import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import {
  Package,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  Tag,
  Sparkles,
  Barcode,
  Pill,
  Calculator,
  Upload,
  Download,
  Database,
  Zap,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  ArrowUpDown,
} from 'lucide-react';
import { BarcodeLabelGenerator } from '../components/BarcodeLabelGenerator';
import { ImportMedicinesModal } from '../components/ImportMedicinesModal';
import { DrugEyeSyncModal } from '../components/DrugEyeSyncModal';
import { calculateStripPrice, formatPharmacyStock } from '../utils/pharmacy';

export const InventoryView: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    quickAdjustStock,
    profile,
    exportMedicinesJSON,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Pagination state for ultra-fast rendering with 10,000+ items
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'expiry'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal for adding / editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Import medicines JSON modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // DrugEye Live Sync Modal
  const [isDrugEyeModalOpen, setIsDrugEyeModalOpen] = useState(false);

  // Barcode generator modal
  const [isBarcodeGeneratorOpen, setIsBarcodeGeneratorOpen] = useState(false);
  const [barcodeTargetProduct, setBarcodeTargetProduct] = useState<Product | null>(null);

  // Debounce search query to prevent lag on fast keystrokes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1); // Reset to page 1 on new query
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    activeIngredient: '',
    category: 'أقراص وكبسولات',
    dosageForm: 'أقراص مغلفة',
    shelfLocation: 'A-01',
    expiryDate: '2027-12',
    stripsPerBox: 3,
    purchasePrice: 380,
    sellingPrice: 500,
    stripPrice: 166.67,
    boxesStock: 10,
    looseStripsStock: 0,
    minStockAlert: 5,
    unit: 'علبة',
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < products.length; i++) {
      if (products[i].category) set.add(products[i].category);
    }
    return ['الكل', ...Array.from(set)];
  }, [products]);

  // High-performance filter & sort
  const filteredProducts = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    const hasQuery = query.length > 0;
    const isCatAll = selectedCategory === 'الكل';

    return products.filter((p) => {
      if (!isCatAll && p.category !== selectedCategory) return false;
      if (onlyLowStock && p.stockQuantity > p.minStockAlert) return false;
      if (!hasQuery) return true;

      return (
        p.name.toLowerCase().includes(query) ||
        p.barcode.includes(query) ||
        (p.activeIngredient && p.activeIngredient.toLowerCase().includes(query)) ||
        (p.shelfLocation && p.shelfLocation.toLowerCase().includes(query)) ||
        p.category.toLowerCase().includes(query)
      );
    }).sort((a, b) => {
      let comp = 0;
      if (sortBy === 'name') comp = a.name.localeCompare(b.name, 'ar');
      else if (sortBy === 'price') comp = a.sellingPrice - b.sellingPrice;
      else if (sortBy === 'stock') comp = a.stockQuantity - b.stockQuantity;
      else if (sortBy === 'expiry') comp = (a.expiryDate || '').localeCompare(b.expiryDate || '');
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [products, selectedCategory, onlyLowStock, debouncedQuery, sortBy, sortOrder]);

  // Pagination calculation
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, validPage, pageSize]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: '622' + Math.floor(100000000 + Math.random() * 900000000).toString(),
      activeIngredient: '',
      category: 'أقراص وكبسولات',
      dosageForm: 'أقراص مغلفة',
      shelfLocation: 'A-01',
      expiryDate: '2027-12',
      stripsPerBox: 3,
      purchasePrice: 380,
      sellingPrice: 500,
      stripPrice: 166.67,
      boxesStock: 15,
      looseStripsStock: 0,
      minStockAlert: 5,
      unit: 'علبة',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    const safeStripsPerBox = Math.max(1, p.stripsPerBox || 1);
    const totalStrips =
      typeof p.totalStripsStock === 'number'
        ? p.totalStripsStock
        : Math.round((p.stockQuantity || 0) * safeStripsPerBox);
    const boxes = Math.floor(totalStrips / safeStripsPerBox);
    const looseStrips = totalStrips % safeStripsPerBox;

    setFormData({
      name: p.name,
      barcode: p.barcode,
      activeIngredient: p.activeIngredient || '',
      category: p.category,
      dosageForm: p.dosageForm || 'أقراص',
      shelfLocation: p.shelfLocation || '',
      expiryDate: p.expiryDate || '',
      stripsPerBox: safeStripsPerBox,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      stripPrice: p.stripPrice || calculateStripPrice(p.sellingPrice, safeStripsPerBox),
      boxesStock: boxes,
      looseStripsStock: looseStrips,
      minStockAlert: p.minStockAlert,
      unit: p.unit || 'علبة',
    });
    setIsModalOpen(true);
  };

  const handleSellingPriceChange = (val: number) => {
    const safeStrips = Math.max(1, Number(formData.stripsPerBox) || 1);
    const newStripPrice = calculateStripPrice(val, safeStrips);
    setFormData((prev) => ({
      ...prev,
      sellingPrice: val,
      stripPrice: newStripPrice,
    }));
  };

  const handleStripsCountChange = (val: number) => {
    const safeStrips = Math.max(1, val);
    const newStripPrice = calculateStripPrice(Number(formData.sellingPrice) || 0, safeStrips);
    setFormData((prev) => ({
      ...prev,
      stripsPerBox: safeStrips,
      stripPrice: newStripPrice,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.barcode.trim()) {
      alert('يرجى كتابة اسم الدواء والباركود');
      return;
    }

    const stripsPerBox = Math.max(1, Number(formData.stripsPerBox) || 1);
    const sellingPrice = Math.max(0, Number(formData.sellingPrice) || 0);
    const purchasePrice = Math.max(0, Number(formData.purchasePrice) || 0);
    const autoStripPrice = calculateStripPrice(sellingPrice, stripsPerBox);
    const stripPrice = Number(formData.stripPrice) > 0 ? Number(formData.stripPrice) : autoStripPrice;
    const stripPurchasePrice = calculateStripPrice(purchasePrice, stripsPerBox);

    const boxes = Math.max(0, Number(formData.boxesStock) || 0);
    const looseStrips = Math.max(0, Number(formData.looseStripsStock) || 0);
    const totalStripsStock = boxes * stripsPerBox + looseStrips;
    const stockQuantity = Number((totalStripsStock / stripsPerBox).toFixed(2));

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        activeIngredient: formData.activeIngredient.trim(),
        category: formData.category,
        dosageForm: formData.dosageForm,
        shelfLocation: formData.shelfLocation.trim(),
        expiryDate: formData.expiryDate.trim(),
        stripsPerBox,
        purchasePrice,
        sellingPrice,
        stripPrice,
        stripPurchasePrice,
        totalStripsStock,
        stockQuantity,
        minStockAlert: Number(formData.minStockAlert) || 5,
        unit: formData.unit || 'علبة',
      });
    } else {
      addProduct({
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        activeIngredient: formData.activeIngredient.trim(),
        category: formData.category,
        dosageForm: formData.dosageForm,
        shelfLocation: formData.shelfLocation.trim(),
        expiryDate: formData.expiryDate.trim(),
        stripsPerBox,
        purchasePrice,
        sellingPrice,
        stripPrice,
        stripPurchasePrice,
        totalStripsStock,
        stockQuantity,
        minStockAlert: Number(formData.minStockAlert) || 5,
        unit: formData.unit || 'علبة',
      });
    }

    setIsModalOpen(false);
  };

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= p.minStockAlert).length;
  }, [products]);

  const totalStockValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stockQuantity || 0) * (p.purchasePrice || 0), 0);
  }, [products]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-inner">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">إدارة أدوية ومخزن الصيدلية</h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="h-3 w-3 text-emerald-600" />
                IndexedDB نشط
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              محرك فائق السرعة يدعم آلاف الأدوية، حساب شريط الدواء تلقائياً (العلبة ÷ الشرايط)، ومتابعة الأرصدة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* DrugEye Live Link Button */}
          <button
            type="button"
            onClick={() => setIsDrugEyeModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50/90 hover:bg-cyan-100 text-cyan-900 px-3.5 py-2.5 text-xs font-black shadow-xs transition-colors cursor-pointer"
            title="ربط ومزامنة أسعار وبيانات الأدوية مباشرة من قاعدة بيانات DrugEye المصرية الحية (pharorg.com)"
          >
            <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <span>ربط وتحديث DrugEye الحية 🌐</span>
          </button>

          {/* Export Medicines JSON */}
          <button
            type="button"
            onClick={exportMedicinesJSON}
            title="تصدير قائمة الأدوية الحالية كملف JSON"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition-colors"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">تصدير أدوية</span>
            <span>JSON</span>
          </button>

          {/* Import Medicines JSON */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 px-3.5 py-2.5 text-xs font-black shadow-xs transition-colors"
          >
            <Zap className="h-4 w-4 text-emerald-600" />
            <span>استيراد أدوية (JSON سريع)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBarcodeTargetProduct(products.length > 0 ? products[0] : null);
              setIsBarcodeGeneratorOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition-colors"
          >
            <Tag className="h-4 w-4 text-emerald-600" />
            <span>طباعة ملصقات الباركود</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة دواء / صنف جديد</span>
          </button>
        </div>
      </div>

      {/* Info Card Explaining Strip & Box System */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-emerald-950">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-emerald-900 text-sm block">
              نظام تسعير وبيع شريط الدواء الذكي:
            </span>
            <span>
              لكل علاج يمكنك تحديد عدد الشرايط في العلبة، ويتم حساب سعر الشريط تلقائياً:{' '}
              <strong className="text-emerald-800 font-mono">سعر الشريط = سعر العلبة ÷ عدد الشرايط</strong>.
              (مثال: علبة بـ 500 ج.م وبها 3 شرايط = 166.67 ج.م للشريط).
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">إجمالي الأصناف المسجلة</span>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">
            {products.length.toLocaleString('ar-EG')}{' '}
            <span className="text-xs font-normal text-slate-400 font-sans">دواء</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">قيمة المخزون (سعر الشراء)</span>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">
            {totalStockValue.toLocaleString('ar-EG')} {profile?.currency || 'ج.م'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">نواقص أوشكت على النفاد</span>
          <div className="text-xl font-black text-amber-600 mt-1 font-mono">
            {lowStockCount.toLocaleString('ar-EG')}{' '}
            <span className="text-xs font-normal text-slate-400 font-sans">دواء</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">أدوية تدعم بيع الشريط</span>
          <div className="text-xl font-black text-emerald-600 mt-1 font-mono">
            {products.filter((p) => (p.stripsPerBox || 1) > 1).length.toLocaleString('ar-EG')}{' '}
            <span className="text-xs font-normal text-slate-400 font-sans">دواء</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث فوري سريع باسم الدواء التجاري، المادة الفعالة، مكان الرف، أو الباركود..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-9 pl-4 text-xs sm:text-sm font-medium focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-xl cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyLowStock}
                onChange={(e) => {
                  setOnlyLowStock(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>النواقص فقط</span>
            </label>

            <div className="flex items-center gap-1 border border-slate-200 rounded-xl px-2.5 py-1 bg-slate-50 text-xs">
              <span className="text-slate-500 font-medium">ترتيب:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="name">الاسم</option>
                <option value="price">السعر</option>
                <option value="stock">الرصيد</option>
                <option value="expiry">الصلاحية</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                className="p-1 hover:bg-slate-200 rounded text-slate-600"
                title="عكس الترتيب"
              >
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table with Fast Pagination */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header Bar with counts and page size selector */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="font-bold text-slate-700 flex items-center gap-2">
            <span>النتائج:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-900 font-black">
              {filteredProducts.length.toLocaleString('ar-EG')}
            </span>
            <span className="text-slate-500 font-normal">
              (يتم عرض صفحة {validPage} من {totalPages})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">عرض بالصفحة:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value={25}>25 دواء</option>
              <option value={50}>50 دواء</option>
              <option value={100}>100 دواء</option>
              <option value={200}>200 دواء</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">الباركود</th>
                <th className="py-3 px-3">اسم الدواء والمستحضر</th>
                <th className="py-3 px-3">الشكل والرف</th>
                <th className="py-3 px-3 text-center">الشرايط بالعلبة</th>
                <th className="py-3 px-3">سعر العلبة</th>
                <th className="py-3 px-3 bg-emerald-50 text-emerald-950 font-black">
                  سعر الشريط (العلبة ÷ الشرايط)
                </th>
                <th className="py-3 px-3">رصيد المخزن (علب + شرايط)</th>
                <th className="py-3 px-3 text-center">تعديل سريع</th>
                <th className="py-3 px-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    لا توجد منتجات مطابقة للبحث أو التصفية الحالية
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const stripsCount = Math.max(1, p.stripsPerBox || 1);
                  const hasStrips = stripsCount > 1;
                  const totalStrips =
                    typeof p.totalStripsStock === 'number'
                      ? p.totalStripsStock
                      : Math.round(p.stockQuantity * stripsCount);
                  const isLow = p.stockQuantity <= p.minStockAlert;
                  const stockDetails = formatPharmacyStock(totalStrips, stripsCount, p.unit);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Barcode */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{p.barcode}</td>

                      {/* Name & Active Ingredient */}
                      <td className="py-3 px-3 font-black text-slate-900">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {isLow && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold">
                                نقص مخزون
                              </span>
                            )}
                          </div>
                          {p.activeIngredient && (
                            <div className="text-[10px] text-slate-500 font-normal">
                              {p.activeIngredient}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Dosage Form & Shelf */}
                      <td className="py-3 px-3 text-slate-600">
                        <div>
                          <span>{p.dosageForm || 'أقراص'}</span>
                          {p.shelfLocation && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              رف: {p.shelfLocation}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Strips per box */}
                      <td className="py-3 px-3 text-center">
                        {hasStrips ? (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-bold text-[11px]">
                            {stripsCount} شرايط
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">عبوة مفردة</span>
                        )}
                      </td>

                      {/* Box Selling Price */}
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <span className="text-sm font-black text-slate-800 font-mono">
                          {p.sellingPrice}
                        </span>{' '}
                        <span className="text-[10px] text-slate-500 font-normal">
                          {profile?.currency || 'ج.م'}
                        </span>
                      </td>

                      {/* Strip Selling Price (Box Price ÷ Strips) */}
                      <td className="py-3 px-3 bg-emerald-50/40">
                        {hasStrips ? (
                          <div className="space-y-0.5">
                            <span className="text-sm font-black text-emerald-700 font-mono">
                              {p.stripPrice.toFixed(2)} {profile?.currency || 'ج.م'}
                            </span>
                            <span className="text-[9.5px] text-emerald-800 block font-sans">
                              ({p.sellingPrice} ÷ {stripsCount})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>

                      {/* Stock in Boxes & Strips */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span
                            className={`font-black text-xs ${
                              isLow ? 'text-rose-600' : 'text-slate-800'
                            }`}
                          >
                            {stockDetails.formattedText}
                          </span>
                        </div>
                      </td>

                      {/* Quick Adjust Buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col gap-1 items-center justify-center">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => quickAdjustStock(p.id, 1, 0)}
                              className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold border border-emerald-200"
                              title="إضافة 1 علبة للمخزن"
                            >
                              +1 علبة
                            </button>
                            <button
                              type="button"
                              onClick={() => quickAdjustStock(p.id, -1, 0)}
                              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold"
                              title="خصم 1 علبة من المخزن"
                            >
                              -1 علبة
                            </button>
                          </div>

                          {hasStrips && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => quickAdjustStock(p.id, 0, 1)}
                                className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-200"
                                title="إضافة 1 شريط للمخزن"
                              >
                                +1 شريط
                              </button>
                              <button
                                type="button"
                                onClick={() => quickAdjustStock(p.id, 0, -1)}
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold"
                                title="خصم 1 شريط من المخزن"
                              >
                                -1 شريط
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setBarcodeTargetProduct(p);
                              setIsBarcodeGeneratorOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="طباعة ملصق الباركود لهذا الصنف"
                          >
                            <Barcode className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="تعديل الصنف"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف الدواء: ${p.name}؟`)) {
                                deleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="حذف الصنف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 font-medium">
              عرض من <span className="font-bold text-slate-800">{((validPage - 1) * pageSize + 1).toLocaleString('ar-EG')}</span> إلى{' '}
              <span className="font-bold text-slate-800">{Math.min(validPage * pageSize, totalItems).toLocaleString('ar-EG')}</span> من إجمالي{' '}
              <span className="font-bold text-slate-800 font-mono">{totalItems.toLocaleString('ar-EG')}</span> دواء
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={validPage === 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
                title="الصفحة الأولى"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={validPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 flex items-center gap-1"
              >
                <ChevronRight className="h-4 w-4" />
                <span>السابق</span>
              </button>

              <span className="px-3 py-1 font-black text-slate-900 bg-white border border-slate-200 rounded-lg font-mono">
                {validPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={validPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 flex items-center gap-1"
              >
                <span>التالي</span>
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                disabled={validPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
                title="الصفحة الأخيرة"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Pill className="h-5 w-5 text-emerald-600" />
                <span>{editingProduct ? 'تعديل بيانات الدواء والمستحضر' : 'إضافة دواء / مستحضر جديد إلى الصيدلية'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1: Medicine Trade Name & Active Ingredient */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    اسم الدواء التجاري (Brand Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: ألفينترن أقراص (Alphintern)"
                    className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs sm:text-sm font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    المادة الفعالة / الاسم العلمي (Active Ingredient)
                  </label>
                  <input
                    type="text"
                    value={formData.activeIngredient}
                    onChange={(e) => setFormData({ ...formData, activeIngredient: e.target.value })}
                    placeholder="مثال: Chymotrypsin & Trypsin"
                    className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-xs font-medium focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Barcode & Category & Dosage Form */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">الباركود</label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          barcode: '622' + Math.floor(100000000 + Math.random() * 900000000),
                        })
                      }
                      className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>توليد</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">القسم</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-medium focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="أقراص وكبسولات">أقراص وكبسولات</option>
                    <option value="فوار ومسكنات">فوار ومسكنات</option>
                    <option value="مضادات حيوية">مضادات حيوية</option>
                    <option value="أشربة ونقط">أشربة ونقط</option>
                    <option value="حقن وأمبولات">حقن وأمبولات</option>
                    <option value="مراهم وكريمات">مراهم وكريمات</option>
                    <option value="فيتامينات ومكملات">فيتامينات ومكملات</option>
                    <option value="مستلزمات طبية">مستلزمات طبية</option>
                    <option value="عناية شخصية">عناية شخصية</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الشكل الدوائي</label>
                  <select
                    value={formData.dosageForm}
                    onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-medium focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="أقراص مغلفة">أقراص مغلفة</option>
                    <option value="أقراص">أقراص</option>
                    <option value="كبسولات">كبسولات</option>
                    <option value="شراب">شراب</option>
                    <option value="أمبولات">أمبولات</option>
                    <option value="نقط للعين/الأذن">نقط للعين/الأذن</option>
                    <option value="مرهم / كريم">مرهم / كريم</option>
                    <option value="فوار">فوار</option>
                    <option value="أكياس">أكياس</option>
                    <option value="بخاخ">بخاخ</option>
                  </select>
                </div>
              </div>

              {/* Box & Strip Prices & Dynamic Formula */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                  <Calculator className="h-4 w-4 text-emerald-700" />
                  <span>تسعير العلبة والشريط الدوائي (حساب تلقائي):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Strips per box */}
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      عدد الشرايط في العلبة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.stripsPerBox}
                      onChange={(e) => handleStripsCountChange(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="مثال: 3"
                      className="w-full rounded-xl border border-emerald-300 bg-white py-2 px-3 text-xs font-black font-mono focus:border-emerald-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-emerald-700 mt-0.5 block">
                      (إذا كان الدواء لا يجزأ مثل الشراب ضع 1)
                    </span>
                  </div>

                  {/* Selling Price of Box */}
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      سعر بيع العلبة كاملاً ({profile?.currency || 'ج.م'}) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      value={formData.sellingPrice}
                      onChange={(e) => handleSellingPriceChange(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="مثال: 500"
                      className="w-full rounded-xl border border-emerald-300 bg-white py-2 px-3 text-xs font-black font-mono text-emerald-700 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  {/* Strip Selling Price */}
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      سعر بيع الشريط الواحد ({profile?.currency || 'ج.م'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.stripPrice}
                      onChange={(e) => setFormData({ ...formData, stripPrice: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-full rounded-xl border border-emerald-300 bg-white py-2 px-3 text-xs font-black font-mono text-amber-700 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Formula Banner */}
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs">
                  <span className="text-emerald-900 font-semibold">
                    معادلة حساب الشريط:
                  </span>
                  <span className="font-mono font-bold text-emerald-800 dir-ltr text-left">
                    {formData.sellingPrice || 0} ÷ {formData.stripsPerBox || 1} ={' '}
                    <span className="text-amber-700 font-black text-sm">
                      {((formData.sellingPrice || 0) / (formData.stripsPerBox || 1)).toFixed(2)}
                    </span>{' '}
                    {profile?.currency || 'ج.م'}
                  </span>
                </div>
              </div>

              {/* Purchase Price & Expiry & Shelf Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    سعر شراء العلبة (التكلفة)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    تكلفة الشريط: {((formData.purchasePrice || 0) / (formData.stripsPerBox || 1)).toFixed(2)} ج.م
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">مكان الرف / الدرج</label>
                  <input
                    type="text"
                    value={formData.shelfLocation}
                    onChange={(e) => setFormData({ ...formData, shelfLocation: e.target.value })}
                    placeholder="مثال: A-01 أو درج 3"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-medium focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">تاريخ الصلاحية</label>
                  <input
                    type="text"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    placeholder="2027-12 أو 2027-12-30"
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono font-medium focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Stock in Boxes & Loose Strips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رصيد العلب الكاملة
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.boxesStock}
                    onChange={(e) => setFormData({ ...formData, boxesStock: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    شرايط مفردة إضافية
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={Math.max(0, (formData.stripsPerBox || 1) - 1)}
                    value={formData.looseStripsStock}
                    onChange={(e) => setFormData({ ...formData, looseStripsStock: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    إجمالي الرصيد: {formData.boxesStock * formData.stripsPerBox + formData.looseStripsStock} شريط
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">حد التنبيه بالنواقص (علب)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minStockAlert}
                    onChange={(e) => setFormData({ ...formData, minStockAlert: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs shadow-md transition-all"
                >
                  {editingProduct ? 'حفظ تعديلات الدواء في IndexedDB' : 'إضافة الدواء لقاعدة البيانات'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Label Generator Modal */}
      {isBarcodeGeneratorOpen && (
        <BarcodeLabelGenerator
          initialProduct={barcodeTargetProduct}
          onClose={() => {
            setIsBarcodeGeneratorOpen(false);
            setBarcodeTargetProduct(null);
          }}
        />
      )}

      {/* Medicines JSON Import Modal */}
      <ImportMedicinesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* DrugEye Live Search & Sync Modal */}
      <DrugEyeSyncModal
        isOpen={isDrugEyeModalOpen}
        onClose={() => setIsDrugEyeModalOpen(false)}
      />
    </div>
  );
};
