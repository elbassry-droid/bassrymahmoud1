import { StoreProfile, LicenseState, UserAccount, Product, Invoice, Supplier, Customer, Expense } from '../types';

interface OfflineExportData {
  profile: StoreProfile | null;
  license: LicenseState;
  users: UserAccount[];
  products: Product[];
  invoices: Invoice[];
  suppliers: Supplier[];
  customers: Customer[];
  expenses: Expense[];
}

export async function generateOfflineHtmlBundle(data: OfflineExportData): Promise<void> {
  const downloadFileName = `نظام_الكاشير_والمخازن_محمود_حمدي_بصري_offline.html`;

  try {
    // 1. Fetch the pre-bundled single-file offline HTML
    const response = await fetch('/pos_offline_singlefile.html');
    if (response.ok) {
      let html = await response.text();

      // 2. Prepare user state injection
      const serializedData = JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>');
      const stateBootstrapper = `
<script>
  (function() {
    try {
      var d = ${serializedData};
      // CRITICAL: Only populate if key does NOT exist in user's browser localStorage yet.
      // This ensures all subsequent additions, sales, and edits are permanently saved and never overwritten on page reload!
      if (d.profile && localStorage.getItem('pos_store_profile_v1') === null) {
        localStorage.setItem('pos_store_profile_v1', JSON.stringify(d.profile));
      }
      if (d.license && localStorage.getItem('pos_license_v1') === null) {
        localStorage.setItem('pos_license_v1', JSON.stringify(d.license));
      }
      if (d.users && d.users.length && localStorage.getItem('pos_users_v1') === null) {
        localStorage.setItem('pos_users_v1', JSON.stringify(d.users));
      }
      if (d.products && d.products.length && localStorage.getItem('pos_products_v1') === null) {
        localStorage.setItem('pos_products_v1', JSON.stringify(d.products));
      }
      if (d.invoices && d.invoices.length && localStorage.getItem('pos_invoices_v1') === null) {
        localStorage.setItem('pos_invoices_v1', JSON.stringify(d.invoices));
      }
      if (d.suppliers && d.suppliers.length && localStorage.getItem('pos_suppliers_v1') === null) {
        localStorage.setItem('pos_suppliers_v1', JSON.stringify(d.suppliers));
      }
      if (d.customers && d.customers.length && localStorage.getItem('pos_customers_v1') === null) {
        localStorage.setItem('pos_customers_v1', JSON.stringify(d.customers));
      }
      if (d.expenses && d.expenses.length && localStorage.getItem('pos_expenses_v1') === null) {
        localStorage.setItem('pos_expenses_v1', JSON.stringify(d.expenses));
      }
    } catch(err) {
      console.warn('Initial storage bootstrapper:', err);
    }
  })();
</script>
`;

      // 3. Inject bootstrapper right after <div id="root"></div> and before main <script>
      html = html.replace('<div id="root"></div>', `<div id="root"></div>\n${stateBootstrapper}`);

      // 4. Download file to user's computer
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
  } catch (err) {
    console.warn('Direct fetch failed, falling back to static URL download', err);
  }

  // Fallback: static link
  const a = document.createElement('a');
  a.href = '/pos_offline_singlefile.html';
  a.download = downloadFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
