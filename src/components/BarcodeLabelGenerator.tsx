import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { BarcodeRenderer } from './BarcodeRenderer';
import {
  Printer,
  Tag,
  Sparkles,
  X,
  Layers,
  Settings2,
  Check,
  Package,
} from 'lucide-react';

interface BarcodeLabelGeneratorProps {
  initialProduct?: Product | null;
  onClose: () => void;
}

export const BarcodeLabelGenerator: React.FC<BarcodeLabelGeneratorProps> = ({
  initialProduct,
  onClose,
}) => {
  const { products, profile } = useStore();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    initialProduct || (products.length > 0 ? products[0] : null)
  );

  const [customName, setCustomName] = useState(
    initialProduct?.name || (products.length > 0 ? products[0].name : 'اسم المنتج')
  );
  const [customBarcode, setCustomBarcode] = useState(
    initialProduct?.barcode || (products.length > 0 ? products[0].barcode : '622100000001')
  );
  const [customPrice, setCustomPrice] = useState(
    initialProduct
      ? initialProduct.sellingPrice.toString()
      : products.length > 0
      ? products[0].sellingPrice.toString()
      : '25'
  );

  // Label Count
  const [labelsCount, setLabelsCount] = useState<number>(12);

  // Printer Type Mode: 'roll' (for thermal label printers like Xprinter/Zebra) or 'sheet' (for standard A4 sticker paper)
  const [printerMode, setPrinterMode] = useState<'roll' | 'sheet'>('roll');

  // Label Size preset
  const [labelSize, setLabelSize] = useState<'38x25' | '40x30' | '50x25' | '58x40'>('38x25');

  // Toggle display elements
  const [showStoreName, setShowStoreName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showCodeText, setShowCodeText] = useState<boolean>(true);
  const [unitType, setUnitType] = useState<'box' | 'strip'>('box');

  const handleSelectProduct = (p: Product, mode: 'box' | 'strip' = unitType) => {
    setSelectedProduct(p);
    setCustomBarcode(p.barcode);
    if (mode === 'strip' && (p.stripsPerBox || 1) > 1) {
      setCustomName(`${p.name} [شريط]`);
      setCustomPrice(p.stripPrice.toFixed(2));
    } else {
      setCustomName(p.name);
      setCustomPrice(p.sellingPrice.toString());
    }
  };

  const handleToggleUnit = (type: 'box' | 'strip') => {
    setUnitType(type);
    if (selectedProduct) {
      if (type === 'strip' && (selectedProduct.stripsPerBox || 1) > 1) {
        setCustomName(`${selectedProduct.name} [شريط]`);
        setCustomPrice(selectedProduct.stripPrice.toFixed(2));
      } else {
        setCustomName(selectedProduct.name);
        setCustomPrice(selectedProduct.sellingPrice.toString());
      }
    }
  };

  const handleSetStockCount = () => {
    if (selectedProduct && selectedProduct.stockQuantity > 0) {
      setLabelsCount(selectedProduct.stockQuantity);
    }
  };

  const generateRandomBarcode = () => {
    const randomCode = '622' + Math.floor(100000000 + Math.random() * 900000000).toString();
    setCustomBarcode(randomCode);
  };

  const handlePrint = () => {
    window.print();
  };

  // Label dimension classes
  const labelDimensions = {
    '38x25': {
      width: '38mm',
      height: '25mm',
      barcodeWidth: 1.0,
      barcodeHeight: 20,
      nameClass: 'text-[9.5px]',
      priceClass: 'text-[10px]',
      storeClass: 'text-[7.5px]',
    },
    '40x30': {
      width: '40mm',
      height: '30mm',
      barcodeWidth: 1.1,
      barcodeHeight: 24,
      nameClass: 'text-[10.5px]',
      priceClass: 'text-[11px]',
      storeClass: 'text-[8.5px]',
    },
    '50x25': {
      width: '50mm',
      height: '25mm',
      barcodeWidth: 1.2,
      barcodeHeight: 22,
      nameClass: 'text-[10.5px]',
      priceClass: 'text-[11px]',
      storeClass: 'text-[8px]',
    },
    '58x40': {
      width: '58mm',
      height: '40mm',
      barcodeWidth: 1.3,
      barcodeHeight: 30,
      nameClass: 'text-[12px]',
      priceClass: 'text-[13px]',
      storeClass: 'text-[9px]',
    },
  }[labelSize];

  // Component representing a single barcode label card
  const SingleLabel = ({ isPrint = false }: { isPrint?: boolean }) => (
    <div
      className={`barcode-label-card bg-white text-black text-center flex flex-col justify-between items-center overflow-hidden border border-black box-border ${
        isPrint ? '' : 'shadow-xs'
      }`}
      style={{
        width: labelDimensions.width,
        height: labelDimensions.height,
        minWidth: labelDimensions.width,
        minHeight: labelDimensions.height,
        padding: '1.5mm 1mm',
        backgroundColor: '#ffffff',
        color: '#000000',
      }}
    >
      {/* Store Header */}
      {showStoreName && (
        <div
          className={`${labelDimensions.storeClass} font-bold text-black truncate w-full leading-none`}
        >
          {profile?.name || 'سوبرماركت'}
        </div>
      )}

      {/* Product Name */}
      <div
        className={`${labelDimensions.nameClass} font-black text-black truncate w-full leading-tight`}
        title={customName}
      >
        {customName || 'اسم المنتج'}
      </div>

      {/* Barcode graphic */}
      <div className="w-full flex justify-center items-center my-0.5">
        <BarcodeRenderer
          value={customBarcode || '12345678'}
          width={labelDimensions.barcodeWidth}
          height={labelDimensions.barcodeHeight}
          fontSize={8.5}
          displayValue={showCodeText}
        />
      </div>

      {/* Selling Price */}
      {showPrice && (
        <div
          className={`${labelDimensions.priceClass} font-black text-black leading-none font-mono`}
        >
          {customPrice} {profile?.currency || 'ج.م'}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 1. ON-SCREEN INTERACTIVE MODAL (Hidden in print) */}
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  مولد وطباعة ملصقات الباركود للمنتجات
                </h3>
                <p className="text-[11px] text-slate-400">
                  متوافق مع طابعات الباركود الحرارية (Xprinter / Zebra) وورق الاستيكر A4
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Controls & Configuration Toolbar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3.5 text-xs">
            {/* Top row: Product picker + fields */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Product selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  اختر من أصناف المخزن:
                </label>
                <select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    const p = products.find((prod) => prod.id === e.target.value);
                    if (p) handleSelectProduct(p);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (رصيد: {p.stockQuantity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Strip vs Box Unit selection if medicine has multiple strips */}
              {selectedProduct && (selectedProduct.stripsPerBox || 1) > 1 && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1.5">
                  <div className="font-bold text-emerald-950 flex items-center justify-between">
                    <span>تسعير ملصق الباركود:</span>
                    <span className="text-[10px] text-emerald-700 font-mono">
                      (العلبة بها {selectedProduct.stripsPerBox} شرايط)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleUnit('box')}
                      className={`py-1.5 px-2 rounded-lg font-bold text-xs transition-all ${
                        unitType === 'box'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      📦 سعر العلبة ({selectedProduct.sellingPrice} {profile?.currency || 'ج.م'})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleUnit('strip')}
                      className={`py-1.5 px-2 rounded-lg font-bold text-xs transition-all ${
                        unitType === 'strip'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      💊 سعر الشريط ({selectedProduct.stripPrice.toFixed(2)} {profile?.currency || 'ج.م'})
                    </button>
                  </div>
                </div>
              )}

              {/* Product Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  الاسم المكتوب بالملصق:
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Barcode number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">رقم الباركود:</label>
                  <button
                    type="button"
                    onClick={generateRandomBarcode}
                    className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>توليد جديد</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={customBarcode}
                  onChange={(e) => setCustomBarcode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Price & Count */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  السعر وعدد الملصقات:
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="السعر"
                    className="w-24 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-center focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={labelsCount}
                    onChange={(e) => setLabelsCount(Math.max(1, Number(e.target.value)))}
                    title="عدد الملصقات المطلوب طباعتها"
                    className="w-20 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-center focus:border-emerald-500 focus:outline-none"
                  />
                  {selectedProduct && selectedProduct.stockQuantity > 0 && (
                    <button
                      type="button"
                      onClick={handleSetStockCount}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-[10px] font-bold text-slate-700"
                      title="طباعة بعدد رصيد المخزن الحالي"
                    >
                      بالمخزون
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Second row: Printer type, Label Dimensions, Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              {/* Printer mode selection */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 text-[11px]">نوع الطابعة:</span>
                <div className="inline-flex bg-slate-200 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPrinterMode('roll')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      printerMode === 'roll'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-black'
                    }`}
                    title="طابعات ملصقات الباركود الحرارية رول (Xprinter / Zebra)"
                  >
                    بكرة رول حراري (Xprinter)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrinterMode('sheet')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      printerMode === 'sheet'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-black'
                    }`}
                    title="ورق ملصقات لاصق مقسم حجم A4"
                  >
                    ورق استيكر A4
                  </button>
                </div>
              </div>

              {/* Label dimensions */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 text-[11px]">مقاس الملصق:</span>
                <select
                  value={labelSize}
                  onChange={(e) => setLabelSize(e.target.value as any)}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold"
                >
                  <option value="38x25">38 × 25 مم (الأكثر انتشاراً)</option>
                  <option value="40x30">40 × 30 مم (متوسط)</option>
                  <option value="50x25">50 × 25 مم (عريض)</option>
                  <option value="58x40">58 × 40 مم (كبير جداً)</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 cursor-pointer select-none font-semibold text-slate-700 text-[11px]">
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={(e) => setShowStoreName(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>اسم المحل</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none font-semibold text-slate-700 text-[11px]">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>السعر</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none font-semibold text-slate-700 text-[11px]">
                  <input
                    type="checkbox"
                    checked={showCodeText}
                    onChange={(e) => setShowCodeText(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>أرقام الباركود</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Print Bar */}
          <div className="p-3 px-5 bg-emerald-50/70 border-b border-emerald-200/80 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black py-2.5 px-6 shadow-md shadow-emerald-600/25 transition-all text-xs sm:text-sm"
            >
              <Printer className="h-4 w-4" />
              <span>طباعة {labelsCount} ملصق باركود الآن</span>
            </button>

            <span className="text-[11px] text-emerald-900 font-medium hidden sm:inline">
              نصيحة: اختر Margins = None في شاشة الطباعة ليطابق الملصقات بالمليمتر
            </span>
          </div>

          {/* Sheet Preview Viewport */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 flex justify-center">
            <div className="w-full max-w-3xl bg-white p-4 sm:p-6 rounded-2xl border border-slate-300 shadow-sm">
              <div className="text-center pb-3 mb-3 border-b border-slate-200 text-xs font-bold text-slate-500 flex justify-between items-center">
                <span>
                  معاينة الملصقات جاهزة للطباعة ({labelsCount} ملصق بمقاس{' '}
                  {labelDimensions.width} × {labelDimensions.height})
                </span>
                <span className="text-emerald-700 font-bold font-mono">
                  {customBarcode}
                </span>
              </div>

              {/* Grid Preview */}
              <div className="flex flex-wrap gap-2.5 justify-center items-center">
                {Array.from({ length: labelsCount }).map((_, idx) => (
                  <SingleLabel key={idx} isPrint={false} />
                ))}
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="bg-slate-100 p-3 px-5 border-t border-slate-200 flex justify-between items-center text-xs text-slate-600">
            <span>
              الصنف المختار: <strong className="text-slate-900">{customName}</strong> —{' '}
              {customPrice} {profile?.currency || 'ج.م'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-bold text-slate-700"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {/* 2. DEDICATED PRINT PORTAL ATTACHED DIRECTLY TO DOCUMENT.BODY */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            id="barcode-labels-print-area"
            className={printerMode === 'roll' ? 'print-mode-roll' : 'print-mode-sheet'}
          >
            {printerMode === 'roll' ? (
              // Continuous Roll: Each label is isolated with page-break-after
              <div className="flex flex-col items-center">
                {Array.from({ length: labelsCount }).map((_, idx) => (
                  <div key={idx} className="barcode-label-wrapper">
                    <SingleLabel isPrint={true} />
                  </div>
                ))}
              </div>
            ) : (
              // A4 Sheet: Neat grid layout with 1mm spacing
              <div
                className="flex flex-wrap gap-1 justify-center items-center"
                style={{ width: '100%', maxWidth: '210mm', margin: '0 auto' }}
              >
                {Array.from({ length: labelsCount }).map((_, idx) => (
                  <SingleLabel key={idx} isPrint={true} />
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
