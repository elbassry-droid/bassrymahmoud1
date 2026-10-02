import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Invoice } from '../types';
import {
  FileText,
  Search,
  Printer,
  Trash2,
  Calendar,
  CreditCard,
  Banknote,
  Bike,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Pill,
  Package,
} from 'lucide-react';

export const InvoicesHistoryView: React.FC = () => {
  const { invoices, deleteInvoice, setActiveReceiptInvoice, profile } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
      (inv.customerPhone && inv.customerPhone.includes(q)) ||
      inv.cashierName.toLowerCase().includes(q);

    const matchesMethod = methodFilter === 'all' || inv.paymentMethod === methodFilter;
    const matchesDate = !dateFilter || inv.date.startsWith(dateFilter);

    return matchesSearch && matchesMethod && matchesDate;
  });

  const handleDelete = (inv: Invoice) => {
    if (
      confirm(
        `هل أنت متأكد من حذف الفاتورة رقم ${inv.invoiceNumber} بقيمة ${inv.total} ${profile?.currency}؟\nسيتم إعادة أصناف الفاتورة إلى رصيد المخزن تلقائياً.`
      )
    ) {
      deleteInvoice(inv.id, true);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">سجل فواتير المبيعات السابقة</h2>
            <p className="text-xs text-slate-500">
              استعراض المبيعات، إعادة طباعة الإيصالات، أو حذف الفواتير الخاطئة
            </p>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
          إجمالي الفواتير المسجلة: {invoices.length} فاتورة
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute inset-y-0 right-3 my-auto text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الفاتورة، اسم العميل، الكاشير..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pr-9 pl-4 text-xs sm:text-sm font-medium focus:border-slate-800 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-medium focus:outline-none"
          >
            <option value="all">جميع طرق الدفع</option>
            <option value="cash">نقدي (كاش)</option>
            <option value="card">شبكة / فيزا</option>
            <option value="installment">تقسيط / آجل</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium focus:outline-none"
          />

          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="text-xs text-rose-600 hover:underline px-1"
            >
              مسح التاريخ
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">رقم الفاتورة</th>
                <th className="py-3 px-4">التاريخ والوقت</th>
                <th className="py-3 px-4">الكاشير</th>
                <th className="py-3 px-4">العميل / ديليفري</th>
                <th className="py-3 px-4">عدد الأصناف</th>
                <th className="py-3 px-4">طريقة الدفع</th>
                <th className="py-3 px-4">إجمالي المبلغ</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    لا توجد فواتير مطابقة للبحث أو التصفية
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isExpanded = expandedInvoiceId === inv.id;
                  const totalStripsCount = inv.items.filter((i) => i.saleUnit === 'strip').reduce((s, i) => s + i.quantity, 0);
                  const totalBoxesCount = inv.items.filter((i) => i.saleUnit !== 'strip').reduce((s, i) => s + i.quantity, 0);

                  return (
                    <React.Fragment key={inv.id}>
                      <tr className={`hover:bg-slate-50/70 transition-colors ${isExpanded ? 'bg-slate-50/90' : ''}`}>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          <button
                            type="button"
                            onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                            className="flex items-center gap-1.5 hover:text-emerald-700 text-right"
                            title="عرض أصناف الفاتورة بالتفصيل"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                            <span>{inv.invoiceNumber}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(inv.date).toLocaleDateString('ar-EG')} -{' '}
                          {new Date(inv.date).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{inv.cashierName}</td>
                        <td className="py-3 px-4">
                          {inv.hasDelivery ? (
                            <div className="flex items-center gap-1 text-emerald-700 font-bold">
                              <Bike className="h-3 w-3" />
                              <span>ديليفري: {inv.customerPhone || inv.deliveryAddress || 'توصيل'}</span>
                            </div>
                          ) : inv.customerName ? (
                            <span className="font-semibold text-amber-800">{inv.customerName}</span>
                          ) : (
                            <span className="text-slate-400">عميل صالة مباشر</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          <div className="space-y-0.5">
                            <span className="font-bold">{inv.items.length} صنف</span>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              {totalBoxesCount > 0 && <span>{totalBoxesCount} علبة</span>}
                              {totalBoxesCount > 0 && totalStripsCount > 0 && <span>+</span>}
                              {totalStripsCount > 0 && (
                                <span className="text-amber-800 font-bold">{totalStripsCount} شريط</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              inv.paymentMethod === 'cash'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.paymentMethod === 'card'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inv.paymentMethod === 'cash'
                              ? 'نقدي (كاش)'
                              : inv.paymentMethod === 'card'
                              ? 'فيزا'
                              : 'تقسيط'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900 text-sm">
                          {inv.total.toFixed(2)} {profile?.currency || 'ج.م'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveReceiptInvoice(inv)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title="طباعة إيصال الفاتورة"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(inv)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="حذف الفاتورة وإعادة الكمية للمخزن"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable items breakdown */}
                      {isExpanded && (
                        <tr className="bg-emerald-50/30">
                          <td colSpan={8} className="p-3 sm:p-4 border-b border-emerald-100">
                            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                              <div className="text-xs font-bold text-slate-800 flex items-center justify-between pb-1.5 border-b border-slate-100">
                                <span>تفاصيل أصناف الفاتورة رقم: {inv.invoiceNumber}</span>
                                <span className="text-[11px] text-slate-500">
                                  تاريخ: {new Date(inv.date).toLocaleString('ar-EG')}
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-right text-[11px]">
                                  <thead>
                                    <tr className="text-slate-500 border-b border-slate-100 font-bold">
                                      <th className="py-1.5 px-2">الصنف</th>
                                      <th className="py-1.5 px-2">الوحدة المباعة</th>
                                      <th className="py-1.5 px-2">سعر الوحدة</th>
                                      <th className="py-1.5 px-2">الكمية</th>
                                      <th className="py-1.5 px-2">الإجمالي</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {inv.items.map((it, idx) => {
                                      const isStrip = it.saleUnit === 'strip';
                                      return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                          <td className="py-1.5 px-2 font-bold text-slate-800">
                                            {it.name}
                                          </td>
                                          <td className="py-1.5 px-2">
                                            {isStrip ? (
                                              <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                                                <Pill className="h-3 w-3" />
                                                <span>شريط (العلبة ÷ {it.stripsPerBox})</span>
                                              </span>
                                            ) : (
                                              <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-1.5 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                                                <Package className="h-3 w-3" />
                                                <span>علبة كاملة</span>
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-1.5 px-2 font-mono">
                                            {it.unitPrice.toFixed(2)} {profile?.currency || 'ج.م'}
                                          </td>
                                          <td className="py-1.5 px-2 font-bold">
                                            {it.quantity} {isStrip ? 'شريط' : 'علبة'}
                                          </td>
                                          <td className="py-1.5 px-2 font-black text-emerald-700 font-mono">
                                            {it.total.toFixed(2)} {profile?.currency || 'ج.م'}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
