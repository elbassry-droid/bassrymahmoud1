import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { UserAccount } from '../types';
import { UserCheck, Plus, Trash2, ShieldCheck, ShoppingCart, Lock, Eye, EyeOff } from 'lucide-react';

export const EmployeesView: React.FC = () => {
  const { users, addUser, deleteUser, toggleUserStatus, currentUser } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'cashier' as 'cashier' | 'admin',
    active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim() || !formData.password.trim()) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    // Check if username already exists
    if (users.some((u) => u.username.toLowerCase() === formData.username.trim().toLowerCase())) {
      alert('اسم المستخدم هذا مسجل بالفعل لموظف آخر، يرجى اختيار اسم مستخدم مختلف');
      return;
    }

    addUser({
      name: formData.name.trim(),
      username: formData.username.trim().toLowerCase(),
      password: formData.password,
      role: formData.role,
      active: formData.active,
    });

    setIsModalOpen(false);
    setFormData({ name: '', username: '', password: '', role: 'cashier', active: true });
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">إدارة موظفي الكاشير والمستخدمين</h2>
            <p className="text-xs text-slate-500">
              إضافة حسابات جديدة لموظفي الكاشير بصلاحيات مبيعات واسترجاع فقط
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة موظف كاشير جديد</span>
        </button>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">اسم الموظف</th>
                <th className="py-3 px-4">اسم المستخدم</th>
                <th className="py-3 px-4">الدور والصلاحية</th>
                <th className="py-3 px-4">كلمة المرور</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isAdmin = u.role === 'admin';
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black">
                        {u.name.charAt(0)}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{u.username}</td>
                    <td className="py-3 px-4">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          <ShieldCheck className="h-3 w-3" />
                          <span>مدير المحل (صلاحية كاملة)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          <ShoppingCart className="h-3 w-3" />
                          <span>كاشير (بيع واسترجاع فقط)</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {/* Password hidden as requested: "مش عايز الباسوردات تظهر" */}
                      ••••••••
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => toggleUserStatus(u.id)}
                        disabled={u.username === 'admin'}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                          u.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {u.active ? 'نشط ويعمل' : 'معطل'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {u.username !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف حساب الموظف: ${u.name}؟`)) {
                              deleteUser(u.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="حذف الحساب"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Cashier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              إضافة موظف كاشير جديد
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الاسم الكامل للموظف <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: أحمد عبد الله (كاشير المسائي)"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم المستخدم (لتسجيل الدخول) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="مثال: ahmed2 أو cashier2"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  كلمة المرور (مشفرة ومحمية) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الصلاحية ونوع الحساب
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as 'cashier' | 'admin' })
                  }
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                >
                  <option value="cashier">كاشير فقط (مبيعات واسترجاع - لا يرى الإيرادات أو الموردين)</option>
                  <option value="admin">مدير إضافي (صلاحيات كاملة على كل شيء)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs shadow-md"
                >
                  إضافة الموظف الآن
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
