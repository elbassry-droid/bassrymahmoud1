import { Product } from '../types';
import { calculateStripPrice } from './pharmacy';

export interface ParsedMedicineResult {
  validMedicines: Omit<Product, 'id' | 'lastUpdated'>[];
  errors: string[];
  totalRawItems: number;
}

export interface ImportMedicinesOptions {
  mode: 'merge' | 'replace';
  onDuplicate: 'update' | 'skip' | 'create_new';
  defaultStock?: number;
}

export interface ImportMedicinesSummary {
  success: boolean;
  totalParsed: number;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  error?: string;
}

/**
 * High-speed helper to extract field value using pre-computed key list.
 */
function getFastField<T = any>(obj: any, keys: string[], defaultValue: T): T {
  if (!obj || typeof obj !== 'object') return defaultValue;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const val = obj[k];
    if (val !== undefined && val !== null && val !== '') {
      return val as T;
    }
  }
  // Case-insensitive fallback
  const objKeys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const lowerKey = keys[i].toLowerCase();
    for (let j = 0; j < objKeys.length; j++) {
      const objKey = objKeys[j];
      if (objKey.toLowerCase() === lowerKey) {
        const val = obj[objKey];
        if (val !== undefined && val !== null && val !== '') {
          return val as T;
        }
      }
    }
  }
  return defaultValue;
}

const NAME_KEYS = [
  'name', 'trade_name', 'tradeName', 'brand_name', 'brandName', 'drug_name', 'drugName',
  'medicine_name', 'medicineName', 'product_name', 'title', 'الاسم', 'اسم_الدواء',
  'اسم_الصنف', 'اسم_العلاج', 'الاسم_التجاري', 'اسم', 'item_name'
];

const INGREDIENT_KEYS = [
  'activeIngredient', 'active_ingredient', 'generic_name', 'genericName', 'active_substance',
  'scientific_name', 'المادة_الفعالة', 'الاسم_العلمي', 'مادة_فعالة', 'الماده_الفعاله'
];

const BARCODE_KEYS = [
  'barcode', 'code', 'bar_code', 'upc', 'ean', 'international_barcode', 'باركود', 'كود', 'كود_الصنف', 'الباركود'
];

const CATEGORY_KEYS = [
  'category', 'classification', 'group', 'section', 'قسم', 'التصنيف', 'تصنيف', 'المجموعة', 'القسم'
];

const DOSAGE_KEYS = [
  'dosageForm', 'dosage_form', 'form', 'type', 'الشكل_الدوائي', 'الشكل', 'النوع'
];

const LOCATION_KEYS = [
  'shelfLocation', 'shelf_location', 'shelf', 'location', 'drawer', 'الرف', 'مكان_الرف', 'المكان'
];

const EXPIRY_KEYS = [
  'expiryDate', 'expiry_date', 'expiry', 'exp_date', 'الصلاحية', 'تاريخ_الصلاحية', 'انتهاء_الصلاحية', 'تاريخ_الانتهاء'
];

const STRIPS_KEYS = [
  'stripsPerBox', 'strips_per_box', 'strips', 'number_of_strips', 'عدد_الشرايط', 'عدد_الشرائط', 'شرايط', 'الشرائط'
];

const SELLING_KEYS = [
  'sellingPrice', 'selling_price', 'price', 'public_price', 'sale_price', 'retail_price',
  'سعر_البيع', 'سعر_الجمهور', 'السعر', 'سعر'
];

const PURCHASE_KEYS = [
  'purchasePrice', 'purchase_price', 'cost', 'buy_price', 'pharmacy_price', 'cost_price',
  'سعر_الشراء', 'سعر_الصيدلي', 'التكلفة', 'تكلفة'
];

const STOCK_KEYS = [
  'stockQuantity', 'stock_quantity', 'stock', 'quantity', 'boxes', 'qty', 'الكمية', 'الرصيد', 'عدد_العلب', 'رصيد_العلب'
];

const TOTAL_STRIPS_KEYS = [
  'totalStripsStock', 'total_strips_stock', 'total_strips', 'totalStrips', 'إجمالي_الشرايط', 'شرايط_المخزن'
];

const MIN_ALERT_KEYS = [
  'minStockAlert', 'min_stock_alert', 'min_stock', 'alert_limit', 'حد_الطلب', 'حد_النواقص', 'تنبيه_النواقص'
];

const UNIT_KEYS = [
  'unit', 'الوحدة', 'وحدة_القياس'
];

/**
 * Converts a raw JS item into a clean Product structure.
 */
