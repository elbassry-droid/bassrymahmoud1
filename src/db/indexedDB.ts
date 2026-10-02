import {
  Product,
  Invoice,
  Supplier,
  Customer,
  Expense,
  UserAccount,
  StoreProfile,
  LicenseState,
  CartItem,
} from '../types';

const DB_NAME = 'PharmacyPOS_IndexedDB_v2';
const DB_VERSION = 2; // Incremented for drugeye_master store

export const STORES = {
  PRODUCTS: 'products',
  INVOICES: 'invoices',
  SUPPLIERS: 'suppliers',
  CUSTOMERS: 'customers',
  EXPENSES: 'expenses',
  USERS: 'users',
  SETTINGS: 'settings',
  DRUGEYE_MASTER: 'drugeye_master',
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

export interface StoredDrugEyeMedicine {
  id: string; // unique key (e.g. name or barcode)
  name: string;
  price: number;
  activeIngredient: string;
  category: string;
  company: string;
  stripsPerBox: number;
  dosageForm: string;
  rawBarcode?: string;
  updatedAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes and opens the IndexedDB database instance with schema migrations.
 */
export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Products store (Medicines)
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        productStore.createIndex('barcode', 'barcode', { unique: false });
        productStore.createIndex('name', 'name', { unique: false });
        productStore.createIndex('category', 'category', { unique: false });
        productStore.createIndex('activeIngredient', 'activeIngredient', { unique: false });
        productStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }

      // 2. Invoices store
      if (!db.objectStoreNames.contains(STORES.INVOICES)) {
        const invoiceStore = db.createObjectStore(STORES.INVOICES, { keyPath: 'id' });
        invoiceStore.createIndex('invoiceNumber', 'invoiceNumber', { unique: true });
        invoiceStore.createIndex('date', 'date', { unique: false });
        invoiceStore.createIndex('customerId', 'customerId', { unique: false });
        invoiceStore.createIndex('status', 'status', { unique: false });
      }

      // 3. Suppliers store
      if (!db.objectStoreNames.contains(STORES.SUPPLIERS)) {
        const supplierStore = db.createObjectStore(STORES.SUPPLIERS, { keyPath: 'id' });
        supplierStore.createIndex('name', 'name', { unique: false });
        supplierStore.createIndex('phone', 'phone', { unique: false });
      }

      // 4. Customers store
      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        const customerStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
        customerStore.createIndex('name', 'name', { unique: false });
        customerStore.createIndex('phone', 'phone', { unique: false });
      }

      // 5. Expenses store
      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const expenseStore = db.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
        expenseStore.createIndex('date', 'date', { unique: false });
        expenseStore.createIndex('category', 'category', { unique: false });
      }

      // 6. Users store
      if (!db.objectStoreNames.contains(STORES.USERS)) {
        const userStore = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
        userStore.createIndex('username', 'username', { unique: true });
      }

      // 7. Settings store (key-value store for profile, license, cart, etc.)
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      // 8. DrugEye Master Offline Database store (stores thousands of downloaded DrugEye medicines)
      if (!db.objectStoreNames.contains(STORES.DRUGEYE_MASTER)) {
        const masterStore = db.createObjectStore(STORES.DRUGEYE_MASTER, { keyPath: 'id' });
        masterStore.createIndex('name', 'name', { unique: false });
        masterStore.createIndex('activeIngredient', 'activeIngredient', { unique: false });
        masterStore.createIndex('category', 'category', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Generic helper to get all items from an object store.
 */
export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const db = await getDB();
  return new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic helper to put a single item into a store.
 */
export async function putInStore<T>(storeName: StoreName, item: T): Promise<void> {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic helper to delete an item by key.
 */
export async function deleteFromStore(storeName: StoreName, key: IDBValidKey): Promise<void> {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Fast bulk insertion / update for tens of thousands of items using chunked transactions.
 * Non-blocking, yields execution to keep UI smooth and provides progress updates.
 */
export async function bulkPutInStore<T extends { id?: string; key?: string }>(
  storeName: StoreName,
  items: T[],
  chunkSize = 1000,
  onProgress?: (processed: number, total: number) => void
): Promise<void> {
  if (items.length === 0) return;
  const db = await getDB();

  let processed = 0;
  const total = items.length;

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      for (const item of chunk) {
        store.put(item);
      }

      tx.oncomplete = () => {
        processed += chunk.length;
        if (onProgress) onProgress(Math.min(processed, total), total);
        resolve();
      };

      tx.onerror = () => reject(tx.error);
    });

    // Yield back to browser event loop to avoid UI freezing
    if (i + chunkSize < total) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}

/**
 * Clear an entire store.
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get setting value from Settings store.
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await getDB();
    return new Promise<T>((resolve) => {
      const tx = db.transaction(STORES.SETTINGS, 'readonly');
      const store = tx.objectStore(STORES.SETTINGS);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value as T);
        } else {
          resolve(defaultValue);
        }
      };
      request.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

/**
 * Put setting value in Settings store.
 */
export async function setSetting<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.SETTINGS, 'readwrite');
      const store = tx.objectStore(STORES.SETTINGS);
      const request = store.put({ key, value, updatedAt: new Date().toISOString() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('setSetting error:', err);
  }
}

/**
 * Saves downloaded DrugEye medicines into the persistent local IndexedDB master catalog.
 */
export async function saveDrugEyeMasterToDB(
  drugs: Array<{
    name: string;
    price: number;
    activeIngredient: string;
    category: string;
    company: string;
    stripsPerBox: number;
    dosageForm: string;
    rawBarcode?: string;
  }>,
  onProgress?: (saved: number, total: number) => void
): Promise<void> {
  const now = new Date().toISOString();
  const formatted: StoredDrugEyeMedicine[] = drugs.map((d) => ({
    id: d.name.trim().toLowerCase(),
    name: d.name.trim(),
    price: d.price,
    activeIngredient: d.activeIngredient || '',
    category: d.category || '',
    company: d.company || '',
    stripsPerBox: d.stripsPerBox || 1,
    dosageForm: d.dosageForm || 'أقراص',
    rawBarcode: d.rawBarcode || '',
    updatedAt: now,
  }));

  await bulkPutInStore(STORES.DRUGEYE_MASTER, formatted, 500, onProgress);
  await setSetting('drugeye_last_sync_date', now);
  await setSetting('drugeye_last_sync_count', drugs.length);
}

/**
 * Retrieves all stored DrugEye master medicines from IndexedDB.
 */
export async function getDrugEyeMasterFromDB(): Promise<StoredDrugEyeMedicine[]> {
  try {
    return await getAllFromStore<StoredDrugEyeMedicine>(STORES.DRUGEYE_MASTER);
  } catch (e) {
    console.warn('Failed getting DrugEye master from DB:', e);
    return [];
  }
}

/**
 * Searches local DrugEye master database (100% offline).
 */
export async function searchLocalDrugEyeMaster(query: string): Promise<StoredDrugEyeMedicine[]> {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  try {
    const all = await getDrugEyeMasterFromDB();
    return all.filter(
      (m) =>
        m.name.toLowerCase().includes(clean) ||
        m.activeIngredient.toLowerCase().includes(clean) ||
        m.category.toLowerCase().includes(clean) ||
        m.company.toLowerCase().includes(clean)
    );
  } catch {
    return [];
  }
}

/**
 * Migration helper: Imports initial default seeds from localStorage if IndexedDB is empty.
 */
export async function runInitialIndexedDBMigration(defaults: {
  products: Product[];
  invoices: Invoice[];
  suppliers: Supplier[];
  customers: Customer[];
  expenses: Expense[];
  users: UserAccount[];
  profile: StoreProfile | null;
  license: LicenseState;
}): Promise<void> {
  try {
    const migrationDone = await getSetting('indexeddb_migration_completed_v2', false);
    if (migrationDone) return;

    console.log('⚡ Initializing IndexedDB ultra-speed database storage...');

    // 1. Migrate Products
    let productsToSave: Product[] = defaults.products;
    const localProductsRaw =
      localStorage.getItem('pos_pharmacy_products_v2') || localStorage.getItem('pos_products_v1');
    if (localProductsRaw) {
      try {
        const parsed = JSON.parse(localProductsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          productsToSave = parsed;
        }
      } catch (e) {
        console.warn('Failed parsing local products for migration', e);
      }
    }
    await bulkPutInStore(STORES.PRODUCTS, productsToSave);

    // 2. Migrate Invoices
    const localInvoicesRaw =
      localStorage.getItem('pos_pharmacy_invoices_v2') || localStorage.getItem('pos_invoices_v1');
    if (localInvoicesRaw) {
      try {
        const parsed = JSON.parse(localInvoicesRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          await bulkPutInStore(STORES.INVOICES, parsed);
        }
      } catch (e) {
        console.warn('Failed parsing local invoices for migration', e);
      }
    }

    // 3. Migrate Suppliers
    let suppliersToSave: Supplier[] = defaults.suppliers;
    const localSuppliersRaw =
      localStorage.getItem('pos_pharmacy_suppliers_v2') || localStorage.getItem('pos_suppliers_v1');
    if (localSuppliersRaw) {
      try {
        const parsed = JSON.parse(localSuppliersRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          suppliersToSave = parsed;
        }
      } catch (e) {
        console.warn('Failed parsing local suppliers for migration', e);
      }
    }
    await bulkPutInStore(STORES.SUPPLIERS, suppliersToSave);

    // 4. Migrate Customers
    let customersToSave: Customer[] = defaults.customers;
    const localCustRaw = localStorage.getItem('pos_customers_v1');
    if (localCustRaw) {
      try {
        const parsed = JSON.parse(localCustRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          customersToSave = parsed;
        }
      } catch (e) {
        console.warn('Failed parsing local customers for migration', e);
      }
    }
    await bulkPutInStore(STORES.CUSTOMERS, customersToSave);

    // 5. Migrate Expenses
    let expensesToSave: Expense[] = defaults.expenses;
    const localExpRaw = localStorage.getItem('pos_expenses_v1');
    if (localExpRaw) {
      try {
        const parsed = JSON.parse(localExpRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          expensesToSave = parsed;
        }
      } catch (e) {
        console.warn('Failed parsing local expenses for migration', e);
      }
    }
    await bulkPutInStore(STORES.EXPENSES, expensesToSave);

    // 6. Migrate Users
    let usersToSave: UserAccount[] = defaults.users;
    const localUsersRaw =
      localStorage.getItem('pos_pharmacy_users_v2') || localStorage.getItem('pos_users_v1');
    if (localUsersRaw) {
      try {
        const parsed = JSON.parse(localUsersRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          usersToSave = parsed;
        }
      } catch (e) {
        console.warn('Failed parsing local users for migration', e);
      }
    }
    await bulkPutInStore(STORES.USERS, usersToSave);

    // 7. Migrate Settings (Profile, License)
    const localProfileRaw =
      localStorage.getItem('pos_pharmacy_profile_v2') || localStorage.getItem('pos_store_profile_v1');
    if (localProfileRaw) {
      try {
        await setSetting('store_profile', JSON.parse(localProfileRaw));
      } catch {}
    } else {
      await setSetting('store_profile', defaults.profile);
    }

    const localLicenseRaw = localStorage.getItem('pos_license_v1');
    if (localLicenseRaw) {
      try {
        await setSetting('store_license', JSON.parse(localLicenseRaw));
      } catch {}
    } else {
      await setSetting('store_license', defaults.license);
    }

    await setSetting('indexeddb_migration_completed_v2', true);
    console.log('⚡ IndexedDB Migration successfully completed!');
  } catch (err) {
    console.error('Error during IndexedDB migration:', err);
  }
}

export const migrateFromLocalStorageIfNeeded = runInitialIndexedDBMigration;
