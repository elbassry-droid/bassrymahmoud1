export interface StoreProfile {
  name: string;
  storeType: string; // 'سوبر ماركت' | 'مكتبة' | 'محل ملابس' | 'إلكترونيات' | 'شركة' | 'أخرى'
  phone: string;
  address: string;
  currency: string;
  logoUrl?: string;
  receiptFooterNote: string;
  taxPercentage: number;
  printerWidth: '80mm' | '58mm';
  createdAt: string;
}

export interface LicenseState {
  isActivated: boolean;
  activationDate?: string;
  trialStartDate: string;
  trialDays: number; // 5 days
}

export interface TrialRemainingTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalHours: number;
  formatted: string;
}

export interface UserAccount {
  id: string;
  username: string;
  password: string; // masked in UI
  name: string;
  role: 'admin' | 'cashier';
  createdAt: string;
  active: boolean;
}

export interface Product {
  id: string;
  barcode: string;
  name: string; // اسم الدواء التجاري (Brand Name)
  activeIngredient?: string; // المادة الفعالة / الاسم العلمي (Active Ingredient)
  category: string; // أقراص وكبسولات، أشربة ونقط، حقن وأمبولات، الخ
  dosageForm?: string; // أقراص، كبسولات، شراب، أمبول، مرهم، نقط، فوار
  shelfLocation?: string; // مكان الرف أو الدرج بالصيدلية (مثال: A-3)
  expiryDate?: string; // تاريخ انتهاء الصلاحية (YYYY-MM أو YYYY-MM-DD)
  
  // Strip & Box calculations (حسبة العلبة والشريط)
  stripsPerBox: number; // عدد الشرايط في العلبة (مثال: 3 شرايط)
  purchasePrice: number; // سعر شراء العلبة (مثال: 360 ج.م)
  sellingPrice: number; // سعر بيع العلبة (مثال: 500 ج.م)
  stripPrice: number; // سعر بيع الشريط = سعر العلبة ÷ عدد الشرايط (مثال: 500 / 3 = 166.67)
  stripPurchasePrice: number; // سعر شراء الشريط = سعر شراء العلبة ÷ عدد الشرايط
  
  // Stock tracking (بالشريط والعلبة)
  totalStripsStock: number; // إجمالي الرصيد بالشريط
  stockQuantity: number; // إجمالي الرصيد بالعلب (totalStripsStock / stripsPerBox)
  minStockAlert: number; // حد التنبيه بالنواقص (بالعلب)
  unit: string; // 'علبة' | 'شريط' | 'زجاجة' | 'أمبول' | 'أنبوبة'
  lastUpdated: string;
}

export interface CartItem {
  id: string; // composite key: `${product.id}-${saleUnit}`
  product: Product;
  saleUnit: 'box' | 'strip'; // بيع علبة كاملة أو شريط واحد
  unitLabel: string; // 'علبة' أو 'شريط'
  quantity: number;
  unitPrice: number; // sellingPrice أو stripPrice
  discount: number;
  total: number;
}

export interface InvoiceItem {
  productId: string;
  barcode: string;
  name: string;
  saleUnit: 'box' | 'strip';
  unitLabel: string;
  stripsPerBox: number;
  unitPrice: number;
  quantity: number;
  discount: number;
  total: number;
  purchasePrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  cashierId: string;
  cashierName: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  // Delivery feature
  hasDelivery: boolean;
  deliveryFee: number;
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryNotes?: string;
  // Totals & Payment
  total: number;
  paymentMethod: 'cash' | 'card' | 'installment';
  // Installment feature
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  paidAmount: number;
  remainingAmount: number;
  // Status
  status: 'completed' | 'returned' | 'partial_returned';
  returnedItems?: {
    productId: string;
    productName: string;
    quantity: number;
    refundAmount: number;
    returnDate: string;
  }[];
}

export interface CustomerInstallment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: string;
  status: 'pending' | 'partially_paid' | 'paid';
  payments: {
    id: string;
    date: string;
    amount: number;
    notes?: string;
  }[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  nationalId?: string;
  totalPurchases: number;
  totalDebts: number;
  notes?: string;
  installments: CustomerInstallment[];
}

export interface SupplierPayment {
  id: string;
  date: string;
  amount: number;
  notes?: string;
}

export interface SupplierPurchase {
  id: string;
  invoiceNumber: string;
  date: string;
  itemsSummary: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  address?: string;
  balanceDue: number; // المبالغ التي يجب أن تدفع للمورد
  notes?: string;
  purchases: SupplierPurchase[];
  payments: SupplierPayment[];
}

export interface Expense {
  id: string;
  title: string;
  category: 'إيجار' | 'كهرباء وفواتير' | 'مرتبات' | 'نثريات وبوفيه' | 'صيانة' | 'نقل وبضاعة' | 'أخرى';
  amount: number;
  date: string;
  notes?: string;
  recordedBy: string;
}