export function normalizeSingleMedicine(raw: any, index: number, usedBarcodes: Set<string>): { medicine?: Omit<Product, 'id' | 'lastUpdated'>; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: `العنصر رقم ${index + 1} ليس كائناً صحيحاً` };
  }

  const name = String(getFastField(raw, NAME_KEYS, '')).trim();
  if (!name) {
    return { error: `العنصر رقم ${index + 1} تم تخطيه لعدم وجود اسم للدواء` };
  }

  const activeIngredient = String(getFastField(raw, INGREDIENT_KEYS, '')).trim();

  let rawBarcode = String(getFastField(raw, BARCODE_KEYS, '')).trim();
  if (!rawBarcode || usedBarcodes.has(rawBarcode)) {
    const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
    rawBarcode = `622${randomPart.slice(0, 9)}`;
  }
  usedBarcodes.add(rawBarcode);

  const category = String(getFastField(raw, CATEGORY_KEYS, 'أقراص وكبسولات')).trim() || 'أقراص وكبسولات';
  const dosageForm = String(getFastField(raw, DOSAGE_KEYS, 'أقراص')).trim() || 'أقراص';
  const shelfLocation = String(getFastField(raw, LOCATION_KEYS, '')).trim();
  const expiryDate = String(getFastField(raw, EXPIRY_KEYS, '2028-12')).trim();

  const stripsRaw = Number(getFastField(raw, STRIPS_KEYS, 1));
  const stripsPerBox = Number.isFinite(stripsRaw) && stripsRaw >= 1 ? Math.floor(stripsRaw) : 1;

  const sellingPriceRaw = Number(getFastField(raw, SELLING_KEYS, 0));
  const sellingPrice = Number.isFinite(sellingPriceRaw) && sellingPriceRaw >= 0 ? Math.round(sellingPriceRaw * 100) / 100 : 0;

  let purchasePriceRaw = Number(getFastField(raw, PURCHASE_KEYS, -1));
  if (!Number.isFinite(purchasePriceRaw) || purchasePriceRaw < 0) {
    purchasePriceRaw = Math.round(sellingPrice * 0.75 * 100) / 100;
  }
  const purchasePrice = purchasePriceRaw;

  const autoStripPrice = calculateStripPrice(sellingPrice, stripsPerBox);
  const stripPriceRaw = Number(getFastField(raw, ['stripPrice', 'strip_price', 'سعر_الشريط', 'سعر_بيع_الشريط'], autoStripPrice));
  const stripPrice = Number.isFinite(stripPriceRaw) && stripPriceRaw > 0 ? Math.round(stripPriceRaw * 100) / 100 : autoStripPrice;

  const autoStripPurchasePrice = calculateStripPrice(purchasePrice, stripsPerBox);
  const stripPurchasePriceRaw = Number(getFastField(raw, ['stripPurchasePrice', 'strip_purchase_price', 'سعر_شراء_الشريط', 'تكلفة_الشريط'], autoStripPurchasePrice));
  const stripPurchasePrice = Number.isFinite(stripPurchasePriceRaw) && stripPurchasePriceRaw > 0 ? Math.round(stripPurchasePriceRaw * 100) / 100 : autoStripPurchasePrice;

  const stockQtyRaw = Number(getFastField(raw, STOCK_KEYS, 10));
  const stockQuantity = Number.isFinite(stockQtyRaw) && stockQtyRaw >= 0 ? stockQtyRaw : 10;

  const totalStripsRaw = Number(getFastField(raw, TOTAL_STRIPS_KEYS, Math.round(stockQuantity * stripsPerBox)));
  const totalStripsStock = Number.isFinite(totalStripsRaw) && totalStripsRaw >= 0 ? totalStripsRaw : Math.round(stockQuantity * stripsPerBox);

  const minAlertRaw = Number(getFastField(raw, MIN_ALERT_KEYS, 5));
  const minStockAlert = Number.isFinite(minAlertRaw) && minAlertRaw >= 0 ? minAlertRaw : 5;

  const unit = String(getFastField(raw, UNIT_KEYS, stripsPerBox > 1 ? 'علبة' : 'عبوة')).trim() || 'علبة';

  return {
    medicine: {
      name,
      activeIngredient,
      barcode: rawBarcode,
      category,
      dosageForm,
      shelfLocation,
      expiryDate,
      stripsPerBox,
      purchasePrice,
      sellingPrice,
      stripPrice,
      stripPurchasePrice,
      stockQuantity: Number((totalStripsStock / stripsPerBox).toFixed(2)),
      totalStripsStock,
      minStockAlert,
      unit,
    },
  };
}

/**
 * Extracts the raw items array from any JSON payload structure.
 */
