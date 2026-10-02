import { Product } from '../types';
import { calculateStripPrice } from './pharmacy';
import {
  saveDrugEyeMasterToDB,
  getDrugEyeMasterFromDB,
  searchLocalDrugEyeMaster,
  getSetting,
  StoredDrugEyeMedicine,
} from '../db/indexedDB';
import { getSyncApiBase } from './cloudSync';

export interface DrugEyeMedicine {
  name: string;
  price: number;
  activeIngredient: string;
  category: string;
  company: string;
  stripsPerBox: number;
  dosageForm: string;
  rawBarcode?: string;
}

export interface DrugEyeSearchResult {
  success: boolean;
  query: string;
  count: number;
  medicines: DrugEyeMedicine[];
  source?: string;
  error?: string;
  timestamp?: string;
  isOffline?: boolean;
}

export interface DrugEyeSyncUpdate {
  originalName: string;
  barcode?: string;
  matchedDrugEyeName: string;
  currentPrice?: number;
  officialPrice: number;
  priceChanged: boolean;
  activeIngredient: string;
  category: string;
  company: string;
  stripsPerBox: number;
}

export interface DrugEyeSyncResult {
  success: boolean;
  totalChecked: number;
  updatesFound: number;
  priceChangesCount: number;
  updates: DrugEyeSyncUpdate[];
  timestamp?: string;
  error?: string;
}

export interface DrugEyeSettings {
  autoSyncOnStartup: boolean;
  syncInterval: 'never' | 'startup' | 'daily' | 'weekly';
  autoUpdatePrices: boolean;
  autoFillActiveIngredients: boolean;
  lastSyncTimestamp?: string;
  lastSyncChangesCount?: number;
}

export const DEFAULT_DRUGEYE_SETTINGS: DrugEyeSettings = {
  autoSyncOnStartup: true,
  syncInterval: 'daily',
  autoUpdatePrices: false,
  autoFillActiveIngredients: true,
};

const DRUGEYE_TARGET_URL =
  'https://drugeye.pharorg.com/drugeyeapp/android-search/drugeye-android-live-go.aspx';

/**
 * Top Egyptian core brand and active ingredient search roots to download comprehensive catalog
 */
export const POPULAR_EGYPTIAN_DRUG_QUERIES = [
  'panadol',
  'augmentin',
  'alphintern',
  'congestal',
  'cataflam',
  'voltaren',
  'brufen',
  'antinal',
  'omeprazole',
  'flagyl',
  'amaryl',
  'concor',
  'ketofan',
  'otrivin',
  'telfast',
  'curam',
  'hibiotic',
  'novaldol',
  'aspocid',
  'spasmo',
  'celebrex',
  'glucophage',
  'januvia',
  'nexium',
  'lipitor',
  'crestor',
  'zithromax',
  'cipro',
  'cefotax',
  'rocephin',
  'unasyn',
  'dalacin',
  'klacid',
  'erythrocin',
  'megamox',
  'ketolac',
  'c-retard',
  'fludrex',
  'comtrex',
  '1,2,3',
  'atarax',
  'motilium',
  'gaviscon',
  'zantac',
  'plavix',
  'clexane',
  'daflon',
  'lasix',
  'aldactone',
  'capoten',
  'amoclan',
  'duricef',
  'suprax',
  'zovirax',
];

/**
 * Embedded comprehensive Egyptian Pharmacopeia & DrugEye offline dataset
 */
