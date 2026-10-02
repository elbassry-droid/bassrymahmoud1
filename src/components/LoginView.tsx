import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Lock, User, Eye, EyeOff, ShieldCheck, ShoppingCart, Store, ArrowLeft } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { profile, login } = useStore();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('2027');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      const ok = login(username, password);
      setIsLoading(false);
      if (!ok) {
        setErrorMsg('اسم المستخدم أو كلمة المرور غير صحيحة، يرجى التأكد والمحاولة مرة أخرى');
      }
    }, 150);
  };

  const fillQuickAccount = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between p-4 sm:p-6 text-slate-800">
      {/* Top Bar Branding */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            {profile?.logoUrl ? (
              <img src={profile.logoUrl} alt="Logo" className="h-7 w-7 object-contain" />
            ) : (
              <Store className="h-6 w-6" />
            )}
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {profile?.name || 'نظام إدارة المتاجر والسوبرماركت'}
            </h1>
            <p className="text-xs text-slate-500">{profile?.storeType || 'نظام كاشير ومخازن متكامل'}</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>يعمل بدون اتصال بالإنترنت (أوفلاين)</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">تسجيل الدخول للنظام</h2>
            <p className="text-sm text-slate-500 mt-1">
              اختر نوع الحساب وأدخل بياناتك للبدء بالعمل
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-sm text-rose-700 flex items-center gap-2">
              <span className="shrink-0 font-bold">✕</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                اسم المستخدم
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin أو اسم الكاشير"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pr-11 pl-4 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                كلمة المرور (مشفرة)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pr-11 pl-11 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 px-4 shadow-lg shadow-emerald-600/25 transition-all text-base disabled:opacity-70"
            >
              <span>{isLoading ? 'جاري الدخول...' : 'دخول إلى البرنامج'}</span>
              <ArrowLeft className="h-5 w-5" />
            </button>
          </form>

          {/* Quick preset credentials helper for ease of testing */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 mb-2.5 text-center">
              اختصارات سريعة لتسجيل الدخول:
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillQuickAccount('admin', '2027')}
                className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  username === 'admin'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    مدير المحل
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                    admin
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">صلاحيات كاملة + إيرادات</span>
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount('cashier', '1234')}
                className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  username === 'cashier'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
                    الكاشير
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                    cashier
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">بيع واسترجاع فقط</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Developer credit footer */}
      <footer className="w-full text-center py-4 border-t border-slate-200 text-xs text-slate-500">
        <p className="font-medium">
          تم تصميم البرنامج بواسطة <span className="font-bold text-slate-800">محمود حمدي بصري</span> — رقم التليفون:{' '}
          <span className="font-mono text-emerald-700 font-bold dir-ltr inline-block">01027568272</span>
        </p>
      </footer>
    </div>
  );
};