function extractRawItems(input: string | any): { items: any[]; error?: string } {
  try {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    if (Array.isArray(data)) {
      return { items: data };
    }
    if (data && typeof data === 'object') {
      const candidates = [
        'medicines', 'products', 'items', 'data', 'drugs', 'الأدوية', 'الادوية', 'أدوية', 'ادوية', 'results', 'list'
      ];
      for (const k of candidates) {
        if (Array.isArray(data[k])) return { items: data[k] };
      }
      const values = Object.values(data);
      if (values.length > 0 && typeof values[0] === 'object' && (values[0] as any).name) {
        return { items: values };
      }
      return { items: [], error: 'لم يتم العثور على مصفوفة أدوية صالحة داخل ملف JSON.' };
    }
    return { items: [], error: 'تنسيق ملف JSON غير صحيح' };
  } catch (err: any) {
    return { items: [], error: `خطأ أثناء قراءة ملف JSON: ${err?.message || 'تنسيق غير سليم'}` };
  }
}

/**
 * Synchronous parser for fast execution of regular/medium lists.
 */
export function parseMedicinesJSON(input: string | any): ParsedMedicineResult {
  const { items, error } = extractRawItems(input);
  if (error) {
    return { validMedicines: [], errors: [error], totalRawItems: 0 };
  }

  const validMedicines: Omit<Product, 'id' | 'lastUpdated'>[] = [];
  const errors: string[] = [];
  const usedBarcodes = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const res = normalizeSingleMedicine(items[i], i, usedBarcodes);
    if (res.medicine) {
      validMedicines.push(res.medicine);
    } else if (res.error) {
      errors.push(res.error);
    }
  }

  return {
    validMedicines,
    errors,
    totalRawItems: items.length,
  };
}

/**
 * High-speed Chunked Asynchronous Parser for massive datasets (10,000+ medicines).
 * Non-blocking, yields execution to ensure smooth 60fps UI and live progress bar updates.
 */
export async function parseMedicinesJSONAsync(
  input: string | any,
  onProgress?: (processed: number, total: number) => void
): Promise<ParsedMedicineResult> {
  const { items, error } = extractRawItems(input);
  if (error) {
    return { validMedicines: [], errors: [error], totalRawItems: 0 };
  }

  const total = items.length;
  const validMedicines: Omit<Product, 'id' | 'lastUpdated'>[] = [];
  const errors: string[] = [];
  const usedBarcodes = new Set<string>();

  const CHUNK_SIZE = 1500;

  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, total);
    for (let j = i; j < end; j++) {
      const res = normalizeSingleMedicine(items[j], j, usedBarcodes);
      if (res.medicine) {
        validMedicines.push(res.medicine);
      } else if (res.error) {
        errors.push(res.error);
      }
    }

    if (onProgress) {
      onProgress(end, total);
    }

    // Yield control so browser doesn't freeze
    if (end < total) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return {
    validMedicines,
    errors,
    totalRawItems: total,
  };
}

/**
 * Sample realistic medicines dataset
 */