export const EMBEDDED_EGYPTIAN_DRUGS: DrugEyeMedicine[] = [
  {
    name: 'PANADOL EXTRA 24 TABS',
    price: 68.0,
    activeIngredient: 'PARACETAMOL 500mg + CAFFEINE 65mg',
    category: 'مسكنات وخافض حرارة',
    company: 'GLAXOSMITHKLINE (GSK)',
    stripsPerBox: 2,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'PANADOL ADVANCE 24 TABS',
    price: 48.0,
    activeIngredient: 'PARACETAMOL 500mg (Optizorb)',
    category: 'مسكنات وخافض حرارة',
    company: 'GLAXOSMITHKLINE (GSK)',
    stripsPerBox: 2,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'PANADOL COLD + FLU ALL IN ONE 24 TABS',
    price: 75.0,
    activeIngredient: 'PARACETAMOL + PHENYLEPHRINE + GUAIFENESIN',
    category: 'أدوية البرد والإنفلونزا',
    company: 'GLAXOSMITHKLINE (GSK)',
    stripsPerBox: 2,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'PANADOL COLD + FLU DAY 24 TABS',
    price: 65.0,
    activeIngredient: 'PARACETAMOL 500mg + CAFFEINE + PHENYLEPHRINE',
    category: 'أدوية البرد والإنفلونزا',
    company: 'GLAXOSMITHKLINE (GSK)',
    stripsPerBox: 2,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'PANADOL NIGHT 24 TABS',
    price: 65.0,
    activeIngredient: 'PARACETAMOL 500mg + DIPHENHYDRAMINE 25mg',
    category: 'مسكنات ومنومات للبرد',
    company: 'GLAXOSMITHKLINE (GSK)',
    stripsPerBox: 2,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'PANADOL JOINT 18 EXTENDED RELEASE TABS',
    price: 90.0,
    activeIngredient: 'PARACETAMOL 665mg Extended Release',
    category: 'مسكنات العظام والمفاصل',
    company: 'GLAXOSMITHKLINE (GSK)',
    stripsPerBox: 3,
    dosageForm: 'أقراص ممتدة المفعول',
  },
  {
    name: 'PANADOL SINUS 24 TABS',
    price: 70.0,
    activeIngredient: 'PARACETAMOL 500mg + PSEUDOEPHEDRINE 30mg',
    category: 'الجيوب الأنفية والبرد',
    company: 'GLAXOSMITHKLINE (GSK)',
    stripsPerBox: 2,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'PANADOL BABY & INFANT SUSPENSION 100ML',
    price: 42.0,
    activeIngredient: 'PARACETAMOL 120mg/5ml',
    category: 'خافض حرارة للأطفال',
    company: 'GLAXOSMITHKLINE (GSK)',
    stripsPerBox: 1,
    dosageForm: 'شراب معلق',
  },
  {
    name: 'ALPHINTERN 30 ENTERIC COATED TABS',
    price: 54.0,
    activeIngredient: 'CHYMOTRYPSIN 300U + TRYPSIN 300U',
    category: 'مضادات التورم والالتهابات',
    company: 'AMMOUN PHARMACEUTICALS',
    stripsPerBox: 3,
    dosageForm: 'أقراص معوية',
  },
  {
    name: 'AUGMENTIN 1GM 14 TABS',
    price: 131.0,
    activeIngredient: 'AMOXICILLIN 875mg + CLAVULANIC ACID 125mg',
    category: 'مضاد حيوي واسع المجال',
    company: 'GLAXOSMITHKLINE (GSK)',
    stripsPerBox: 2,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'AUGMENTIN 625MG 10 TABS',
    price: 85.0,
    activeIngredient: 'AMOXICILLIN 500mg + CLAVULANIC ACID 125mg',
    category: 'مضاد حيوي واسع المجال',
    company: 'GLAXOSMITHKLINE (GSK)',
    stripsPerBox: 1,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'AUGMENTIN 457MG SUSPENSION 70ML',
    price: 69.0,
    activeIngredient: 'AMOXICILLIN 400mg + CLAVULANIC ACID 57mg/5ml',
    category: 'مضاد حيوي للأطفال',
    company: 'GLAXOSMITHKLINE (GSK)',
    stripsPerBox: 1,
    dosageForm: 'شراب معلق',
  },
  {
    name: 'CONGESTAL 20 TABS',
    price: 39.0,
    activeIngredient:
      'PARACETAMOL 650mg + CHLORPHENIRAMINE 4mg + PSEUDOEPHEDRINE 60mg',
    category: 'علاج نزلات البرد والإنفلونزا',
    company: 'SIGMA PHARMACEUTICAL INDUSTRIES',
    stripsPerBox: 2,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'CONGESTAL SYRUP 120ML',
    price: 26.0,
    activeIngredient: 'PARACETAMOL + CHLORPHENIRAMINE + PSEUDOEPHEDRINE',
    category: 'علاج نزلات البرد للأطفال',
    company: 'SIGMA PHARMACEUTICAL INDUSTRIES',
    stripsPerBox: 1,
    dosageForm: 'شراب',
  },
  {
    name: 'ANTINAL 200MG 24 CAPS',
    price: 36.0,
    activeIngredient: 'NIFUROXAZIDE 200mg',
    category: 'مطهر معوي ومضاد للإسهال',
    company: 'AMMOUN PHARMACEUTICALS',
    stripsPerBox: 2,
    dosageForm: 'كبسولات',
  },
  {
    name: 'ANTINAL SUSPENSION 60ML',
    price: 18.0,
    activeIngredient: 'NIFUROXAZIDE 220mg/5ml',
    category: 'مطهر معوي للأطفال',
    company: 'AMMOUN PHARMACEUTICALS',
    stripsPerBox: 1,
    dosageForm: 'شراب معلق',
  },
  {
    name: 'CATAFLAM 50MG 20 F.C. TABS',
    price: 51.0,
    activeIngredient: 'DICLOFENAC POTASSIUM 50mg',
    category: 'مسكن سريع ومضاد للالتهاب',
    company: 'NOVARTIS',
    stripsPerBox: 2,
    dosageForm: 'أقراص سريعة المفعول',
  },
  {
    name: 'VOLTAREN 100MG 10 RETARD TABS',
    price: 65.0,
    activeIngredient: 'DICLOFENAC SODIUM 100mg',
    category: 'مسكن ومضاد للروماتيزم',
    company: 'NOVARTIS',
    stripsPerBox: 1,
    dosageForm: 'أقراص ممتدة المفعول',
  },
  {
    name: 'VOLTAREN 75MG/3ML 6 AMPOULES',
    price: 58.0,
    activeIngredient: 'DICLOFENAC SODIUM 75mg/3ml',
    category: 'حقن مسكنة للآلام الشديدة',
    company: 'NOVARTIS',
    stripsPerBox: 6,
    dosageForm: 'حقن وأمبولات',
  },
  {
    name: 'BRUFEN 400MG 30 TABS',
    price: 45.0,
    activeIngredient: 'IBUPROFEN 400mg',
    category: 'مسكن وخافض حرارة',
    company: 'ABBOTT / KAHIRA PHARMA',
    stripsPerBox: 3,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'BRUFEN 600MG 30 EFFERVESCENT SACHETS',
    price: 60.0,
    activeIngredient: 'IBUPROFEN 600mg',
    category: 'فوار مسكن للآلام',
    company: 'ABBOTT',
    stripsPerBox: 3,
    dosageForm: 'أكياس فوار',
  },
  {
    name: 'FLAGYL 500MG 20 TABS',
    price: 26.0,
    activeIngredient: 'METRONIDAZOLE 500mg',
    category: 'مضاد للطفيليات والبكتيريا اللاهوائية',
    company: 'SANOFI',
    stripsPerBox: 2,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'OMEPRAZOLE 20MG 14 CAPS',
    price: 42.0,
    activeIngredient: 'OMEPRAZOLE 20mg',
    category: 'علاج الحموضة وقرحة المعدة',
    company: 'SEDICO',
    stripsPerBox: 2,
    dosageForm: 'كبسولات معوية',
  },
  {
    name: 'CONTROLOC 40MG 28 TABS',
    price: 180.0,
    activeIngredient: 'PANTOPRAZOLE 40mg',
    category: 'مثبط مضخة البروتون للحموضة',
    company: 'TAKEDA',
    stripsPerBox: 2,
    dosageForm: 'أقراص معوية',
  },
  {
    name: 'CONCOR 5MG 30 TABS',
    price: 63.0,
    activeIngredient: 'BISOPROLOL FUMARATE 5mg',
    category: 'أدوية علاج ضغط الدم المرتفع والقلب',
    company: 'MERCK / AMMOUN',
    stripsPerBox: 3,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'CONCOR 2.5MG 30 TABS',
    price: 48.0,
    activeIngredient: 'BISOPROLOL FUMARATE 2.5mg',
    category: 'أدوية القلب والضغط',
    company: 'MERCK / AMMOUN',
    stripsPerBox: 3,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'AMARYL 2MG 30 TABS',
    price: 54.0,
    activeIngredient: 'GLIMEPIRIDE 2mg',
    category: 'علاج مرض السكري من النوع الثاني',
    company: 'SANOFI',
    stripsPerBox: 3,
    dosageForm: 'أقراص',
  },
  {
    name: 'AMARYL 3MG 30 TABS',
    price: 66.0,
    activeIngredient: 'GLIMEPIRIDE 3mg',
    category: 'علاج مرض السكري',
    company: 'SANOFI',
    stripsPerBox: 3,
    dosageForm: 'أقراص',
  },
  {
    name: 'GLUCOPHAGE 1000MG 30 TABS',
    price: 60.0,
    activeIngredient: 'METFORMIN HCL 1000mg',
    category: 'تنظيم السكر وإنقاص الوزن',
    company: 'MERCK',
    stripsPerBox: 3,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'TELFAST 180MG 20 TABS',
    price: 88.0,
    activeIngredient: 'FEXOFENADINE HCL 180mg',
    category: 'مضاد للحساسية والارتيكاريا بدون نعاس',
    company: 'SANOFI',
    stripsPerBox: 2,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'TELFAST 120MG 20 TABS',
    price: 74.0,
    activeIngredient: 'FEXOFENADINE HCL 120mg',
    category: 'مضاد لحساسية الأنف والجيوب',
    company: 'SANOFI',
    stripsPerBox: 2,
    dosageForm: 'أقراص مغلفة',
  },
  {
    name: 'OTRIVIN 0.1% ADULT NASAL DROPS 10ML',
    price: 16.0,
    activeIngredient: 'XYLOMETAZOLINE HCL 0.1%',
    category: 'مزيل لاحتقان الأنف للبالغين',
    company: 'GLAXOSMITHKLINE (GSK)',
    stripsPerBox: 1,
    dosageForm: 'نقط للأنف',
  },
  {
    name: '1,2,3 COLD & FLU 20 TABS',
    price: 33.0,
    activeIngredient: 'PARACETAMOL + PSEUDOEPHEDRINE + CHLORPHENIRAMINE',
    category: 'علاج نزلات البرد',
    company: 'HIKMA PHARMACEUTICALS',
    stripsPerBox: 2,
    dosageForm: 'أقراص',
  },
  {
    name: 'KETOFAN 50MG 20 CAPS',
    price: 28.0,
    activeIngredient: 'KETOPROFEN 50mg',
    category: 'مسكن عام ومسكن لآلام الأسنان',
    company: 'AMMOUN PHARMACEUTICALS',
    stripsPerBox: 2,
    dosageForm: 'كبسولات',
  },
  {
    name: 'CELEBREX 200MG 10 CAPS',
    price: 110.0,
    activeIngredient: 'CELECOXIB 200mg',
    category: 'مسكن آمن للمعدة والفقرات',
    company: 'PFIZER',
    stripsPerBox: 1,
    dosageForm: 'كبسولات',
  },
  {
    name: 'C-RETARD 500MG 10 SUSTAINED RELEASE CAPS',
    price: 24.0,
    activeIngredient: 'VITAMIN C (ASCORBIC ACID) 500mg',
    category: 'فيتامينات وتقوية المناعة',
    company: 'HIKMA PHARMACEUTICALS',
    stripsPerBox: 1,
    dosageForm: 'كبسولات ممتدة المفعول',
  },
];

