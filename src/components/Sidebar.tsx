import React from 'react';
import { useStore } from '../context/StoreContext';
import {
  Zap,
  RotateCcw,
  Package,
  Truck,
  Users,
  DollarSign,
  Calculator,
  Barcode,
  Receipt,
  UserCheck,
  Settings,
  Phone,
} from 'lucide-react';

export type NavTab =
  | 'pos'
  | 'returns'
  | 'inventory'
  | 'suppliers'
  | 'customers'
  | 'expenses'
  | 'closing'
  | 'barcode'
  | 'invoices'
  | 'employees'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { currentUser } = useStore();
  const isAdmin = currentUser?.role === 'admin';

  // Navigation tabs for Cashier
  const cashierTabs: { id: NavTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'pos', label: 'شاشة البيع السريع (POS)', icon: Zap },
    { id: 'returns', label: 'استرجاع المنتجات', icon: RotateCcw },
  ];

  // Navigation tabs for Admin / Store Manager
  const adminTabs: { id: NavTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'pos', label: 'شاشة البيع (POS)', icon: Zap },
    { id: 'returns', label: 'استرجاع الفواتير', icon: RotateCcw },
    { id: 'inventory', label: 'المخزن والمنتجات', icon: Package },
    { id: 'suppliers', label: 'الموردين والمستحقات', icon: Truck },
    { id: 'customers', label: 'العملاء والأقساط', icon: Users },
    { id: 'expenses', label: 'المصروفات اليومية', icon: DollarSign },
    { id: 'closing', label: 'تقفيل نهاية اليوم', icon: Calculator, badge: 'Z-Report' },
    { id: 'barcode', label: 'مولد وطباعة الباركود', icon: Barcode },
    { id: 'invoices', label: 'سجل الفواتير والمبيعات', icon: Receipt },
    { id: 'employees', label: 'موظفي الكاشير', icon: UserCheck },
    { id: 'settings', label: 'إعدادات المحل والنسخ', icon: Settings },
  ];

  const currentTabs = isAdmin ? adminTabs : cashierTabs;

  return (
    <aside className="no-print w-64 bg-white border-l border-slate-200 flex flex-col justify-between shrink-0 shadow-xs">
      {/* Navigation List */}
      <div className="p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-black text-slate-400 uppercase tracking-wider">
          {isAdmin ? 'القائمة الرئيسية للمدير' : 'قائمة الكاشير'}
        </div>

        {currentTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] bg-emerald-500/20 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Developer credit card at the bottom of sidebar */}
      <div className="p-3 m-3 rounded-2xl bg-slate-50 border border-slate-200/90 text-right space-y-1.5">
        <div className="text-[10px] text-slate-500 font-medium">تم تصميم البرنامج بواسطة:</div>
        <div className="text-xs font-black text-slate-900">محمود حمدي بصري</div>
        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 font-mono">
          <Phone className="h-3 w-3" />
          <span className="dir-ltr inline-block">01027568272</span>
        </div>
      </div>
    </aside>
  );
};
