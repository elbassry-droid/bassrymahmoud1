import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  StoreProfile,
  LicenseState,
  TrialRemainingTime,
  UserAccount,
  Product,
  CartItem,
  Invoice,
  Customer,
  Supplier,
  Expense,
} from '../types';
import { soundManager } from '../utils/audio';
import { generateOfflineHtmlBundle } from '../utils/exportOfflineHtml';
import { calculateStripPrice } from '../utils/pharmacy';
import {
  parseMedicinesJSON,
  parseMedicinesJSONAsync,
  ImportMedicinesOptions,
  ImportMedicinesSummary,
} from '../utils/medicinesJsonParser';
import {
  getDB,
  getAllFromStore,
  putInStore,
  deleteFromStore,
  bulkPutInStore,
  clearStore,
  getSetting,
  setSetting,
  migrateFromLocalStorageIfNeeded,
  STORES,
} from '../db/indexedDB';
import {
  SyncConfig,
  SyncTrafficStats,
  SyncDeltaItem,
  loadSyncConfig,
  saveSyncConfig,
  loadSyncStats,
  recordSyncTraffic,
  checkRemoteChanges,
  pushDeltasToCloud,
  pullDeltasFromCloud,
  uploadFullSnapshot,
  downloadFullSnapshot,
  queueOfflineDelta,
  getOfflineQueue,
  clearOfflineQueue,
} from '../utils/cloudSync';

// Default Store Profile for Pharmacy
const DEFAULT_STORE_PROFILE: StoreProfile = {
  name: 'صيدلية الشفاء والبركة',
  storeType: 'صيدلية ومستحضرات طبية',
  phone: '01027568272',
  address: 'شارع الجمهورية - أمام المستشفى التخصصي',
  currency: 'ج.م',
  logoUrl: '',
  receiptFooterNote: 'مع تمنياتنا لكم بالشفاء العاجل وموفور الصحة! يرجى مراجعة مواعيد الجرعات مع الدكتور الصيدلي',
  taxPercentage: 0,
  printerWidth: '80mm',
  createdAt: new Date().toISOString(),
};

// Default Admin & Cashier Pharmacist Accounts
const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: '2027', // Masked in all UI
    name: 'د. محمود حمدي (مدير الصيدلية)',
    role: 'admin',
    createdAt: new Date().toISOString(),
    active: true,
  },
  {
    id: 'user-cashier-1',
    username: 'cashier',
    password: '1234',
    name: 'د. أحمد صيدلي (كاشير النبطشية)',
    role: 'cashier',
    createdAt: new Date().toISOString(),
    active: true,
  },
];

// Seed initial realistic pharmacy medicines with strips and box calculations
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'med-1',
    barcode: '622100200101',
    name: 'ألفينترن أقراص لعلاج التورم والالتهابات (Alphintern)',
    activeIngredient: 'Chymotrypsin & Trypsin (كيموتربسين + تربسين)',
    category: 'فوار ومسكنات',
    dosageForm: 'أقراص مغلفة',
    shelfLocation: 'A-01',
    expiryDate: '2027-12',
    stripsPerBox: 3,
    purchasePrice: 380,
    sellingPrice: 500,
    stripPrice: 166.67,
    stripPurchasePrice: 126.67,
    totalStripsStock: 45,
    stockQuantity: 15,
    minStockAlert: 5,
    unit: 'علبة',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'med-2',
    barcode: '622100200102',
    name: 'أوجمنتين 1 جم أقراص (Augmentin 1g)',
    activeIngredient: 'Amoxicillin + Clavulanic Acid (أموكسيسيلين + كلافولانيك)',
    category: 'مضادات حيوية',
    dosageForm: 'أقراص مغلفة',
    shelfLocation: 'A-03',
    expiryDate: '2027-08',
    stripsPerBox: 2,
    purchasePrice: 98,
    sellingPrice: 130,
    stripPrice: 65,
    stripPurchasePrice: 49,
    totalStripsStock: 30,
    stockQuantity: 15,
    minStockAlert: 6,
    unit: 'علبة',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'med-3',
    barcode: '622100200103',
    name: 'بانادول إكسترا أحمر مسكن وخافض حرارة (Panadol Extra)',
    activeIngredient: 'Paracetamol 500mg + Caffeine 65mg (باراسيتامول + كافيين)',
    category: 'فوار ومسكنات',
    dosageForm: 'أقراص',
    shelfLocation: 'A-05',
    expiryDate: '2028-01',
    stripsPerBox: 2,
    purchasePrice: 45,
    sellingPrice: 60,
    stripPrice: 30,
    stripPurchasePrice: 22.5,
    totalStripsStock: 60,
    stockQuantity: 30,
    minStockAlert: 10,
    unit: 'علبة',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'med-4',
    barcode: '622100200104',
    name: 'كونجستال أقراص للبرد والرشح (Congestal)',
    activeIngredient: 'Paracetamol + Pseudoephedrine + Chlorpheniramine',
    category: 'فوار ومسكنات',
    dosageForm: 'أقراص',
    shelfLocation: 'B-02',
    expiryDate: '2027-11',
    stripsPerBox: 2,
    purchasePrice: 28,
    sellingPrice: 40,
    stripPrice: 20,
    stripPurchasePrice: 14,
    totalStripsStock: 38,
    stockQuantity: 19,
    minStockAlert: 8,
    unit: 'علبة',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'med-5',
    barcode: '622100200105',
    name: 'أنتينال 200 مجم كبسول مطهر معوي (Antinal)',
    activeIngredient: 'Nifuroxazide 200mg (نيفوروكسازيد)',
    category: 'أقراص وكبسولات',
    dosageForm: 'كبسولات',
    shelfLocation: 'B-04',
    expiryDate: '2027-09',
    stripsPerBox: 2,
    purchasePrice: 32,
    sellingPrice: 42,
    stripPrice: 21,
    stripPurchasePrice: 16,
    totalStripsStock: 24,
    stockQuantity: 12,
    minStockAlert: 5,
    unit: 'علبة',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'med-6',
    barcode: '622100200106',
    name: 'كتافلام 50 مجم مسكن ومضاد للالتهاب (Cataflam 50mg)',
    activeIngredient: 'Diclofenac Potassium 50mg (ديكلوفيناك بوتاسيوم)',
    category: 'فوار ومسكنات',
    dosageForm: 'أقراص',
    shelfLocation: 'A-04',
    expiryDate: '2028-03',
    stripsPerBox: 2,
    purchasePrice: 52,
    sellingPrice: 70,
    stripPrice: 35,
    stripPurchasePrice: 26,
    totalStripsStock: 32,
    stockQuantity: 16,
    minStockAlert: 6,
    unit: 'علبة',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'med-7',
    barcode: '622100200107',
    name: 'أوميجا 3 بلس كبسول جيلاتيني رخو (Omega 3 Plus)',
    activeIngredient: 'Fish Oil 1000mg + Wheat Germ Oil 100mg',
    category: 'فيتامينات ومكملات',
    dosageForm: 'كبسولات رخوة',
    shelfLocation: 'C-01',
    expiryDate: '2027-10',
    stripsPerBox: 3,
    purchasePrice: 90,
    sellingPrice: 120,
    stripPrice: 40,
    stripPurchasePrice: 30,
    totalStripsStock: 33,
    stockQuantity: 11,
    minStockAlert: 4,
    unit: 'علبة',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'med-8',
    barcode: '622100200108',
    name: 'توسكان شراب 100 مل للكحة والبلغم (Tusskan Syrup)',
    activeIngredient: 'Dextromethorphan + Guaifenesin + Diphenhydramine',
    category: 'أشربة ونقط',
    dosageForm: 'شراب',
    shelfLocation: 'D-02',
    expiryDate: '2026-11',
    stripsPerBox: 1,
    purchasePrice: 22,
    sellingPrice: 28,
    stripPrice: 28,
    stripPurchasePrice: 22,
    totalStripsStock: 14,
    stockQuantity: 14,
    minStockAlert: 5,
    unit: 'زجاجة',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'med-9',
    barcode: '622100200109',
    name: 'كريم كيناكومب 30 جم للالتهابات والتسلخات (Kenacomb)',
    activeIngredient: 'Triamcinolone + Neomycin + Gramicidin + Nystatin',
    category: 'مراهم وكريمات',
    dosageForm: 'كريم موضعي',
    shelfLocation: 'E-01',
    expiryDate: '2028-06',
    stripsPerBox: 1,
    purchasePrice: 34,
    sellingPrice: 45,
    stripPrice: 45,
    stripPurchasePrice: 34,
    totalStripsStock: 20,
    stockQuantity: 20,
    minStockAlert: 5,
    unit: 'أنبوبة',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'med-10',
    barcode: '622100200110',
    name: 'حقن فولتارين 75 مجم / 3 مل مسكن (Voltaren Ampoules)',
    activeIngredient: 'Diclofenac Sodium 75mg/3ml (ديكلوفيناك صوديوم)',
    category: 'حقن وأمبولات',
    dosageForm: 'أمبولات عضلية',
    shelfLocation: 'F-01',
    expiryDate: '2027-07',
    stripsPerBox: 6,
    purchasePrice: 72,
    sellingPrice: 96,
    stripPrice: 16,
    stripPurchasePrice: 12,
    totalStripsStock: 36,
    stockQuantity: 6,
    minStockAlert: 3,
    unit: 'علبة',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'med-11',
    barcode: '622100200111',
    name: 'بانادول كولد آند فلو داي الأصفر (Panadol Cold & Flu Day)',
    activeIngredient: 'Paracetamol 500mg + Pseudoephedrine 30mg',
    category: 'فوار ومسكنات',
    dosageForm: 'أقراص',
    shelfLocation: 'A-06',
    expiryDate: '2027-09',
    stripsPerBox: 3,
    purchasePrice: 56,
    sellingPrice: 75,
    stripPrice: 25,
    stripPurchasePrice: 18.67,
    totalStripsStock: 27,
    stockQuantity: 9,
    minStockAlert: 4,
    unit: 'علبة',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'med-12',
    barcode: '622100200112',
    name: 'كيتوفان 50 مجم كبسول مسكن (Ketofan 50mg)',
    activeIngredient: 'Ketoprofen 50mg (كيتوبروفين)',
    category: 'أقراص وكبسولات',
    dosageForm: 'كبسولات',
    shelfLocation: 'B-03',
    expiryDate: '2028-02',
    stripsPerBox: 2,
    purchasePrice: 26,
    sellingPrice: 36,
    stripPrice: 18,
    stripPurchasePrice: 13,
    totalStripsStock: 6,
    stockQuantity: 3,
    minStockAlert: 8,
    unit: 'علبة',
    lastUpdated: new Date().toISOString(),
  },
];

