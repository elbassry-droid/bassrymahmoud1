import React, { useState, useRef, useEffect } from 'react';
import {
  searchMedicineGoogle,
  searchMedicineSubstitutes,
  searchMedicineDosage,
  searchMedicineOfficialPrice,
} from '../utils/pharmacy';
import { Globe, ChevronDown, Sparkles, ExternalLink, Pill, DollarSign, Info } from 'lucide-react';

interface GoogleSearchMedicineButtonProps {
  medicineName: string;
  activeIngredient?: string;
  variant?: 'compact' | 'badge' | 'full' | 'icon';
  className?: string;
}

export const GoogleSearchMedicineButton: React.FC<GoogleSearchMedicineButtonProps> = ({
  medicineName,
  activeIngredient,
  variant = 'badge',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleQuickSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    searchMedicineGoogle(medicineName, activeIngredient);
  };

  const handleSubstitutes = (e: React.MouseEvent) => {
    e.stopPropagation();
    searchMedicineSubstitutes(medicineName, activeIngredient);
    setIsOpen(false);
  };

  const handleDosage = (e: React.MouseEvent) => {
    e.stopPropagation();
    searchMedicineDosage(medicineName);
    setIsOpen(false);
  };

  const handleOfficialPrice = (e: React.MouseEvent) => {
    e.stopPropagation();
    searchMedicineOfficialPrice(medicineName);
    setIsOpen(false);
  };

  // Icon only
  if (variant === 'icon') {
    return (
      <div className={`relative inline-flex items-center ${className}`} ref={menuRef}>
        <button
          type="button"
          onClick={handleQuickSearch}
          title="بحث في جوجل عن الدواء ودواعي الاستعمال"
          className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors border border-blue-200/60 bg-blue-50/40"
        >
          <Globe className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Compact badge
  if (variant === 'compact') {
    return (
      <div className={`relative inline-flex items-center ${className}`} ref={menuRef}>
        <button
          type="button"
          onClick={handleQuickSearch}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 transition-colors"
          title="بحث في جوجل"
        >
          <Globe className="h-3 w-3 text-blue-600" />
          <span>جوجل</span>
        </button>
      </div>
    );
  }

  // Full button with quick dropdown
  return (
    <div className={`relative inline-flex items-center ${className}`} ref={menuRef}>
      <div className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50/70 shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={handleQuickSearch}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100/80 transition-colors"
          title={`بحث مباشر في جوجل عن: ${medicineName}`}
        >
          <Globe className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <span>بحث جوجل</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="px-1.5 py-1 border-r border-blue-200/80 hover:bg-blue-100 text-blue-600 transition-colors"
          title="خيارات البحث في جوجل (البدائل والجرعات)"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-56 rounded-xl bg-white border border-slate-200 shadow-xl z-50 py-1 text-right text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-50">
            بحث في جوجل عن: <span className="text-slate-800">{medicineName}</span>
          </div>

          <div className="py-1">
            <button
              type="button"
              onClick={handleQuickSearch}
              className="w-full px-3 py-2 text-right hover:bg-blue-50 text-slate-700 flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-blue-600" />
                <span>دواعي الاستعمال والآثار الجانبية</span>
              </span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={handleSubstitutes}
              className="w-full px-3 py-2 text-right hover:bg-emerald-50 text-slate-700 flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <Pill className="h-3.5 w-3.5 text-emerald-600" />
                <span>بدائل ومثائل الدواء (نفس المادة)</span>
              </span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={handleDosage}
              className="w-full px-3 py-2 text-right hover:bg-purple-50 text-slate-700 flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                <span>الجرعة الموصى بها وطريقة الاستخدام</span>
              </span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={handleOfficialPrice}
              className="w-full px-3 py-2 text-right hover:bg-amber-50 text-slate-700 flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                <span>السعر الرسمي في الصيدليات</span>
              </span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
