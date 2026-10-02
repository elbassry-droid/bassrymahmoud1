import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../context/StoreContext';
import { Invoice } from '../types';
import { BarcodeRenderer } from './BarcodeRenderer';
import {
  Printer,
  X,
  Bike,
  CreditCard,
  Banknote,
  Check,
  Image as ImageIcon,
  Type,
  FileText,
} from 'lucide-react';

interface ThermalReceiptProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ invoice, onClose }) => {
  const { profile, updateProfile } = useStore();

  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm' | 'auto'>(
    profile?.printerWidth || '80mm'
  );
  const [fontSizeMode, setFontSizeMode] = useState<'compact' | 'normal' | 'large'>('normal');
  const [showLogo, setShowLogo] = useState<boolean>(true);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSetWidth = (w: '80mm' | '58mm' | 'auto') => {
    setPaperWidth(w);
    if (profile && (w === '80mm' || w === '58mm')) {
      updateProfile({ ...profile, printerWidth: w });
    }
  };

  const formattedDate = new Date(invoice.date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const formattedTime = new Date(invoice.date).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Dynamic font sizing for thermal printer readability
  const fontSizes = {
    compact: {
      base: 'text-[9.5px]',
      title: 'text-[11.5px]',
      items: 'text-[9px]',
      meta: 'text-[9px]',
      total: 'text-[12.5px]',
      footer: 'text-[8px]',
    },
    normal: {
      base: 'text-[11px]',
      title: 'text-[13px]',
      items: 'text-[10px]',
      meta: 'text-[10px]',
      total: 'text-[15px]',
      footer: 'text-[9px]',
    },
    large: {
      base: 'text-[12px]',
      title: 'text-[15px]',
      items: 'text-[11px]',
      meta: 'text-[11px]',
      total: 'text-[17px]',
      footer: 'text-[10px]',
    },
  }[fontSizeMode];

  const paperClass =
    paperWidth === '80mm' ? 'paper-80mm' : paperWidth === '58mm' ? 'paper-58mm' : 'paper-auto';

  // Sub-component: The actual thermal receipt content
  const ReceiptContent = ({ isPrintOnly = false }: { isPrintOnly?: boolean }) => (
    <div
      className={`text-black font-sans leading-tight bg-white select-none ${
        isPrintOnly ? '' : 'p-3'
      }`}
      style={{
        color: '#000000',
        backgroundColor: '#ffffff',
      }}
    >
      {/* 1. Header: Store Logo, Name, Type, Address, Phone */}
      <div className="text-center pb-2 border-b-2 border-dashed border-black">
        {showLogo && profile?.logoUrl && (
          <div className="flex justify-center mb-1.5">
            <img
              src={profile.logoUrl}
              alt="Logo"
              className="h-10 max-w-[100px] object-contain filter grayscale contrast-200"
            />
          </div>
        )}
        <h2 className={`${fontSizes.title} font-black text-black tracking-tight`}>
          {profile?.name || 'سوبرماركت البركة'}
        </h2>
        {profile?.storeType && (
          <p className={`${fontSizes.footer} text-black font-bold mt-0.5`}>
            {profile.storeType}
          </p>
        )}
        {profile?.address && (
          <p className={`${fontSizes.footer} text-black mt-0.5`}>{profile.address}</p>
        )}
        {profile?.phone && (
          <p className={`${fontSizes.footer} font-black text-black mt-0.5`}>
            هاتف: {profile.phone}
          </p>
        )}
      </div>

      {/* 2. Invoice Meta Details */}
      <div className={`py-1.5 border-b border-dashed border-black ${fontSizes.meta} space-y-0.5 text-black`}>
        <div className="flex justify-between font-black">
          <span>رقم الفاتورة:</span>
          <span className="font-mono">{invoice.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>التاريخ: {formattedDate}</span>
          <span>الوقت: {formattedTime}</span>
        </div>
        <div className="flex justify-between">
          <span>الكاشير:</span>
          <span className="font-bold">{invoice.cashierName}</span>
        </div>

        {/* Delivery Details (if applicable) */}
        {invoice.hasDelivery && (
          <div className="border border-black p-1 rounded mt-1 bg-white">
            <div className="font-black flex items-center gap-1 text-[9.5px]">
              <Bike className="h-3 w-3 inline text-black" />
              <span>خدمة توصيل ديليفري</span>
            </div>
            {invoice.deliveryAddress && (
              <div className="text-[9px]">العنوان: {invoice.deliveryAddress}</div>
            )}
            {invoice.deliveryPhone && (
              <div className="text-[9px]">الهاتف: {invoice.deliveryPhone}</div>
            )}
          </div>
        )}

        {/* Installment details (if applicable) */}
        {invoice.paymentMethod === 'installment' && (
          <div className="border-2 border-black p-1.5 rounded mt-1 space-y-0.5 bg-white text-black">
            <div className="font-black text-[10px]">فاتورة تقسيط / آجل:</div>
            <div className="flex justify-between font-bold">
              <span>اسم العميل:</span>
              <span>{invoice.customerName || 'عميل آجل'}</span>
            </div>
            {invoice.customerPhone && (
              <div className="flex justify-between text-[9px]">
                <span>الهاتف:</span>
                <span>{invoice.customerPhone}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-0.5 border-t border-black/40">
              <span>المدفوع مقدماً:</span>
              <span>
                {invoice.paidAmount} {profile?.currency || 'ج.م'}
              </span>
            </div>
            <div className="flex justify-between font-black">
              <span>المتبقي في الحساب:</span>
              <span>
                {invoice.remainingAmount} {profile?.currency || 'ج.م'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Items List - Clean 2-tier design for zero overflow on thermal rolls */}
      <div className="py-1.5 border-b-2 border-dashed border-black">
        <div className="flex justify-between font-black text-[10px] pb-1 border-b border-black text-black">
          <span>الصنف والكمية</span>
          <span>الإجمالي</span>
        </div>

        <div className="divide-y divide-black/30 pt-1">
          {invoice.items && invoice.items.length > 0 ? (
            invoice.items.map((item, index) => (
              <div key={index} className="py-1">
                {/* Item Name */}
                <div className={`font-black text-black ${fontSizes.items} leading-tight text-right flex items-center justify-between gap-1`}>
                  <span>{item.name}</span>
                  <span className="font-bold text-[9px] border border-black px-1 py-0.2 rounded shrink-0">
                    {item.saleUnit === 'strip' ? 'شريط' : (item.unitLabel || 'علبة')}
                  </span>
                </div>

                {/* Quantity x Price = Total with Strip Formula Note */}
                <div className="flex justify-between items-center text-[9.5px] text-black font-mono pt-0.5">
                  <span className="font-sans">
                    {item.quantity} {item.saleUnit === 'strip' ? 'شريط' : 'علبة'} × {item.unitPrice.toFixed(2)}
                    {item.saleUnit === 'strip' && item.stripsPerBox > 1 && (
                      <span className="text-[8.5px] font-sans mr-1 text-black">
                        (العلبة ÷ {item.stripsPerBox})
                      </span>
                    )}
                  </span>
                  <span className="font-black text-black font-mono">
                    {item.total.toFixed(2)} {profile?.currency || 'ج.م'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-1 text-center text-xs text-black">لا توجد أصناف</div>
          )}
        </div>
      </div>

      {/* 4. Financial Calculations & Totals */}
      <div className={`py-1.5 border-b border-dashed border-black ${fontSizes.meta} space-y-0.5 text-black`}>
        <div className="flex justify-between">
          <span>المجموع الفرعي:</span>
          <span className="font-mono font-bold">{invoice.subtotal.toFixed(2)}</span>
        </div>

        {invoice.hasDelivery && invoice.deliveryFee > 0 && (
          <div className="flex justify-between font-bold">
            <span>رسوم التوصيل:</span>
            <span className="font-mono font-bold">+{invoice.deliveryFee.toFixed(2)}</span>
          </div>
        )}

        {invoice.discountAmount > 0 && (
          <div className="flex justify-between">
            <span>الخصم:</span>
            <span className="font-mono font-bold">-{invoice.discountAmount.toFixed(2)}</span>
          </div>
        )}

        {invoice.taxAmount > 0 && (
          <div className="flex justify-between">
            <span>الضريبة:</span>
            <span className="font-mono font-bold">+{invoice.taxAmount.toFixed(2)}</span>
          </div>
        )}

        {/* Grand Total */}
        <div className="flex justify-between items-center pt-1.5 mt-1 border-t-2 border-black text-black">
          <span className={`${fontSizes.total} font-black`}>الإجمالي المطلوب:</span>
          <span className={`${fontSizes.total} font-black font-mono underline decoration-2`}>
            {invoice.total.toFixed(2)} {profile?.currency || 'ج.م'}
          </span>
        </div>

        {/* Payment Method */}
        <div className="flex justify-between text-[10px] pt-1 text-black font-bold">
          <span>طريقة الدفع:</span>
          <span>
            {invoice.paymentMethod === 'cash'
              ? 'نقدي (كاش)'
              : invoice.paymentMethod === 'card'
              ? 'فيزا / بطاقة بنكية'
              : 'تقسيط / آجل'}
          </span>
        </div>
      </div>

      {/* 5. Barcode of Invoice */}
      <div className="py-2 text-center flex flex-col items-center justify-center">
        <BarcodeRenderer
          value={invoice.invoiceNumber}
          width={paperWidth === '58mm' ? 1.0 : 1.3}
          height={paperWidth === '58mm' ? 24 : 32}
          fontSize={9}
        />
      </div>

      {/* 6. Custom Store Footer Note */}
      {profile?.receiptFooterNote && (
        <div className={`text-center font-bold text-black ${fontSizes.footer} pb-1.5 leading-tight`}>
          {profile.receiptFooterNote}
        </div>
      )}

      {/* 7. MANDATORY DEVELOPER SIGNATURE FOOTER */}
      <div className="pt-2 border-t border-dotted border-black text-center text-black leading-tight">
        <div className="text-[8.5px]">تم تصميم البرنامج بواسطة</div>
        <div className="font-black text-[10.5px]">محمود حمدي بصري</div>
        <div className="font-mono text-[9px] font-bold">رقم التليفون: 01027568272</div>
      </div>

      {/* 8. Tear-off feed margin for physical paper cutter */}
      <div className="h-4 border-b border-dashed border-black/20 my-1 text-[8px] text-center text-black/40">
        - - - - - - - - - - - -
      </div>
    </div>
  );

  return (
    <>
      {/* 1. ON-SCREEN MODAL PREVIEW (Hidden during print via no-print class) */}
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">
          {/* Top Bar */}
          <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Printer className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm">معاينة وطباعة الفاتورة الحرارية</h3>
                <p className="text-[10px] text-slate-400">
                  متوافق تلقائياً مع كافة طابعات الإيصالات (USB / Bluetooth / Network)
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

          {/* Setup Toolbar */}
          <div className="bg-slate-100 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Paper Width buttons */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 text-[11px]">مقاس الورق:</span>
              <div className="inline-flex bg-slate-200 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleSetWidth('80mm')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    paperWidth === '80mm'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-black'
                  }`}
                  title="عرض الورق 80 مم (الأكثر انتشاراً في نقاط البيع والسوبرماركت)"
                >
                  80 مم (القياسي)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetWidth('58mm')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    paperWidth === '58mm'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-black'
                  }`}
                  title="عرض الورق 58 مم (الطابعات المحمولة والصغيرة والبلوتوث)"
                >
                  58 مم (الصغيرة)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetWidth('auto')}
                  className={`px-2 py-1 rounded-lg font-bold transition-all ${
                    paperWidth === 'auto'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-black'
                  }`}
                  title="ملاءمة تلقائية مع عرض رأس الطابعة"
                >
                  تلقائي
                </button>
              </div>
            </div>

            {/* Font size and Logo toggles */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
                <Type className="h-3.5 w-3.5 text-slate-400 mr-1" />
                {(['compact', 'normal', 'large'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFontSizeMode(mode)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      fontSizeMode === mode
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {mode === 'compact' ? 'مضغوط' : mode === 'normal' ? 'متوسط' : 'كبير'}
                  </button>
                ))}
              </div>

              {profile?.logoUrl && (
                <button
                  type="button"
                  onClick={() => setShowLogo(!showLogo)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-colors ${
                    showLogo
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-300 bg-white text-slate-500'
                  }`}
                  title="إظهار أو إخفاء اللوجو لتوفير مساحة الورقة الحرارية"
                >
                  <ImageIcon className="h-3 w-3" />
                  <span>اللوجو</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-emerald-50/60 p-2.5 px-4 border-b border-emerald-200/80 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all active:scale-[0.99]"
            >
              <Printer className="h-4 w-4" />
              <span>طباعة الإيصال فوراً على ماكينة الفواتير</span>
            </button>

            <span className="text-[11px] text-emerald-900 font-medium hidden sm:inline">
              Margins = None
            </span>
          </div>

          {/* Preview Scroll Area */}
          <div className="flex-1 overflow-y-auto bg-slate-200/70 p-4 sm:p-6 flex justify-center">
            <div
              className={`bg-white border border-slate-300 shadow-lg ${
                paperWidth === '80mm'
                  ? 'w-[74mm] max-w-[74mm]'
                  : paperWidth === '58mm'
                  ? 'w-[48mm] max-w-[48mm]'
                  : 'w-full max-w-[74mm]'
              }`}
            >
              <ReceiptContent isPrintOnly={false} />
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="bg-slate-100 p-2.5 px-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
            <span>
              العرض الحالي:{' '}
              <strong className="text-slate-800">
                {paperWidth === '80mm' ? '80 مم' : paperWidth === '58mm' ? '58 مم' : 'تلقائي'}
              </strong>
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
          <div id="receipt-print-area" className={paperClass}>
            <ReceiptContent isPrintOnly={true} />
          </div>,
          document.body
        )}
    </>
  );
};