/**
 * Parses raw HTML table from DrugEye live response
 */
export function parseDrugEyeHtmlClient(fullHtml: string): DrugEyeMedicine[] {
  const tableStartIndex = fullHtml.indexOf('<table id="MyTable"');
  if (tableStartIndex === -1) return [];

  const tableEndIndex = fullHtml.indexOf(
    '<input name="Passgenericname"',
    tableStartIndex
  );
  const tablePart =
    tableEndIndex !== -1
      ? fullHtml.slice(tableStartIndex, tableEndIndex)
      : fullHtml.slice(tableStartIndex);

  const rows = tablePart
    .split(/<\/?tr[^>]*>/gi)
    .filter((r) => r.trim().length > 0);
  const drugs: DrugEyeMedicine[] = [];

  let currentDrug: DrugEyeMedicine | null = null;

  for (const row of rows) {
    const isBlue = /color:\s*blue/i.test(row) || /color="blue"/i.test(row);
    const isRed = /color:\s*red/i.test(row) || /color="red"/i.test(row);

    if (isBlue && isRed) {
      if (currentDrug && currentDrug.name) {
        drugs.push(currentDrug);
      }

      const cleanText = (str: string) =>
        str
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();

      const tds = row.split(/<\/?td[^>]*>/gi).filter((t) => t.trim().length > 0);
      const name = tds[0] ? cleanText(tds[0]) : '';
      const priceStr = tds[1] ? cleanText(tds[1]) : '0';
      const price = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;

      let stripsPerBox = 1;
      let dosageForm = 'أقراص';

      const upperName = name.toUpperCase();
      if (
        upperName.includes('TAB') ||
        upperName.includes('CAP') ||
        upperName.includes('PILL')
      ) {
        dosageForm = upperName.includes('CAP') ? 'كبسولات' : 'أقراص';
        const numMatch = upperName.match(
          /(\d+)\s*(?:F\.C\.)?\s*(?:TABS?|CAPS?|PILLS?)/i
        );
        if (numMatch) {
          const totalUnits = parseInt(numMatch[1], 10);
          if (totalUnits === 20 || totalUnits === 24) stripsPerBox = 2;
          else if (totalUnits === 30) stripsPerBox = 3;
          else if (totalUnits === 40) stripsPerBox = 4;
          else if (totalUnits === 48 || totalUnits === 50) stripsPerBox = 4;
          else if (totalUnits === 60) stripsPerBox = 6;
          else if (totalUnits === 10) stripsPerBox = 1;
          else if (totalUnits > 10)
            stripsPerBox = Math.max(1, Math.round(totalUnits / 10));
        }
      } else if (
        upperName.includes('SYRUP') ||
        upperName.includes('SUSPENSION') ||
        upperName.includes('ELIXIR')
      ) {
        dosageForm = 'شراب';
        stripsPerBox = 1;
      } else if (
        upperName.includes('AMP') ||
        upperName.includes('VIAL') ||
        upperName.includes('INJ')
      ) {
        dosageForm = 'حقن وأمبولات';
        const ampMatch = upperName.match(/(\d+)\s*(?:AMPS?|VIALS?)/i);
        if (ampMatch) stripsPerBox = parseInt(ampMatch[1], 10) || 1;
      } else if (upperName.includes('CREAM') || upperName.includes('OINT')) {
        dosageForm = 'مراهم وكريمات';
        stripsPerBox = 1;
      } else if (upperName.includes('DROPS')) {
        dosageForm = 'نقط للعين/الأنف';
        stripsPerBox = 1;
      } else if (upperName.includes('SACHET')) {
        dosageForm = 'أكياس فوار';
        const sachMatch = upperName.match(/(\d+)\s*SACHETS?/i);
        if (sachMatch) stripsPerBox = parseInt(sachMatch[1], 10) || 1;
      }

      currentDrug = {
        name,
        price,
        activeIngredient: '',
        category: '',
        company: '',
        stripsPerBox,
        dosageForm,
      };
      continue;
    }

    if (currentDrug) {
      const cleanText = (str: string) =>
        str
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();

      if (/color:\s*black/i.test(row) || /color="black"/i.test(row)) {
        currentDrug.activeIngredient = cleanText(row);
      } else if (/color:\s*green/i.test(row) || /color="green"/i.test(row)) {
        currentDrug.category = cleanText(row);
      } else if (
        /color:\s*blueviolet/i.test(row) ||
        /color="blueviolet"/i.test(row) ||
        /color:\s*purple/i.test(row)
      ) {
        currentDrug.company = cleanText(row);
      }
    }
  }

  if (currentDrug && currentDrug.name) {
    drugs.push(currentDrug);
  }

  return drugs;
}

