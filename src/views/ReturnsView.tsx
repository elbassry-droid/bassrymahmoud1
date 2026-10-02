import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Invoice } from '../types';
import { RotateCcw, Search, CheckCircle, AlertCircle, Printer, Eye } from 'lucide-react';

export const ReturnsView: React.FC = () => {
  const { invoices, returnInvoiceItems, setActiveReceiptInvoice, profile } = useStore();
  const [searchCode, setSearchCode] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<{ [itemKey: string]: number }>({});
  const [returnSuccessMsg, setReturnSuccessMsg] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setReturnSuccessMsg('');
    const query = searchCode.trim().toLowerCase();
    if (!query) return;

    const found = invoices.find(
      (inv) =>
        inv.invoiceNumber.toLowerCase() === query ||
        inv.id.toLowerCase() === query ||
        inv.items.some((item) => item.barcode === query)
    );

    if (found) {
      setSelectedInvoice(found);
      const initialQtys: { [itemKey: string]: number } = {};
      found.items.forEach((item, index) => {
        initialQtys[`${item.productId}-${item.saleUnit}-${index}`] = 0;
      });
      setSelectedItemIds(initialQtys);
    } else {
      setSelectedInvoice(null);
      alert('لم يتم العثور على فاتورة بهذا الرقم أو الباركود');
    }
  };

  const handleReturnSubmit = () => {
    if (!selectedInvoice) return;

    const returnList: {
      productId: string;
      quantity: number;
      refundAmount: number;
      saleUnit?: 'box' | 'strip';
    }[] = [];

    selectedInvoice.items.forEach((item, index) => {
      const key = `${item.productId}-${item.saleUnit}-${index}`;
      const qty = selectedItemIds[key] || 0;
      if (qty > 0) {
        returnList.push({
          productId: item.productId,
          quantity: qty,
          refundAmount: qty * item.unitPrice,
          saleUnit: item.saleUnit,
        });
      }
    });

    if (returnList.length === 0) {
      alert('يرجى تحديد كمية صنف واحد على الأقل لاسترجاعه');
      return;
    }

    returnInvoiceItems(selectedInvoice.id, returnList);
    setReturnSuccessMsg('تم تسجيل عملية استرجاع الأصناف بنجاح وإعادة رصيدها (بالشريط والعلبة) للمخزن!');
    setSelectedInvoice(null);
    setSearchCode('');
  };

  const totalRefundAmount = selectedInvoice
    ? selectedInvoice.items.reduce((sum, item, index) => {
        const key = `${item.productId}-${item.saleUnit}-${index}`;
        const qty = selectedItemIds[key] || 0;
        return sum + qty * item.unitPrice;
      }, 0)
    : 0;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <RotateCcw className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">شاشة استرجاع المنتجات والفواتير</h2>
            <p className="text-xs text-slate-500">
              استرجاع أصناف الفواتير السابقة وإعادتها للمخزن مع خصم قيمة المرتجع من الكاشير
            </p>
          </div>
        </div>
      </div>

      {returnSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{returnSuccessMsg}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="اكتب رقم الفاتورة (مثال: INV-123456) أو امسح باركود الفاتورة..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pr-10 pl-4 text-sm font-medium focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 text-sm transition-colors"
          >
            بحث عن الفاتورة
          </button>
        </form>
      </div>

      {/* Selected Invoice Details & Return Form */}
      {selectedInvoice && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-slate-900">
                  فاتورة رقم: {selectedInvoice.invoiceNumber}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    selectedInvoice.status === 'returned'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedInvoice.status === 'returned' ? 'تم استرجاع جزئي/كلي' : 'مكتملة'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                تاريخ البيع: {new Date(selectedInvoice.date).toLocaleString('ar-EG')} — الكاشير:{' '}
                {selectedInvoice.cashierName}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveReceiptInvoice(selectedInvoice)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Printer className="h-4 w-4 text-emerald-600" />
              <span>إعادة طباعة الإيصال الأصلية</span>
            </button>
          </div>

          {/* Items Return Table */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3">
              حدد الكميات المراد استرجاعها من الأصناف:
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">الباركود</th>
                    <th className="py-2.5 px-3">اسم الدواء</th>
                    <th className="py-2.5 px-3">نوع البيع</th>
                    <th className="py-2.5 px-3">سعر الوحدة</th>
                    <th className="py-2.5 px-3">الكمية المباعة</th>
                    <th className="py-2.5 px-3">الكمية المسترجعة</th>
                    <th className="py-2.5 px-3">مبلغ الاسترجاع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items.map((item, index) => {
                    const key = `${item.productId}-${item.saleUnit}-${index}`;
                    const currentReturnQty = selectedItemIds[key] || 0;
                    const isStrip = item.saleUnit === 'strip';
                    return (
                      <tr key={key} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-slate-500">{item.barcode}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <div>
                            <span>{item.name}</span>
                            {isStrip && item.stripsPerBox > 1 && (
                              <div className="text-[10px] text-amber-800 font-medium">
                                حسبة الشريط: سعر العلبة ÷ {item.stripsPerBox} شرايط
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {isStrip ? (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full text-[10px]">
                              💊 شريط
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-2 py-0.5 rounded-full text-[10px]">
                              📦 علبة
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          {item.unitPrice} {profile?.currency || 'ج.م'}
                        </td>
                        <td className="py-2.5 px-3 font-bold">
                          {item.quantity} {isStrip ? 'شريط' : 'علبة'}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={currentReturnQty}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(item.quantity, Number(e.target.value) || 0));
                              setSelectedItemIds({ ...selectedItemIds, [key]: val });
                            }}
                            className="w-20 rounded-lg border border-slate-300 py-1 px-2 text-center font-bold text-xs focus:border-rose-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-black text-rose-700">
                          {(currentReturnQty * item.unitPrice).toFixed(2)} {profile?.currency || 'ج.م'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Refund summary and action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-rose-50/70 border border-rose-200">
            <div>
              <span className="text-xs text-rose-800 font-medium">إجمالي المبلغ الواجب رده للعميل:</span>
              <div className="text-xl font-black text-rose-700">
                {totalRefundAmount.toFixed(2)} {profile?.currency || 'ج.م'}
              </div>
            </div>

            <button
              type="button"
              disabled={totalRefundAmount <= 0}
              onClick={handleReturnSubmit}
              className="w-full sm:w-auto rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black py-2.5 px-6 shadow-md shadow-rose-600/20 text-sm transition-all disabled:opacity-50"
            >
              تأكيد الاسترجاع ورد المبلغ وإعادة للمخزن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
