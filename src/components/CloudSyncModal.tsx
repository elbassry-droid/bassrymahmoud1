import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import {
  X,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Smartphone,
  Monitor,
  Cloud,
  CloudCheck,
  Wifi,
  WifiOff,
  Database,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldCheck,
  Share2,
  Signal,
  Laptop,
} from 'lucide-react';
import {
  SyncConfig,
  SyncTrafficStats,
  generateRandomRoomCode,
} from '../utils/cloudSync';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    syncConfig,
    syncStats,
    updateSyncConfig,
    triggerManualSync,
    triggerFullCloudBackup,
    triggerFullCloudRestore,
    isSyncing,
    lastSavedAt,
    products,
    invoices,
  } = useStore();

  const [inputRoomCode, setInputRoomCode] = useState(syncConfig?.roomCode || '');
  const [deviceName, setDeviceName] = useState(syncConfig?.deviceName || 'الجهاز 1');
  const [deviceRole, setDeviceRole] = useState<'master' | 'remote'>(syncConfig?.deviceRole || 'master');
  const [copied, setCopied] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (syncConfig) {
      setInputRoomCode(syncConfig.roomCode);
      setDeviceName(syncConfig.deviceName);
      setDeviceRole(syncConfig.deviceRole);
    }
  }, [syncConfig]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inputRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGenerateNewCode = () => {
    const newCode = generateRandomRoomCode();
    setInputRoomCode(newCode);
    if (updateSyncConfig) {
      updateSyncConfig({
        ...syncConfig,
        roomCode: newCode,
      });
    }
  };

  const handleSaveAndConnect = async () => {
    if (!inputRoomCode.trim()) {
      setActionError('يرجى كتابة كود المزامنة');
      return;
    }

    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (updateSyncConfig) {
        updateSyncConfig({
          ...syncConfig,
          roomCode: inputRoomCode.trim().toUpperCase(),
          deviceName: deviceName.trim() || 'جهاز الصيدلية',
          deviceRole,
          enabled: true,
        });
      }

      const res = await triggerManualSync();
      if (res) {
        setActionSuccess('تم الربط والمزامنة بنجاح مع السيرفر السحابي!');
      } else {
        setActionSuccess('تم حفظ الإعدادات، والنظام سيزامن تلقائياً عند توفر النت');
      }
    } catch (e: any) {
      setActionError(e?.message || 'حدث خطأ أثناء الاتصال');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleFullBackup = async () => {
    if (!confirm('هل تريد رفع نسخة كاملة من أدوية وفواتير هذا الجهاز إلى السحابة ليتمكن الجهاز الثاني من استيرادها؟')) {
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    const ok = await triggerFullCloudBackup();
    setIsProcessing(false);
    if (ok) {
      setActionSuccess('تم رفع كامل قاعدة البيانات بنجاح إلى السيرفر السحابي!');
      setTimeout(() => setActionSuccess(null), 4000);
    } else {
      setActionError('تعذر رفع النسخة، يرجى التأكد من اتصال الإنترنت');
    }
  };

  const handleFullRestore = async () => {
    if (
      !confirm(
        'تحذير: سيتم استبدال بيانات هذا الجهاز بالبيانات المرفوعة على السيرفر من الجهاز الأول. هل أنت متأكد من الاستمرار؟'
      )
    ) {
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    const ok = await triggerFullCloudRestore();
    setIsProcessing(false);
    if (ok) {
      setActionSuccess('تم استيراد ومطابقة كامل البيانات من الجهاز الرئيسي بنجاح!');
      setTimeout(() => setActionSuccess(null), 4000);
    } else {
      setActionError('لم يتم العثور على نسخة سحابية مطابقة لهذا الكود');
    }
  };

  const totalKB = (syncStats?.totalBytes || 0) / 1024;
  const totalMB = syncStats?.totalMB || 0;
  const quotaMB = syncStats?.quotaMB || 100;
  const percent = syncStats?.quotaUsedPercent || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl p-5 sm:p-7 space-y-6 my-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800/90 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-inner">
              <Cloud className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  مزامنة جهازين عن بُعد (سيرفر مجاني ونت بسيط)
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  وفر 99.8% نت
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                توحيد الأدوية والمبيعات والمخزن بين جهازين عن بُعد مع استهلاك باقة أقل من 100 ميجا
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-zinc-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback messages */}
        {actionSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Live Internet Consumption Card (100 MB Quota Guarantee) */}
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-zinc-900/60 to-emerald-950/30 p-4 sm:p-5 space-y-3 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Signal className="h-5 w-5 text-cyan-400" />
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>عداد استهلاك باقة الإنترنت المباشر</span>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-md">
                    مضغوط فائق الخفة
                  </span>
                </h4>
                <p className="text-xs text-zinc-400">
                  يرسل فقط التعديلات اللحظية (Delta) بدون إعادة تحميل البيانات الكبيرة
                </p>
              </div>
            </div>

            <div className="text-left bg-black/50 border border-zinc-800 rounded-xl px-3 py-1.5 self-start sm:self-auto">
              <span className="text-xs text-zinc-400 block font-medium">المستهلك الفعلي:</span>
              <span className="text-sm font-black text-emerald-400">
                {totalMB < 1 ? `${totalKB.toFixed(1)} KB` : `${totalMB.toFixed(2)} MB`}
                <span className="text-xs text-zinc-400 font-normal"> / {quotaMB} MB</span>
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden border border-zinc-700/60">
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(1, Math.min(100, percent))}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>نسبة استخدام الباقة: {percent.toFixed(2)}% فقط</span>
              <span className="text-emerald-400 font-bold">
                متبقي {Math.max(0, 100 - percent).toFixed(1)}% من باقة الـ 100 ميجا (تكفي لشهور!)
              </span>
            </div>
          </div>
        </div>

        {/* Sync Room Key Box */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">كود الربط والمزامنة الموحد للصيدلية</h3>
            </div>
            <button
              type="button"
              onClick={handleGenerateNewCode}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
            >
              توليد كود جديد 🔀
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="sm:col-span-2 relative">
              <input
                type="text"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                placeholder="مثال: PHARM-2027"
                className="w-full bg-black border border-zinc-700 focus:border-cyan-400 rounded-xl px-4 py-3 text-center text-lg font-black tracking-widest text-emerald-300 font-mono focus:outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-3 rounded-xl border border-zinc-700 text-xs transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>نسخ الكود للجهاز الثاني</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            💡 <strong className="text-zinc-200">طريقة التشغيل على جهازين:</strong> ضع نفس هذا الكود في الجهاز
            الأول (الكاشير) والجهاز الثاني (اللابتوب أو الهاتف)، وسيتم ربطهما تلقائياً وتحديث الأصناف والفواتير
            فورياً.
          </p>
        </div>

        {/* Device Settings & Role */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Laptop className="h-4 w-4 text-cyan-400" />
            <span>إعدادات هذا الجهاز الحالي</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Device Name */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">اسم هذا الجهاز بالصيدلية</label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="مثال: كاشير 1 الرئيسي / لابتوب المدير"
                className="w-full bg-black border border-zinc-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden"
              />
            </div>

            {/* Device Role */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">نوع ودور هذا الجهاز</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeviceRole('master')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    deviceRole === 'master'
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                      : 'bg-black border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>جهاز 1 (رئيسي)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeviceRole('remote')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    deviceRole === 'remote'
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                      : 'bg-black border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>جهاز 2 (عن بُعد)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sync Controls & Initial Clone Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Main Connect & Sync Button */}
          <button
            type="button"
            onClick={handleSaveAndConnect}
            disabled={isProcessing || isSyncing}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-3.5 rounded-2xl text-xs shadow-lg shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isProcessing || isSyncing ? 'animate-spin' : ''}`} />
            <span>حفظ ومزامنة الآن ⚡</span>
          </button>

          {/* Full Backup to Cloud */}
          <button
            type="button"
            onClick={handleFullBackup}
            disabled={isProcessing || isSyncing}
            className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-cyan-500/40 font-bold px-4 py-3.5 rounded-2xl text-xs transition-all cursor-pointer disabled:opacity-50"
            title="رفع نسخة كاملة من أدوية وفواتير هذا الجهاز ليستوردها الجهاز الثاني"
          >
            <ArrowUpCircle className="h-4 w-4 text-cyan-400" />
            <span>رفع نسخة كاملة للجهاز 2</span>
          </button>

          {/* Full Restore from Cloud */}
          <button
            type="button"
            onClick={handleFullRestore}
            disabled={isProcessing || isSyncing}
            className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/40 font-bold px-4 py-3.5 rounded-2xl text-xs transition-all cursor-pointer disabled:opacity-50"
            title="استيراد وتنزيل كامل أدوية وفواتير الجهاز الأول على هذا الجهاز"
          >
            <ArrowDownCircle className="h-4 w-4 text-amber-400" />
            <span>استيراد أدوية الجهاز الأول</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="border-t border-zinc-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                syncStats?.status === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : syncStats?.status === 'syncing'
                  ? 'bg-cyan-400 animate-spin'
                  : 'bg-zinc-500'
              }`}
            ></span>
            <span>الحالة: {syncStats?.statusMessage || 'جاهز'}</span>
          </div>

          <div>
            <span>الأدوية المسجلة: {products.length} صنف</span>
            <span className="mx-2">•</span>
            <span>الفواتير: {invoices.length} فاتورة</span>
          </div>
        </div>
      </div>
    </div>
  );
};
