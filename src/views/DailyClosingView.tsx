import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Calculator,
  Calendar,
  Banknote,
  CreditCard,
  RotateCcw,
  Bike,
  Printer,
  TrendingUp,
  Receipt,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const DailyClosingView: React.FC = () => {
  const { invoices, expenses, suppliers, customers, profile } = useStore();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filter items by selected date
  const dayInvoices = invoices.filter((inv) => inv.date.startsWith(selectedDate));
  const dayExpenses = expenses.filter((e) => e.date.startsWith(selectedDate));

  // Supplier payments today
  const daySupplierPayments = suppliers.reduce((sum, sup) => {
    const pays = sup.payments.filter((p) => p.date.startsWith(selectedDate));
    return sum + pays.reduce((pSum, pay) => pSum + pay.amount, 0);
  }, 0);

  // Customer installment collections today
  const dayInstallmentCollections = customers.reduce((sum, cust) => {
    let collected = 0;
    cust.installments.forEach((inst) => {
      inst.payments.forEach((p) => {
        if (p.date.startsWith(selectedDate)) {
          collected += p.amount;
        }
      });
    });
    return sum + collected;
  }, 0);

  // Totals calculations
  let totalSales = 0;
  let cashSales = 0;
  let cardSales = 0;
  let installmentSales = 0;
  let deliveryFeesTotal = 0;
  let totalRefunds = 0;
  let totalCOGS = 0; // Cost of Goods Sold

  dayInvoices.forEach((inv) => {
    totalSales += inv.total;
    if (inv.hasDelivery) deliveryFeesTotal += inv.deliveryFee;

    if (inv.paymentMethod === 'cash') {
      cashSales += inv.total;
    } else if (inv.paymentMethod === 'card') {
      cardSales += inv.total;
    } else if (inv.paymentMethod === 'installment') {
      installmentSales += inv.total;
      cashSales += inv.paidAmount; // Cash collected as down payment
    }

    // Returned items refunds
    if (inv.returnedItems) {
      inv.returnedItems.forEach((r) => {
        totalRefunds += r.refundAmount;
      });
    }

    // Cost calculation
    inv.items.forEach((item) => {
      totalCOGS += (item.purchasePrice || 0) * item.quantity;
    });
  });

  const totalDayExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Total cash drawer balance: Cash sales + collected installment payments - refunds - daily expenses - supplier payments
  const netCashInDrawer =
    cashSales + dayInstallmentCollections - totalRefunds - totalDayExpenses - daySupplierPayments;

  // Estimated gross profit (Sales - Cost) - Expenses
  const grossProfit = totalSales - totalCOGS;
  const netProfit = grossProfit - totalDayExpenses;

  const handlePrintDailyReport = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">حساب نهاية اليوم وتقفيل الخزينة (Z-Report)</h2>
            <p className="text-xs text-slate-500">
              مطابقة درج الكاشير، الإيرادات والمصروفات، وصافي الأرباح التقديرية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-none font-sans"
            />
          </div>

          <button
            type="button"
            onClick={handlePrintDailyReport}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold shadow-md transition-all"
          >
            <Printer className="h-4 w-4 text-emerald-400" />
            <span>طباعة تقرير الإغلاق (Z-Report)</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Net Drawer Cash */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md space-y-1">
          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
            <Banknote className="h-4 w-4" />
            الصافي النقدي المتوقع في درج الكاشير
          </span>
          <div className="text-3xl font-black tracking-tight text-white pt-1">
            {netCashInDrawer.toLocaleString()} {profile?.currency || 'ج.م'}
          </div>
          <p className="text-[11px] text-slate-400 pt-1">
            (المبيعات النقدية + تحصيلات الأقساط) - (المرتجع + المصروفات + سداد الموردين)
          </p>
        </div>

        {/* Total Gross Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
            <Receipt className="h-4 w-4 text-blue-600" />
            إجمالي مبيعات اليوم (كل الطرق)
          </span>
          <div className="text-2xl font-black text-slate-900 pt-1">
            {totalSales.toLocaleString()} {profile?.currency || 'ج.م'}
          </div>
          <p className="text-[11px] text-slate-500 pt-1">{dayInvoices.length} فواتير بيع تم إصدارها اليوم</p>
        </div>

        {/* Net Estimated Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            صافي الربح التقديري لليوم
          </span>
          <div
            className={`text-2xl font-black pt-1 ${
              netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {netProfit.toLocaleString()} {profile?.currency || 'ج.م'}
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            (هامش ربح المبيعات بعد خصم تكلفة البضاعة والمصروفات)
          </p>
        </div>
      </div>

      {/* Detailed Balance Sheet Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          تفاصيل الحركات المالية لليوم ({new Date(selectedDate).toLocaleDateString('ar-EG')}):
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg">
              الإيرادات والمقبوضات النقدية (+)
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                  المبيعات النقدية المباشرة (كاش):
                </span>
                <span className="font-bold text-slate-900">
                  +{cashSales.toLocaleString()} {profile?.currency}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                  مبيعات الفيزا والشبكة (حساب البنك):
                </span>
                <span className="font-bold text-blue-700">
                  +{cardSales.toLocaleString()} {profile?.currency}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-amber-600" />
                  أقساط محصلة من العملاء اليوم:
                </span>
                <span className="font-bold text-amber-800">
                  +{dayInstallmentCollections.toLocaleString()} {profile?.currency}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-1">
                  <Bike className="h-3.5 w-3.5 text-indigo-600" />
                  رسوم خدمة التوصيل (ديليفري):
                </span>
                <span className="font-semibold text-slate-800">
                  +{deliveryFeesTotal.toLocaleString()} {profile?.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Expense & Deduction Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg">
              المدفوعات والمصروفات الخارجة من الدرج (-)
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-1">
                  <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                  مبالغ المرتجعات المستردة للعملاء:
                </span>
                <span className="font-bold text-rose-700">
                  -{totalRefunds.toLocaleString()} {profile?.currency}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-1">
                  <Receipt className="h-3.5 w-3.5 text-rose-600" />
                  مصروفات التشغيل والنثريات اليومية:
                </span>
                <span className="font-bold text-rose-700">
                  -{totalDayExpenses.toLocaleString()} {profile?.currency}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600 flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5 text-rose-600" />
                  دفعات مسددة للموردين نقداً اليوم:
                </span>
                <span className="font-bold text-rose-700">
                  -{daySupplierPayments.toLocaleString()} {profile?.currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden printable Z-Report section for thermal POS printer */}
      <div className="hidden">
        <div id="receipt-print-area" className="p-4 font-mono text-xs text-black bg-white max-w-[300px]">
          <div className="text-center pb-2 border-b border-dashed border-black">
            <h2 className="font-bold text-sm">{profile?.name}</h2>
            <p className="text-[10px]">تقرير الإغلاق المالي للدرج (Z-Report)</p>
            <p className="text-[10px]">التاريخ: {selectedDate}</p>
          </div>
          <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-black">
            <div className="flex justify-between">
              <span>إجمالي المبيعات:</span>
              <span>{totalSales} {profile?.currency}</span>
            </div>
            <div className="flex justify-between">
              <span>المبيعات النقدية:</span>
              <span>{cashSales} {profile?.currency}</span>
            </div>
            <div className="flex justify-between">
              <span>مبيعات الشبكة:</span>
              <span>{cardSales} {profile?.currency}</span>
            </div>
            <div className="flex justify-between">
              <span>أقساط محصلة:</span>
              <span>{dayInstallmentCollections} {profile?.currency}</span>
            </div>
            <div className="flex justify-between">
              <span>المرتجع:</span>
              <span>-{totalRefunds} {profile?.currency}</span>
            </div>
            <div className="flex justify-between">
              <span>المصروفات:</span>
              <span>-{totalDayExpenses} {profile?.currency}</span>
            </div>
            <div className="flex justify-between">
              <span>سداد الموردين:</span>
              <span>-{daySupplierPayments} {profile?.currency}</span>
            </div>
          </div>
          <div className="py-2 text-sm font-black flex justify-between border-b border-black">
            <span>الصافي في الدرج:</span>
            <span>{netCashInDrawer} {profile?.currency}</span>
          </div>
          <div className="text-center pt-2 text-[9px] text-gray-700">
            تم تصميم البرنامج بواسطة محمود حمدي بصري 01027568272
          </div>
        </div>
      </div>
    </div>
  );
};