// Seed initial pharmacy drug distribution suppliers
const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'الشركة المتحدة للصيادلة (UCP)',
    companyName: 'المتحدة لتوزيع الأدوية والمستلزمات',
    phone: '01001234567',
    address: 'فرع مخزن القاهرة الكبرى - المقطم',
    balanceDue: 8500,
    notes: 'توريد أدوية ومضادات حيوية مع خصم صيدلي 20%',
    purchases: [
      {
        id: 'purch-1',
        invoiceNumber: 'UCP-2026-881',
        date: new Date(Date.now() - 3 * 86400000).toISOString(),
        itemsSummary: 'طلبية مضادات حيوية ومسكنات وألفينترن',
        totalAmount: 18500,
        paidAmount: 10000,
        remainingAmount: 8500,
        notes: 'دفعة أولى بشيك كاش والمتبقي آجل أسبوعين',
      },
    ],
    payments: [
      {
        id: 'pay-1',
        date: new Date(Date.now() - 3 * 86400000).toISOString(),
        amount: 10000,
        notes: 'سداد نقدي مع استلام البضاعة',
      },
    ],
  },
  {
    id: 'sup-2',
    name: 'شركة ابن سينا فارما (Ibnsina Pharma)',
    companyName: 'ابن سينا لتجارة الأدوية',
    phone: '01122334455',
    address: 'المنطقة الصناعية - مدينة العبور',
    balanceDue: 3200,
    notes: 'مورد معتمد لمستحضرات التجميل والفيتامينات وألبان الأطفال',
    purchases: [
      {
        id: 'purch-2',
        invoiceNumber: 'IBN-2026-402',
        date: new Date(Date.now() - 1 * 86400000).toISOString(),
        itemsSummary: 'فيتامينات أوميجا 3 وكريمات وأمبولات',
        totalAmount: 6200,
        paidAmount: 3000,
        remainingAmount: 3200,
      },
    ],
    payments: [
      {
        id: 'pay-2',
        date: new Date(Date.now() - 1 * 86400000).toISOString(),
        amount: 3000,
        notes: 'دفعة استلام فاتورة IBN-2026-402',
      },
    ],
  },
];

// Seed initial customers
const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'أحمد محمود إبراهيم (علاج شهري)',
    phone: '01099887766',
    address: 'عمارة 14 - شارع النصر',
    nationalId: '29010151234567',
    totalPurchases: 1800,
    totalDebts: 450,
    notes: 'مريض سكر وضغط منتظم - حساب شهري',
    installments: [
      {
        id: 'inst-1',
        invoiceId: 'inv-demo-1',
        invoiceNumber: 'INV-202601',
        date: new Date(Date.now() - 5 * 86400000).toISOString(),
        totalAmount: 950,
        paidAmount: 500,
        remainingAmount: 450,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        status: 'partially_paid',
        payments: [
          {
            id: 'p-1',
            date: new Date(Date.now() - 5 * 86400000).toISOString(),
            amount: 500,
            notes: 'دفعة نقدية بالصيدلية',
          },
        ],
      },
    ],
  },
];

// Seed pharmacy expenses
const DEFAULT_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    title: 'فاتورة كهرباء ثلاجة الأنسولين والمحل',
    category: 'كهرباء وفواتير',
    amount: 750,
    date: new Date().toISOString(),
    notes: 'فاتورة شهرية لعداد التجاري وثلاجة حفظ الأدوية',
    recordedBy: 'المدير العام',
  },
  {
    id: 'exp-2',
    title: 'أكياس صيدلية مطبوعة وبكر فواتير حرارية',
    category: 'نثريات وبوفيه',
    amount: 220,
    date: new Date().toISOString(),
    notes: 'شراء أكياس بلاستيك بيضاء وبكر طابعة 80 مم',
    recordedBy: 'المدير العام',
  },
];

