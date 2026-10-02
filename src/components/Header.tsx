import React from 'react';
import { useStore } from '../context/StoreContext';
import {
  Store,
  LogOut,
  User,
  ShieldCheck,
  ShoppingCart,
  Printer,
  Settings,
  HelpCircle,
  Download,
  CheckCircle2,
  Zap,
  Globe,
  Cloud,
  RefreshCw,
  Laptop,
} from 'lucide-react';
import { TrialCountdownWidget } from './TrialCountdownWidget';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenStoreProfile: () => void;
  onOpenDrugEye?: () => void;
  onOpenCloudSync?: () => void;
  onOpenDesktopModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenStoreProfile,
  onOpenDrugEye,
  onOpenCloudSync,
  onOpenDesktopModal,
}) => {
  const {
    profile,
    currentUser,
    logout,
    downloadOfflineHtmlBundle,
    lastSavedAt,
    products,
    syncStats,
    isSyncing,
    syncConfig,
  } = useStore();

  const totalMB = syncStats?.totalMB || 0;
  const totalKB = (syncStats?.totalBytes || 0) / 1024;
  const dataDisplay = totalMB < 1 ? `${totalKB.toFixed(0)} KB` : `${totalMB.toFixed(1)} MB`;

  return (
    <header className="no-print h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Right side: Store Branding */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenStoreProfile}
          className="flex items-center gap-3 text-right hover:opacity-85 transition-opacity"
          title="تعديل بيانات المحل واللوجو"
        >
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center overflow-hidden border border-slate-700 shadow-xs">
            {profile?.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt="Logo"
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <Store className="h-5 w-5 text-emerald-400" />
            )}
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
              {profile?.name || 'صيدلية الشفاء والبركة'}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              {profile?.storeType || 'نظام كاشير وإدارة متكامل'}
            </p>
          </div>
        </button>
      </div>

      {/* Left side: Trial status, User role badge, Settings & Logout */}
      <div className="flex items-center gap-3">
        {/* Remote 2-Device Cloud Sync Button */}
        {onOpenCloudSync && (
          <button
            type="button"
            onClick={onOpenCloudSync}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 text-cyan-950 border border-cyan-300 text-xs font-black transition-all shadow-xs cursor-pointer"
            title={`مزامنة جهازين عن بُعد (سيرفر مجاني وباقة 100 ميجا): استهلاك اليوم ${dataDisplay} فقط. انقر لإعداد أو مزامنة الجهاز الثاني.`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                syncStats?.status === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : syncStats?.status === 'syncing' || isSyncing
                  ? 'bg-cyan-500 animate-spin'
                  : 'bg-zinc-400'
              }`}
            ></span>
            <Cloud className="h-3.5 w-3.5 text-cyan-700" />
            <span className="hidden sm:inline">مزامنة جهازين 🔄</span>
            <span className="text-[10px] bg-cyan-200/80 text-cyan-900 px-1.5 py-0.5 rounded-md font-mono font-bold">
              {dataDisplay}
            </span>
          </button>
        )}

        {/* DrugEye Live Link Shortcut */}
        {onOpenDrugEye && (
          <button
            type="button"
            onClick={onOpenDrugEye}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-950 border border-cyan-300 text-xs font-black transition-all shadow-2xs cursor-pointer"
            title="فتح قاعدة بيانات دليل أدوية DrugEye الحية للمطابقة والبحث والتحديث التلقائي"
          >
            <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <Globe className="h-3.5 w-3.5 text-cyan-600" />
            <span>DrugEye Live 🌐</span>
          </button>
        )}

        {/* IndexedDB Ultra Speed Indicator */}
        <div
          className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold"
          title={`قاعدة بيانات IndexedDB الصاروخية نشطة: مسجّل ${products.length} دواء بدون حدود أو بطء (آخر حفظ: ${lastSavedAt})`}
        >
          <Zap className="h-3.5 w-3.5 text-emerald-600 fill-emerald-500" />
          <span>IndexedDB: {products.length.toLocaleString('ar-EG')} دواء</span>
        </div>

        {/* Desktop EXE App Modal button */}
        {onOpenDesktopModal && (
          <button
            type="button"
            onClick={onOpenDesktopModal}
            className="hidden md:flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 px-3 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="تحميل البرنامج كملف EXE وتطبيق سطح مكتب مستقل للكمبيوتر يعمل بدون متصفح"
          >
            <Laptop className="h-3.5 w-3.5 text-indigo-600" />
            <span>تطبيق الكمبيوتر EXE 💻</span>
          </button>
        )}

        {/* Offline HTML Download button */}
        <button
          type="button"
          onClick={downloadOfflineHtmlBundle}
          className="hidden xl:flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-bold transition-all shadow-xs"
          title="تحميل البرنامج كاملاً كملف HTML مستقل يعمل بدون إنترنت نهائياً على أي جهاز كمبيوتر"
        >
          <Download className="h-3.5 w-3.5 text-emerald-600" />
          <span>ملف HTML</span>
        </button>

        {/* Trial Countdown Widget on the side */}
        <TrialCountdownWidget />

        {/* Current User Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
          <div
            className={`h-6 w-6 rounded-lg flex items-center justify-center ${
              currentUser?.role === 'admin'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {currentUser?.role === 'admin' ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <ShoppingCart className="h-3.5 w-3.5" />
            )}
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-800 block text-[11px]">
              {currentUser?.name || 'مستخدم'}
            </span>
            <span className="text-[10px] text-slate-400">
              {currentUser?.role === 'admin' ? 'مدير المحل (صلاحية كاملة)' : 'كاشير (مبيعات فقط)'}
            </span>
          </div>
        </div>

        {/* Settings button (Admin only) */}
        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="الإعدادات وبيانات المحل والنسخ الاحتياطي"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}

        {/* Logout button */}
        <button
          type="button"
          onClick={logout}
          className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
          title="تسجيل الخروج من الحساب"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
