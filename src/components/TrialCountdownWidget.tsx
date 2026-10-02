import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ShieldCheck, Clock, Key } from 'lucide-react';
import { TrialLockModal } from './TrialLockModal';

export const TrialCountdownWidget: React.FC = () => {
  const { license, remainingTime } = useStore();
  const [showModal, setShowModal] = useState(false);

  if (license.isActivated) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 text-xs font-semibold">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>نسخة مرخصة دائمة</span>
      </div>
    );
  }

  const isCritical = remainingTime.totalHours < 24;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        title="انقر لإدخال كود التفعيل وتنشيط النسخة الدائمة"
        className={`group inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${
          isCritical
            ? 'bg-rose-50 border-rose-300 text-rose-900 hover:bg-rose-100 animate-pulse'
            : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
        }`}
      >
        <Clock className={`h-4 w-4 shrink-0 ${isCritical ? 'text-rose-600' : 'text-amber-600'}`} />
        <div className="text-right leading-tight">
          <span className="block font-black">
            متبقي: {remainingTime.totalHours} ساعة ({remainingTime.days} يوم و {remainingTime.hours} س و {remainingTime.minutes} د)
          </span>
          <span className="text-[10px] opacity-80">
            {isCritical ? 'أوشكت الـ 5 أيام على الانتهاء!' : 'فترة تجريبية 5 أيام'}
          </span>
        </div>
        <span className="flex items-center gap-1 bg-white/90 px-1.5 py-0.5 rounded text-[10px] text-slate-700 border border-slate-200 group-hover:bg-white shrink-0 font-bold">
          <Key className="h-3 w-3 text-emerald-600" />
          <span>تفعيل</span>
        </span>
      </button>

      <TrialLockModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
