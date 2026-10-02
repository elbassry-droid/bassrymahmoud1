import LZString from 'lz-string';
import { Product, Invoice, Customer, Supplier, Expense, StoreProfile } from '../types';

export interface SyncDeltaItem {
  id: string;
  type: 'invoice' | 'product' | 'customer' | 'supplier' | 'expense' | 'profile';
  action: 'create' | 'update' | 'delete';
  deviceId: string;
  deviceName: string;
  timestamp: string;
  data: any;
}

export interface SyncConfig {
  enabled: boolean;
  roomCode: string;
  deviceId: string;
  deviceName: string;
  deviceRole: 'master' | 'remote';
  serverUrl?: string;
  autoSyncIntervalSec: number;
}

export interface SyncTrafficStats {
  bytesSent: number;
  bytesReceived: number;
  totalBytes: number;
  totalMB: number;
  quotaMB: number; // 100 MB
  quotaUsedPercent: number;
  lastSyncTime: string | null;
  status: 'connected' | 'syncing' | 'offline' | 'error' | 'idle';
  statusMessage: string;
  syncedDeltasCount: number;
}

const STORAGE_KEYS = {
  CONFIG: 'pharmacy_cloud_sync_config_v1',
  STATS: 'pharmacy_cloud_sync_stats_v1',
  OFFLINE_QUEUE: 'pharmacy_cloud_sync_queue_v1',
  LAST_TIMESTAMP: 'pharmacy_cloud_sync_last_timestamp_v1',
  LAST_VERSION: 'pharmacy_cloud_sync_last_version_v1',
  SERVER_URL: 'pos_custom_server_url',
};

export const DEFAULT_CLOUD_SERVER_URL = 'https://ais-dev-mrag7yx55poebveh5tgqtc-111982313627.europe-west2.run.app';

// Generate random friendly room code
export function generateRandomRoomCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `PHARM-${digits}`;
}

// Generate unique device ID
export function generateDeviceId(): string {
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

export function loadSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load sync config:', e);
  }

  // Default initial configuration
  const defaultCode = generateRandomRoomCode();
  const defaultConfig: SyncConfig = {
    enabled: true,
    roomCode: defaultCode,
    deviceId: generateDeviceId(),
    deviceName: 'الجهاز 1 (الكاشير الرئيسي)',
    deviceRole: 'master',
    serverUrl: DEFAULT_CLOUD_SERVER_URL,
    autoSyncIntervalSec: 20, // 20s adaptive polling (consumes almost 0 data!)
  };

  saveSyncConfig(defaultConfig);
  return defaultConfig;
}

export function saveSyncConfig(config: SyncConfig) {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    if (config.serverUrl) {
      localStorage.setItem(STORAGE_KEYS.SERVER_URL, config.serverUrl);
    }
  } catch (e) {
    console.error('Failed to save sync config:', e);
  }
}

export function loadSyncStats(): SyncTrafficStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load sync stats:', e);
  }

  return {
    bytesSent: 0,
    bytesReceived: 0,
    totalBytes: 0,
    totalMB: 0,
    quotaMB: 100, // 100MB package
    quotaUsedPercent: 0,
    lastSyncTime: null,
    status: 'idle',
    statusMessage: 'المزامنة السحابية جاهزة',
    syncedDeltasCount: 0,
  };
}

export function recordSyncTraffic(sent: number, received: number, status?: SyncTrafficStats['status'], msg?: string) {
  const current = loadSyncStats();
  current.bytesSent += sent;
  current.bytesReceived += received;
  current.totalBytes = current.bytesSent + current.bytesReceived;
  current.totalMB = parseFloat((current.totalBytes / (1024 * 1024)).toFixed(3));
  current.quotaUsedPercent = parseFloat(((current.totalMB / current.quotaMB) * 100).toFixed(2));
  if (status) current.status = status;
  if (msg) current.statusMessage = msg;
  current.lastSyncTime = new Date().toISOString();

  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save sync stats:', e);
  }

  return current;
}

// Queue offline changes
export function queueOfflineDelta(delta: Omit<SyncDeltaItem, 'deviceId' | 'deviceName' | 'timestamp'>) {
  const config = loadSyncConfig();
  const fullDelta: SyncDeltaItem = {
    ...delta,
    deviceId: config.deviceId,
    deviceName: config.deviceName,
    timestamp: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    const queue: SyncDeltaItem[] = raw ? JSON.parse(raw) : [];
    queue.push(fullDelta);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to queue offline delta:', e);
  }
}

export function getOfflineQueue(): SyncDeltaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function clearOfflineQueue() {
  localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
}

// Determine server base URL with smart fallback for standalone HTML files (file://)
export function getSyncApiBase(): string {
  if (typeof window !== 'undefined') {
    // 1. Check custom saved server URL
    try {
      const customUrl = localStorage.getItem(STORAGE_KEYS.SERVER_URL);
      if (customUrl && customUrl.startsWith('http')) {
        return customUrl.replace(/\/+$/, '');
      }
    } catch {}

    // 2. If running under HTTP or HTTPS (server hosted), use origin
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      return window.location.origin;
    }
  }

  // 3. Fallback for standalone HTML files opened via file:///
  return DEFAULT_CLOUD_SERVER_URL;
}

/**
 * Check if remote server has new changes (Ultra low ~20 bytes request)
 */
