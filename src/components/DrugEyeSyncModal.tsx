import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import {
  X,
  Search,
  RefreshCw,
  Zap,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Pill,
  Building,
  Layers,
  Plus,
  Sliders,
  Check,
  Globe,
  Radio,
  DownloadCloud,
  Database,
  Wifi,
  WifiOff,
  Server,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  searchDrugEyeLive,
  syncInventoryWithDrugEye,
  checkDrugEyeConnection,
  convertDrugEyeToProduct,
  downloadAllDrugEyeMasterCatalog,
  getDrugEyeOfflineStatus,
  getPreloadedEgyptianMedicines,
  DrugEyeMedicine,
  DrugEyeSyncUpdate,
  DrugEyeSettings,
  DEFAULT_DRUGEYE_SETTINGS,
} from '../utils/drugeye';
import { calculateStripPrice } from '../utils/pharmacy';

interface DrugEyeSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const DrugEyeSyncModal: React.FC<DrugEyeSyncModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
}) => {
  const { products, addProduct, updateProduct, profile } = useStore();

  const [activeTab, setActiveTab] = useState<'search' | 'sync' | 'download_master' | 'settings'>(
    'search'
  );
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DrugEyeMedicine[]>(() => getPreloadedEgyptianMedicines());
  const [searchSource, setSearchSource] = useState<string>('قاعدة بيانات الأدوية المصرية المدمجة (أوفلاين وأونلاين 🌐)');
  const [searchError, setSearchError] = useState<string>('');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncUpdates, setSyncUpdates] = useState<DrugEyeSyncUpdate[]>([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Set<string>>(new Set());
  const [syncProgress, setSyncProgress] = useState<{ checked: number; total: number }>({
    checked: 0,
    total: 0,
  });
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string>('');

  // Full master catalog download state
  const [isDownloadingMaster, setIsDownloadingMaster] = useState(false);
  const [masterProgress, setMasterProgress] = useState<{
    step: string;
    processed: number;
    total: number;
  }>({ step: '', processed: 0, total: 0 });
  const [masterSuccessMsg, setMasterSuccessMsg] = useState<string>('');

  // Offline status
  const [offlineStatus, setOfflineStatus] = useState<{
    count: number;
    lastSyncDate: string | null;
    hasOfflineData: boolean;
  }>({ count: 0, lastSyncDate: null, hasOfflineData: false });

  // Settings
  const [settings, setSettings] = useState<DrugEyeSettings>(() => {
    const saved = localStorage.getItem('pos_drugeye_settings_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_DRUGEYE_SETTINGS;
  });

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<{ online: boolean; message: string }>({
    online: true,
    message: 'جاري التحقق من الاتصال...',
  });

  const refreshOfflineInfo = () => {
    getDrugEyeOfflineStatus().then(setOfflineStatus);
  };

  // Check connection and status on open
  useEffect(() => {
    if (isOpen) {
      checkDrugEyeConnection().then(setConnectionStatus);
      refreshOfflineInfo();
      if (initialQuery) {
        setSearchQuery(initialQuery);
        handleLiveSearch(initialQuery);
      } else {
        const preloaded = getPreloadedEgyptianMedicines(selectedCategory);
        setSearchResults(preloaded);
        setSearchSource('دليل الأدوية المصرية المدمج بالبرنامج (جاهز للعمل أوفلاين ⚡)');
      }
    }
  }, [isOpen, initialQuery]);

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setSearchQuery('');
    const preloaded = getPreloadedEgyptianMedicines(cat);
    setSearchResults(preloaded);
    setSearchSource(`أدوية تصنيف "${cat}" — جاهزة ومسجلة بأسعارها الرسمية`);
    setSearchError('');
  };

  if (!isOpen) return null;

  // Handle live search
  const handleLiveSearch = async (q?: string) => {
    const targetQuery = q !== undefined ? q : searchQuery;
    if (!targetQuery.trim()) {
      const preloaded = getPreloadedEgyptianMedicines(selectedCategory);
      setSearchResults(preloaded);
      setSearchSource('دليل الأدوية المصرية المدمج بالبرنامج');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      const res = await searchDrugEyeLive(targetQuery);
      if (res.success) {
        setSearchResults(res.medicines);
        setSearchSource(res.source || '');
        if (res.medicines.length === 0) {
          setSearchError(`لم يتم العثور على أدوية مطابقة لـ "${targetQuery}"`);
        }
      } else {
        setSearchError(res.error || 'تعذر جلب نتائج من قاعدة البيانات');
        setSearchResults([]);
      }
    } catch (err: any) {
      setSearchError(err?.message || 'خطأ في الاتصال');
    } finally {
      setIsSearching(false);
    }
  };

  // Add single medicine from DrugEye to pharmacy inventory
  const handleAddDrugToInventory = (med: DrugEyeMedicine) => {
    const converted = convertDrugEyeToProduct(med);
    addProduct(converted);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {}

    alert(`تمت إضافة "${med.name}" بنجاح إلى مخزن الصيدلية مع حساب الشرايط والأسعار تلقائياً!`);
  };

  // Run full master catalog download
  const handleDownloadMasterCatalog = async () => {
    setIsDownloadingMaster(true);
    setMasterSuccessMsg('');

    try {
      const res = await downloadAllDrugEyeMasterCatalog((step, processed, total) => {
        setMasterProgress({ step, processed, total });
      });

      if (res.success) {
        setMasterSuccessMsg(res.message);
        refreshOfflineInfo();

        try {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {}
      }
    } catch (err: any) {
      alert('خطأ أثناء تنزيل مكتبة الأدوية: ' + (err?.message || ''));
    } finally {
      setIsDownloadingMaster(false);
    }
  };

  // Run batch sync against DrugEye
  const handleRunSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMsg('');
    setSyncUpdates([]);
    setSelectedUpdates(new Set());

    try {
      const res = await syncInventoryWithDrugEye(products, (checked, total) => {
        setSyncProgress({ checked, total });
      });

      if (res.success) {
        setSyncUpdates(res.updates);
        // Select all by default
        const allKeys = new Set(res.updates.map((u) => u.originalName));
        setSelectedUpdates(allKeys);

        if (res.updates.length === 0) {
          setSyncSuccessMsg('كافة الأدوية في صيدليتك متوافقة ومطابقة لأحدث الأسعار الرسمية في DrugEye!');
        }
      } else {
        alert(res.error || 'فشلت المزامنة مع قاعدة بيانات DrugEye');
      }
    } catch (err: any) {
      alert('خطأ أثناء المزامنة: ' + (err?.message || ''));
    } finally {
      setIsSyncing(false);
    }
  };

  // Apply selected updates to local inventory
  const handleApplyUpdates = () => {
    if (selectedUpdates.size === 0) {
      alert('يرجى اختيار الأدوية المراد تحديثها');
      return;
    }

    let updatedCount = 0;

    syncUpdates.forEach((up) => {
      if (!selectedUpdates.has(up.originalName)) return;

      const matchedProduct = products.find((p) => p.name === up.originalName || p.barcode === up.barcode);
      if (matchedProduct) {
        const stripsCount = Math.max(1, up.stripsPerBox || matchedProduct.stripsPerBox || 1);
        const newSellingPrice = up.officialPrice || matchedProduct.sellingPrice;
        const newStripPrice = calculateStripPrice(newSellingPrice, stripsCount);

        updateProduct(matchedProduct.id, {
          sellingPrice: newSellingPrice,
          stripPrice: newStripPrice,
          activeIngredient: up.activeIngredient || matchedProduct.activeIngredient,
          category: up.category || matchedProduct.category,
        });

        updatedCount++;
      }
    });

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    setSyncSuccessMsg(`تم تحديث بيانات وأسعار ${updatedCount} دواء بنجاح وفق قاعدة بيانات DrugEye الرسمية!`);
    setSyncUpdates([]);
  };

  const toggleSelectUpdate = (name: string) => {
    setSelectedUpdates((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const saveSettings = (newSettings: DrugEyeSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pos_drugeye_settings_v1', JSON.stringify(newSettings));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4 sm:p-5 bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-inner">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span>دليل أدوية DrugEye للمزامنة والعمل أوفلاين</span>
                </h2>
                {connectionStatus.online ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-black flex items-center gap-1">
                    <Wifi className="h-3 w-3 text-emerald-400" />
                    متصل أونلاين
                  </span>
                ) : (
                  <span className="text-[10px] bg-zinc-700/50 text-zinc-300 border border-zinc-600 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <WifiOff className="h-3 w-3 text-zinc-400" />
                    أوفلاين (يعمل بالبيانات المخزنة)
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                تنزيل التحديثات بالكامل من الإنترنت وحفظها على جهازك لتعمل أوفلاين بسرعة صاروخية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Offline Library Status Badge */}
        <div className="bg-zinc-900/90 border-b border-zinc-800 px-5 py-2.5 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2 text-zinc-300">
            <Database className="h-4 w-4 text-cyan-400" />
            <span>
              مكتبة الأدوية المحفوظة محلياً على جهازك: <strong className="text-white font-mono">{offlineStatus.count.toLocaleString('ar-EG')}</strong> دواء
            </span>
            {offlineStatus.lastSyncDate && (
              <span className="text-zinc-500 text-[11px]">
                (آخر تحديث: {new Date(offlineStatus.lastSyncDate).toLocaleDateString('ar-EG')} - {new Date(offlineStatus.lastSyncDate).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('download_master')}
            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30"
          >
            <DownloadCloud className="h-3.5 w-3.5" />
            <span>تنزيل / تجديد التحديثات الآن</span>
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-zinc-800 px-5 pt-3 bg-zinc-900/40 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 shrink-0 ${
              activeTab === 'search'
                ? 'border-cyan-400 text-cyan-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>بحث فوري (أونلاين / أوفلاين)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('download_master')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 shrink-0 ${
              activeTab === 'download_master'
                ? 'border-cyan-400 text-cyan-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <DownloadCloud className="h-4 w-4" />
            <span>تنزيل مكتبة الأدوية بالكامل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 shrink-0 ${
              activeTab === 'sync'
                ? 'border-cyan-400 text-cyan-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <RefreshCw className="h-4 w-4" />
            <span>تحديث أسعار المخزن</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 mr-auto shrink-0 ${
              activeTab === 'settings'
                ? 'border-cyan-400 text-cyan-400 bg-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>الإعدادات</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* TAB 1: Live Search */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              {/* Search input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLiveSearch();
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-zinc-500">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="اكتب اسم الدواء بالإنجليزية أو العربية (مثال: Panadol, Alphintern, Augmentin, Congestal)..."
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 py-3 pr-10 pl-4 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black text-xs transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${isSearching ? 'animate-spin' : ''}`} />
                  <span>{isSearching ? 'جاري البحث...' : 'بحث'}</span>
                </button>
              </form>

              {/* Quick Category Filters for Egyptian Medicines */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  'الكل',
                  'مسكنات وخافض حرارة',
                  'مضاد حيوي',
                  'أدوية البرد',
                  'مضادات التورم',
                  'مسكنات العظام',
                  'خافض حرارة للأطفال',
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-cyan-500 text-zinc-950 font-black shadow-xs'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Error Message */}
              {searchError && (
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Source tag */}
              {searchSource && (
                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-cyan-400" />
                  <span>المصدر: {searchSource}</span>
                </div>
              )}

              {/* Search Results Table */}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-bold text-white">
                      نتائج البحث ({searchResults.length} دواء):
                    </span>
                    <span className="text-[11px] text-cyan-400">
                      اضغط "إضافة للصيدلية" لإدراجه فوراً بالمخزن مع حساب الشرايط
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchResults.map((med, idx) => {
                      const existing = products.find(
                        (p) => p.name.toLowerCase() === med.name.toLowerCase()
                      );
                      const stripsCount = Math.max(1, med.stripsPerBox || 1);
                      const stripPrice = calculateStripPrice(med.price, stripsCount);

                      return (
                        <div
                          key={idx}
                          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2.5 flex flex-col justify-between hover:border-cyan-500/50 transition-all"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold text-sm text-white leading-snug">{med.name}</h4>
                              <span className="font-black text-sm text-cyan-400 font-mono shrink-0">
                                {med.price} {profile?.currency || 'ج.م'}
                              </span>
                            </div>

                            {med.activeIngredient && (
                              <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                                <Pill className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate">{med.activeIngredient}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
                              {med.company && (
                                <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 font-medium">
                                  {med.company}
                                </span>
                              )}
                              {med.category && (
                                <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                                  {med.category}
                                </span>
                              )}
                              {stripsCount > 1 && (
                                <span className="bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-bold">
                                  {stripsCount} شرايط (الشريط بـ {stripPrice.toFixed(2)} ج.م)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                            {existing ? (
                              <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                                <Check className="h-3.5 w-3.5" />
                                <span>مسجل بالمخزن (السعر الحالي: {existing.sellingPrice} ج.م)</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-zinc-500 font-normal">
                                غير مضاف للصيدلية بعد
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAddDrugToInventory(med)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-zinc-950 font-bold text-xs border border-cyan-500/40 transition-all cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>{existing ? 'تحديث / إضافة كمية' : 'إضافة للصيدلية'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Full Master Catalog Download (Online to Offline) */}
          {activeTab === 'download_master' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/30 to-zinc-900/60 p-5 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shrink-0">
                    <DownloadCloud className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-white">
                      تنزيل وتحديث مكتبة أدوية DrugEye بالكامل للعمل أوفلاين
                    </h3>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      عند الضغط على الزر وأنت متصل بالنت، سيقوم النظام بتنزيل آلاف الأدوية المصرية بتسعيراتها الرسمية وموادها الفعالة والشركات المصنعة وحفظها بشكل دائم في قاعدة بيانات جهازك (IndexedDB). بعد ذلك سيعمل النظام أوفلاين 100% بدون نت بالبيانات التي تم تنزيلها!
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">حالة البيانات المخزنة أوفلاين:</span>
                    <span className="font-bold text-white font-mono">
                      {offlineStatus.count.toLocaleString('ar-EG')} دواء مسجل محلياً
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">تاريخ آخر مزامنة من النت:</span>
                    <span className="font-mono text-cyan-400">
                      {offlineStatus.lastSyncDate
                        ? `${new Date(offlineStatus.lastSyncDate).toLocaleDateString('ar-EG')} - ${new Date(offlineStatus.lastSyncDate).toLocaleTimeString('ar-EG')}`
                        : 'تم التحميل مع النسخة'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    disabled={isDownloadingMaster}
                    onClick={handleDownloadMasterCatalog}
                    className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-zinc-950 font-black text-sm transition-all shadow-xl shadow-cyan-500/25 disabled:opacity-50 cursor-pointer"
                  >
                    <DownloadCloud className={`h-5 w-5 ${isDownloadingMaster ? 'animate-bounce' : ''}`} />
                    <span>
                      {isDownloadingMaster
                        ? 'جاري تنزيل وتحديث الأدوية من الإنترنت...'
                        : 'تحديث وتنزيل كل أدوية DrugEye الآن 📥'}
                    </span>
                  </button>
                </div>

                {isDownloadingMaster && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="flex justify-between text-xs text-zinc-300 font-mono">
                      <span className="truncate">{masterProgress.step}</span>
                      <span className="shrink-0">
                        {masterProgress.processed} / {masterProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300"
                        style={{
                          width: `${
                            masterProgress.total > 0
                              ? (masterProgress.processed / masterProgress.total) * 100
                              : 10
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {masterSuccessMsg && (
                  <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 text-xs font-bold text-emerald-300 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span>{masterSuccessMsg}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Batch Sync Inventory with DrugEye */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-cyan-400" />
                      <span>فحص ومزامنة أسعار أدوية صيدليتك الحالية</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      يقوم السيستم بفحص أسعار الأدوية المسجلة لديك ومطابقتها وتعديل أسعار الشرايط والعلب بنقرة واحدة
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={handleRunSync}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'جاري الفحص...' : 'فحص ومطابقة الأسعار'}</span>
                  </button>
                </div>

                {isSyncing && (
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                    <div className="flex justify-between text-xs text-zinc-400 font-mono">
                      <span>جاري مطابقة الأدوية...</span>
                      <span>
                        {syncProgress.checked} / {syncProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full transition-all duration-300"
                        style={{
                          width: `${
                            syncProgress.total > 0
                              ? (syncProgress.checked / syncProgress.total) * 100
                              : 20
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Success Msg */}
              {syncSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span>{syncSuccessMsg}</span>
                </div>
              )}

              {/* Updates List Table */}
              {syncUpdates.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">
                      الأدوية التي تم العثور عليها وتحديثاتها ({syncUpdates.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedUpdates.size === syncUpdates.length) {
                          setSelectedUpdates(new Set());
                        } else {
                          setSelectedUpdates(new Set(syncUpdates.map((u) => u.originalName)));
                        }
                      }}
                      className="text-cyan-400 hover:underline font-bold text-xs"
                    >
                      {selectedUpdates.size === syncUpdates.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                    </button>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-zinc-900 text-zinc-400 sticky top-0 border-b border-zinc-800 font-bold">
                          <tr>
                            <th className="py-2.5 px-3">اختيار</th>
                            <th className="py-2.5 px-3">اسم الدواء بالمخزن</th>
                            <th className="py-2.5 px-3">الاسم المطابق</th>
                            <th className="py-2.5 px-3">السعر الحالي</th>
                            <th className="py-2.5 px-3">السعر الرسمي</th>
                            <th className="py-2.5 px-3">حالة السعر</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 font-medium">
                          {syncUpdates.map((up, idx) => {
                            const isSelected = selectedUpdates.has(up.originalName);
                            return (
                              <tr
                                key={idx}
                                onClick={() => toggleSelectUpdate(up.originalName)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected ? 'bg-cyan-950/20' : 'hover:bg-zinc-800/40'
                                }`}
                              >
                                <td className="py-2 px-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectUpdate(up.originalName)}
                                    className="rounded border-zinc-700 text-cyan-500 focus:ring-cyan-500"
                                  />
                                </td>
                                <td className="py-2 px-3 font-bold text-white">{up.originalName}</td>
                                <td className="py-2 px-3 text-cyan-300 font-mono text-[11px]">
                                  {up.matchedDrugEyeName}
                                </td>
                                <td className="py-2 px-3 font-mono text-zinc-400">
                                  {up.currentPrice || 0} ج.م
                                </td>
                                <td className="py-2 px-3 font-mono font-bold text-cyan-400">
                                  {up.officialPrice} ج.م
                                </td>
                                <td className="py-2 px-3">
                                  {up.priceChanged ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1 w-max">
                                      <TrendingUp className="h-3 w-3" />
                                      تغير في السعر
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                                      مطابق للرسمي
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleApplyUpdates}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>تطبيق التحديثات المحددة ({selectedUpdates.size}) على المخزن</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Settings */}
          {activeTab === 'settings' && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
              <h3 className="font-bold text-sm text-white">إعدادات المزامنة والربط مع دليل الأدوية:</h3>

              <div className="space-y-3 text-xs">
                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                  <div>
                    <div className="font-bold text-white">فحص تلقائي للتحديثات عند فتح البرنامج</div>
                    <div className="text-zinc-400 text-[11px] mt-0.5">
                      يتحقق من وجود أي تعديلات على أسعار الأدوية عند تشغيل السيستم
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoSyncOnStartup}
                    onChange={(e) =>
                      saveSettings({ ...settings, autoSyncOnStartup: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-cyan-500 focus:ring-cyan-500 border-zinc-700"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                  <div>
                    <div className="font-bold text-white">تعبئة المادة الفعالة والشركة المصنعة تلقائياً</div>
                    <div className="text-zinc-400 text-[11px] mt-0.5">
                      تحديث المواد الفعالة والشركات المصنعة الناقصة من قاعدة بيانات DrugEye
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoFillActiveIngredients}
                    onChange={(e) =>
                      saveSettings({ ...settings, autoFillActiveIngredients: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-cyan-500 focus:ring-cyan-500 border-zinc-700"
                  />
                </label>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white">رابط السيرفر السحابي (Cloud Server URL) للمزامنة وملف الـ HTML:</div>
                    <button
                      type="button"
                      onClick={() => {
                        checkDrugEyeConnection().then((res) => {
                          setConnectionStatus(res);
                          alert(res.online ? '🟢 الاتصال بالسيرفر السحابي ناجح بنشاط!' : '⚪ يعمل حالياً في وضع الأوفلاين المحلي');
                        });
                      }}
                      className="text-[11px] bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold px-2.5 py-1 rounded-lg border border-cyan-500/40 cursor-pointer"
                    >
                      فحص الاتصال بالسيرفر ⚡
                    </button>
                  </div>
                  <div className="font-mono text-cyan-300 text-[11px] bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 break-all dir-ltr text-left">
                    https://ais-dev-mrag7yx55poebveh5tgqtc-111982313627.europe-west2.run.app
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{connectionStatus.message}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="font-bold text-zinc-300 text-[11px]">رابط خادم DrugEye الأصلي:</div>
                  <div className="font-mono text-zinc-500 text-[10px] bg-zinc-900 p-2 rounded-lg border border-zinc-800 break-all dir-ltr text-left">
                    https://drugeye.pharorg.com/drugeyeapp/android-search/drugeye-android-live-go.aspx
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-4 bg-zinc-900/80 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                connectionStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
              }`}
            ></span>
            <span>
              {connectionStatus.online
                ? 'متصل بالإنترنت وقاعدة بيانات DrugEye جاهزة'
                : 'وضع الأوفلاين: البيانات المخزنة محلياً جاهزة وسريعة'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
