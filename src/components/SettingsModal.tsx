import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Settings,
  Download,
  Upload,
  RefreshCw,
  Printer,
  ShieldCheck,
  KeyRound,
  Store,
  Phone,
  X,
  CheckCircle,
  AlertCircle,
  Database,
  Pill,
  Sparkles,
  Zap,
  Cloud,
  Laptop,
} from 'lucide-react';
import { TrialLockModal } from './TrialLockModal';
import { ImportMedicinesModal } from './ImportMedicinesModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStoreSetup: () => void;
  onOpenCloudSync?: () => void;
  onOpenDesktopModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenStoreSetup,
  onOpenCloudSync,
  onOpenDesktopModal,
}) => {
  const {
    profile,
    updateProfile,
    exportDatabaseJSON,
    importDatabaseJSON,
    exportMedicinesJSON,
    downloadOfflineHtmlBundle,
    resetToDefaultData,
    license,
    remainingTime,
    products,
    invoices,
    customers,
    suppliers,
    expenses,
    lastSavedAt,
    forceSaveAllToLocalStorage,
    syncStats,
  } = useStore();

  const [importStatus, setImportStatus] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [isMedicinesImportOpen, setIsMedicinesImportOpen] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await importDatabaseJSON(content);
      if (success) {
        setImportStatus('تم استعادة النسخة الاحتياطية بنجاح إلى قاعدة بيانات IndexedDB!');
        setTimeout(() => setImportStatus(''), 4000);
      } else {
        setImportStatus('خطأ: ملف النسخة الاحتياطية غير صالح');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl p-6 sm:p-8 space-y-6 my-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800/90 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 text-emerald-400">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">إعدادات النظام وقاعدة بيانات IndexedDB</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  محرك فائق السرعة
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                تخصيص هوية المتجر، حفظ واستعادة قاعدة البيانات الصاروخية، وحالة الترخيص
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {importStatus && (
          <div className="p-3 rounded-xl bg-zinc-900 border border-emerald-500/50 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Section 1: Store Profile quick access */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-emerald-400 overflow-hidden">
              {profile?.logoUrl ? (
                <img src={profile.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
              ) : (
                <Store className="h-5 w-5" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{profile?.name || 'بيانات المحل'}</h4>
              <p className="text-xs text-zinc-400">
                {profile?.storeType} — هاتف: {profile?.phone}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenStoreSetup();
            }}
            className="rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white px-3.5 py-2 transition-colors cursor-pointer"
          >
            تعديل بيانات المحل واللوجو
          </button>
        </div>

        {/* Section 1.5: Remote 2-Device Cloud Sync Card */}
        {onOpenCloudSync && (
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-zinc-900/60 to-blue-950/30 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Cloud className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">مزامنة جهازين عن بُعد (سيرفر مجاني ونت ضعيف)</h4>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    باقة 100 ميجا
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  ربط كاشير الصيدلية مع جهاز المدير/الفرع الثاني لمطابقة الأدوية والفواتير فورياً
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCloudSync();
              }}
              className="rounded-xl border border-cyan-500/40 bg-cyan-950/80 hover:bg-cyan-900 text-xs font-black text-cyan-200 px-3.5 py-2 transition-colors cursor-pointer shrink-0"
            >
              فتح إعدادات المزامنة 🔄
            </button>
          </div>
        )}

        {/* Section 1.6: Windows Desktop EXE App Card */}
        {onOpenDesktopModal && (
          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-zinc-900/60 to-purple-950/30 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Laptop className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">تطبيق سطح المكتب للكمبيوتر (EXE Suite)</h4>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                    Windows PC
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  تنزيل حزمة تشغيل البرنامج كملف EXE مستقل في وضع سطح المكتب بدون شريط متصفح
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDesktopModal();
              }}
              className="rounded-xl border border-indigo-500/40 bg-indigo-950/80 hover:bg-indigo-900 text-xs font-black text-indigo-200 px-3.5 py-2 transition-colors cursor-pointer shrink-0"
            >
              تحميل ملفات EXE 💻
            </button>
          </div>
        )}

        {/* Section 2: Printer Setup */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-emerald-400" />
                <span>ماكينة طباعة الفواتير والإيصالات الحرارية</span>
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                يتم التوافق مع أي طابعة حرارية (USB / Network / Bluetooth) تلقائياً عبر المتصفح
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => profile && updateProfile({ ...profile, printerWidth: '80mm' })}
              className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                profile?.printerWidth === '80mm'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-black'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
              }`}
            >
              طابعة 80 مم (الستاندرد لمعظم نقاط البيع)
            </button>
            <button
              type="button"
              onClick={() => profile && updateProfile({ ...profile, printerWidth: '58mm' })}
              className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                profile?.printerWidth === '58mm'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-black'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
              }`}
            >
              طابعة 58 مم (الإيصالات المحمولة والصغيرة)
            </button>
          </div>
        </div>

        {/* IndexedDB Auto-Save Status Section */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>محرك التخزين الصاروخي (IndexedDB)</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    مفعل وسريع جداً ⚡
                  </span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  تخزين دائم غير محدود لعشرات الآلاف من الأدوية والفواتير دون أي تأخير أو استهلاك للذاكرة.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                forceSaveAllToLocalStorage();
                setSaveSuccessMsg(true);
                setTimeout(() => setSaveSuccessMsg(false), 3000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs transition-all shrink-0"
              title="مزامنة وتأكيد حفظ كافة البيانات في IndexedDB"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>تأكيد الحفظ والمزامنة</span>
            </button>
          </div>

          {saveSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>تم التحقق وتأكيد حفظ كافة السجلات في IndexedDB بنجاح فائق!</span>
            </div>
          )}

          {/* Quick Storage Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-center text-xs">
            <div className="bg-black/60 rounded-xl p-2 border border-zinc-800">
              <div className="text-[10px] text-zinc-400">الأدوية المسجلة</div>
              <div className="font-black text-emerald-400 text-sm font-mono">{products.length.toLocaleString('ar-EG')}</div>
            </div>
            <div className="bg-black/60 rounded-xl p-2 border border-zinc-800">
              <div className="text-[10px] text-zinc-400">الفواتير</div>
              <div className="font-black text-emerald-400 text-sm font-mono">{invoices.length.toLocaleString('ar-EG')}</div>
            </div>
            <div className="bg-black/60 rounded-xl p-2 border border-zinc-800">
              <div className="text-[10px] text-zinc-400">العملاء</div>
              <div className="font-black text-emerald-400 text-sm font-mono">{customers.length.toLocaleString('ar-EG')}</div>
            </div>
            <div className="bg-black/60 rounded-xl p-2 border border-zinc-800">
              <div className="text-[10px] text-zinc-400">الموردين</div>
              <div className="font-black text-emerald-400 text-sm font-mono">{suppliers.length.toLocaleString('ar-EG')}</div>
            </div>
            <div className="bg-black/60 rounded-xl p-2 border border-zinc-800 col-span-2 sm:col-span-1">
              <div className="text-[10px] text-zinc-400">آخر مزامنة</div>
              <div className="font-mono text-zinc-300 text-[11px] font-bold">{lastSavedAt}</div>
            </div>
          </div>
        </div>

        {/* Section 3: Offline Backup & Restore (JSON File) and Offline HTML Bundle */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div>
            <h4 className="text-sm font-bold text-white">النسخ الاحتياطي والتشغيل بدون إنترنت (أوفلاين)</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              يمكنك تحميل البرنامج كاملاً كملف HTML مستقل يعمل بمفرده على أي جهاز، أو تصدير قاعدة البيانات كملف JSON
            </p>
          </div>

          {/* Standalone HTML Download Banner */}
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black text-emerald-400 block">
                ملف البرنامج أوفلاين المستقل (Offline Single-File HTML)
              </span>
              <span className="text-[11px] text-zinc-400">
                حمل ملف HTML واحد يحتوي على كامل البرنامج، وافتحه على أي جهاز كمبيوتر بدون نت نهائياً!
              </span>
            </div>
            <button
              type="button"
              onClick={downloadOfflineHtmlBundle}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-2.5 px-4 text-xs transition-colors shadow-md shadow-emerald-500/20"
            >
              <Download className="h-4 w-4" />
              <span>تحميل ملف HTML أوفلاين</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={exportDatabaseJSON}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 px-4 text-xs transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>تصدير نسخة احتياطية (ملف JSON)</span>
            </button>

            <label className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 px-4 text-xs transition-colors cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>استعادة نسخة احتياطية من ملف</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Section: Medicines JSON Direct Import & Export */}
        <div className="rounded-2xl border border-emerald-500/40 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>إدارة واستيراد ملفات الأدوية (JSON فائق السرعة)</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    جديد
                  </span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  إضافة أدوية ومستحضرات الصيدلية دفعة واحدة من ملف خارجي، أو استخراج قائمة الأدوية الحالية كملف JSON
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsMedicinesImportOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-2.5 px-4 text-xs transition-colors shadow-md shadow-emerald-500/20"
            >
              <Upload className="h-4 w-4" />
              <span>استيراد ملف أدوية JSON للسيستم</span>
            </button>

            <button
              type="button"
              onClick={exportMedicinesJSON}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 px-4 text-xs transition-colors"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>تصدير قائمة الأدوية كملف JSON ({products.length} دواء)</span>
            </button>
          </div>
        </div>

        {/* Section 4: License & Activation */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">ترخيص البرنامج</h4>
              {license.isActivated ? (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  نسخة دائمة مفعلة مدى الحياة
                </span>
              ) : (
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  متبقي {remainingTime.totalHours} ساعة ({remainingTime.days} يوم و {remainingTime.hours} س)
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {license.isActivated
                ? 'النظام مرخص بالكامل مدى الحياة بدون أي قيود.'
                : 'الوقت المتبقي: ' + remainingTime.formatted + ' - يتوقف النظام تلقائياً بعد انتهاء الـ 5 أيام.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowLicenseModal(true)}
            className="rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white px-3.5 py-2 flex items-center gap-1.5 transition-colors"
          >
            <KeyRound className="h-4 w-4 text-emerald-400" />
            <span>{license.isActivated ? 'معلومات الترخيص' : 'إدخال كود التفعيل'}</span>
          </button>
        </div>

        {/* Developer signature */}
        <div className="rounded-xl border border-zinc-800 bg-black p-4 text-center text-xs text-zinc-400 space-y-1">
          <div>
            تم تصميم وبرمجة السيستم بواسطة:{' '}
            <span className="font-bold text-white">محمود حمدي بصري</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-emerald-400 font-mono font-bold">
            <Phone className="h-3.5 w-3.5" />
            <span className="dir-ltr inline-block">01027568272</span>
          </div>
        </div>
      </div>

      <TrialLockModal isOpen={showLicenseModal} onClose={() => setShowLicenseModal(false)} />

      <ImportMedicinesModal
        isOpen={isMedicinesImportOpen}
        onClose={() => setIsMedicinesImportOpen(false)}
      />
    </div>
  );
};