export async function checkRemoteChanges(
  roomCode: string,
  lastVersion: number,
  deviceId: string
): Promise<{ changed: boolean; version: number; devicesCount: number }> {
  try {
    const base = getSyncApiBase();
    const url = `${base}/api/sync/check?room=${encodeURIComponent(roomCode)}&v=${lastVersion}&deviceId=${encodeURIComponent(deviceId)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Device-Id': deviceId,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const bodySize = (await res.clone().text()).length;
    recordSyncTraffic(20, bodySize);

    if (!res.ok) {
      return { changed: false, version: lastVersion, devicesCount: 0 };
    }

    const data = await res.json();
    return {
      changed: !!data.changed,
      version: data.version || lastVersion,
      devicesCount: data.devicesCount || 1,
    };
  } catch (e) {
    return { changed: false, version: lastVersion, devicesCount: 0 };
  }
}

/**
 * Push deltas to cloud relay
 */
export async function pushDeltasToCloud(
  roomCode: string,
  deltas: SyncDeltaItem[],
  config: SyncConfig
): Promise<boolean> {
  if (!deltas || deltas.length === 0) return true;

  try {
    const base = getSyncApiBase();
    const url = `${base}/api/sync/push`;
    const payload = JSON.stringify({
      roomCode,
      deltas,
      deviceId: config.deviceId,
      deviceName: config.deviceName,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': config.deviceId,
        'X-Device-Name': encodeURIComponent(config.deviceName),
      },
      body: payload,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const sentBytes = payload.length;
    const recBytes = (await res.clone().text()).length;
    recordSyncTraffic(sentBytes, recBytes, 'connected', `تم إرسال ${deltas.length} تعديل بنجاح`);

    return res.ok;
  } catch (e) {
    console.error('Failed to push deltas:', e);
    recordSyncTraffic(0, 0, 'offline', 'فشل الاتصال بالسيرفر - تم الحفظ أوفلاين');
    return false;
  }
}

/**
 * Pull new deltas from cloud relay
 */
export async function pullDeltasFromCloud(
  roomCode: string,
  sinceTimestamp: string,
  config: SyncConfig
): Promise<{ success: boolean; deltas: SyncDeltaItem[]; version: number }> {
  try {
    const base = getSyncApiBase();
    const url = `${base}/api/sync/pull?room=${encodeURIComponent(roomCode)}&since=${encodeURIComponent(sinceTimestamp)}&deviceId=${encodeURIComponent(config.deviceId)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Device-Id': config.deviceId,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const sentBytes = 35;
    const bodyText = await res.clone().text();
    const recBytes = bodyText.length;

    if (!res.ok) {
      recordSyncTraffic(sentBytes, recBytes, 'offline', 'تعذر جلب التحديثات');
      return { success: false, deltas: [], version: 0 };
    }

    const data = JSON.parse(bodyText);
    const deltasCount = data.deltas?.length || 0;
    recordSyncTraffic(
      sentBytes,
      recBytes,
      'connected',
      deltasCount > 0 ? `تم استلام ${deltasCount} تعديل من الجهاز الآخر` : 'متصل ومحدث 100%'
    );

    return {
      success: true,
      deltas: data.deltas || [],
      version: data.version || 0,
    };
  } catch (e) {
    console.error('Failed to pull deltas:', e);
    recordSyncTraffic(0, 0, 'offline', 'وضع أوفلاين');
    return { success: false, deltas: [], version: 0 };
  }
}

/**
 * Upload full snapshot to clone database onto device 2
 */
export async function uploadFullSnapshot(
  roomCode: string,
  snapshot: {
    products: Product[];
    invoices: Invoice[];
    customers: Customer[];
    suppliers: Supplier[];
    expenses: Expense[];
    profile: StoreProfile | null;
  },
  config: SyncConfig
): Promise<boolean> {
  try {
    const base = getSyncApiBase();
    const url = `${base}/api/sync/snapshot`;
    const payload = JSON.stringify({
      roomCode,
      snapshot,
      deviceId: config.deviceId,
      deviceName: config.deviceName,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    });

    const sentBytes = payload.length;
    const recBytes = (await res.clone().text()).length;
    recordSyncTraffic(sentBytes, recBytes, 'connected', 'تم رفع نسخة كاملة للمزامنة بنجاح');

    return res.ok;
  } catch (e) {
    console.error('Error uploading snapshot:', e);
    return false;
  }
}

/**
 * Download full snapshot to clone onto this device
 */
export async function downloadFullSnapshot(
  roomCode: string
): Promise<{
  success: boolean;
  snapshot?: {
    products: Product[];
    invoices: Invoice[];
    customers: Customer[];
    suppliers: Supplier[];
    expenses: Expense[];
    profile: StoreProfile;
  };
  error?: string;
}> {
  try {
    const base = getSyncApiBase();
    const url = `${base}/api/sync/snapshot?room=${encodeURIComponent(roomCode)}`;
    const res = await fetch(url);
    const bodyText = await res.clone().text();
    const recBytes = bodyText.length;

    recordSyncTraffic(30, recBytes);

    if (!res.ok) {
      return { success: false, error: 'لم يتم العثور على نسخة في هذه الغرفة بعد' };
    }

    const data = JSON.parse(bodyText);
    return {
      success: true,
      snapshot: data.snapshot,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || 'تعذر الاتصال بالسيرفر' };
  }
}
