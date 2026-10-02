import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Customer } from '../types';
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Trash2,
  CreditCard,
  Clock,
  DollarSign,
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, recordInstallmentPayment, profile } =
    useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modals
  const [isAddCustModalOpen, setIsAddCustModalOpen] = useState(false);
  const [isPayInstallmentModalOpen, setIsPayInstallmentModalOpen] = useState(false);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNote, setPaymentNote] = useState('');

  // Form state
  const [custForm, setCustForm] = useState({
    name: '',
    phone: '',
    address: '',
    nationalId: '',
    notes: '',
  });

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.nationalId && c.nationalId.includes(q))
    );
  });

  const totalCustomerDebts = customers.reduce((sum, c) => sum + c.totalDebts, 0);

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name.trim() || !custForm.phone.trim()) {
      alert('يرجى إدخال اسم العميل ورقم هاتفه');
      return;
    }

    const created = addCustomer({
      name: custForm.name.trim(),
      phone: custForm.phone.trim(),
      address: custForm.address.trim() || undefined,
      nationalId: custForm.nationalId.trim() || undefined,
      notes: custForm.notes.trim() || undefined,
    });

    setIsAddCustModalOpen(false);
    setSelectedCustomer(created);
    setCustForm({ name: '', phone: '', address: '', nationalId: '', notes: '' });
  };

  const handlePayInstallmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedInstallmentId || paymentAmount <= 0) return;

    recordInstallmentPayment(
      selectedCustomer.id,
      selectedInstallmentId,
      paymentAmount,
      paymentNote || 'سداد قسط نقدي'
    );

    setIsPayInstallmentModalOpen(false);
    // Refresh selected customer
    setSelectedCustomer((prev) =>
      prev ? customers.find((c) => c.id === prev.id) || null : null
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">سجل العملاء والأقساط المؤجلة</h2>
            <p className="text-xs text-slate-500">
              متابعة فواتير التقسيط، مديونيات العملاء، وسداد أقساط الحساب حتى الاستيفاء
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddCustModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">إجمالي عدد العملاء</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{customers.length}</h3>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            👥
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between sm:col-span-2">
          <div>
            <p className="text-xs text-slate-500">إجمالي مبالغ الأقساط المتبقية لدى العملاء</p>
            <h3 className="text-2xl font-black text-amber-700 mt-1">
              {totalCustomerDebts.toLocaleString()} {profile?.currency || 'ج.م'}
            </h3>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            📑
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List Column */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search className="h-4 w-4 absolute inset-y-0 right-3 my-auto text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو رقم الهاتف..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-3 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredCustomers.map((c) => {
              const isSelected = selectedCustomer?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                      : 'border-transparent hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{c.phone}</span>
                      </p>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">الأقساط المتبقية:</span>
                      <span
                        className={`text-xs font-black ${
                          c.totalDebts > 0 ? 'text-amber-700' : 'text-emerald-600'
                        }`}
                      >
                        {c.totalDebts.toLocaleString()} {profile?.currency || 'ج.م'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Details & Installments Ledger */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-[650px] overflow-hidden">
          {selectedCustomer ? (
            <div className="flex-1 flex flex-col overflow-hidden space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 shrink-0">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedCustomer.name}</h3>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                    <span>الهاتف: {selectedCustomer.phone}</span>
                    {selectedCustomer.address && <span>العنوان: {selectedCustomer.address}</span>}
                    {selectedCustomer.nationalId && <span>الرقم القومي: {selectedCustomer.nationalId}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          `هل أنت متأكد من حذف العميل: ${selectedCustomer.name}؟ هذا الإجراء نهائي.`
                        )
                      ) {
                        deleteCustomer(selectedCustomer.id);
                        setSelectedCustomer(null);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                    title="حذف العميل"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Debt Summary */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-xs text-amber-900 font-semibold">
                    إجمالي الأقساط والمديونيات المتبقية على العميل:
                  </span>
                  <div className="text-2xl font-black text-amber-700">
                    {selectedCustomer.totalDebts.toLocaleString()} {profile?.currency || 'ج.م'}
                  </div>
                </div>
                <div className="text-xs text-slate-500 text-left">
                  <div>إجمالي المشتريات: {selectedCustomer.totalPurchases} {profile?.currency}</div>
                  <div>عدد فواتير التقسيط: {selectedCustomer.installments.length}</div>
                </div>
              </div>

              {/* Installments List */}
              <div className="flex-1 overflow-y-auto space-y-3">
                <h4 className="text-xs font-bold text-slate-700">فواتير التقسيط والدفعات المسجلة:</h4>

                {selectedCustomer.installments.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    لا توجد فواتير تقسيط مسجلة على هذا العميل حتى الآن
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCustomer.installments.map((inst) => {
                      const isFullyPaid = inst.remainingAmount <= 0;
                      return (
                        <div
                          key={inst.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-900">
                                فاتورة رقم: {inst.invoiceNumber}
                              </span>
                              <span className="text-slate-400 text-[10px] mr-2">
                                بتاريخ: {new Date(inst.date).toLocaleDateString('ar-EG')}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                isFullyPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isFullyPaid ? 'تم السداد بالكامل' : 'قيد السداد'}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg text-slate-700">
                            <div>
                              <span className="text-[10px] text-slate-400 block">إجمالي الفاتورة:</span>
                              <span className="font-bold">{inst.totalAmount} {profile?.currency}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">المدفوع حتى الآن:</span>
                              <span className="font-bold text-emerald-700">
                                {inst.paidAmount} {profile?.currency}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">المتبقي:</span>
                              <span className="font-black text-rose-700">
                                {inst.remainingAmount} {profile?.currency}
                              </span>
                            </div>
                          </div>

                          {/* Payments breakdown */}
                          {inst.payments.length > 0 && (
                            <div className="text-[11px] text-slate-500 pt-1 space-y-1">
                              <span className="font-bold text-[10px] text-slate-600">سجل الدفعات:</span>
                              {inst.payments.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex justify-between bg-emerald-50/50 border border-emerald-100 p-1.5 rounded"
                                >
                                  <span>{p.notes || 'دفعة قسط'}</span>
                                  <span className="font-bold text-emerald-800">
                                    +{p.amount} {profile?.currency}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {!isFullyPaid && (
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInstallmentId(inst.id);
                                  setPaymentAmount(inst.remainingAmount);
                                  setPaymentNote('سداد قسط نقدي');
                                  setIsPayInstallmentModalOpen(true);
                                }}
                                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 text-xs flex items-center gap-1 shadow-xs"
                              >
                                <DollarSign className="h-3.5 w-3.5" />
                                <span>سداد قسط من الفاتورة</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <Users className="h-12 w-12 text-slate-300 stroke-[1.5] mb-2" />
              <p className="font-semibold text-slate-600 text-sm">اختر عميل من القائمة</p>
              <p className="text-xs text-slate-400 mt-1">لعرض سجل الأقساط المؤجلة وسداد المبالغ المتبقية</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddCustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              تسجيل عميل جديد
            </h3>
            <form onSubmit={handleAddCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم العميل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={custForm.name}
                  onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                  placeholder="مثال: محمود علي عبد الرحمن"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  رقم الهاتف <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={custForm.phone}
                  onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                  placeholder="01012345678"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الرقم القومي (اختياري لضمان التقسيط)
                </label>
                <input
                  type="text"
                  value={custForm.nationalId}
                  onChange={(e) => setCustForm({ ...custForm, nationalId: e.target.value })}
                  placeholder="14 رقم"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">العنوان</label>
                <input
                  type="text"
                  value={custForm.address}
                  onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
                  placeholder="الشارع أو المنطقة"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs shadow-md"
                >
                  حفظ العميل
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCustModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Installment Modal */}
      {isPayInstallmentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              سداد قسط للعميل: {selectedCustomer.name}
            </h3>
            <form onSubmit={handlePayInstallmentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  المبلغ المسدد الآن <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm font-black text-emerald-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ملاحظة السداد
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs shadow-md"
                >
                  تأكيد استلام القسط وتحديث الحساب
                </button>
                <button
                  type="button"
                  onClick={() => setIsPayInstallmentModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
