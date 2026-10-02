import React, { useState, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import {
  X,
  Upload,
  FileText,
  FileCode,
  CheckCircle,
  AlertTriangle,
  Download,
  Database,
  ArrowRight,
  Sparkles,
  Layers,
  RefreshCw,
  Search,
  Pill,
  Zap,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  parseMedicinesJSONAsync,
  getSampleMedicinesJSON,
  ParsedMedicineResult,
} from '../utils/medicinesJsonParser';

interface ImportMedicinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportMedicinesModal: React.FC<ImportMedicinesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, importMedicinesJSONAsync } = useStore();

  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'template'>('upload');
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progressState, setProgressState] = useState<{
    percent: number;
    phase: string;
    countText: string;
  }>({
    percent: 0,
    phase: '',
    countText: '',
  });

  const [parseResult, setParseResult] = useState<ParsedMedicineResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update' | 'skip' | 'create_new'>('update');
  const [searchFilter, setSearchFilter] = useState('');
  const [importSummary, setImportSummary] = useState<{
    success: boolean;
    message: string;
    added: number;
    updated: number;
    skipped: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Format file size
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' بايت';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' ك.ب';
    return (bytes / (1024 * 1024)).toFixed(2) + ' م.ب';
  };

  // Handle file select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(formatBytes(file.size));
    setIsParsing(true);
    setProgressState({
      percent: 10,
      phase: 'قراءة الملف من القرص...',
      countText: '',
    });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        setJsonText(content);

        setProgressState({
          percent: 30,
          phase: 'تحليل مصفوفة الأدوية والشرايط...',
          countText: '',
        });

        const result = await parseMedicinesJSONAsync(content, (processed, total) => {
          const pct = Math.min(95, Math.round(30 + (processed / total) * 65));
          setProgressState({
            percent: pct,
            phase: `معالجة ${processed.toLocaleString('ar-EG')} من ${total.toLocaleString('ar-EG')} دواء...`,
            countText: `${processed} / ${total}`,
          });
        });

        setParseResult(result);
        setImportSummary(null);
      } catch (err: any) {
        alert('حدث خطأ أثناء قراءة الملف: ' + (err?.message || 'تنسيق غير صالح'));
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
  };

  // Handle manual paste parse
  const handleParseText = async () => {
    if (!jsonText.trim()) {
      alert('يرجى لصق نص كود JSON أولاً');
      return;
    }
    setIsParsing(true);
    try {
      const result = await parseMedicinesJSONAsync(jsonText, (processed, total) => {
        const pct = Math.round((processed / total) * 100);
        setProgressState({
          percent: pct,
          phase: `تحليل ${processed} من ${total} دواء...`,
          countText: `${processed} / ${total}`,
        });
      });
      setParseResult(result);
      setImportSummary(null);
    } catch (err: any) {
      alert('خطأ في التحليل: ' + (err?.message || ''));
    } finally {
      setIsParsing(false);
    }
  };

  // Load sample template into state
  const handleLoadSample = async () => {
    const sample = getSampleMedicinesJSON();
    setJsonText(sample);
    setFileName('نموذج_أدوية_صيدلية_تجريبي.json');
    setFileSize('10 أدوية');
    setIsParsing(true);
    const result = await parseMedicinesJSONAsync(sample);
    setParseResult(result);
    setActiveTab('upload');
    setImportSummary(null);
    setIsParsing(false);
  };

  // Download template JSON
  const handleDownloadSample = () => {
    const sample = getSampleMedicinesJSON();
    const blob = new Blob([sample], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medicines_template_صيدلية.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Execute fast asynchronous bulk import
  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validMedicines.length === 0) {
      alert('لا توجد أدوية صالحة للإضافة');
      return;
    }

    if (importMode === 'replace') {
      const confirmed = window.confirm(
        `تنبيه هام: اخترت استبدال كامل قائمة الأدوية.\nسيتم حذف ${products.length} دواء مسجل حالياً واستبدالهم بـ ${parseResult.validMedicines.length} دواء من الملف.\n\nهل أنت متأكد من الاستمرار؟`
      );
      if (!confirmed) return;
    }

    setIsImporting(true);
    setProgressState({
      percent: 5,
      phase: 'بدء الاستيراد السريع في IndexedDB...',
      countText: '',
    });

    try {
      const res = await importMedicinesJSONAsync(
        jsonText,
        {
          mode: importMode,
          onDuplicate: duplicateStrategy,
        },
        (processed, total, phase) => {
          const pct = Math.min(100, Math.round((processed / Math.max(1, total)) * 100));
          setProgressState({
            percent: pct,
            phase,
            countText: `${processed.toLocaleString('ar-EG')} / ${total.toLocaleString('ar-EG')}`,
          });
        }
      );

      if (res.success) {
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {}

        setImportSummary({
          success: true,
          message:
            importMode === 'replace'
              ? `تم استبدال وحفظ ${res.addedCount.toLocaleString('ar-EG')} دواء بنجاح في قاعدة بيانات IndexedDB الصاروخية!`
              : `تمت الإضافة بنجاح فائق: إضافة ${res.addedCount.toLocaleString('ar-EG')} دواء جديد وتحديث ${res.updatedCount.toLocaleString('ar-EG')} دواء مسجل مسبقاً!`,
          added: res.addedCount,
          updated: res.updatedCount,
          skipped: res.skippedCount,
        });
      } else {
        setImportSummary({
          success: false,
          message: res.error || 'حدث خطأ أثناء استيراد الأدوية',
          added: 0,
          updated: 0,
          skipped: 0,
        });
      }
    } catch (err: any) {
      alert('خطأ أثناء الاستيراد: ' + (err?.message || ''));
    } finally {
      setIsImporting(false);
    }
  };

  const existingBarcodes = new Set(products.map((p) => p.barcode));

  const duplicateCount = parseResult
    ? parseResult.validMedicines.filter((m) => existingBarcodes.has(m.barcode)).length
    : 0;

  const brandNewCount = parseResult
    ? parseResult.validMedicines.length - duplicateCount
    : 0;

  const previewItems = parseResult
    ? parseResult.validMedicines.filter((m) => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.barcode.includes(q) ||
          (m.activeIngredient && m.activeIngredient.toLowerCase().includes(q))
        );
      })
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-5 bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span>استيراد أدوية فائق السرعة (JSON)</span>
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  محرك IndexedDB الصاروخي
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                استيراد عشرات الآلاف من الأدوية بلمح البصر دون أي تعليق أو تأخير مع حساب الشرايط والأسعار تلقائياً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Progress Overlay / Banner when Parsing or Importing */}
          {(isParsing || isImporting) && (
            <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 text-white space-y-2.5 animate-pulse">
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{progressState.phase || 'جاري المعالجة السريعة...'}</span>
                </div>
                <div className="font-mono text-emerald-300 font-bold">
                  {progressState.countText || `${progressState.percent}%`}
                </div>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-700">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-200 rounded-full"
                  style={{ width: `${progressState.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Banner */}
          {importSummary && (
            <div
              className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between gap-3 ${
                importSummary.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {importSummary.success ? (
                  <CheckCircle className="h-6 w-6 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-rose-400 shrink-0" />
                )}
                <div>
                  <div className="text-sm font-black">{importSummary.message}</div>
                  {importSummary.success && (
                    <div className="text-xs font-normal text-emerald-400/90 mt-1">
                      إجمالي الأدوية المخزنة بقاعدة بيانات IndexedDB الآن:{' '}
                      <span className="font-bold text-white font-mono text-sm">{products.length.toLocaleString('ar-EG')}</span> دواء جاهزة للبيع الفوري
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black transition-colors shadow-lg shadow-emerald-500/20"
              >
                العودة للبرنامج
              </button>
            </div>
          )}

          {/* Source Tabs */}
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'upload'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>اختيار أو سحب ملف JSON</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'paste'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <FileCode className="h-4 w-4" />
              <span>لصق كود JSON مباشرة</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('template')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all mr-auto ${
                activeTab === 'template'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>نموذج أدوية تجريبي جاهز</span>
            </button>
          </div>

          {/* TAB 1: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div
                onClick={() => !isParsing && fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-emerald-500/80 bg-zinc-900/50 hover:bg-zinc-900/80 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="h-14 w-14 rounded-2xl bg-zinc-800 group-hover:bg-emerald-500/10 text-zinc-400 group-hover:text-emerald-400 border border-zinc-700 group-hover:border-emerald-500/30 flex items-center justify-center transition-all">
                  <Upload className="h-7 w-7" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {fileName ? (
                      <span className="text-emerald-400 flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4" />
                        {fileName} <span className="text-zinc-400 text-xs font-mono">({fileSize})</span>
                      </span>
                    ) : (
                      'اضغط هنا لاختيار ملف JSON أو اسحبه هنا (يدعم حتى 100,000 دواء)'
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    يدعم ملفات JSON الضخمة بكل الصيغ مع دمج تلقائي في قاعدة بيانات IndexedDB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Paste JSON */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>الصق نص مصفوفة أو كائن JSON هنا:</span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {jsonText.length > 0 ? `${jsonText.length.toLocaleString('ar-EG')} حرف` : ''}
                </span>
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={`[\n  {\n    "name": "بانادول إكسترا 500 مجم",\n    "activeIngredient": "Paracetamol + Caffeine",\n    "barcode": "622100200103",\n    "sellingPrice": 60,\n    "stripsPerBox": 2,\n    "stockQuantity": 20\n  }\n]`}
                rows={7}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3.5 font-mono text-xs text-emerald-300 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                dir="ltr"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isParsing}
                  onClick={handleParseText}
                  className="flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2 text-xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isParsing ? 'animate-spin' : ''}`} />
                  <span>تحليل ومعاينة النص</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Template & Sample Info */}
          {activeTab === 'template' && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span>نموذج ملف أدوية صيدلية مصرية جاهز (10 أدوية شهيرة)</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    يحتوي النموذج على أشهر أدوية السوق المصري (ألفينترن، أوجمنتين، بانادول، كونجستال، كتافلام، وغيرها) مع بياناتها الكاملة وشرايطها وأسعارها.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-md shadow-emerald-600/20"
                >
                  <Layers className="h-4 w-4" />
                  <span>تحميل النموذج مباشرة للمعاينة والإضافة</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors"
                >
                  <Download className="h-4 w-4 text-emerald-400" />
                  <span>تنزيل ملف JSON للكمبيوتر لتعديله</span>
                </button>
              </div>

              <div className="bg-black/60 rounded-xl p-3 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                <div className="text-zinc-300 font-bold">الحقول المدعومة تلقائياً داخل كل عنصر:</div>
                <div className="font-mono text-zinc-400 dir-ltr text-left">
                  name (اسم_الدواء), activeIngredient (المادة_الفعالة), barcode (الباركود), sellingPrice (سعر_البيع), stripsPerBox (عدد_الشرايط), stripPrice, stockQuantity, category, dosageForm, shelfLocation, expiryDate
                </div>
              </div>
            </div>
          )}

          {/* Parsed Results & Preview Section */}
          {parseResult && (
            <div className="space-y-4 pt-2 border-t border-zinc-800">
              {/* Parse Stats Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-2xl">
                  <div className="text-[11px] text-zinc-400">إجمالي الأدوية بالملف</div>
                  <div className="text-xl font-black text-white mt-0.5 font-mono">
                    {parseResult.validMedicines.length.toLocaleString('ar-EG')}{' '}
                    <span className="text-xs font-normal text-zinc-400 font-sans">دواء</span>
                  </div>
                </div>

                <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-2xl">
                  <div className="text-[11px] text-emerald-400">أصناف جديدة كلياً</div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5 font-mono">
                    {brandNewCount.toLocaleString('ar-EG')} <span className="text-xs font-normal text-zinc-400 font-sans">صنف</span>
                  </div>
                </div>

                <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-2xl">
                  <div className="text-[11px] text-amber-400">تطابق باركود مسجل مسبقاً</div>
                  <div className="text-xl font-black text-amber-400 mt-0.5 font-mono">
                    {duplicateCount.toLocaleString('ar-EG')} <span className="text-xs font-normal text-zinc-400 font-sans">دواء</span>
                  </div>
                </div>

                <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-2xl">
                  <div className="text-[11px] text-zinc-400">الأدوية المسجلة حالياً</div>
                  <div className="text-xl font-black text-zinc-300 mt-0.5 font-mono">
                    {products.length.toLocaleString('ar-EG')} <span className="text-xs font-normal text-zinc-400 font-sans">دواء</span>
                  </div>
                </div>
              </div>

              {/* Errors/Warnings if any */}
              {parseResult.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    <span>ملاحظات أثناء القراءة ({parseResult.errors.length}):</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-400/80 max-h-24 overflow-y-auto">
                    {parseResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {parseResult.errors.length > 5 && (
                      <li>... و {parseResult.errors.length - 5} ملاحظة أخرى</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Import Options Controls */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
                <h4 className="text-xs font-bold text-zinc-200">خيارات الاستيراد والتحديث:</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Mode */}
                  <div>
                    <label className="block text-zinc-400 mb-1.5 font-medium">طريقة الإضافة:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                          importMode === 'merge'
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                        }`}
                      >
                        دمج مع الأدوية الحالية
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                          importMode === 'replace'
                            ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                        }`}
                      >
                        استبدال كامل الأدوية
                      </button>
                    </div>
                  </div>

                  {/* Duplicate Strategy */}
                  <div>
                    <label className="block text-zinc-400 mb-1.5 font-medium">
                      في حال وجود دواء بنفس الباركود:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy('update')}
                        className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                          duplicateStrategy === 'update'
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                        }`}
                      >
                        تحديث البيانات
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy('skip')}
                        className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                          duplicateStrategy === 'skip'
                            ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                        }`}
                      >
                        تخطي المكرر
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy('create_new')}
                        className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                          duplicateStrategy === 'create_new'
                            ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                        }`}
                      >
                        باركود جديد
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-300">معاينة الأدوية التي ستضاف:</span>
                    <span className="text-xs text-zinc-500 font-mono">({previewItems.length.toLocaleString('ar-EG')})</span>
                  </div>

                  <div className="relative w-48 sm:w-64">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-zinc-500">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="تصفية بالاسم أو الباركود..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-1.5 pr-8 pl-3 text-xs text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-zinc-900 text-zinc-400 sticky top-0 border-b border-zinc-800 font-bold">
                        <tr>
                          <th className="py-2.5 px-3">اسم الدواء</th>
                          <th className="py-2.5 px-3">الباركود</th>
                          <th className="py-2.5 px-3">الشرايط</th>
                          <th className="py-2.5 px-3">سعر العلبة</th>
                          <th className="py-2.5 px-3">سعر الشريط</th>
                          <th className="py-2.5 px-3">الرصيد</th>
                          <th className="py-2.5 px-3">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-medium">
                        {previewItems.slice(0, 50).map((med, idx) => {
                          const isDup = existingBarcodes.has(med.barcode);
                          return (
                            <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                              <td className="py-2 px-3">
                                <div className="font-bold text-white truncate max-w-xs" title={med.name}>
                                  {med.name}
                                </div>
                                {med.activeIngredient && (
                                  <div className="text-[10px] text-zinc-500 truncate max-w-xs">
                                    {med.activeIngredient}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-zinc-400">
                                {med.barcode}
                              </td>
                              <td className="py-2 px-3">
                                <span className="bg-zinc-800 px-2 py-0.5 rounded-md text-[11px] font-bold text-emerald-400">
                                  {med.stripsPerBox} {med.stripsPerBox > 1 ? 'شرايط' : 'عبوة'}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-bold text-white font-mono">
                                {med.sellingPrice} ج.م
                              </td>
                              <td className="py-2 px-3 font-bold text-emerald-400 font-mono">
                                {med.stripPrice} ج.م
                              </td>
                              <td className="py-2 px-3 font-bold text-zinc-300">
                                {med.stockQuantity} {med.unit}
                              </td>
                              <td className="py-2 px-3">
                                {isDup ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                                    موجود مسبقاً
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                                    جديد
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {previewItems.length > 50 && (
                    <div className="p-2 text-center text-[11px] text-zinc-500 border-t border-zinc-800">
                      يتم عرض أول 50 دواء من إجمالي {previewItems.length.toLocaleString('ar-EG')} دواء
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-zinc-800 p-4 sm:p-5 bg-zinc-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 text-center sm:text-right">
            {parseResult ? (
              <span>
                جاهز لإضافة <strong className="text-white font-black font-mono">{parseResult.validMedicines.length.toLocaleString('ar-EG')}</strong> دواء إلى محرك IndexedDB الصاروخي
              </span>
            ) : (
              <span>يرجى اختيار ملف JSON أو لصق كود الأدوية للبدء</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={isImporting}
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="button"
              disabled={isImporting || !parseResult || parseResult.validMedicines.length === 0}
              onClick={handleConfirmImport}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                !isImporting && parseResult && parseResult.validMedicines.length > 0
                  ? 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 shadow-lg shadow-emerald-500/20 cursor-pointer'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-800'
              }`}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري الحفظ الفائق في IndexedDB...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>
                    {importMode === 'replace'
                      ? `استبدال الأدوية وحفظ (${parseResult?.validMedicines.length.toLocaleString('ar-EG') || 0}) دواء`
                      : `إضافة (${parseResult?.validMedicines.length.toLocaleString('ar-EG') || 0}) دواء إلى IndexedDB`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
