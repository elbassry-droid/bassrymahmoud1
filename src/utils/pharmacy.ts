// Pharmacy utility functions for strip/box calculations, Google search, and stock tracking

/**
 * Calculates strip price based on box price and number of strips in the box.
 * Example: 500 EGP / 3 strips = 166.67 EGP
 */
export function calculateStripPrice(boxPrice: number, stripsPerBox: number): number {
  if (!stripsPerBox || stripsPerBox <= 1) return boxPrice;
  const raw = boxPrice / stripsPerBox;
  // Round to 2 decimal places
  return Math.round(raw * 100) / 100;
}

/**
 * Returns a human-friendly Arabic text explaining the strip price formula.
 * Example: "500 ج.م ÷ 3 شرايط = 166.67 ج.م للشريط"
 */
export function getStripCalculationBreakdown(
  boxPrice: number,
  stripsPerBox: number,
  currency: string = 'ج.م'
): {
  formulaText: string;
  stripPrice: number;
  stripsPerBox: number;
  boxPrice: number;
} {
  const safeStrips = Math.max(1, stripsPerBox || 1);
  const stripPrice = calculateStripPrice(boxPrice, safeStrips);
  const formulaText =
    safeStrips > 1
      ? `${boxPrice} ${currency} ÷ ${safeStrips} شرايط = ${stripPrice.toFixed(2)} ${currency} للشريط`
      : `${boxPrice} ${currency} للعبوة`;

  return {
    formulaText,
    stripPrice,
    stripsPerBox: safeStrips,
    boxPrice,
  };
}

/**
 * Formats inventory stock showing both Boxes and loose Strips
 * Example: 29 strips with 3 strips/box => "9 علب و 2 شريط (29 شريط)"
 */
export function formatPharmacyStock(
  totalStrips: number,
  stripsPerBox: number = 1,
  defaultUnit: string = 'علبة'
): {
  boxes: number;
  strips: number;
  totalStrips: number;
  formattedText: string;
  shortText: string;
} {
  const safeStripsPerBox = Math.max(1, stripsPerBox || 1);
  const safeTotalStrips = Math.max(0, totalStrips || 0);

  if (safeStripsPerBox <= 1) {
    return {
      boxes: safeTotalStrips,
      strips: 0,
      totalStrips: safeTotalStrips,
      formattedText: `${safeTotalStrips} ${defaultUnit}`,
      shortText: `${safeTotalStrips} ${defaultUnit}`,
    };
  }

  const boxes = Math.floor(safeTotalStrips / safeStripsPerBox);
  const remainderStrips = safeTotalStrips % safeStripsPerBox;

  let formattedText = '';
  let shortText = '';

  if (boxes === 0 && remainderStrips === 0) {
    formattedText = 'الرصيد نفد (0)';
    shortText = '0 رصيد';
  } else if (boxes > 0 && remainderStrips === 0) {
    formattedText = `${boxes} علبة (${safeTotalStrips} شريط)`;
    shortText = `${boxes} علبة`;
  } else if (boxes === 0 && remainderStrips > 0) {
    formattedText = `${remainderStrips} شريط`;
    shortText = `${remainderStrips} شريط`;
  } else {
    formattedText = `${boxes} علبة و ${remainderStrips} شريط (${safeTotalStrips} شريط)`;
    shortText = `${boxes}ع + ${remainderStrips}ش`;
  }

  return {
    boxes,
    strips: remainderStrips,
    totalStrips: safeTotalStrips,
    formattedText,
    shortText,
  };
}

/**
 * Google Search helpers for medicines
 */
export function openGoogleSearch(query: string) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function searchMedicineGoogle(medicineName: string, activeIngredient?: string) {
  const q = activeIngredient
    ? `دواء ${medicineName} ${activeIngredient} دواعي الاستعمال والجرعة والبدائل`
    : `دواء ${medicineName} دواعي الاستعمال والجرعة وسعر`;
  openGoogleSearch(q);
}

export function searchMedicineSubstitutes(medicineName: string, activeIngredient?: string) {
  const q = activeIngredient
    ? `بدائل ومثائل دواء ${medicineName} المادة الفعالة ${activeIngredient}`
    : `بديل دواء ${medicineName} نفس المادة الفعالة والسعر`;
  openGoogleSearch(q);
}

export function searchMedicineDosage(medicineName: string) {
  const q = `جرعة وطريقة استخدام دواء ${medicineName} والآثار الجانبية وموانع الاستعمال`;
  openGoogleSearch(q);
}

export function searchMedicineOfficialPrice(medicineName: string) {
  const q = `سعر دواء ${medicineName} في الصيدليات الدليل الدوائي المصري`;
  openGoogleSearch(q);
}

/**
 * Check expiry date status for medicine safety
 */
export function getExpiryStatus(expiryDate?: string): {
  status: 'expired' | 'critical' | 'warning' | 'good' | 'none';
  label: string;
  colorClass: string;
  monthsRemaining?: number;
} {
  if (!expiryDate) {
    return { status: 'none', label: 'غير محدد', colorClass: 'text-slate-400' };
  }

  const now = new Date();
  let exp: Date;

  // Handle YYYY-MM format or YYYY-MM-DD
  if (expiryDate.length === 7) {
    const [y, m] = expiryDate.split('-').map(Number);
    exp = new Date(y, m, 0); // last day of month
  } else {
    exp = new Date(expiryDate);
  }

  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.ceil(diffDays / 30);

  if (diffDays <= 0) {
    return {
      status: 'expired',
      label: 'منتهي الصلاحية!',
      colorClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      monthsRemaining: 0,
    };
  } else if (diffMonths <= 2) {
    return {
      status: 'critical',
      label: `صلاحية وشيكة (${diffDays} يوم)`,
      colorClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      monthsRemaining: diffMonths,
    };
  } else if (diffMonths <= 6) {
    return {
      status: 'warning',
      label: `صلاحية قريبة (${diffMonths} شهور)`,
      colorClass: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      monthsRemaining: diffMonths,
    };
  }

  return {
    status: 'good',
    label: `صالح (${expiryDate})`,
    colorClass: 'text-slate-500',
    monthsRemaining: diffMonths,
  };
}