export function getSampleMedicinesJSON(): string {
  const sample = [
    {
      name: "ألفينترن أقراص لعلاج التورم والالتهابات (Alphintern)",
      activeIngredient: "Chymotrypsin & Trypsin (كيموتربسين + تربسين)",
      barcode: "622100200101",
      category: "فوار ومسكنات",
      dosageForm: "أقراص مغلفة",
      shelfLocation: "A-01",
      expiryDate: "2027-12",
      stripsPerBox: 3,
      purchasePrice: 380,
      sellingPrice: 500,
      stripPrice: 166.67,
      stockQuantity: 15,
      minStockAlert: 5,
      unit: "علبة"
    },
    {
      name: "أوجمنتين 1 جم أقراص مضاد حيوي (Augmentin 1g)",
      activeIngredient: "Amoxicillin + Clavulanic Acid (أموكسيسيلين + كلافولانيك)",
      barcode: "622100200102",
      category: "مضادات حيوية",
      dosageForm: "أقراص مغلفة",
      shelfLocation: "A-03",
      expiryDate: "2027-08",
      stripsPerBox: 2,
      purchasePrice: 98,
      sellingPrice: 130,
      stripPrice: 65,
      stockQuantity: 20,
      minStockAlert: 6,
      unit: "علبة"
    },
    {
      name: "بانادول إكسترا أحمر مسكن وخافض حرارة (Panadol Extra)",
      activeIngredient: "Paracetamol 500mg + Caffeine 65mg (باراسيتامول + كافيين)",
      barcode: "622100200103",
      category: "فوار ومسكنات",
      dosageForm: "أقراص",
      shelfLocation: "A-05",
      expiryDate: "2028-01",
      stripsPerBox: 2,
      purchasePrice: 45,
      sellingPrice: 60,
      stripPrice: 30,
      stockQuantity: 30,
      minStockAlert: 10,
      unit: "علبة"
    },
    {
      name: "كونجستال أقراص للبرد والإنفلونزا (Congestal)",
      activeIngredient: "Paracetamol + Pseudoephedrine + Chlorpheniramine",
      barcode: "622100200104",
      category: "فوار ومسكنات",
      dosageForm: "أقراص",
      shelfLocation: "B-02",
      expiryDate: "2027-11",
      stripsPerBox: 2,
      purchasePrice: 28,
      sellingPrice: 40,
      stripPrice: 20,
      stockQuantity: 25,
      minStockAlert: 8,
      unit: "علبة"
    },
    {
      name: "أنتينال 200 مجم كبسول مطهر معوي (Antinal)",
      activeIngredient: "Nifuroxazide 200mg (نيفوروكسازيد)",
      barcode: "622100200105",
      category: "أقراص وكبسولات",
      dosageForm: "كبسولات",
      shelfLocation: "B-04",
      expiryDate: "2027-09",
      stripsPerBox: 2,
      purchasePrice: 32,
      sellingPrice: 42,
      stripPrice: 21,
      stockQuantity: 18,
      minStockAlert: 5,
      unit: "علبة"
    },
    {
      name: "كتافلام 50 مجم مسكن سريع للأسنان والعظام (Cataflam 50mg)",
      activeIngredient: "Diclofenac Potassium 50mg (ديكلوفيناك بوتاسيوم)",
      barcode: "622100200106",
      category: "فوار ومسكنات",
      dosageForm: "أقراص",
      shelfLocation: "A-04",
      expiryDate: "2028-03",
      stripsPerBox: 2,
      purchasePrice: 52,
      sellingPrice: 70,
      stripPrice: 35,
      stockQuantity: 24,
      minStockAlert: 6,
      unit: "علبة"
    },
    {
      name: "أوميجا 3 بلس كبسول جيلاتيني رخو (Omega 3 Plus)",
      activeIngredient: "Fish Oil 1000mg + Wheat Germ Oil 100mg",
      barcode: "622100200107",
      category: "فيتامينات ومكملات",
      dosageForm: "كبسولات رخوة",
      shelfLocation: "C-01",
      expiryDate: "2027-10",
      stripsPerBox: 3,
      purchasePrice: 90,
      sellingPrice: 120,
      stripPrice: 40,
      stockQuantity: 15,
      minStockAlert: 4,
      unit: "علبة"
    },
    {
      name: "توسكان شراب 100 مل للكحة والبلغم (Tusskan Syrup)",
      activeIngredient: "Dextromethorphan + Guaifenesin + Diphenhydramine",
      barcode: "622100200108",
      category: "أشربة ونقط",
      dosageForm: "شراب",
      shelfLocation: "D-02",
      expiryDate: "2027-05",
      stripsPerBox: 1,
      purchasePrice: 22,
      sellingPrice: 28,
      stripPrice: 28,
      stockQuantity: 16,
      minStockAlert: 5,
      unit: "زجاجة"
    },
    {
      name: "كريم كيناكومب 30 جم للالتهابات والتسلخات (Kenacomb)",
      activeIngredient: "Triamcinolone + Neomycin + Gramicidin + Nystatin",
      barcode: "622100200109",
      category: "مراهم وكريمات",
      dosageForm: "كريم موضعي",
      shelfLocation: "E-01",
      expiryDate: "2028-06",
      stripsPerBox: 1,
      purchasePrice: 34,
      sellingPrice: 45,
      stripPrice: 45,
      stockQuantity: 22,
      minStockAlert: 5,
      unit: "أنبوبة"
    },
    {
      name: "حقن فولتارين 75 مجم / 3 مل مسكن (Voltaren Ampoules)",
      activeIngredient: "Diclofenac Sodium 75mg/3ml (ديكلوفيناك صوديوم)",
      barcode: "622100200110",
      category: "حقن وأمبولات",
      dosageForm: "أمبولات عضلية",
      shelfLocation: "F-01",
      expiryDate: "2027-07",
      stripsPerBox: 6,
      purchasePrice: 72,
      sellingPrice: 96,
      stripPrice: 16,
      stockQuantity: 10,
      minStockAlert: 3,
      unit: "علبة"
    }
  ];

  return JSON.stringify(sample, null, 2);
}
