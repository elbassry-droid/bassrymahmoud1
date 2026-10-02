import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Supplier } from '../types';
import {
  Truck,
  Plus,
  Search,
  DollarSign,
  Phone,
  MapPin,
  Trash2,
  Edit2,
  FileText,
  CreditCard,
  Building,
  CheckCircle2,
} from 'lucide-react';

export const SuppliersView: React.FC = () => {
  const {
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addSupplierPurchase,
    addSupplierPayment,
    profile,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Modals
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  // Forms state
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    companyName: '',
    phone: '',
    address: '',
    balanceDue: 0,
    notes: '',
  });

  const [purchaseForm, setPurchaseForm] = useState({
    invoiceNumber: `PO-${Date.now().toString().slice(-5)}`,
    itemsSummary: '',
    totalAmount: 0,
    paidAmount: 0,
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    notes: 'سند صرف دفعة نقدية للمورد',
  });

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.companyName && s.companyName.toLowerCase().includes(q)) ||
      s.phone.includes(q)
    );
  });

  const totalDebtsToSuppliers = suppliers.reduce((sum, s) => sum + s.balanceDue, 0);

  const handleAddSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim() || !supplierForm.phone.trim()) {
      alert('يرجى كتابة اسم المورد ورقم الهاتف');
      return;
    }

    addSupplier({
      name: supplierForm.name.trim(),
      companyName: supplierForm.companyName.trim() || undefined,
      phone: supplierForm.phone.trim(),
      address: supplierForm.address.trim() || undefined,
      balanceDue: Number(supplierForm.balanceDue) || 0,
      notes: supplierForm.notes.trim() || undefined,
    });

    setIsAddSupplierOpen(false);
    setSupplierForm({
      name: '',
      companyName: '',
      phone: '',
      address: '',
      balanceDue: 0,
      notes: '',
    });
  };

  const handleAddPurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    if (purchaseForm.totalAmount <= 0) {
      alert('يرجى تحديد إجمالي فاتورة التوريد');
      return;
    }

    addSupplierPurchase(selectedSupplier.id, {
      invoiceNumber: purchaseForm.invoiceNumber,
      itemsSummary: purchaseForm.itemsSummary,
      totalAmount: Number(purchaseForm.totalAmount),
      paidAmount: Number(purchaseForm.paidAmount),
      notes: purchaseForm.notes,
    });

    setIsAddPurchaseOpen(false);
    // Refresh selected supplier view
    setSelectedSupplier((prev) =>
      prev ? suppliers.find((s) => s.id === prev.id) || null : null
    );
  };

  const handleAddPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    if (paymentForm.amount <= 0) {
      alert('يرجى تحديد المبلغ المراد سداده');
      return;
    }

    addSupplierPayment(selectedSupplier.id, {
      amount: Number(paymentForm.amount),
      notes: paymentForm.notes,
    });

    setIsAddPaymentOpen(false);
    setSelectedSupplier((prev) =>
      prev ? suppliers.find((s) => s.id === prev.id) || null : null
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">الموردين والمبالغ المستحقة للدفع</h2>
            <p className="text-xs text-slate-500">
              متابعة فواتير المشتريات، كشوف حساب الموردين، وسداد الدفعات النقدية
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddSupplierOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة مورد جديد</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">إجمالي عدد الموردين</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{suppliers.length}</h3>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            🏢
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between sm:col-span-2">
          <div>
            <p className="text-xs text-slate-500">إجمالي المبالغ الواجب دفعها للموردين (مديونيات مؤجلة)</p>
            <h3 className="text-2xl font-black text-rose-700 mt-1">
              {totalDebtsToSuppliers.toLocaleString()} {profile?.currency || 'ج.م'}
            </h3>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            💸
          </div>
        </div>
      </div>

      {/* Main Content: Suppliers List & Statement Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suppliers List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search className="h-4 w-4 absolute inset-y-0 right-3 my-auto text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو الهاتف..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-3 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredSuppliers.map((s) => {
              const isSelected = selectedSupplier?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSupplier(s)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                      : 'border-transparent hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{s.name}</h4>
                      {s.companyName && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="h-3 w-3 text-slate-400" />
                          <span>{s.companyName}</span>
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{s.phone}</span>
                      </p>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">المستحق:</span>
                      <span
                        className={`text-xs font-black ${
                          s.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {s.balanceDue.toLocaleString()} {profile?.currency || 'ج.م'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Supplier Details & Ledger */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-[650px] overflow-hidden">
          {selectedSupplier ? (
            <div className="flex-1 flex flex-col overflow-hidden space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{selectedSupplier.name}</h3>
                    {selectedSupplier.companyName && (
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                        {selectedSupplier.companyName}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                    <span>الهاتف: {selectedSupplier.phone}</span>
                    {selectedSupplier.address && <span>العنوان: {selectedSupplier.address}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseForm({
                        invoiceNumber: `PO-${Date.now().toString().slice(-5)}`,
                        itemsSummary: '',
                        totalAmount: 0,
                        paidAmount: 0,
                        notes: '',
                      });
                      setIsAddPurchaseOpen(true);
                    }}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 text-xs flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>تسجيل فاتورة توريد</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentForm({
                        amount: selectedSupplier.balanceDue,
                        notes: 'سداد دفعة للمورد',
                      });
                      setIsAddPaymentOpen(true);
                    }}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 text-xs flex items-center gap-1 shadow-xs"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>سداد دفعة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          `هل أنت متأكد من حذف المورد: ${selectedSupplier.name}؟ هذا الإجراء نهائي.`
                        )
                      ) {
                        deleteSupplier(selectedSupplier.id);
                        setSelectedSupplier(null);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                    title="حذف المورد"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Balance Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-xs text-slate-500">إجمالي المديونية الحالية للمورد:</span>
                  <div className="text-2xl font-black text-rose-700">
                    {selectedSupplier.balanceDue.toLocaleString()} {profile?.currency || 'ج.م'}
                  </div>
                </div>
                <div className="text-left text-xs text-slate-500">
                  <div>عدد فواتير التوريد: {selectedSupplier.purchases.length}</div>
                  <div>عدد الدفعات المسددة: {selectedSupplier.payments.length}</div>
                </div>
              </div>

              {/* Transactions / Purchases tabs */}
              <div className="flex-1 overflow-y-auto space-y-3">
                <h4 className="text-xs font-bold text-slate-700">سجل فواتير التوريد وسندات الصرف:</h4>

                {selectedSupplier.purchases.length === 0 && selectedSupplier.payments.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    لا توجد فواتير أو حركات مسجلة لهذا المورد حتى الآن
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedSupplier.purchases.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                            <span>فاتورة توريد: {p.invoiceNumber}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{p.itemsSummary || 'توريد بضاعة للمخزن'}</p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(p.date).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-slate-900">
                            {p.totalAmount} {profile?.currency}
                          </div>
                          <div className="text-[10px] text-emerald-600">
                            المدفوع: {p.paidAmount} | المتبقي: {p.remainingAmount}
                          </div>
                        </div>
                      </div>
                    ))}

                    {selectedSupplier.payments.map((pay) => (
                      <div
                        key={pay.id}
                        className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>سند صرف دفعة نقدية</span>
                          </div>
                          <p className="text-[11px] text-emerald-700 mt-0.5">{pay.notes}</p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(pay.date).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                        <div className="text-left font-black text-emerald-700 text-sm">
                          -{pay.amount} {profile?.currency}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <Truck className="h-12 w-12 text-slate-300 stroke-[1.5] mb-2" />
              <p className="font-semibold text-slate-600 text-sm">اختر مورد من القائمة</p>
              <p className="text-xs text-slate-400 mt-1">لعرض كشف الحساب وتسجيل فواتير التوريد وسداد الدفعات</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Supplier Modal */}
      {isAddSupplierOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              إضافة مورد جديد
            </h3>
            <form onSubmit={handleAddSupplierSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم المورد / المسؤول <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="مثال: الحاج إبراهيم الشرقاوي"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم الشركة أو المؤسسة
                </label>
                <input
                  type="text"
                  value={supplierForm.companyName}
                  onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })}
                  placeholder="مثال: شركة النصر لتوريد المواد الغذائية"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رقم الهاتف <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رصيد مديونية افتتاحي
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={supplierForm.balanceDue}
                    onChange={(e) => setSupplierForm({ ...supplierForm, balanceDue: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">العنوان</label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs shadow-md"
                >
                  حفظ المورد
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Purchase Invoice Modal */}
      {isAddPurchaseOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              تسجيل فاتورة توريد جديدة من: {selectedSupplier.name}
            </h3>
            <form onSubmit={handleAddPurchaseSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  رقم فاتورة التوريد
                </label>
                <input
                  type="text"
                  required
                  value={purchaseForm.invoiceNumber}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  بيان البضاعة المستلمة
                </label>
                <input
                  type="text"
                  value={purchaseForm.itemsSummary}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, itemsSummary: e.target.value })}
                  placeholder="مثال: توريد 50 كرتونة زيت و30 شيكارة أرز"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    إجمالي الفاتورة
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={purchaseForm.totalAmount}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, totalAmount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    المدفوع نقداً فوراً
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={purchaseForm.totalAmount}
                    value={purchaseForm.paidAmount}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paidAmount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-bold text-emerald-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold flex justify-between">
                <span>المبلغ المتبقي مديونية:</span>
                <span className="text-rose-600">
                  {Math.max(0, purchaseForm.totalAmount - purchaseForm.paidAmount)} {profile?.currency || 'ج.م'}
                </span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 text-xs shadow-md"
                >
                  حفظ الفاتورة وتحديث الحساب
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddPurchaseOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Voucher Modal */}
      {isAddPaymentOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              سند صرف وسداد دفعة للمورد: {selectedSupplier.name}
            </h3>
            <form onSubmit={handleAddPaymentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  المبلغ المدفوع للمورد <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm font-black text-emerald-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ملاحظات أو رقم إيصال الاستلام
                </label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs shadow-md"
                >
                  تأكيد سداد المبلغ وتخفيض المديونية
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddPaymentOpen(false)}
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
