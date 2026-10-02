import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, Customer } from '../types';
import {
  ScanBarcode,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle,
  Bike,
  CreditCard,
  Banknote,
  Calendar,
  UserPlus,
  User,
  Camera,
  RotateCcw,
  Sparkles,
  Printer,
  Pill,
  Package,
  Zap,
  ChevronDown,
  Globe,
} from 'lucide-react';
import { CameraBarcodeScanner } from '../components/CameraBarcodeScanner';
import { DrugEyeSyncModal } from '../components/DrugEyeSyncModal';
import { formatPharmacyStock } from '../utils/pharmacy';

export const POSView: React.FC = () => {
  const {
    products,
    cart,
    addToCart,
    updateCartQty,
    updateCartDiscount,
    removeFromCart,
    toggleCartSaleUnit,
    clearCart,
    createInvoice,
    customers,
    profile,
    scanBarcode,
    barcodeMap,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [isDrugEyeModalOpen, setIsDrugEyeModalOpen] = useState(false);
  const [drugEyeQuery, setDrugEyeQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState<number>(36);

  // Delivery state
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState<number>(20);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'installment'>('cash');
  const [billDiscount, setBillDiscount] = useState<number>(0);

  // Installment state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [installmentCustomerName, setInstallmentCustomerName] = useState('');
  const [installmentCustomerPhone, setInstallmentCustomerPhone] = useState('');
  const [downPayment, setDownPayment] = useState<number>(0);

  // Search input focus ref
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Hardware barcode scanner global keystroke buffer
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Debounce search query to keep typing responsive at 60fps
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setVisibleLimit(36);
    }, 120);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // F9 Hotkey for quick checkout
      if (e.key === 'F9') {
        e.preventDefault();
        handleCheckout();
        return;
      }

      // Enter key marks end of hardware barcode scanner sequence
      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          const scanned = barcodeBufferRef.current;
          barcodeBufferRef.current = '';
          const res = scanBarcode(scanned);
          if (res.found) {
            e.preventDefault();
            return;
          }
        }
        barcodeBufferRef.current = '';
      } else if (e.key.length === 1 && !isInput) {
        if (timeDiff > 60) {
          barcodeBufferRef.current = '';
        }
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanBarcode]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < products.length; i++) {
      if (products[i].category) set.add(products[i].category);
    }
    return ['الكل', ...Array.from(set)];
  }, [products]);

  // High-performance filtered products with memoization
  const filteredProducts = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    const isCatAll = selectedCategory === 'الكل';
    const hasQuery = query.length > 0;

    return products.filter((p) => {
      if (!isCatAll && p.category !== selectedCategory) return false;
      if (!hasQuery) return true;

      return (
        p.name.toLowerCase().includes(query) ||
        p.barcode.includes(query) ||
        (p.activeIngredient && p.activeIngredient.toLowerCase().includes(query)) ||
        (p.shelfLocation && p.shelfLocation.toLowerCase().includes(query)) ||
        p.category.toLowerCase().includes(query)
      );
    });
  }, [products, selectedCategory, debouncedQuery]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleLimit);
  }, [filteredProducts, visibleLimit]);

  // Totals calculation
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const taxRate = profile?.taxPercentage || 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const currentDeliveryFee = hasDelivery ? Number(deliveryFee) || 0 : 0;
  const grandTotal = Math.max(0, subtotal + currentDeliveryFee + taxAmount - billDiscount);

  // Installment remaining calculation
  const safeDownPayment = Math.min(grandTotal, Math.max(0, Number(downPayment) || 0));
  const remainingInstallment = Math.max(0, grandTotal - safeDownPayment);

  // Submit invoice
  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'installment') {
      if (!selectedCustomerId && !installmentCustomerName.trim()) {
        alert('يرجى اختيار عميل أو كتابة اسم العميل لتسجيل فاتورة التقسيط');
        return;
      }
    }

    createInvoice({
      paymentMethod,
      hasDelivery,
      deliveryFee: currentDeliveryFee,
      deliveryAddress,
      deliveryPhone,
      deliveryNotes,
      customerId: selectedCustomerId || undefined,
      customerName: selectedCustomerId
        ? customers.find((c) => c.id === selectedCustomerId)?.name
        : installmentCustomerName.trim(),
      customerPhone: selectedCustomerId
        ? customers.find((c) => c.id === selectedCustomerId)?.phone
        : installmentCustomerPhone.trim(),
      paidAmount: paymentMethod === 'installment' ? safeDownPayment : grandTotal,
      remainingAmount: paymentMethod === 'installment' ? remainingInstallment : 0,
      discountAmount: billDiscount,
    });

    // Reset local form states
    setHasDelivery(false);
    setDeliveryAddress('');
    setDeliveryPhone('');
    setPaymentMethod('cash');
    setBillDiscount(0);
    setSelectedCustomerId('');
    setInstallmentCustomerName('');
    setInstallmentCustomerPhone('');
    setDownPayment(0);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) return;
    const res = scanBarcode(clean);
    if (res.found) {
      setSearchQuery('');
    }
  };

  return (
    <div className="h-[calc(100vh-4.5rem)] flex flex-col lg:flex-row gap-4 p-3 sm:p-5 overflow-hidden">
      {/* Right Column: Products & Quick Catalog */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden min-w-0">
        {/* Search & Barcode Top Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex gap-2">
            <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو امسح الباركود مباشرة (أو اضغط Enter لإضافة فورية)..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium placeholder-slate-400"
              />
            </form>

            <button
              type="button"
              onClick={() => {
                setDrugEyeQuery(searchQuery);
                setIsDrugEyeModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 hover:bg-cyan-100 px-3.5 py-2.5 text-xs font-bold text-cyan-900 shadow-xs transition-colors shrink-0 cursor-pointer"
              title="بحث حي مباشر في قاعدة بيانات دليل أدوية DrugEye"
            >
              <Globe className="h-4 w-4 text-cyan-600" />
              <span className="hidden sm:inline">دليل DrugEye</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCameraScanner(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition-colors shrink-0"
              title="مسح بالكاميرا"
            >
              <Camera className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">مسح بالكاميرا</span>
            </button>
          </div>

          {/* Categories Horizontal Scroller */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setVisibleLimit(36);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Info banner for strip calculation */}
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900 font-semibold">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              نظام بيع الأدوية بالشريط أو بالعلبة: يتم احتساب سعر الشريط تلقائياً = (سعر العلبة ÷ عدد الشرايط).
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 bg-white/80 px-2 py-0.5 rounded-full border border-emerald-200 hidden sm:inline">
            مثال: 500 ج.م ÷ 3 شرايط = 166.67 ج.م للشريط
          </span>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <ScanBarcode className="h-12 w-12 stroke-[1.5] text-slate-300 mx-auto" />
              <div>
                <p className="font-semibold text-slate-600">
                  {searchQuery.trim()
                    ? `لا توجد أدوية مسجلة محلياً في صيدليتك باسم "${searchQuery}"`
                    : 'لا توجد أدوية مطابقة للبحث'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  يمكنك البحث الفوري في قاعدة بيانات دليل أدوية DrugEye الرسمية الحية وإضافته بلمسة واحدة
                </p>
              </div>

              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setDrugEyeQuery(searchQuery);
                    setIsDrugEyeModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-black text-xs shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
                >
                  <Globe className="h-4 w-4" />
                  <span>بحث مباشر في دليل DrugEye عن "{searchQuery}"</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {visibleProducts.map((p) => {
                  const stripsCount = Math.max(1, p.stripsPerBox || 1);
                  const hasStrips = stripsCount > 1;
                  const totalStrips = typeof p.totalStripsStock === 'number' ? p.totalStripsStock : Math.round(p.stockQuantity * stripsCount);
                  const isOutOfStock = totalStrips <= 0;
                  const isLowStock = !isOutOfStock && p.stockQuantity <= p.minStockAlert;
                  const stockDetails = formatPharmacyStock(totalStrips, stripsCount, p.unit);

                  return (
                    <div
                      key={p.id}
                      className={`text-right p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isOutOfStock
                          ? 'border-slate-200 bg-slate-100 opacity-60'
                          : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md'
                      }`}
                    >
                      <div>
                        {/* Top Bar: Barcode, Shelf, Stock Status */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[10px] text-slate-400 font-mono">{p.barcode}</span>
                          <div className="flex items-center gap-1">
                            {p.shelfLocation && (
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                رف: {p.shelfLocation}
                              </span>
                            )}
                            {isLowStock && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                قارب النفاذ
                              </span>
                            )}
                            {isOutOfStock && (
                              <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                                نفد
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Medicine Name */}
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                          {p.name}
                        </h4>

                        {/* Active Ingredient / Dosage Form */}
                        {(p.dosageForm || p.activeIngredient) && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {p.dosageForm ? `${p.dosageForm}` : ''}{' '}
                            {p.activeIngredient ? `• ${p.activeIngredient}` : ''}
                          </p>
                        )}

                        {/* Stock availability */}
                        <div className="mt-2 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg flex items-center justify-between">
                          <span>الرصيد المتاح:</span>
                          <span className="font-bold text-slate-800">{stockDetails.formattedText}</span>
                        </div>

                        {/* Strips Calculation Formula Tag */}
                        {hasStrips && (
                          <div className="mt-2 p-1.5 rounded-lg bg-emerald-50/90 border border-emerald-200 text-[10px] text-emerald-950 space-y-0.5">
                            <div className="flex justify-between font-bold">
                              <span>العلبة بها:</span>
                              <span className="font-mono text-emerald-800">{stripsCount} شرايط</span>
                            </div>
                            <div className="flex justify-between text-emerald-800 font-medium pt-0.5 border-t border-emerald-200/50">
                              <span>سعر الشريط (العلبة ÷ {stripsCount}):</span>
                              <span className="font-bold text-emerald-900 font-mono">
                                {p.stripPrice.toFixed(2)} {profile?.currency || 'ج.م'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: Sell Box vs Sell Strip */}
                      <div className="pt-2.5 border-t border-slate-100 mt-2.5">
                        {hasStrips ? (
                          <div className="grid grid-cols-2 gap-2">
                            {/* Sell Full Box */}
                            <button
                              type="button"
                              disabled={isOutOfStock || totalStrips < stripsCount}
                              onClick={() => addToCart(p, 1, 'box')}
                              className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              title={`بيع علبة كاملة (${stripsCount} شرايط) بسعر ${p.sellingPrice} ${profile?.currency || 'ج.م'}`}
                            >
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                <span>بيع علبة</span>
                              </span>
                              <span className="text-[11px] font-mono mt-0.5 opacity-95">
                                {p.sellingPrice} {profile?.currency || 'ج.م'}
                              </span>
                            </button>

                            {/* Sell Single Strip */}
                            <button
                              type="button"
                              disabled={isOutOfStock || totalStrips < 1}
                              onClick={() => addToCart(p, 1, 'strip')}
                              className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              title={`بيع شريط واحد بسعر ${p.stripPrice.toFixed(2)} ${profile?.currency || 'ج.م'} (سعر العلبة ${p.sellingPrice} ÷ ${stripsCount})`}
                            >
                              <span className="flex items-center gap-1">
                                <Pill className="h-3 w-3" />
                                <span>بيع شريط</span>
                              </span>
                              <span className="text-[11px] font-mono mt-0.5 opacity-95">
                                {p.stripPrice.toFixed(2)} {profile?.currency || 'ج.م'}
                              </span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => addToCart(p, 1, 'box')}
                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-40"
                          >
                            <Package className="h-3.5 w-3.5" />
                            <span>بيع عبوة/علبة</span>
                            <span className="font-mono text-emerald-100">
                              ({p.sellingPrice} {profile?.currency || 'ج.م'})
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button if results exceed limit */}
              {filteredProducts.length > visibleLimit && (
                <div className="flex justify-center pt-2 pb-4">
                  <button
                    type="button"
                    onClick={() => setVisibleLimit((prev) => prev + 36)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs transition-all"
                  >
                    <ChevronDown className="h-4 w-4 text-emerald-600" />
                    <span>
                      عرض 36 دواء إضافي (يتبقى {(filteredProducts.length - visibleLimit).toLocaleString('ar-EG')} دواء)
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Left Column: Cart, Delivery, Installment & Checkout */}
      <div className="w-full lg:w-[440px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden shrink-0">
        {/* Cart Top Header */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">سلة الفاتورة الحالية</h3>
              <p className="text-[11px] text-slate-500">{cart.length} أصناف في الفاتورة</p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>تفريغ الفاتورة</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingCart className="h-10 w-10 text-slate-300 stroke-[1.5] mb-2" />
              <p className="text-sm font-semibold text-slate-600">الفاتورة فارغة حالياً</p>
              <p className="text-xs text-slate-400 mt-1">
                اختر بيع علبة أو شريط من القائمة أو امسح الباركود بجهاز القارئ
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const isStrip = item.saleUnit === 'strip';
              const hasStrips = (item.product.stripsPerBox || 1) > 1;

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-200 transition-all space-y-2"
                >
                  {/* Top row: Item Name and Sale Unit Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="text-xs font-bold text-slate-900 leading-tight">
                          {item.product.name}
                        </h5>
                        {isStrip ? (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                            <Pill className="h-3 w-3 text-amber-700" />
                            <span>شريط منفرد</span>
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                            <Package className="h-3 w-3 text-emerald-700" />
                            <span>علبة كاملة</span>
                          </span>
                        )}
                      </div>

                      {/* Strip Calculation Breakdown Note */}
                      {hasStrips && (
                        <div className="mt-1 text-[10px] font-medium leading-tight">
                          {isStrip ? (
                            <span className="text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 inline-block font-sans">
                              سعر الشريط = سعر العلبة ({item.product.sellingPrice}) ÷ {item.product.stripsPerBox} شرايط = {item.unitPrice.toFixed(2)} {profile?.currency || 'ج.م'}
                            </span>
                          ) : (
                            <span className="text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 inline-block font-sans">
                              علبة كاملة تحتوي على {item.product.stripsPerBox} شرايط ({item.unitPrice.toFixed(2)} {profile?.currency || 'ج.م'})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-colors shrink-0"
                      title="حذف من الفاتورة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Bottom row: Unit Switch Toggle + Quantity Controls + Line Total */}
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60">
                    {/* Unit Switch Button */}
                    {hasStrips ? (
                      <button
                        type="button"
                        onClick={() => toggleCartSaleUnit(item.id)}
                        className="text-[11px] font-bold text-slate-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all shadow-2xs"
                        title={`تحويل البيع من ${isStrip ? 'شريط' : 'علبة'} إلى ${isStrip ? 'علبة' : 'شريط'}`}
                      >
                        <RotateCcw className="h-3 w-3 text-emerald-600" />
                        <span>تحويل إلى {isStrip ? 'علبة كاملة' : 'شريط واحد'}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">عبوة مفردة</span>
                    )}

                    {/* Quantity Controls & Line Total */}
                    <div className="flex items-center gap-3">
                      {/* Quantity minus / input / plus */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, item.quantity - 1)}
                          className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateCartQty(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-8 text-center font-bold text-xs bg-transparent focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, item.quantity + 1)}
                          className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Total */}
                      <div className="text-left font-mono">
                        <span className="text-xs sm:text-sm font-black text-emerald-700">
                          {item.total.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500 mr-1">
                          {profile?.currency || 'ج.م'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Options Panel: Delivery & Installment Controls */}
        <div className="border-t border-slate-200 bg-slate-50/90 p-3 space-y-2.5">
          {/* Delivery Option Toggle */}
          <div className="bg-white rounded-xl border border-slate-200 p-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={hasDelivery}
                  onChange={(e) => setHasDelivery(e.target.checked)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="flex items-center gap-1.5">
                  <Bike className="h-4 w-4 text-emerald-600" />
                  إضافة خدمة توصيل (ديليفري)
                </span>
              </label>
              {hasDelivery && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    className="w-16 rounded-lg border border-slate-300 py-1 px-2 text-xs font-bold text-center focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">{profile?.currency || 'ج.م'}</span>
                </div>
              )}
            </div>

            {hasDelivery && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="عنوان العميل للتوصيل..."
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-emerald-500"
                />
                <input
                  type="tel"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  placeholder="رقم هاتف العميل..."
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Banknote className="h-3.5 w-3.5" />
                <span>نقدي (كاش)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                  paymentMethod === 'card'
                    ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>فيزا / شبكة</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('installment')}
                className={`py-2 px-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                  paymentMethod === 'installment'
                    ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>تقسيط / آجل</span>
              </button>
            </div>
          </div>

          {/* Installment Details Panel */}
          {paymentMethod === 'installment' && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 space-y-2 text-xs">
              <div className="font-bold text-amber-900 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-amber-700" />
                <span>بيانات العميل لحساب التقسيط:</span>
              </div>

              {/* Customer Selector / Creator */}
              <div className="space-y-1.5">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    if (e.target.value) {
                      const c = customers.find((cust) => cust.id === e.target.value);
                      if (c) {
                        setInstallmentCustomerName(c.name);
                        setInstallmentCustomerPhone(c.phone);
                      }
                    }
                  }}
                  className="w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="">-- اختر عميل مسجل سابقاً أو اكتب جديد بالأسفل --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - مديونية: {c.totalDebts} {profile?.currency}
                    </option>
                  ))}
                </select>

                {!selectedCustomerId && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={installmentCustomerName}
                      onChange={(e) => setInstallmentCustomerName(e.target.value)}
                      placeholder="اسم العميل (مطلوب)..."
                      className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs focus:outline-none"
                    />
                    <input
                      type="tel"
                      value={installmentCustomerPhone}
                      onChange={(e) => setInstallmentCustomerPhone(e.target.value)}
                      placeholder="رقم الهاتف للتواصل..."
                      className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                )}

                {/* Down Payment & Remaining calculation */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-0.5">
                      المقدم المدفوع:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      value={downPayment}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                      className="w-full rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-0.5">
                      المتبقي قسط مؤجل:
                    </label>
                    <div className="w-full rounded-lg bg-amber-200/70 border border-amber-300 px-2 py-1 text-xs font-black text-center text-amber-950">
                      {remainingInstallment.toFixed(2)} {profile?.currency || 'ج.م'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Totals Summary */}
          <div className="space-y-1 text-xs pt-1 border-t border-slate-200">
            <div className="flex justify-between text-slate-600">
              <span>المجموع الفرعي:</span>
              <span>{subtotal.toFixed(2)} {profile?.currency || 'ج.م'}</span>
            </div>
            {hasDelivery && currentDeliveryFee > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>رسوم التوصيل:</span>
                <span>+{currentDeliveryFee.toFixed(2)} {profile?.currency || 'ج.م'}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-base font-black text-slate-900 pt-1 border-t border-slate-200">
              <span>الإجمالي المستحق:</span>
              <span className="text-xl font-black text-emerald-700">
                {grandTotal.toFixed(2)} {profile?.currency || 'ج.م'}
              </span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black py-3 px-4 shadow-lg shadow-emerald-600/25 transition-all text-sm disabled:opacity-50 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>حفظ الفاتورة وطباعة الإيصال (F9)</span>
          </button>
        </div>
      </div>

      {/* Camera scanner modal */}
      <CameraBarcodeScanner
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onDetected={(code) => {
          scanBarcode(code);
        }}
      />

      {/* DrugEye Live Search & Sync Modal */}
      <DrugEyeSyncModal
        isOpen={isDrugEyeModalOpen}
        onClose={() => setIsDrugEyeModalOpen(false)}
        initialQuery={drugEyeQuery}
      />
    </div>
  );
};