/**
 * Returns preloaded Egyptian medicines catalog (Instant 0ms UI populator)
 */
export function getPreloadedEgyptianMedicines(categoryFilter?: string): DrugEyeMedicine[] {
  if (!categoryFilter || categoryFilter === 'الكل') {
    return EMBEDDED_EGYPTIAN_DRUGS;
  }
  const cleanCat = categoryFilter.trim().toLowerCase();
  return EMBEDDED_EGYPTIAN_DRUGS.filter((m) =>
    (m.category && m.category.toLowerCase().includes(cleanCat)) ||
    (m.dosageForm && m.dosageForm.toLowerCase().includes(cleanCat))
  );
}

/**
 * Searches DrugEye database in real time with resilient multi-tier fallback:
 * 1. If online: queries cloud server / proxy & caches result into IndexedDB.
 * 2. If offline / file://: searches local IndexedDB master catalog and embedded drugs instantly (0ms).
 */
export async function searchDrugEyeLive(
  query: string
): Promise<DrugEyeSearchResult> {
  const clean = query.trim();
  if (!clean) {
    return {
      success: true,
      query: '',
      count: EMBEDDED_EGYPTIAN_DRUGS.length,
      medicines: EMBEDDED_EGYPTIAN_DRUGS.slice(0, 30),
      source: 'دليل الأدوية المصرية المدمج بالبرنامج',
    };
  }

  // Pre-calculate local matching results (Instant 0ms)
  let localMatches: DrugEyeMedicine[] = [];
  try {
    const localDb = await searchLocalDrugEyeMaster(clean);
    if (localDb && localDb.length > 0) {
      localMatches = localDb;
    }
  } catch {}

  if (localMatches.length === 0) {
    const lower = clean.toLowerCase();
    localMatches = EMBEDDED_EGYPTIAN_DRUGS.filter(
      (m) =>
        m.name.toLowerCase().includes(lower) ||
        m.activeIngredient.toLowerCase().includes(lower) ||
        m.category.toLowerCase().includes(lower) ||
        m.company.toLowerCase().includes(lower)
    );
  }

  // TIER 1: Try Cloud / Local API endpoint (works on server AND standalone HTML files via getSyncApiBase())
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline) {
    try {
      const baseUrl = getSyncApiBase();
      const url = `${baseUrl}/api/drugeye/search?q=${encodeURIComponent(clean)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data: DrugEyeSearchResult = await response.json();
        if (data && data.success && data.medicines && data.medicines.length > 0) {
          saveDrugEyeMasterToDB(data.medicines).catch(() => {});
          return {
            ...data,
            source: 'قاعدة بيانات DrugEye الحية عبر السيرفر السحابي (أونلاين 🌐)',
          };
        }
      }
    } catch {
      // Fallback
    }

    // TIER 2: CORS proxy fallback
    const proxyEndpoints = [
      `https://corsproxy.io/?${encodeURIComponent(DRUGEYE_TARGET_URL)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(DRUGEYE_TARGET_URL)}`,
    ];

    for (const proxyUrl of proxyEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const initRes = await fetch(proxyUrl, {
          headers: { Accept: 'text/html' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (initRes.ok) {
          const initHtml = await initRes.text();
          const vs = initHtml.match(/id="__VIEWSTATE" value="([^"]+)"/)?.[1] || '';
          const ev = initHtml.match(/id="__EVENTVALIDATION" value="([^"]+)"/)?.[1] || '';
          const vsg = initHtml.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/)?.[1] || '';

          const body = new URLSearchParams({
            __VIEWSTATE: vs,
            __EVENTVALIDATION: ev,
            __VIEWSTATEGENERATOR: vsg,
            ttt: clean,
            b1: 'search',
          });

          const postRes = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
          });

          if (postRes.ok) {
            const postHtml = await postRes.text();
            const medicines = parseDrugEyeHtmlClient(postHtml);
            if (medicines.length > 0) {
              saveDrugEyeMasterToDB(medicines).catch(() => {});
              return {
                success: true,
                query: clean,
                count: medicines.length,
                medicines,
                source: 'DrugEye Live Database (مباشر من المصدر)',
                timestamp: new Date().toISOString(),
              };
            }
          }
        }
      } catch {}
    }
  }

  // TIER 3 & 4: Return instant local IndexedDB & embedded catalog
  return {
    success: true,
    query: clean,
    count: localMatches.length,
    medicines: localMatches,
    source: 'قاعدة بيانات أدوية الصيدلية المدمجة (تعمل 100% أوفلاين على جهازك)',
    isOffline: true,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Downloads comprehensive DrugEye updates and stores them into local IndexedDB
 */
export async function downloadAllDrugEyeMasterCatalog(
  onProgress?: (step: string, processed: number, total: number) => void
): Promise<{ success: boolean; count: number; message: string }> {
  const collectedMap = new Map<string, DrugEyeMedicine>();

  // 1. Seed with embedded medicines first
  for (const med of EMBEDDED_EGYPTIAN_DRUGS) {
    collectedMap.set(med.name.toLowerCase().trim(), med);
  }

  const queries = POPULAR_EGYPTIAN_DRUG_QUERIES;
  const totalQueries = queries.length;

  if (onProgress) onProgress('جاري الاتصال بدليل DrugEye...', 0, totalQueries);

  let completedQueries = 0;

  for (const q of queries) {
    try {
      const res = await searchDrugEyeLive(q);
      if (res.success && res.medicines.length > 0) {
        for (const med of res.medicines) {
          collectedMap.set(med.name.toLowerCase().trim(), med);
        }
      }
    } catch {
      // Continue
    }

    completedQueries++;
    if (onProgress) {
      onProgress(
        `جاري تنزيل أحدث الأدوية: "${q}" (${collectedMap.size} دواء تم جمعها حتى الآن)...`,
        completedQueries,
        totalQueries
      );
    }

    // Small courteous throttle
    await new Promise((r) => setTimeout(r, 120));
  }

  const allDrugs = Array.from(collectedMap.values());

  if (onProgress) {
    onProgress('جاري حفظ كافة الأدوية في قاعدة بيانات الجهاز (IndexedDB)...', totalQueries, totalQueries);
  }

  await saveDrugEyeMasterToDB(allDrugs);

  return {
    success: true,
    count: allDrugs.length,
    message: `تم تنزيل وحفظ ${allDrugs.length.toLocaleString('ar-EG')} دواء بتسعيراتهم الرسمية وموادهم الفعالة في قاعدة بيانات جهازك، وسيعمل السيستم بها أوفلاين بالكامل!`,
  };
}

/**
 * Gets offline DrugEye catalog status
 */
export async function getDrugEyeOfflineStatus(): Promise<{
  count: number;
  lastSyncDate: string | null;
  hasOfflineData: boolean;
}> {
  try {
    const all = await getDrugEyeMasterFromDB();
    const count = all.length > 0 ? all.length : EMBEDDED_EGYPTIAN_DRUGS.length;
    const lastSyncDate = await getSetting<string | null>('drugeye_last_sync_date', null);

    return {
      count,
      lastSyncDate,
      hasOfflineData: count > 0,
    };
  } catch {
    return {
      count: EMBEDDED_EGYPTIAN_DRUGS.length,
      lastSyncDate: null,
      hasOfflineData: true,
    };
  }
}

/**
 * Performs batch synchronization of pharmacy inventory against DrugEye
 */
export async function syncInventoryWithDrugEye(
  products: Product[],
  onProgress?: (checked: number, total: number) => void
): Promise<DrugEyeSyncResult> {
  if (products.length === 0) {
    return {
      success: true,
      totalChecked: 0,
      updatesFound: 0,
      priceChangesCount: 0,
      updates: [],
    };
  }

  const batch = products.slice(0, 40).map((p) => ({
    name: p.name,
    barcode: p.barcode,
    currentPrice: p.sellingPrice,
  }));

  if (onProgress) onProgress(0, batch.length);

  // 1. Try server-side batch sync if available and online
  if (
    typeof window !== 'undefined' &&
    window.location.protocol.startsWith('http') &&
    navigator.onLine
  ) {
    try {
      const response = await fetch('/api/drugeye/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: batch }),
      });

      if (response.ok) {
        const data: DrugEyeSyncResult = await response.json();
        if (onProgress) onProgress(batch.length, batch.length);
        return data;
      }
    } catch {
      // Fallback
    }
  }

  // 2. Client-side batch sync (works online or offline via IndexedDB)
  const updates: DrugEyeSyncUpdate[] = [];
  let checkedCount = 0;

  for (const item of batch) {
    const cleanName =
      item.name.replace(/\(.*?\)/g, '').split(' ')[0] || item.name;
    if (cleanName && cleanName.length >= 3) {
      const searchRes = await searchDrugEyeLive(cleanName);
      if (searchRes.success && searchRes.medicines.length > 0) {
        const normalizedItem = item.name.toLowerCase();
        let bestMatch = searchRes.medicines.find(
          (m) =>
            normalizedItem.includes(m.name.toLowerCase()) ||
            m.name.toLowerCase().includes(normalizedItem)
        );

        if (!bestMatch) {
          bestMatch = searchRes.medicines[0];
        }

        const priceChanged =
          item.currentPrice !== undefined && item.currentPrice !== bestMatch.price;

        updates.push({
          originalName: item.name,
          barcode: item.barcode,
          matchedDrugEyeName: bestMatch.name,
          currentPrice: item.currentPrice,
          officialPrice: bestMatch.price,
          priceChanged,
          activeIngredient: bestMatch.activeIngredient,
          category: bestMatch.category,
          company: bestMatch.company,
          stripsPerBox: bestMatch.stripsPerBox,
        });
      }
    }

    checkedCount++;
    if (onProgress) onProgress(checkedCount, batch.length);
  }

  return {
    success: true,
    totalChecked: batch.length,
    updatesFound: updates.length,
    priceChangesCount: updates.filter((u) => u.priceChanged).length,
    updates,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Checks connection status to DrugEye Live Database
 */
export async function checkDrugEyeConnection(): Promise<{
  online: boolean;
  message: string;
}> {
  const isBrowserOnline =
    typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isBrowserOnline) {
    try {
      const baseUrl = getSyncApiBase();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${baseUrl}/api/drugeye/status`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          online: data.online ?? true,
          message: data.message || 'متصل بخادم قاعدة بيانات الأدوية أونلاين',
        };
      }
    } catch {}
  }

  if (!isBrowserOnline) {
    return {
      online: false,
      message: 'الوضع الحالي: أوفلاين (يعمل بكامل قاعدة الأدوية المخزنة على جهازك بدون إنترنت)',
    };
  }

  return {
    online: true,
    message: 'قاعدة بيانات الأدوية نشطة وجاهزة للاستخدام والمزامنة',
  };
}

/**
 * Converts a DrugEye result into a full Product entity for our pharmacy system
 */
export function convertDrugEyeToProduct(
  item: DrugEyeMedicine,
  existingBarcode?: string
): Omit<Product, 'id' | 'lastUpdated'> {
  const stripsPerBox = Math.max(1, item.stripsPerBox || 1);
  const sellingPrice = Math.max(0, item.price || 0);
  const purchasePrice = Math.round(sellingPrice * 0.75 * 100) / 100; // standard 25% pharmacy margin
  const stripPrice = calculateStripPrice(sellingPrice, stripsPerBox);
  const stripPurchasePrice = calculateStripPrice(purchasePrice, stripsPerBox);

  // Generate unique Egyptian 622 barcode if not provided
  let barcode = existingBarcode || item.rawBarcode || '';
  if (!barcode) {
    const rand = Math.floor(100000000 + Math.random() * 900000000).toString();
    barcode = `622${rand.slice(0, 9)}`;
  }

  const unit = stripsPerBox > 1 ? 'علبة' : 'عبوة';
  const totalStripsStock = stripsPerBox * 10; // default 10 boxes stock

  return {
    name: item.name,
    activeIngredient: item.activeIngredient,
    barcode,
    category: item.category || 'أقراص وكبسولات',
    dosageForm: item.dosageForm || 'أقراص',
    shelfLocation: '',
    expiryDate: '2028-12',
    stripsPerBox,
    purchasePrice,
    sellingPrice,
    stripPrice,
    stripPurchasePrice,
    stockQuantity: 10,
    totalStripsStock,
    minStockAlert: 5,
    unit,
  };
}