interface StoreContextType {
  // Database Status
  isDbReady: boolean;
  dbEngine: 'indexedDB';
  // Profile
  profile: StoreProfile | null;
  updateProfile: (data: StoreProfile) => void;
  // License & Trial
  license: LicenseState;
  daysRemaining: number;
  remainingTime: TrialRemainingTime;
  isTrialExpired: boolean;
  activateSystem: (code: string) => { success: boolean; message: string };
  // Auth
  currentUser: UserAccount | null;
  users: UserAccount[];
  login: (username: string, pass: string) => boolean;
  logout: () => void;
  addUser: (account: Omit<UserAccount, 'id' | 'createdAt'>) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  // Products (أدوية ومستحضرات الصيدلية)
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'lastUpdated'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  quickAdjustStock: (id: string, deltaBoxes: number, deltaStrips?: number) => void;
  barcodeMap: Map<string, Product>;
  // POS & Cart (سلة مبيعات الصيدلية بالعلبة والشريط)
  cart: CartItem[];
  addToCart: (product: Product, qty?: number, saleUnit?: 'box' | 'strip') => void;
  scanBarcode: (barcode: string) => { found: boolean; item?: Product };
  updateCartQty: (cartItemId: string, quantity: number) => void;
  updateCartDiscount: (cartItemId: string, discount: number) => void;
  removeFromCart: (cartItemId: string) => void;
  toggleCartSaleUnit: (cartItemId: string) => void;
  clearCart: () => void;
  // Invoices & Checkout
  invoices: Invoice[];
  createInvoice: (params: {
    paymentMethod: 'cash' | 'card' | 'installment';
    hasDelivery: boolean;
    deliveryFee: number;
    deliveryAddress?: string;
    deliveryPhone?: string;
    deliveryNotes?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    paidAmount: number;
    remainingAmount: number;
    discountAmount?: number;
    notes?: string;
  }) => Invoice;
  deleteInvoice: (invoiceId: string, restoreStock?: boolean) => void;
  returnInvoiceItems: (
    invoiceId: string,
    returns: { productId: string; quantity: number; refundAmount: number; saleUnit?: 'box' | 'strip' }[]
  ) => void;
  // Suppliers
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'purchases' | 'payments'>) => void;
  updateSupplier: (id: string, data: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  addSupplierPurchase: (
    supplierId: string,
    purchase: {
      invoiceNumber: string;
      itemsSummary: string;
      totalAmount: number;
      paidAmount: number;
      notes?: string;
    }
  ) => void;
  addSupplierPayment: (
    supplierId: string,
    payment: { amount: number; notes?: string }
  ) => void;
  // Customers & Installments
  customers: Customer[];
  addCustomer: (cust: Omit<Customer, 'id' | 'totalPurchases' | 'totalDebts' | 'installments'>) => Customer;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  recordInstallmentPayment: (
    customerId: string,
    installmentId: string,
    amount: number,
    note?: string
  ) => void;
  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'recordedBy' | 'date'>) => void;
  deleteExpense: (id: string) => void;
  // Print & Receipt
  activeReceiptInvoice: Invoice | null;
  setActiveReceiptInvoice: (invoice: Invoice | null) => void;
  printInvoice: (invoice: Invoice) => void;
  // Backup & Reset
  exportDatabaseJSON: () => void;
  importDatabaseJSON: (jsonString: string) => Promise<boolean>;
  importMedicinesJSON: (
    jsonInput: string | any,
    options?: Partial<ImportMedicinesOptions>
  ) => ImportMedicinesSummary;
  importMedicinesJSONAsync: (
    jsonInput: string | any,
    options?: Partial<ImportMedicinesOptions>,
    onProgress?: (processed: number, total: number, phase: string) => void
  ) => Promise<ImportMedicinesSummary>;
  exportMedicinesJSON: () => void;
  resetToDefaultData: () => Promise<void>;
  downloadOfflineHtmlBundle: () => void;
  // Persistence status
  lastSavedAt: string;
  forceSaveAllToLocalStorage: () => void;
  // Cloud & Multi-Device Sync (< 100MB ultra-low internet consumption)
  syncConfig: SyncConfig;
  syncStats: SyncTrafficStats;
  isSyncing: boolean;
  updateSyncConfig: (config: SyncConfig) => void;
  triggerManualSync: () => Promise<boolean>;
  triggerFullCloudBackup: () => Promise<boolean>;
  triggerFullCloudRestore: () => Promise<boolean>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDbReady, setIsDbReady] = useState(false);

  // Cloud Sync state
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => loadSyncConfig());
  const [syncStats, setSyncStats] = useState<SyncTrafficStats>(() => loadSyncStats());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const lastSyncVersionRef = useRef<number>(0);
  const lastSyncTimeRef = useRef<string>(new Date().toISOString());

  // States with ready-to-use defaults
  const [profile, setProfile] = useState<StoreProfile | null>(DEFAULT_STORE_PROFILE);
  const [license, setLicense] = useState<LicenseState>({
    isActivated: false,
    trialStartDate: new Date().toISOString(),
    trialDays: 5,
  });
  const [users, setUsers] = useState<UserAccount[]>(DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(DEFAULT_USERS[0]);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);
  const [customers, setCustomers] = useState<Customer[]>(DEFAULT_CUSTOMERS);
  const [expenses, setExpenses] = useState<Expense[]>(DEFAULT_EXPENSES);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeReceiptInvoice, setActiveReceiptInvoice] = useState<Invoice | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string>(() => new Date().toLocaleTimeString('ar-EG'));

  // 1. Initialize IndexedDB and migrate data on startup
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        await migrateFromLocalStorageIfNeeded({
          products: DEFAULT_PRODUCTS,
          invoices: [],
          users: DEFAULT_USERS,
          suppliers: DEFAULT_SUPPLIERS,
          customers: DEFAULT_CUSTOMERS,
          expenses: DEFAULT_EXPENSES,
          profile: DEFAULT_STORE_PROFILE,
          license: {
            isActivated: false,
            trialStartDate: new Date().toISOString(),
            trialDays: 5,
          },
        });

        // Load all datasets in parallel from IndexedDB
        const [
          dbProducts,
          dbInvoices,
          dbSuppliers,
          dbCustomers,
          dbExpenses,
          dbUsers,
          dbProfile,
          dbLicense,
          dbActiveUser,
          dbCart,
        ] = await Promise.all([
          getAllFromStore<Product>(STORES.PRODUCTS),
          getAllFromStore<Invoice>(STORES.INVOICES),
          getAllFromStore<Supplier>(STORES.SUPPLIERS),
          getAllFromStore<Customer>(STORES.CUSTOMERS),
          getAllFromStore<Expense>(STORES.EXPENSES),
          getAllFromStore<UserAccount>(STORES.USERS),
          getSetting<StoreProfile | null>('store_profile', DEFAULT_STORE_PROFILE),
          getSetting<LicenseState>('store_license', {
            isActivated: false,
            trialStartDate: new Date().toISOString(),
            trialDays: 5,
          }),
          getSetting<UserAccount | null>('current_user', null),
          getSetting<CartItem[]>('active_cart', []),
        ]);

        if (isMounted) {
          if (dbProducts && dbProducts.length > 0) setProducts(dbProducts);
          if (dbInvoices) setInvoices(dbInvoices);
          if (dbSuppliers && dbSuppliers.length > 0) setSuppliers(dbSuppliers);
          if (dbCustomers && dbCustomers.length > 0) setCustomers(dbCustomers);
          if (dbExpenses && dbExpenses.length > 0) setExpenses(dbExpenses);
          if (dbUsers && dbUsers.length > 0) setUsers(dbUsers);
          if (dbProfile) setProfile(dbProfile);
          if (dbLicense) setLicense(dbLicense);
          if (dbActiveUser) setCurrentUser(dbActiveUser);
          if (dbCart) setCart(dbCart);

          setIsDbReady(true);
          setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));
        }
      } catch (err) {
        console.error('IndexedDB initialization error, fallback to memory:', err);
        if (isMounted) setIsDbReady(true);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. High-speed Barcode Map for O(1) POS Lookups (Handles 100,000+ items instantly)
  const barcodeMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.barcode) {
        map.set(p.barcode.trim(), p);
      }
    }
    return map;
  }, [products]);

  // Real-time ticker for trial countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Precise trial remaining calculation (5 days = 120 hours)
  const calculateRemainingTime = (): TrialRemainingTime => {
    if (license.isActivated) {
      return {
        days: 999,
        hours: 999,
        minutes: 999,
        seconds: 999,
        totalHours: 999,
        formatted: 'نسخة دائمة مفعلة مدى الحياة (IndexedDB ⚡)',
      };
    }

    const start = new Date(license.trialStartDate).getTime();
    const totalMs = license.trialDays * 24 * 60 * 60 * 1000;
    const elapsed = now - start;
    const remainingMs = Math.max(0, totalMs - elapsed);

    const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

    let formatted = '';
    if (days > 0) {
      formatted = `${days} يوم و ${hours} ساعة و ${minutes} دقيقة`;
    } else if (hours > 0) {
      formatted = `${hours} ساعة و ${minutes} دقيقة و ${seconds} ثانية`;
    } else if (minutes > 0 || seconds > 0) {
      formatted = `${minutes} دقيقة و ${seconds} ثانية (أوشك الوقت على النفاد!)`;
    } else {
      formatted = 'انتهت الفترة التجريبية (120 ساعة)';
    }

    return {
      days,
      hours,
      minutes,
      seconds,
      totalHours,
      formatted,
    };
  };

  const remainingTime = calculateRemainingTime();
  const daysRemaining = remainingTime.days;
  const isTrialExpired = !license.isActivated && remainingTime.totalHours <= 0 && remainingTime.minutes <= 0 && remainingTime.seconds <= 0;

  // Activation code logic - Secret code: BAS2027-1
  const activateSystem = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode === 'BAS2027-1') {
      const updated: LicenseState = {
        isActivated: true,
        activationDate: new Date().toISOString(),
        trialStartDate: license.trialStartDate,
        trialDays: 5,
      };
      setLicense(updated);
      setSetting('store_license', updated);
      soundManager.playCashRegister();
      return { success: true, message: 'تم تفعيل البرنامج بنجاح! شكراً لشرائك النسخة الكاملة.' };
    }
    soundManager.playErrorBeep();
    return { success: false, message: 'كود التفعيل غير صحيح! يرجى التواصل مع الدعم الفني للشراء.' };
  };

  // Auth methods
  const login = (username: string, pass: string): boolean => {
    const found = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === pass && u.active
    );
    if (found) {
      setCurrentUser(found);
      setSetting('current_user', found);
      soundManager.playCashRegister();
      return true;
    }
    soundManager.playErrorBeep();
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setSetting('current_user', null);
  };

  const addUser = (accountData: Omit<UserAccount, 'id' | 'createdAt'>) => {
    const newUser: UserAccount = {
      ...accountData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    putInStore(STORES.USERS, newUser);
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    deleteFromStore(STORES.USERS, id);
  };

  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, active: !u.active };
          putInStore(STORES.USERS, updated);
          return updated;
        }
        return u;
      })
    );
  };

  // ==========================================
  // CLOUD SYNC & ULTRA-LOW DATA ENGINE (<100MB)
  // ==========================================

  const updateSyncConfig = useCallback((newConfig: SyncConfig) => {
    setSyncConfig(newConfig);
    saveSyncConfig(newConfig);
  }, []);

  const broadcastDelta = useCallback(
    (
      type: SyncDeltaItem['type'],
      action: SyncDeltaItem['action'],
      data: any
    ) => {
      if (!syncConfig.enabled || !syncConfig.roomCode) return;

      const delta: SyncDeltaItem = {
        id: `delta-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type,
        action,
        deviceId: syncConfig.deviceId,
        deviceName: syncConfig.deviceName,
        timestamp: new Date().toISOString(),
        data,
      };

      // Push asynchronously in background
      pushDeltasToCloud(syncConfig.roomCode, [delta], syncConfig)
        .then((success) => {
          if (!success) {
            queueOfflineDelta(delta);
          }
          setSyncStats(loadSyncStats());
        })
        .catch(() => {
          queueOfflineDelta(delta);
          setSyncStats(loadSyncStats());
        });
    },
    [syncConfig]
  );

  const applyIncomingDeltas = useCallback(async (deltas: SyncDeltaItem[]) => {
    if (!deltas || deltas.length === 0) return;

    for (const delta of deltas) {
      if (delta.type === 'invoice' && delta.action === 'create') {
        const inv = delta.data as Invoice;
        setInvoices((prev) => {
          if (prev.some((i) => i.id === inv.id || i.invoiceNumber === inv.invoiceNumber)) return prev;
          return [inv, ...prev];
        });
        await putInStore(STORES.INVOICES, inv);
      } else if (delta.type === 'product') {
        const prod = delta.data as Product;
        if (delta.action === 'create' || delta.action === 'update') {
          setProducts((prev) => {
            const index = prev.findIndex((p) => p.id === prod.id || p.barcode === prod.barcode);
            if (index >= 0) {
              const next = [...prev];
              next[index] = prod;
              return next;
            } else {
              return [prod, ...prev];
            }
          });
          await putInStore(STORES.PRODUCTS, prod);
        } else if (delta.action === 'delete') {
          setProducts((prev) => prev.filter((p) => p.id !== prod.id && p.barcode !== prod.barcode));
          await deleteFromStore(STORES.PRODUCTS, prod.id);
        }
      } else if (delta.type === 'customer') {
        const cust = delta.data as Customer;
        if (delta.action === 'create' || delta.action === 'update') {
          setCustomers((prev) => {
            const index = prev.findIndex((c) => c.id === cust.id);
            if (index >= 0) {
              const next = [...prev];
              next[index] = cust;
              return next;
            } else {
              return [cust, ...prev];
            }
          });
          await putInStore(STORES.CUSTOMERS, cust);
        } else if (delta.action === 'delete') {
          setCustomers((prev) => prev.filter((c) => c.id !== cust.id));
          await deleteFromStore(STORES.CUSTOMERS, cust.id);
        }
      } else if (delta.type === 'supplier') {
        const sup = delta.data as Supplier;
        if (delta.action === 'create' || delta.action === 'update') {
          setSuppliers((prev) => {
            const index = prev.findIndex((s) => s.id === sup.id);
            if (index >= 0) {
              const next = [...prev];
              next[index] = sup;
              return next;
            } else {
              return [sup, ...prev];
            }
          });
          await putInStore(STORES.SUPPLIERS, sup);
        }
      } else if (delta.type === 'expense') {
        const exp = delta.data as Expense;
        if (delta.action === 'create' || delta.action === 'update') {
          setExpenses((prev) => {
            const index = prev.findIndex((e) => e.id === exp.id);
            if (index >= 0) {
              const next = [...prev];
              next[index] = exp;
              return next;
            } else {
              return [exp, ...prev];
            }
          });
          await putInStore(STORES.EXPENSES, exp);
        }
      } else if (delta.type === 'profile') {
        const prof = delta.data as StoreProfile;
        setProfile(prof);
        await setSetting('store_profile', prof);
      }
    }
    setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));
  }, []);

  const performDeltaSync = useCallback(async (): Promise<boolean> => {
    if (!syncConfig.enabled || !syncConfig.roomCode || isSyncing) return false;

    setIsSyncing(true);
    try {
      // 1. Flush offline queue if any
      const offlineQueue = getOfflineQueue();
      if (offlineQueue.length > 0) {
        const pushed = await pushDeltasToCloud(syncConfig.roomCode, offlineQueue, syncConfig);
        if (pushed) {
          clearOfflineQueue();
        }
      }

      // 2. Check remote version (~20 bytes)
      const check = await checkRemoteChanges(
        syncConfig.roomCode,
        lastSyncVersionRef.current,
        syncConfig.deviceId
      );

      if (check.changed) {
        const pullRes = await pullDeltasFromCloud(
          syncConfig.roomCode,
          lastSyncTimeRef.current,
          syncConfig
        );

        if (pullRes.success && pullRes.deltas.length > 0) {
          await applyIncomingDeltas(pullRes.deltas);
          lastSyncVersionRef.current = pullRes.version;
          lastSyncTimeRef.current = new Date().toISOString();
        }
      } else {
        recordSyncTraffic(0, 0, 'connected', 'متصل ومحدث 100%');
      }

      setSyncStats(loadSyncStats());
      return true;
    } catch (err) {
      console.error('Delta sync error:', err);
      recordSyncTraffic(0, 0, 'offline', 'وضع محلي أوفلاين');
      setSyncStats(loadSyncStats());
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [syncConfig, isSyncing, applyIncomingDeltas]);

  const triggerManualSync = useCallback(async (): Promise<boolean> => {
    return await performDeltaSync();
  }, [performDeltaSync]);

  const triggerFullCloudBackup = useCallback(async (): Promise<boolean> => {
    if (!syncConfig.roomCode) return false;
    setIsSyncing(true);
    try {
      const ok = await uploadFullSnapshot(
        syncConfig.roomCode,
        {
          products,
          invoices,
          customers,
          suppliers,
          expenses,
          profile,
        },
        syncConfig
      );
      setSyncStats(loadSyncStats());
      return ok;
    } catch (e) {
      console.error('Full cloud backup failed:', e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [syncConfig, products, invoices, customers, suppliers, expenses, profile]);

  const triggerFullCloudRestore = useCallback(async (): Promise<boolean> => {
    if (!syncConfig.roomCode) return false;
    setIsSyncing(true);
    try {
      const res = await downloadFullSnapshot(syncConfig.roomCode);
      if (res.success && res.snapshot) {
        const snap = res.snapshot;
        if (snap.products) {
          setProducts(snap.products);
          await clearStore(STORES.PRODUCTS);
          await bulkPutInStore(STORES.PRODUCTS, snap.products);
        }
        if (snap.invoices) {
          setInvoices(snap.invoices);
          await clearStore(STORES.INVOICES);
          await bulkPutInStore(STORES.INVOICES, snap.invoices);
        }
        if (snap.customers) {
          setCustomers(snap.customers);
          await clearStore(STORES.CUSTOMERS);
          await bulkPutInStore(STORES.CUSTOMERS, snap.customers);
        }
        if (snap.suppliers) {
          setSuppliers(snap.suppliers);
          await clearStore(STORES.SUPPLIERS);
          await bulkPutInStore(STORES.SUPPLIERS, snap.suppliers);
        }
        if (snap.expenses) {
          setExpenses(snap.expenses);
          await clearStore(STORES.EXPENSES);
          await bulkPutInStore(STORES.EXPENSES, snap.expenses);
        }
        if (snap.profile) {
          setProfile(snap.profile);
          await setSetting('store_profile', snap.profile);
        }
        setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));
        setSyncStats(loadSyncStats());
        return true;
      }
      return false;
    } catch (e) {
      console.error('Full cloud restore failed:', e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [syncConfig]);

  // Background sync timer loop (Adaptive polling every 20s, uses ~20 bytes)
  useEffect(() => {
    if (!isDbReady || !syncConfig.enabled || !syncConfig.roomCode) return;

    performDeltaSync();

    const intervalMs = Math.max(10, syncConfig.autoSyncIntervalSec || 20) * 1000;
    const interval = setInterval(() => {
      performDeltaSync();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isDbReady, syncConfig.enabled, syncConfig.roomCode, syncConfig.autoSyncIntervalSec, performDeltaSync]);

  // Product methods (أدوية ومستحضرات الصيدلية)
  const addProduct = (data: Omit<Product, 'id' | 'lastUpdated'>) => {
    const stripsPerBox = Math.max(1, data.stripsPerBox || 1);
    const stripPrice = data.stripPrice || calculateStripPrice(data.sellingPrice, stripsPerBox);
    const stripPurchasePrice =
      data.stripPurchasePrice || calculateStripPrice(data.purchasePrice, stripsPerBox);
    const totalStripsStock =
      data.totalStripsStock !== undefined
        ? data.totalStripsStock
        : Math.round(data.stockQuantity * stripsPerBox);

    const newProduct: Product = {
      ...data,
      stripsPerBox,
      stripPrice,
      stripPurchasePrice,
      totalStripsStock,
      stockQuantity: Number((totalStripsStock / stripsPerBox).toFixed(2)),
      id: `med-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      lastUpdated: new Date().toISOString(),
    };

    setProducts((prev) => [newProduct, ...prev]);
    putInStore(STORES.PRODUCTS, newProduct);
    broadcastDelta('product', 'create', newProduct);
    setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));
  };

  const updateProduct = (id: string, data: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const merged = { ...p, ...data };
        const stripsPerBox = Math.max(1, merged.stripsPerBox || 1);
        const stripPrice =
          data.sellingPrice !== undefined || data.stripsPerBox !== undefined
            ? calculateStripPrice(merged.sellingPrice, stripsPerBox)
            : merged.stripPrice;
        const stripPurchasePrice =
          data.purchasePrice !== undefined || data.stripsPerBox !== undefined
            ? calculateStripPrice(merged.purchasePrice, stripsPerBox)
            : merged.stripPurchasePrice;

        let totalStripsStock = merged.totalStripsStock;
        if (data.stockQuantity !== undefined && data.totalStripsStock === undefined) {
          totalStripsStock = Math.round(data.stockQuantity * stripsPerBox);
        } else if (data.totalStripsStock !== undefined) {
          totalStripsStock = data.totalStripsStock;
        }

        const updated = {
          ...merged,
          stripsPerBox,
          stripPrice,
          stripPurchasePrice,
          totalStripsStock,
          stockQuantity: Number((totalStripsStock / stripsPerBox).toFixed(2)),
          lastUpdated: new Date().toISOString(),
        };

        putInStore(STORES.PRODUCTS, updated);
        broadcastDelta('product', 'update', updated);
        return updated;
      })
    );
    setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    deleteFromStore(STORES.PRODUCTS, id);
    broadcastDelta('product', 'delete', { id });
    setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));
  };

  const quickAdjustStock = (id: string, deltaBoxes: number, deltaStrips: number = 0) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const stripsPerBox = Math.max(1, p.stripsPerBox || 1);
        const currentStrips =
          typeof p.totalStripsStock === 'number'
            ? p.totalStripsStock
            : Math.round(p.stockQuantity * stripsPerBox);
        const addedStrips = deltaBoxes * stripsPerBox + deltaStrips;
        const newTotalStrips = Math.max(0, currentStrips + addedStrips);
        const newBoxes = Number((newTotalStrips / stripsPerBox).toFixed(2));

        const updated = {
          ...p,
          totalStripsStock: newTotalStrips,
          stockQuantity: newBoxes,
          lastUpdated: new Date().toISOString(),
        };

        putInStore(STORES.PRODUCTS, updated);
        broadcastDelta('product', 'update', updated);
        return updated;
      })
    );
    setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));
  };

  // Cart operations (سلة مبيعات الصيدلية بالعلبة والشريط)
  const addToCart = (product: Product, qty: number = 1, saleUnit: 'box' | 'strip' = 'box') => {
    soundManager.playScanBeep();
    const stripsInBox = Math.max(1, product.stripsPerBox || 1);
    const actualUnit: 'box' | 'strip' = stripsInBox > 1 ? saleUnit : 'box';
    const itemId = `${product.id}-${actualUnit}`;
    const unitPrice =
      actualUnit === 'strip'
        ? product.stripPrice || calculateStripPrice(product.sellingPrice, stripsInBox)
        : product.sellingPrice;
    const unitLabel = actualUnit === 'strip' ? 'شريط' : (product.unit || 'علبة');

    setCart((prev) => {
      const existing = prev.find((item) => item.id === itemId);
      let updated: CartItem[];
      if (existing) {
        updated = prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: item.quantity + qty,
                total: Math.max(0, (item.quantity + qty) * item.unitPrice - item.discount),
              }
            : item
        );
      } else {
        updated = [
          ...prev,
          {
            id: itemId,
            product,
            saleUnit: actualUnit,
            unitLabel,
            quantity: qty,
            unitPrice,
            discount: 0,
            total: qty * unitPrice,
          },
        ];
      }
      setSetting('active_cart', updated);
      return updated;
    });
  };

  const scanBarcode = useCallback((barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return { found: false };

    // Instant O(1) map lookup
    const item = barcodeMap.get(clean);
    if (item) {
      addToCart(item, 1, 'box');
      return { found: true, item };
    }
    soundManager.playErrorBeep();
    return { found: false };
  }, [barcodeMap]);

  const updateCartQty = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) => {
      const updated = prev.map((item) =>
        item.id === cartItemId || item.product.id === cartItemId
          ? {
              ...item,
              quantity,
              total: Math.max(0, quantity * item.unitPrice - item.discount),
            }
          : item
      );
      setSetting('active_cart', updated);
      return updated;
    });
  };

  const updateCartDiscount = (cartItemId: string, discount: number) => {
    setCart((prev) => {
      const updated = prev.map((item) =>
        item.id === cartItemId || item.product.id === cartItemId
          ? {
              ...item,
              discount: Math.max(0, discount),
              total: Math.max(0, item.quantity * item.unitPrice - discount),
            }
          : item
      );
      setSetting('active_cart', updated);
      return updated;
    });
  };

  const toggleCartSaleUnit = (cartItemId: string) => {
    setCart((prev) => {
      const updated = prev.map((item) => {
        if (item.id === cartItemId || item.product.id === cartItemId) {
          const stripsInBox = Math.max(1, item.product.stripsPerBox || 1);
          if (stripsInBox <= 1) return item;

          const newUnit: 'box' | 'strip' = item.saleUnit === 'box' ? 'strip' : 'box';
          const newPrice =
            newUnit === 'strip'
              ? item.product.stripPrice || calculateStripPrice(item.product.sellingPrice, stripsInBox)
              : item.product.sellingPrice;
          const newLabel = newUnit === 'strip' ? 'شريط' : (item.product.unit || 'علبة');
          const newId = `${item.product.id}-${newUnit}`;

          return {
            ...item,
            id: newId,
            saleUnit: newUnit,
            unitLabel: newLabel,
            unitPrice: newPrice,
            total: Math.max(0, item.quantity * newPrice - item.discount),
          };
        }
        return item;
      });
      setSetting('active_cart', updated);
      return updated;
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => {
      const updated = prev.filter((item) => item.id !== cartItemId && item.product.id !== cartItemId);
      setSetting('active_cart', updated);
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    setSetting('active_cart', []);
  };

  // Invoices & Checkout
  const createInvoice = ({
    paymentMethod,
    hasDelivery,
    deliveryFee,
    deliveryAddress,
    deliveryPhone,
    deliveryNotes,
    customerId,
    customerName,
    customerPhone,
    paidAmount,
    remainingAmount,
    discountAmount = 0,
    notes,
  }: {
    paymentMethod: 'cash' | 'card' | 'installment';
    hasDelivery: boolean;
    deliveryFee: number;
    deliveryAddress?: string;
    deliveryPhone?: string;
    deliveryNotes?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    paidAmount: number;
    remainingAmount: number;
    discountAmount?: number;
    notes?: string;
  }): Invoice => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const taxRate = profile?.taxPercentage || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const finalTotal = subtotal + (hasDelivery ? deliveryFee : 0) + taxAmount - discountAmount;

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    const invoiceItems = cart.map((item) => {
      const isStrip = item.saleUnit === 'strip';
      const stripsInBox = Math.max(1, item.product.stripsPerBox || 1);
      const purchasePrice = isStrip
        ? item.product.stripPurchasePrice || (item.product.purchasePrice / stripsInBox)
        : item.product.purchasePrice;

      return {
        productId: item.product.id,
        barcode: item.product.barcode,
        name: item.product.name,
        saleUnit: item.saleUnit,
        unitLabel: item.unitLabel,
        stripsPerBox: stripsInBox,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        purchasePrice,
        discount: item.discount,
        total: item.total,
      };
    });

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      date: new Date().toISOString(),
      cashierName: currentUser?.name || 'كاشير الصيدلية',
      cashierId: currentUser?.id || 'cashier',
      items: invoiceItems,
      subtotal,
      taxAmount,
      deliveryFee: hasDelivery ? deliveryFee : 0,
      discountAmount,
      total: finalTotal,
      paidAmount,
      remainingAmount,
      paymentMethod,
      hasDelivery,
      deliveryAddress,
      deliveryPhone,
      deliveryNotes,
      customerId,
      customerName,
      customerPhone,
      status: 'completed',
    };

    // 1. Deduct stock accurately in strips
    setProducts((prev) => {
      const updatedList = prev.map((p) => {
        const matchingCartItems = cart.filter((item) => item.product.id === p.id);
        if (matchingCartItems.length === 0) return p;

        const stripsPerBox = Math.max(1, p.stripsPerBox || 1);
        let stripsToDeduct = 0;
        matchingCartItems.forEach((item) => {
          if (item.saleUnit === 'strip') {
            stripsToDeduct += item.quantity;
          } else {
            stripsToDeduct += item.quantity * stripsPerBox;
          }
        });

        const currentTotalStrips =
          typeof p.totalStripsStock === 'number'
            ? p.totalStripsStock
            : Math.round(p.stockQuantity * stripsPerBox);
        const newTotalStrips = Math.max(0, currentTotalStrips - stripsToDeduct);
        const newBoxes = Number((newTotalStrips / stripsPerBox).toFixed(2));

        const updatedProduct: Product = {
          ...p,
          totalStripsStock: newTotalStrips,
          stockQuantity: newBoxes,
          lastUpdated: new Date().toISOString(),
        };

        putInStore(STORES.PRODUCTS, updatedProduct);
        return updatedProduct;
      });
      return updatedList;
    });

    // 2. Handle customer installment debt
    if (paymentMethod === 'installment' && remainingAmount > 0) {
      if (customerId) {
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id === customerId) {
              const updatedCust: Customer = {
                ...c,
                totalPurchases: c.totalPurchases + finalTotal,
                totalDebts: c.totalDebts + remainingAmount,
                installments: [
                  ...(c.installments || []),
                  {
                    id: `inst-${Date.now()}`,
                    invoiceId: newInvoice.id,
                    invoiceNumber: newInvoice.invoiceNumber,
                    date: newInvoice.date,
                    totalAmount: finalTotal,
                    paidAmount: paidAmount,
                    remainingAmount: remainingAmount,
                    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                    status: paidAmount > 0 ? 'partially_paid' : 'pending',
                    payments:
                      paidAmount > 0
                        ? [
                            {
                              id: `p-${Date.now()}`,
                              date: newInvoice.date,
                              amount: paidAmount,
                              notes: 'مقدم الفاتورة عند الشراء',
                            },
                          ]
                        : [],
                  },
                ],
              };
              putInStore(STORES.CUSTOMERS, updatedCust);
              return updatedCust;
            }
            return c;
          })
        );
      } else if (customerName) {
        const newCust: Customer = {
          id: `cust-${Date.now()}`,
          name: customerName,
          phone: customerPhone || '',
          address: deliveryAddress || '',
          totalPurchases: finalTotal,
          totalDebts: remainingAmount,
          notes: 'عميل آجل / أقساط مسجل من شاشة الكاشير',
          installments: [
            {
              id: `inst-${Date.now()}`,
              invoiceId: newInvoice.id,
              invoiceNumber: newInvoice.invoiceNumber,
              date: newInvoice.date,
              totalAmount: finalTotal,
              paidAmount: paidAmount,
              remainingAmount: remainingAmount,
              dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
              status: paidAmount > 0 ? 'partially_paid' : 'pending',
              payments:
                paidAmount > 0
                  ? [
                      {
                        id: `p-${Date.now()}`,
                        date: newInvoice.date,
                        amount: paidAmount,
                        notes: 'مقدم الفاتورة عند الشراء',
                      },
                    ]
                  : [],
            },
          ],
        };
        setCustomers((prev) => [newCust, ...prev]);
        putInStore(STORES.CUSTOMERS, newCust);
        newInvoice.customerId = newCust.id;
      }
    }

    // 3. Save invoice to IndexedDB & Broadcast Delta
    setInvoices((prev) => [newInvoice, ...prev]);
    putInStore(STORES.INVOICES, newInvoice);
    broadcastDelta('invoice', 'create', newInvoice);

    // 4. Clear cart & play cash chime
    setCart([]);
    setSetting('active_cart', []);
    soundManager.playCashRegister();

    // 5. Open receipt preview
    setActiveReceiptInvoice(newInvoice);
    setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));

    return newInvoice;
  };

  // Delete invoice
  const deleteInvoice = (invoiceId: string, restoreStock: boolean = true) => {
    const target = invoices.find((inv) => inv.id === invoiceId);
    if (!target) return;

    if (restoreStock) {
      setProducts((prev) =>
        prev.map((p) => {
          const matchingItems = target.items.filter((i) => i.productId === p.id);
          if (matchingItems.length === 0) return p;

          const stripsPerBox = Math.max(1, p.stripsPerBox || 1);
          let stripsToAdd = 0;
          matchingItems.forEach((item) => {
            if (item.saleUnit === 'strip') {
              stripsToAdd += item.quantity;
            } else {
              stripsToAdd += item.quantity * stripsPerBox;
            }
          });

          const currentTotalStrips =
            typeof p.totalStripsStock === 'number'
              ? p.totalStripsStock
              : Math.round(p.stockQuantity * stripsPerBox);
          const newTotalStrips = currentTotalStrips + stripsToAdd;
          const newBoxes = Number((newTotalStrips / stripsPerBox).toFixed(2));

          const updated = {
            ...p,
            totalStripsStock: newTotalStrips,
            stockQuantity: newBoxes,
            lastUpdated: new Date().toISOString(),
          };
          putInStore(STORES.PRODUCTS, updated);
          return updated;
        })
      );
    }

    if (target.customerId && target.remainingAmount > 0) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === target.customerId) {
            const updated = {
              ...c,
              totalPurchases: Math.max(0, c.totalPurchases - target.total),
              totalDebts: Math.max(0, c.totalDebts - target.remainingAmount),
              installments: c.installments.filter((ins) => ins.invoiceId !== invoiceId),
            };
            putInStore(STORES.CUSTOMERS, updated);
            return updated;
          }
          return c;
        })
      );
    }

    setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
    deleteFromStore(STORES.INVOICES, invoiceId);
    soundManager.playCashRegister();
    setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));
  };

  // Return invoice items
  const returnInvoiceItems = (
    invoiceId: string,
    returns: { productId: string; quantity: number; refundAmount: number; saleUnit?: 'box' | 'strip' }[]
  ) => {
    const target = invoices.find((inv) => inv.id === invoiceId);
    if (!target) return;

    setProducts((prev) =>
      prev.map((p) => {
        const ret = returns.find((r) => r.productId === p.id);
        if (ret) {
          const invItem = target.items.find((i) => i.productId === p.id);
          const stripsPerBox = Math.max(1, p.stripsPerBox || 1);
          const isStrip = ret.saleUnit === 'strip' || invItem?.saleUnit === 'strip';
          const stripsToAdd = isStrip ? ret.quantity : ret.quantity * stripsPerBox;

          const currentTotalStrips =
            typeof p.totalStripsStock === 'number'
              ? p.totalStripsStock
              : Math.round(p.stockQuantity * stripsPerBox);
          const newTotalStrips = currentTotalStrips + stripsToAdd;
          const newBoxes = Number((newTotalStrips / stripsPerBox).toFixed(2));

          const updated = {
            ...p,
            totalStripsStock: newTotalStrips,
            stockQuantity: newBoxes,
            lastUpdated: new Date().toISOString(),
          };
          putInStore(STORES.PRODUCTS, updated);
          return updated;
        }
        return p;
      })
    );

    const returnRecords = returns.map((r) => {
      const orig = target.items.find((item) => item.productId === r.productId);
      return {
        productId: r.productId,
        productName: orig?.name || 'منتج',
        quantity: r.quantity,
        refundAmount: r.refundAmount,
        returnDate: new Date().toISOString(),
      };
    });

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId) {
          const updated: Invoice = {
            ...inv,
            status: 'returned',
            returnedItems: [...(inv.returnedItems || []), ...returnRecords],
          };
          putInStore(STORES.INVOICES, updated);
          return updated;
        }
        return inv;
      })
    );

    soundManager.playCashRegister();
    setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));
  };

  // Supplier operations
  const addSupplier = (data: Omit<Supplier, 'id' | 'purchases' | 'payments'>) => {
    const newSup: Supplier = {
      ...data,
      id: `sup-${Date.now()}`,
      purchases: [],
      payments: [],
    };
    setSuppliers((prev) => [newSup, ...prev]);
    putInStore(STORES.SUPPLIERS, newSup);
  };

  const updateSupplier = (id: string, data: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, ...data };
          putInStore(STORES.SUPPLIERS, updated);
          return updated;
        }
        return s;
      })
    );
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    deleteFromStore(STORES.SUPPLIERS, id);
  };

  const addSupplierPurchase = (
    supplierId: string,
    purchase: {
      invoiceNumber: string;
      itemsSummary: string;
      totalAmount: number;
      paidAmount: number;
      notes?: string;
    }
  ) => {
    const remaining = Math.max(0, purchase.totalAmount - purchase.paidAmount);
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === supplierId) {
          const newPurch = {
            id: `purch-${Date.now()}`,
            ...purchase,
            remainingAmount: remaining,
            date: new Date().toISOString(),
          };
          const updated = {
            ...s,
            balanceDue: s.balanceDue + remaining,
            purchases: [newPurch, ...s.purchases],
          };
          putInStore(STORES.SUPPLIERS, updated);
          return updated;
        }
        return s;
      })
    );
    soundManager.playCashRegister();
  };

  const addSupplierPayment = (
    supplierId: string,
    payment: { amount: number; notes?: string }
  ) => {
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === supplierId) {
          const newPay = {
            id: `pay-${Date.now()}`,
            ...payment,
            date: new Date().toISOString(),
          };
          const updated = {
            ...s,
            balanceDue: Math.max(0, s.balanceDue - payment.amount),
            payments: [newPay, ...s.payments],
          };
          putInStore(STORES.SUPPLIERS, updated);
          return updated;
        }
        return s;
      })
    );
    soundManager.playCashRegister();
  };

  // Customers & Installments
  const addCustomer = (custData: Omit<Customer, 'id' | 'totalPurchases' | 'totalDebts' | 'installments'>) => {
    const newCust: Customer = {
      ...custData,
      id: `cust-${Date.now()}`,
      totalPurchases: 0,
      totalDebts: 0,
      installments: [],
    };
    setCustomers((prev) => [newCust, ...prev]);
    putInStore(STORES.CUSTOMERS, newCust);
    broadcastDelta('customer', 'create', newCust);
    soundManager.playCashRegister();
    return newCust;
  };

  const updateCustomer = (id: string, data: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...data };
          putInStore(STORES.CUSTOMERS, updated);
          broadcastDelta('customer', 'update', updated);
          return updated;
        }
        return c;
      })
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    deleteFromStore(STORES.CUSTOMERS, id);
    broadcastDelta('customer', 'delete', { id });
  };

  const recordInstallmentPayment = (
    customerId: string,
    installmentId: string,
    amount: number,
    note?: string
  ) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === customerId) {
          const updatedInstallments = c.installments.map((inst) => {
            if (inst.id === installmentId) {
              const newPaid = inst.paidAmount + amount;
              const newRemaining = Math.max(0, inst.totalAmount - newPaid);
              const newStatus = (newRemaining <= 0 ? 'paid' : 'partially_paid') as 'paid' | 'partially_paid';
              return {
                ...inst,
                paidAmount: newPaid,
                remainingAmount: newRemaining,
                status: newStatus,
                payments: [
                  ...inst.payments,
                  {
                    id: `pay-${Date.now()}`,
                    date: new Date().toISOString(),
                    amount,
                    notes: note || 'سداد قسط',
                  },
                ],
              };
            }
            return inst;
          });

          const updated = {
            ...c,
            totalDebts: Math.max(0, c.totalDebts - amount),
            installments: updatedInstallments,
          };
          putInStore(STORES.CUSTOMERS, updated);
          broadcastDelta('customer', 'update', updated);
          return updated;
        }
        return c;
      })
    );
    soundManager.playCashRegister();
  };

  // Expenses
  const addExpense = (data: Omit<Expense, 'id' | 'recordedBy' | 'date'>) => {
    const newExp: Expense = {
      ...data,
      id: `exp-${Date.now()}`,
      date: new Date().toISOString(),
      recordedBy: currentUser?.name || 'المدير',
    };
    setExpenses((prev) => [newExp, ...prev]);
    putInStore(STORES.EXPENSES, newExp);
    broadcastDelta('expense', 'create', newExp);
    soundManager.playCashRegister();
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    deleteFromStore(STORES.EXPENSES, id);
    broadcastDelta('expense', 'delete', { id });
  };

  // Printing
  const printInvoice = (invoice: Invoice) => {
    setActiveReceiptInvoice(invoice);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const updateProfile = (data: StoreProfile) => {
    setProfile(data);
    setSetting('store_profile', data);
    broadcastDelta('profile', 'update', data);
    try {
      localStorage.setItem('pos_pharmacy_profile_v2', JSON.stringify(data));
    } catch {}
  };

  // JSON Database Export
  const exportDatabaseJSON = () => {
    const backupData = {
      version: '2.0',
      storageEngine: 'IndexedDB',
      exportedAt: new Date().toISOString(),
      storeProfile: profile,
      license,
      users,
      products,
      invoices,
      suppliers,
      customers,
      expenses,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_pos_indexeddb_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSON Database Import
  const importDatabaseJSON = async (jsonString: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonString);
      if (data.storeProfile) {
        setProfile(data.storeProfile);
        await setSetting('store_profile', data.storeProfile);
      }
      if (data.products && Array.isArray(data.products)) {
        setProducts(data.products);
        await clearStore(STORES.PRODUCTS);
        await bulkPutInStore(STORES.PRODUCTS, data.products);
      }
      if (data.invoices && Array.isArray(data.invoices)) {
        setInvoices(data.invoices);
        await clearStore(STORES.INVOICES);
        await bulkPutInStore(STORES.INVOICES, data.invoices);
      }
      if (data.suppliers && Array.isArray(data.suppliers)) {
        setSuppliers(data.suppliers);
        await clearStore(STORES.SUPPLIERS);
        await bulkPutInStore(STORES.SUPPLIERS, data.suppliers);
      }
      if (data.customers && Array.isArray(data.customers)) {
        setCustomers(data.customers);
        await clearStore(STORES.CUSTOMERS);
        await bulkPutInStore(STORES.CUSTOMERS, data.customers);
      }
      if (data.expenses && Array.isArray(data.expenses)) {
        setExpenses(data.expenses);
        await clearStore(STORES.EXPENSES);
        await bulkPutInStore(STORES.EXPENSES, data.expenses);
      }
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
        await clearStore(STORES.USERS);
        await bulkPutInStore(STORES.USERS, data.users);
      }
      if (data.license) {
        setLicense(data.license);
        await setSetting('store_license', data.license);
      }

      soundManager.playCashRegister();
      setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));
      return true;
    } catch (err) {
      console.error('Import error:', err);
      soundManager.playErrorBeep();
      return false;
    }
  };

  // Synchronous import medicines wrapper
  const importMedicinesJSON = (
    jsonInput: string | any,
    options: Partial<ImportMedicinesOptions> = {}
  ): ImportMedicinesSummary => {
    const { mode = 'merge', onDuplicate = 'update' } = options;
    const parsed = parseMedicinesJSON(jsonInput);

    if (parsed.validMedicines.length === 0) {
      soundManager.playErrorBeep();
      return {
        success: false,
        totalParsed: parsed.totalRawItems,
        addedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        error: parsed.errors[0] || 'لم يتم العثور على أدوية صالحة للإضافة',
      };
    }

    const timestamp = new Date().toISOString();

    if (mode === 'replace') {
      const newProductList: Product[] = parsed.validMedicines.map((item, idx) => ({
        ...item,
        id: `med-import-${Date.now()}-${idx}`,
        lastUpdated: timestamp,
      }));
      setProducts(newProductList);
      clearStore(STORES.PRODUCTS).then(() => {
        bulkPutInStore(STORES.PRODUCTS, newProductList);
      });
      soundManager.playCashRegister();
      return {
        success: true,
        totalParsed: parsed.totalRawItems,
        addedCount: newProductList.length,
        updatedCount: 0,
        skippedCount: 0,
      };
    }

    // Merge mode with high speed Map
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const existingMap = new Map<string, Product>();
    products.forEach((p) => existingMap.set(p.barcode, p));

    const updatedList = [...products];

    parsed.validMedicines.forEach((med, idx) => {
      const existing = existingMap.get(med.barcode);
      if (existing) {
        if (onDuplicate === 'skip') {
          skippedCount++;
        } else if (onDuplicate === 'update') {
          const indexInList = updatedList.findIndex((p) => p.id === existing.id);
          if (indexInList !== -1) {
            const updated = {
              ...existing,
              name: med.name || existing.name,
              activeIngredient: med.activeIngredient || existing.activeIngredient,
              category: med.category || existing.category,
              dosageForm: med.dosageForm || existing.dosageForm,
              shelfLocation: med.shelfLocation || existing.shelfLocation,
              expiryDate: med.expiryDate || existing.expiryDate,
              stripsPerBox: med.stripsPerBox || existing.stripsPerBox,
              sellingPrice: med.sellingPrice || existing.sellingPrice,
              purchasePrice: med.purchasePrice || existing.purchasePrice,
              stripPrice: med.stripPrice || existing.stripPrice,
              stripPurchasePrice: med.stripPurchasePrice || existing.stripPurchasePrice,
              totalStripsStock:
                med.totalStripsStock !== undefined ? med.totalStripsStock : existing.totalStripsStock,
              stockQuantity:
                med.stockQuantity !== undefined ? med.stockQuantity : existing.stockQuantity,
              minStockAlert:
                med.minStockAlert !== undefined ? med.minStockAlert : existing.minStockAlert,
              unit: med.unit || existing.unit,
              lastUpdated: timestamp,
            };
            updatedList[indexInList] = updated;
            updatedCount++;
          }
        } else if (onDuplicate === 'create_new') {
          const randomSuffix = Math.floor(100000000 + Math.random() * 900000000).toString();
          const newBarcode = `622${randomSuffix.slice(0, 9)}`;
          const brandNewProduct: Product = {
            ...med,
            barcode: newBarcode,
            id: `med-import-${Date.now()}-${idx}`,
            lastUpdated: timestamp,
          };
          updatedList.unshift(brandNewProduct);
          existingMap.set(newBarcode, brandNewProduct);
          addedCount++;
        }
      } else {
        const brandNewProduct: Product = {
          ...med,
          id: `med-import-${Date.now()}-${idx}`,
          lastUpdated: timestamp,
        };
        updatedList.unshift(brandNewProduct);
        existingMap.set(med.barcode, brandNewProduct);
        addedCount++;
      }
    });

    setProducts(updatedList);
    bulkPutInStore(STORES.PRODUCTS, updatedList);
    soundManager.playCashRegister();

    return {
      success: true,
      totalParsed: parsed.totalRawItems,
      addedCount,
      updatedCount,
      skippedCount,
    };
  };

  // Ultra-fast Asynchronous Bulk JSON Import for tens of thousands of medicines
  const importMedicinesJSONAsync = async (
    jsonInput: string | any,
    options: Partial<ImportMedicinesOptions> = {},
    onProgress?: (processed: number, total: number, phase: string) => void
  ): Promise<ImportMedicinesSummary> => {
    const { mode = 'merge', onDuplicate = 'update' } = options;

    if (onProgress) onProgress(0, 100, 'تحليل وفك تشفير ملف الأدوية...');
    const parsed = await parseMedicinesJSONAsync(jsonInput, (processed, total) => {
      if (onProgress) onProgress(processed, total, `قراءة وتحليل ${processed} من ${total} دواء...`);
    });

    if (parsed.validMedicines.length === 0) {
      soundManager.playErrorBeep();
      return {
        success: false,
        totalParsed: parsed.totalRawItems,
        addedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        error: parsed.errors[0] || 'لم يتم العثور على أدوية صالحة للإضافة',
      };
    }

    const timestamp = new Date().toISOString();
    const totalItems = parsed.validMedicines.length;

    if (mode === 'replace') {
      if (onProgress) onProgress(0, totalItems, 'جاري تحضير الأدوية للتخزين السريع...');
      const newProductList: Product[] = parsed.validMedicines.map((item, idx) => ({
        ...item,
        id: `med-import-${Date.now()}-${idx}`,
        lastUpdated: timestamp,
      }));

      if (onProgress) onProgress(0, totalItems, 'جاري حفظ الأدوية في IndexedDB بسرعة فائقة...');
      await clearStore(STORES.PRODUCTS);
      await bulkPutInStore(STORES.PRODUCTS, newProductList, 1000, (proc, tot) => {
        if (onProgress) onProgress(proc, tot, `تم حفظ ${proc} من ${tot} دواء في قاعدة البيانات...`);
      });

      setProducts(newProductList);
      soundManager.playCashRegister();
      setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));

      return {
        success: true,
        totalParsed: parsed.totalRawItems,
        addedCount: newProductList.length,
        updatedCount: 0,
        skippedCount: 0,
      };
    }

    // High-performance Merge
    if (onProgress) onProgress(0, totalItems, 'مطابقة الباركود وحساب الشرايط...');

    const existingMap = new Map<string, Product>();
    const existingIndexMap = new Map<string, number>();
    products.forEach((p, index) => {
      existingMap.set(p.barcode, p);
      existingIndexMap.set(p.id, index);
    });

    const updatedList = [...products];
    const itemsToSaveToDb: Product[] = [];
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < parsed.validMedicines.length; i++) {
      const med = parsed.validMedicines[i];
      const existing = existingMap.get(med.barcode);

      if (existing) {
        if (onDuplicate === 'skip') {
          skippedCount++;
        } else if (onDuplicate === 'update') {
          const idx = existingIndexMap.get(existing.id);
          if (idx !== undefined && idx >= 0 && idx < updatedList.length) {
            const updated: Product = {
              ...existing,
              name: med.name || existing.name,
              activeIngredient: med.activeIngredient || existing.activeIngredient,
              category: med.category || existing.category,
              dosageForm: med.dosageForm || existing.dosageForm,
              shelfLocation: med.shelfLocation || existing.shelfLocation,
              expiryDate: med.expiryDate || existing.expiryDate,
              stripsPerBox: med.stripsPerBox || existing.stripsPerBox,
              sellingPrice: med.sellingPrice || existing.sellingPrice,
              purchasePrice: med.purchasePrice || existing.purchasePrice,
              stripPrice: med.stripPrice || existing.stripPrice,
              stripPurchasePrice: med.stripPurchasePrice || existing.stripPurchasePrice,
              totalStripsStock:
                med.totalStripsStock !== undefined ? med.totalStripsStock : existing.totalStripsStock,
              stockQuantity:
                med.stockQuantity !== undefined ? med.stockQuantity : existing.stockQuantity,
              minStockAlert:
                med.minStockAlert !== undefined ? med.minStockAlert : existing.minStockAlert,
              unit: med.unit || existing.unit,
              lastUpdated: timestamp,
            };
            updatedList[idx] = updated;
            itemsToSaveToDb.push(updated);
            updatedCount++;
          }
        } else if (onDuplicate === 'create_new') {
          const randomSuffix = Math.floor(100000000 + Math.random() * 900000000).toString();
          const newBarcode = `622${randomSuffix.slice(0, 9)}`;
          const brandNewProduct: Product = {
            ...med,
            barcode: newBarcode,
            id: `med-import-${Date.now()}-${i}`,
            lastUpdated: timestamp,
          };
          updatedList.unshift(brandNewProduct);
          existingMap.set(newBarcode, brandNewProduct);
          itemsToSaveToDb.push(brandNewProduct);
          addedCount++;
        }
      } else {
        const brandNewProduct: Product = {
          ...med,
          id: `med-import-${Date.now()}-${i}`,
          lastUpdated: timestamp,
        };
        updatedList.unshift(brandNewProduct);
        existingMap.set(med.barcode, brandNewProduct);
        itemsToSaveToDb.push(brandNewProduct);
        addedCount++;
      }

      if (i % 2000 === 0 && onProgress) {
        onProgress(i, totalItems, `معالجة ${i} من ${totalItems} دواء...`);
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    if (onProgress) onProgress(0, itemsToSaveToDb.length, 'جاري الحفظ في IndexedDB...');
    await bulkPutInStore(STORES.PRODUCTS, itemsToSaveToDb, 1000, (proc, tot) => {
      if (onProgress) onProgress(proc, tot, `تم حفظ ${proc} من ${tot} دواء في قاعدة البيانات...`);
    });

    setProducts(updatedList);
    soundManager.playCashRegister();
    setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));

    return {
      success: true,
      totalParsed: parsed.totalRawItems,
      addedCount,
      updatedCount,
      skippedCount,
    };
  };

  // Export medicines
  const exportMedicinesJSON = () => {
    const exportData = products.map((p) => ({
      name: p.name,
      activeIngredient: p.activeIngredient || '',
      barcode: p.barcode,
      category: p.category,
      dosageForm: p.dosageForm || 'أقراص',
      shelfLocation: p.shelfLocation || '',
      expiryDate: p.expiryDate || '',
      stripsPerBox: p.stripsPerBox,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      stripPrice: p.stripPrice,
      stockQuantity: p.stockQuantity,
      totalStripsStock: p.totalStripsStock,
      minStockAlert: p.minStockAlert,
      unit: p.unit,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `أدوية_الصيدلية_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetToDefaultData = async () => {
    await clearStore(STORES.PRODUCTS);
    await clearStore(STORES.INVOICES);
    await clearStore(STORES.SUPPLIERS);
    await clearStore(STORES.CUSTOMERS);
    await clearStore(STORES.EXPENSES);

    await bulkPutInStore(STORES.PRODUCTS, DEFAULT_PRODUCTS);
    await bulkPutInStore(STORES.SUPPLIERS, DEFAULT_SUPPLIERS);
    await bulkPutInStore(STORES.CUSTOMERS, DEFAULT_CUSTOMERS);
    await bulkPutInStore(STORES.EXPENSES, DEFAULT_EXPENSES);

    setProducts(DEFAULT_PRODUCTS);
    setSuppliers(DEFAULT_SUPPLIERS);
    setCustomers(DEFAULT_CUSTOMERS);
    setExpenses(DEFAULT_EXPENSES);
    setInvoices([]);
    setCart([]);
    setSetting('active_cart', []);
    setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));
  };

  const downloadOfflineHtmlBundle = () => {
    generateOfflineHtmlBundle({
      profile,
      license,
      users,
      products,
      invoices,
      suppliers,
      customers,
      expenses,
    });
    soundManager.playCashRegister();
  };

  const forceSaveAllToLocalStorage = () => {
    bulkPutInStore(STORES.PRODUCTS, products);
    bulkPutInStore(STORES.INVOICES, invoices);
    bulkPutInStore(STORES.SUPPLIERS, suppliers);
    bulkPutInStore(STORES.CUSTOMERS, customers);
    bulkPutInStore(STORES.EXPENSES, expenses);
    setSetting('store_profile', profile);
    setSetting('store_license', license);
    setLastSavedAt(new Date().toLocaleTimeString('ar-EG'));
  };

  return (
    <StoreContext.Provider
      value={{
        isDbReady,
        dbEngine: 'indexedDB',
        profile,
        updateProfile,
        license,
        daysRemaining,
        remainingTime,
        isTrialExpired,
        activateSystem,
        currentUser,
        users,
        login,
        logout,
        addUser,
        deleteUser,
        toggleUserStatus,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        quickAdjustStock,
        barcodeMap,
        cart,
        addToCart,
        scanBarcode,
        updateCartQty,
        updateCartDiscount,
        removeFromCart,
        toggleCartSaleUnit,
        clearCart,
        invoices,
        createInvoice,
        deleteInvoice,
        returnInvoiceItems,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addSupplierPurchase,
        addSupplierPayment,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        recordInstallmentPayment,
        expenses,
        addExpense,
        deleteExpense,
        activeReceiptInvoice,
        setActiveReceiptInvoice,
        printInvoice,
        exportDatabaseJSON,
        importDatabaseJSON,
        importMedicinesJSON,
        importMedicinesJSONAsync,
        exportMedicinesJSON,
        resetToDefaultData,
        downloadOfflineHtmlBundle,
        lastSavedAt,
        forceSaveAllToLocalStorage,
        // Cloud & Multi-Device Sync
        syncConfig,
        syncStats,
        isSyncing,
        updateSyncConfig,
        triggerManualSync,
        triggerFullCloudBackup,
        triggerFullCloudRestore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
