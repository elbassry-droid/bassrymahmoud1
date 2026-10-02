import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Expense } from '../types';
import { DollarSign, Plus, Trash2, Calendar, Tag, FileText } from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { expenses, addExpense, deleteExpense, profile } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'نثريات وبوفيه' as Expense['category'],
    amount: 50,
    notes: '',
  });

  const categories: Expense['category'][] = [
    'إيجار',
    'كهرباء وفواتير',
    'مرتبات',
    'نثريات وبوفيه',
    'صيانة',
    'نقل وبضاعة',
    'أخرى',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || formData.amount <= 0) {
      alert('يرجى كتابة بيان المصروف وتحديد المبلغ');
      return;
    }

    addExpense({
      title: formData.title.trim(),
      category: formData.category,
      amount: Number(formData.amount),
      notes: formData.notes.trim() || undefined,
    });

    setIsModalOpen(false);
    setFormData({ title: '', category: 'نثريات وبوفيه', amount: 50, notes: '' });
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Today's expenses
  const todayStr = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter((e) => e.date.startsWith(todayStr));
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">سجل المصروفات اليومية والنثريات</h2>
            <p className="text-xs text-slate-500">
              تسجيل ومتابعة مصاريف التشغيل، الفواتير، الإيجار، والرواتب
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>تسجيل مصروف جديد</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">مصروفات اليوم الحالي</p>
            <h3 className="text-2xl font-black text-rose-700 mt-1">
              {todayTotal.toLocaleString()} {profile?.currency || 'ج.م'}
            </h3>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            📅
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">إجمالي كل المصروفات المسجلة</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {totalExpenses.toLocaleString()} {profile?.currency || 'ج.م'}
            </h3>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            🧾
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">التاريخ والوقت</th>
                <th className="py-3 px-4">بند المصروف</th>
                <th className="py-3 px-4">التصنيف</th>
                <th className="py-3 px-4">المبلغ</th>
                <th className="py-3 px-4">مسجل بواسطة</th>
                <th className="py-3 px-4">ملاحظات</th>
                <th className="py-3 px-4 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    لا توجد مصروفات مسجلة حتى الآن
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(exp.date).toLocaleDateString('ar-EG')} -{' '}
                      {new Date(exp.date).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{exp.title}</td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-rose-700">
                      -{exp.amount} {profile?.currency || 'ج.م'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{exp.recordedBy}</td>
                    <td className="py-3 px-4 text-slate-400">{exp.notes || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف مصروف: ${exp.title}؟`)) {
                            deleteExpense(exp.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="حذف المصروف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              تسجيل مصروف جديد
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  بيان المصروف <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: فاتورة كهرباء أو شراء أكياس"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    تصنيف المصروف
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as Expense['category'] })
                    }
                    className="w-full rounded-xl border border-slate-300 py-2 px-2 text-xs font-medium focus:border-rose-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    المبلغ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-black text-rose-700 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ملاحظات</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 text-xs shadow-md"
                >
                  تسجيل المصروف
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
