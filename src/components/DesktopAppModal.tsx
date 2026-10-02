import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  X,
  Laptop,
  Download,
  CheckCircle2,
  FileCode,
  Package,
  Sparkles,
  Zap,
  FolderArchive,
  Terminal,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface DesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({ isOpen, onClose }) => {
  const { downloadOfflineHtmlBundle } = useStore();
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadZip = () => {
    soundManager.playCashRegister();
    const a = document.createElement('a');
    a.href = '/PharmacyPOS_Windows_Desktop_EXE.zip';
    a.download = 'PharmacyPOS_Windows_Desktop_EXE.zip';
    a.click();
    setDownloadSuccess('جاري تنزيل حزمة تطبيق سطح المكتب الشاملة (ZIP)!');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleDownloadBatLauncher = () => {
    soundManager.playCashRegister();
    const batchContent = `@echo off
chcp 65001 > nul
title نظام إدارة الصيدليات ونقاط البيع - د. محمود حمدي بصري
cls
echo ====================================================================
echo        نظام كاشير وإدارة الصيدليات - د. محمود حمدي بصري
echo                    تطبيق سطح المكتب للكمبيوتر
echo ====================================================================
echo.
echo جاري تشغيل البرنامج في نافذة سطح مكتب مستقلة...
echo.

set "HTML_FILE=%~dp0نظام_الكاشير_والمخازن_محمود_حمدي_بصري.html"
if not exist "%HTML_FILE%" set "HTML_FILE=%~dp0index.html"

:: 1. Try Microsoft Edge in dedicated standalone App Mode
where msedge >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start "" msedge --app="%HTML_FILE%" --window-size=1366,768 --start-maximized
    exit /b 0
)

:: 2. Try Google Chrome in dedicated App Mode
where chrome >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start "" chrome --app="%HTML_FILE%" --window-size=1366,768 --start-maximized
    exit /b 0
)

:: 3. Try standard Windows default browser
start "" "%HTML_FILE%"
exit /b 0
`;
    const blob = new Blob([batchContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'تشغيل_البرنامج_كتطبيق_سطح_مكتب.bat';
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('تم تنزيل ملف تشغيل سطح المكتب (.bat) بنجاح!');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl p-5 sm:p-7 space-y-6 my-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800/90 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-inner">
              <Laptop className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  تحويل وتشغيل البرنامج كملف EXE وتطبيق سطح مكتب
                </h2>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                  Windows PC
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                تشغيل السيستم كنافذة برنامج مستقلة على شاشات الكاشير وسطح المكتب بدون متصفح
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

        {/* Success alert */}
        {downloadSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Primary Download Card: Full Windows EXE Suite */}
        <div className="rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/50 via-zinc-900/80 to-emerald-950/40 p-5 sm:p-6 space-y-4 relative overflow-hidden shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">
                  حزمة تشغيل الكمبيوتر الكاملة (ZIP شامل الـ EXE والملفات)
                </h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-xl">
                تحتوي على ملف البرنامج الشامل مع أداة التجميع لإنشاء ملف <strong>PharmacyPOS_App.exe</strong> تلقائياً،
                وملف تشغيل سطح المكتب بنقرة واحدة.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadZip}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-zinc-950 font-black px-6 py-3.5 rounded-2xl text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-[1.02] cursor-pointer shrink-0"
            >
              <FolderArchive className="h-4 w-4" />
              <span>تحميل حزمة الـ EXE (ملف ZIP) 📥</span>
            </button>
          </div>
        </div>

        {/* Alternative Fast Download Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option A: Standalone HTML */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <FileCode className="h-4 w-4" />
                <span>ملف الـ HTML الشامل (Single-File)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                ملف واحد يحتوي على كل شيء (كاشير، مخازن، قاعدة بيانات، DrugEye) يعمل بدون برامج إضافية.
              </p>
            </div>

            <button
              type="button"
              onClick={downloadOfflineHtmlBundle}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border border-emerald-500/30 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>تنزيل ملف الـ HTML المستقل</span>
            </button>
          </div>

          {/* Option B: Direct .BAT Desktop Launcher */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <Terminal className="h-4 w-4" />
                <span>ملف التشغيل المباشر (.BAT Launcher)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                يفتح البرنامج كنافذة سطح مكتب منفصلة كبرنامج EXE مستقل على شاشة الكاشير بدون شريط المتصفح.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadBatLauncher}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-cyan-500/30 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>تنزيل ملف التشغيل (.BAT)</span>
            </button>
          </div>
        </div>

        {/* Visual Instructions */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5 space-y-3 text-xs text-zinc-300">
          <h4 className="font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>خطوات تشغيل وتوليد ملف EXE على جهازك:</span>
          </h4>

          <ol className="list-decimal list-inside space-y-2 text-zinc-400 leading-relaxed">
            <li>
              قم بتنزيل <strong className="text-zinc-200">ملف الـ ZIP</strong> أعلاه وفك الضغط عنه على سطح المكتب (Desktop).
            </li>
            <li>
              ستجد ملفاً باسم <strong className="text-cyan-300">انشاء_ملف_EXE_تلقائيا.bat</strong> — انقر عليه مرتين ليتم إنشاء ملف <strong className="text-emerald-300">PharmacyPOS_App.exe</strong> فورياً على جهازك.
            </li>
            <li>
              يمكنك أيضاً النقر مرتين على <strong className="text-cyan-300">تشغيل_البرنامج_كتطبيق_سطح_مكتب.bat</strong> لفتحه مباشرة في وضع الـ Desktop App (ملء الشاشة مع حفظ البيانات).
            </li>
          </ol>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800/80 pt-4 flex items-center justify-between text-xs text-zinc-400">
          <span>نظام د. محمود حمدي بصري — متوافق مع Windows 7, 8, 10, 11</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
