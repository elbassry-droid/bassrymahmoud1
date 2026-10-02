import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { StoreProfile } from '../types';
import { Store, Upload, CheckCircle2, ShieldCheck, Printer } from 'lucide-react';

interface StoreSetupModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isInitialSetup?: boolean;
}

export const StoreSetupModal: React.FC<StoreSetupModalProps> = ({
  isOpen,
  onClose,
  isInitialSetup = false,
}) => {
  const { profile, updateProfile } = useStore();

  const [formData, setFormData] = useState<StoreProfile>({
    name: profile?.name || '',
    storeType: profile?.storeType || 'سوبر ماركت',
    phone: profile?.phone || '',
    address: profile?.address || '',
    currency: profile?.currency || 'ج.م',
    logoUrl: profile?.logoUrl || '',
    receiptFooterNote: profile?.receiptFooterNote || 'شكراً لتعاملكم معنا، يسعدنا دائماً خدمتكم!',
    taxPercentage: profile?.taxPercentage ?? 0,
    printerWidth: profile?.printerWidth || '80mm',
    createdAt: profile?.createdAt || new Date().toISOString(),
  });

  const [logoPreview, setLogoPreview] = useState<string>(profile?.logoUrl || '');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('حجم اللوجو يجب أن يكون أقل من 2 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        setFormData((prev) => ({ ...prev, logoUrl: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('يرجى كتابة اسم المحل أو المتجر');
      return;
    }
    if (!formData.phone.trim()) {
      setError('يرجى كتابة رقم الهاتف لتسجيله في الفواتير');
      return;
    }

    updateProfile(formData);
    if (onClose) onClose();
  };

  // Styled purely in luxurious black as explicitly requested:
  // "خلي اللون اللي في تسجيل البيانات و الاعدادات إلى لون اسود فقط"
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl p-6 sm:p-8 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800/80 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700/60 text-emerald-400">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {isInitialSetup ? 'تهيئة وإعداد بيانات المحل' : 'إعدادات وبيانات المتجر'}
              </h2>
              <p className="text-sm text-zinc-400 mt-0.5">
                {isInitialSetup
                  ? 'يرجى إدخال بيانات المتجر لتخصيص النظام وطباعة الفواتير'
                  : 'تعديل هوية المحل وإعدادات ماكينة الطباعة'}
              </p>
            </div>
          </div>
          {!isInitialSetup && onClose && (
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-950/60 border border-red-800/60 p-3.5 text-sm text-red-300 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Section */}
          <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/50 p-4">
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              لوجو المحل (يظهر في أعلى إيصالات الطباعة)
            </label>
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950 overflow-hidden">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <Store className="h-8 w-8 text-zinc-600" />
                )}
              </div>
              <div className="flex-1">
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm font-medium text-white transition-colors border border-zinc-700">
                  <Upload className="h-4 w-4" />
                  <span>رفع صورة اللوجو</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview('');
                      setFormData((p) => ({ ...p, logoUrl: '' }));
                    }}
                    className="mr-3 text-xs text-rose-400 hover:underline"
                  >
                    حذف اللوجو
                  </button>
                )}
                <p className="text-xs text-zinc-500 mt-1.5">
                  صيغة PNG أو JPG شفافة وبحجم خفيف لتحسين سرعة الطباعة
                </p>
              </div>
            </div>
          </div>

          {/* Grid of basic fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                اسم المحل / المنشأة <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: هايبر ماركت البركة أو مكتبة النجاح"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700/80 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                نوع النشاط التجاري
              </label>
              <select
                value={formData.storeType}
                onChange={(e) => setFormData({ ...formData, storeType: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700/80 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="سوبر ماركت">سوبر ماركت وبقالة</option>
                <option value="مكتبة">مكتبة وأدوات مدرسية</option>
                <option value="محل ملابس">محل ملابس وأحذية</option>
                <option value="إلكترونيات">إلكترونيات وموبايلات</option>
                <option value="عطارة وتوابل">عطارة وتوابل</option>
                <option value="صيدلية ومستحضرات">صيدلية ومستحضرات</option>
                <option value="شركة تجارية">شركة ومؤسسة تجارية</option>
                <option value="أخرى">نشاط تجاري آخر</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                رقم الهاتف للتواصل <span className="text-emerald-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="مثال: 01012345678"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700/80 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                العنوان بالتفصيل
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="مثال: 12 شارع التحرير - وسط البلد"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700/80 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                رمز العملة
              </label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                placeholder="ج.م أو $"
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700/80 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                مقاس ماكينة طباعة الإيصالات (POS)
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, printerWidth: '80mm' })}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl border p-2.5 text-sm font-medium transition-all ${
                    formData.printerWidth === '80mm'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Printer className="h-4 w-4" />
                  <span>80 مم (ستاندرد)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, printerWidth: '58mm' })}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl border p-2.5 text-sm font-medium transition-all ${
                    formData.printerWidth === '58mm'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Printer className="h-4 w-4" />
                  <span>58 مم (محمولة صغرى)</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              رسالة أسفل الفاتورة (خاتمة الإيصال)
            </label>
            <input
              type="text"
              value={formData.receiptFooterNote}
              onChange={(e) => setFormData({ ...formData, receiptFooterNote: e.target.value })}
              placeholder="شكراً لزيارتكم - البضاعة المباعة ترد وتستبدل خلال 14 يوماً مع الفاتورة"
              className="w-full rounded-xl bg-zinc-900 border border-zinc-700/80 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Developer credit banner at bottom */}
          <div className="rounded-xl border border-zinc-800 bg-black p-3.5 text-center text-xs text-zinc-400">
            تم تصميم وبرمجة السيستم بواسطة:{' '}
            <span className="font-semibold text-emerald-400">محمود حمدي بصري</span> — رقم التليفون:{' '}
            <span className="font-mono text-zinc-200 dir-ltr inline-block">01027568272</span>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 text-base shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>{isInitialSetup ? 'حفظ البيانات وبدء تشغيل النظام' : 'تحديث البيانات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
