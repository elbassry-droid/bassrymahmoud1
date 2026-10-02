import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { KeyRound, ShieldAlert, CheckCircle2, Phone, Sparkles } from 'lucide-react';

interface TrialLockModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isMandatoryLock?: boolean; // if trial days <= 0
}

export const TrialLockModal: React.FC<TrialLockModalProps> = ({
  isOpen,
  onClose,
  isMandatoryLock = false,
}) => {
  const { license, activateSystem, remainingTime } = useStore();
  const [activationCode, setActivationCode] = useState('');
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCode.trim()) {
      setMessage({ text: 'يرجى إدخال كود التفعيل', isError: true });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = activateSystem(activationCode);
      setIsSubmitting(false);
      if (res.success) {
        setMessage({ text: res.message, isError: false });
        setTimeout(() => {
          if (onClose) onClose();
        }, 1200);
      } else {
        setMessage({ text: res.message, isError: true });
      }
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3">
            {license.isActivated ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            ) : (
              <KeyRound className="h-8 w-8" />
            )}
          </div>
          <h3 className="text-2xl font-black text-white">
            {license.isActivated
              ? 'البرنامج مفعل بنسخة دائمة'
              : isMandatoryLock
              ? 'انتهت الفترة التجريبية وتوقف البرنامج (120 ساعة)'
              : 'شراء وتفعيل النسخة الدائمة'}
          </h3>
          <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
            {license.isActivated
              ? 'تم التحقق من ترخيص النظام بنجاح - كامل الصلاحيات مفعلة مدى الحياة.'
              : isMandatoryLock
              ? 'انتهت مدة الـ 5 أيام (120 ساعة) بالكامل وتوقف البرنامج عن العمل. لمواصلة استخدام النظام يرجى إدخال كود التفعيل المعتمد.'
              : 'قم بإدخال كود التفعيل الخاص بك لتنشيط النسخة الدائمة وإلغاء قيود الفترة التجريبية.'}
          </p>

          {!license.isActivated && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 text-xs text-amber-400 font-bold">
              <span>⏱️</span>
              <span>{remainingTime.formatted}</span>
            </div>
          )}
        </div>

        {message && (
          <div
            className={`mb-5 rounded-xl p-3.5 text-sm flex items-center gap-2 border ${
              message.isError
                ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
            }`}
          >
            <span>{message.isError ? '⚠️' : '✓'}</span>
            <span>{message.text}</span>
          </div>
        )}

        {!license.isActivated && (
          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">
                كود تفعيل البرنامج (License Key)
              </label>
              {/* NOTE: Strictly protected, no hints, placeholder is completely neutral */}
              <input
                type="text"
                autoComplete="off"
                spellCheck="false"
                required
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder="أدخل كود التفعيل المعتمد هنا..."
                className="w-full text-center tracking-widest font-mono rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3.5 text-lg font-bold text-emerald-400 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-3 text-base shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-60"
              >
                <Sparkles className="h-5 w-5" />
                <span>{isSubmitting ? 'جاري التحقق...' : 'تفعيل البرنامج الآن'}</span>
              </button>
              {!isMandatoryLock && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>
        )}

        {/* Contact info for purchasing */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center">
          <p className="text-xs text-zinc-400 mb-2 font-medium">
            للحصول على كود التفعيل أو شراء النسخة الكاملة، يرجى التواصل مباشرة مع المطور:
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900 border border-zinc-700/80 px-4 py-1.5 text-xs text-zinc-200">
            <span className="font-bold text-emerald-400">محمود حمدي بصري</span>
            <span className="text-zinc-600">|</span>
            <Phone className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-mono font-bold tracking-wider text-emerald-300 dir-ltr inline-block">
              01027568272
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
