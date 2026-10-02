import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { StoreSetupModal } from './components/StoreSetupModal';
import { LoginView } from './components/LoginView';
import { TrialLockModal } from './components/TrialLockModal';
import { ThermalReceipt } from './components/ThermalReceipt';
import { SettingsModal } from './components/SettingsModal';
import { BarcodeLabelGenerator } from './components/BarcodeLabelGenerator';
import { DrugEyeSyncModal } from './components/DrugEyeSyncModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { DesktopAppModal } from './components/DesktopAppModal';

// Views
import { POSView } from './views/POSView';
import { ReturnsView } from './views/ReturnsView';
import { InventoryView } from './views/InventoryView';
import { SuppliersView } from './views/SuppliersView';
import { CustomersView } from './views/CustomersView';
import { ExpensesView } from './views/ExpensesView';
import { DailyClosingView } from './views/DailyClosingView';
import { InvoicesHistoryView } from './views/InvoicesHistoryView';
import { EmployeesView } from './views/EmployeesView';

const MainAppContent: React.FC = () => {
  const {
    profile,
    currentUser,
    isTrialExpired,
    activeReceiptInvoice,
    setActiveReceiptInvoice,
  } = useStore();

  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStoreSetupOpen, setIsStoreSetupOpen] = useState(false);
  const [isDrugEyeOpen, setIsDrugEyeOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isDesktopAppOpen, setIsDesktopAppOpen] = useState(false);

  // 1. If store profile has not been set yet, show setup modal first
  if (!profile) {
    return <StoreSetupModal isOpen={true} isInitialSetup={true} />;
  }

  // 2. If 5-day trial has expired and system is not activated, lock screen
  if (isTrialExpired) {
    return <TrialLockModal isOpen={true} isMandatoryLock={true} />;
  }

  // 3. If not logged in, show login page
  if (!currentUser) {
    return <LoginView />;
  }

  // Enforce cashier role boundaries (cashiers can ONLY access POS and Returns)
  const isCashier = currentUser.role === 'cashier';
  const effectiveTab: NavTab = isCashier && activeTab !== 'pos' && activeTab !== 'returns'
    ? 'pos'
    : activeTab;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-['Cairo',sans-serif] selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenStoreProfile={() => setIsStoreSetupOpen(true)}
        onOpenDrugEye={() => setIsDrugEyeOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        onOpenDesktopModal={() => setIsDesktopAppOpen(true)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Role-based Sidebar */}
        <Sidebar activeTab={effectiveTab} onSelectTab={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setActiveTab(tab);
          }
        }} />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto bg-slate-100 flex flex-col justify-between">
          <div className="min-w-0">
            {effectiveTab === 'pos' && <POSView />}
            {effectiveTab === 'returns' && <ReturnsView />}
            {effectiveTab === 'inventory' && !isCashier && <InventoryView />}
            {effectiveTab === 'suppliers' && !isCashier && <SuppliersView />}
            {effectiveTab === 'customers' && !isCashier && <CustomersView />}
            {effectiveTab === 'expenses' && !isCashier && <ExpensesView />}
            {effectiveTab === 'closing' && !isCashier && <DailyClosingView />}
            {effectiveTab === 'barcode' && !isCashier && (
              <BarcodeLabelGenerator onClose={() => setActiveTab('pos')} />
            )}
            {effectiveTab === 'invoices' && !isCashier && <InvoicesHistoryView />}
            {effectiveTab === 'employees' && !isCashier && <EmployeesView />}
          </div>

          {/* Footer with credit */}
          <footer className="no-print py-3 px-6 text-center text-xs text-slate-500 border-t border-slate-200 bg-white/70 backdrop-blur-xs">
            تم تصميم البرنامج بواسطة <span className="font-bold text-slate-900">محمود حمدي بصري</span> — رقم التليفون:{' '}
            <span className="font-mono font-bold text-emerald-700 dir-ltr inline-block">01027568272</span>
          </footer>
        </main>
      </div>

      {/* Settings Modal (Black Themed) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenStoreSetup={() => setIsStoreSetupOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        onOpenDesktopModal={() => setIsDesktopAppOpen(true)}
      />

      {/* Store Profile Setup Modal (Black Themed) */}
      <StoreSetupModal
        isOpen={isStoreSetupOpen}
        onClose={() => setIsStoreSetupOpen(false)}
        isInitialSetup={false}
      />

      {/* Thermal POS Receipt Modal Preview */}
      <ThermalReceipt
        invoice={activeReceiptInvoice}
        onClose={() => setActiveReceiptInvoice(null)}
      />

      {/* DrugEye Live Search & Sync Modal */}
      <DrugEyeSyncModal
        isOpen={isDrugEyeOpen}
        onClose={() => setIsDrugEyeOpen(false)}
      />

      {/* 2-Device Remote Cloud Sync Modal (<100MB internet usage) */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
      />

      {/* Windows Desktop EXE App Modal */}
      <DesktopAppModal
        isOpen={isDesktopAppOpen}
        onClose={() => setIsDesktopAppOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainAppContent />
    </StoreProvider>
  );
}
