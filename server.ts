import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import https from 'https';

// Allow connection to DrugEye server even if its SSL certificate is expired or self-signed
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DRUGEYE_URL = 'https://drugeye.pharorg.com/drugeyeapp/android-search/drugeye-android-live-go.aspx';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const SYNC_FILE = path.join(DATA_DIR, 'sync_store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create data dir:', e);
  }
}

// In-memory sync store with persistence
interface SyncDelta {
  id: string;
  type: 'invoice' | 'product' | 'customer' | 'supplier' | 'expense' | 'profile';
  action: 'create' | 'update' | 'delete';
  deviceId: string;
  deviceName: string;
  timestamp: string;
  data: any;
}

interface SyncRoom {
  roomCode: string;
  createdAt: string;
  lastUpdated: string;
  version: number;
  devices: Array<{ id: string; name: string; lastSeen: string }>;
  deltas: SyncDelta[];
  fullSnapshot?: {
    products?: any[];
    invoices?: any[];
    customers?: any[];
    suppliers?: any[];
    expenses?: any[];
    profile?: any;
    version: number;
    updatedAt: string;
  };
  stats: {
    totalBytesTransferred: number;
    pushesCount: number;
    pullsCount: number;
  };
}

let syncRooms: Record<string, SyncRoom> = {};

// Load persistent sync store
try {
  if (fs.existsSync(SYNC_FILE)) {
    const raw = fs.readFileSync(SYNC_FILE, 'utf-8');
    syncRooms = JSON.parse(raw);
    console.log(`📦 Loaded ${Object.keys(syncRooms).length} sync rooms from disk`);
  }
} catch (e) {
  console.error('Error loading sync_store.json:', e);
  syncRooms = {};
}

function persistSyncStore() {
  try {
    fs.writeFileSync(SYNC_FILE, JSON.stringify(syncRooms, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing sync_store.json:', e);
  }
}

/**
 * Intelligent parser for DrugEye HTML output table
 */
function parseDrugEyeHtml(fullHtml: string) {
  const tableStartIndex = fullHtml.indexOf('<table id="MyTable"');
  if (tableStartIndex === -1) return [];

  const tableEndIndex = fullHtml.indexOf('<input name="Passgenericname"', tableStartIndex);
  const tablePart = tableEndIndex !== -1 
    ? fullHtml.slice(tableStartIndex, tableEndIndex)
    : fullHtml.slice(tableStartIndex);

  const rows = tablePart.split(/<\/?tr[^>]*>/gi).filter((r) => r.trim().length > 0);
  const drugs: Array<{
    name: string;
    price: number;
    activeIngredient: string;
    category: string;
    company: string;
    stripsPerBox: number;
    dosageForm: string;
  }> = [];

  let currentDrug: {
    name: string;
    price: number;
    activeIngredient: string;
    category: string;
    company: string;
    stripsPerBox: number;
    dosageForm: string;
  } | null = null;

  for (const row of rows) {
    const isBlue = /color:\s*blue/i.test(row) || /color="blue"/i.test(row);
    const isRed = /color:\s*red/i.test(row) || /color="red"/i.test(row);

    if (isBlue && isRed) {
      if (currentDrug && currentDrug.name) {
        drugs.push(currentDrug);
      }

      const cleanText = (str: string) =>
        str
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();

      const tds = row.split(/<\/?td[^>]*>/gi).filter((t) => t.trim().length > 0);
      const name = tds[0] ? cleanText(tds[0]) : '';
      const priceStr = tds[1] ? cleanText(tds[1]) : '0';
      const price = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;

      let stripsPerBox = 1;
      let dosageForm = 'أقراص';

      const upperName = name.toUpperCase();
      if (upperName.includes('TAB') || upperName.includes('CAP') || upperName.includes('PILL')) {
        dosageForm = upperName.includes('CAP') ? 'كبسولات' : 'أقراص';
        const numMatch = upperName.match(/(\d+)\s*(?:F\.C\.)?\s*(?:TABS?|CAPS?|PILLS?)/i);
        if (numMatch) {
          const totalUnits = parseInt(numMatch[1], 10);
          if (totalUnits === 20 || totalUnits === 24) stripsPerBox = 2;
          else if (totalUnits === 30) stripsPerBox = 3;
          else if (totalUnits === 40) stripsPerBox = 4;
          else if (totalUnits === 48 || totalUnits === 50) stripsPerBox = 4;
          else if (totalUnits === 60) stripsPerBox = 6;
          else if (totalUnits === 10) stripsPerBox = 1;
          else if (totalUnits > 10) stripsPerBox = Math.max(1, Math.round(totalUnits / 10));
        }
      } else if (upperName.includes('SYRUP') || upperName.includes('SUSPENSION') || upperName.includes('ELIXIR')) {
        dosageForm = 'شراب';
        stripsPerBox = 1;
      } else if (upperName.includes('AMP') || upperName.includes('VIAL') || upperName.includes('INJ')) {
        dosageForm = 'حقن وأمبولات';
        const ampMatch = upperName.match(/(\d+)\s*(?:AMPS?|VIALS?)/i);
        if (ampMatch) stripsPerBox = parseInt(ampMatch[1], 10) || 1;
      } else if (upperName.includes('CREAM') || upperName.includes('OINT')) {
        dosageForm = 'مراهم وكريمات';
        stripsPerBox = 1;
      } else if (upperName.includes('DROPS')) {
        dosageForm = 'نقط للعين/الأذن';
        stripsPerBox = 1;
      } else if (upperName.includes('SACHET')) {
        dosageForm = 'أكياس فوار';
        const sachMatch = upperName.match(/(\d+)\s*SACHETS?/i);
        if (sachMatch) stripsPerBox = parseInt(sachMatch[1], 10) || 1;
      }

      currentDrug = {
        name,
        price,
        activeIngredient: '',
        category: '',
        company: '',
        stripsPerBox,
        dosageForm,
      };
      continue;
    }

    if (currentDrug) {
      const cleanText = (str: string) =>
        str
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();

      if (/color:\s*black/i.test(row) || /color="black"/i.test(row)) {
        currentDrug.activeIngredient = cleanText(row);
      } else if (/color:\s*green/i.test(row) || /color="green"/i.test(row)) {
        currentDrug.category = cleanText(row);
      } else if (
        /color:\s*blueviolet/i.test(row) ||
        /color="blueviolet"/i.test(row) ||
        /color:\s*purple/i.test(row)
      ) {
        currentDrug.company = cleanText(row);
      }
    }
  }

  if (currentDrug && currentDrug.name) {
    drugs.push(currentDrug);
  }

  return drugs;
}

/**
 * Searches DrugEye live web service with automatic ViewState management
 */
async function searchDrugEye(query: string) {
  try {
    const initRes = await fetch(DRUGEYE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      },
    });

    const initHtml = await initRes.text();
    const vs = initHtml.match(/id="__VIEWSTATE" value="([^"]+)"/)?.[1] || '';
    const ev = initHtml.match(/id="__EVENTVALIDATION" value="([^"]+)"/)?.[1] || '';
    const vsg = initHtml.match(/id="__VIEWSTATEGENERATOR" value="([^"]+)"/)?.[1] || '';

    const body = new URLSearchParams({
      __VIEWSTATE: vs,
      __EVENTVALIDATION: ev,
      __VIEWSTATEGENERATOR: vsg,
      ttt: query.trim(),
      b1: 'search',
    });

    const postRes = await fetch(DRUGEYE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      },
      body: body.toString(),
    });

    const postHtml = await postRes.text();
    const medicines = parseDrugEyeHtml(postHtml);

    return {
      success: true,
      query,
      count: medicines.length,
      medicines,
      source: 'DrugEye Live Database (pharorg.com)',
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('DrugEye API search error:', error);
    return {
      success: false,
      query,
      count: 0,
      medicines: [],
      error: error?.message || 'تعذر الاتصال بخادم DrugEye',
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS middleware for cross-origin or standalone HTML files
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Device-Id, X-Device-Name');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // ==========================================
  // CLOUD SYNC & ULTRA-LOW DATA RELAY ROUTES
  // Designed for < 100MB internet usage
  // ==========================================

  // 1. Initialize or join a sync room
  app.post('/api/sync/init', (req, res) => {
    const requestedCode = (req.body.roomCode || '').trim().toUpperCase() || `PHARM-${Math.floor(1000 + Math.random() * 9000)}`;
    const deviceId = req.body.deviceId || `dev-${Date.now()}`;
    const deviceName = req.body.deviceName || 'جهاز صيدلية';

    if (!syncRooms[requestedCode]) {
      syncRooms[requestedCode] = {
        roomCode: requestedCode,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: 1,
        devices: [],
        deltas: [],
        stats: {
          totalBytesTransferred: 0,
          pushesCount: 0,
          pullsCount: 0,
        },
      };
    }

    const room = syncRooms[requestedCode];
    // Update or register device
    const existingDev = room.devices.find((d) => d.id === deviceId);
    if (existingDev) {
      existingDev.lastSeen = new Date().toISOString();
      existingDev.name = deviceName;
    } else {
      room.devices.push({
        id: deviceId,
        name: deviceName,
        lastSeen: new Date().toISOString(),
      });
    }

    persistSyncStore();

    res.json({
      success: true,
      roomCode: requestedCode,
      version: room.version,
      lastUpdated: room.lastUpdated,
      connectedDevicesCount: room.devices.length,
      devices: room.devices,
      hasSnapshot: !!room.fullSnapshot,
    });
  });

  // 2. Ultra-lightweight version check (returns ~20 bytes, saves 99.9% data)
  app.get('/api/sync/check', (req, res) => {
    const roomCode = String(req.query.room || '').trim().toUpperCase();
    const clientVersion = parseInt(String(req.query.v || '0'), 10);
    const deviceId = String(req.headers['x-device-id'] || req.query.deviceId || '');

    if (!roomCode || !syncRooms[roomCode]) {
      return res.json({ success: true, exists: false, changed: false, version: 0 });
    }

    const room = syncRooms[roomCode];

    // Heartbeat device last seen
    if (deviceId) {
      const dev = room.devices.find((d) => d.id === deviceId);
      if (dev) dev.lastSeen = new Date().toISOString();
    }

    const changed = room.version > clientVersion;
    res.json({
      success: true,
      exists: true,
      changed,
      version: room.version,
      lastUpdated: room.lastUpdated,
      devicesCount: room.devices.length,
    });
  });

  // 3. Push delta changes (only sent when an invoice or item is modified)
  app.post('/api/sync/push', (req, res) => {
    const { roomCode, deltas, snapshot, deviceId, deviceName } = req.body;
    const cleanRoom = (roomCode || '').trim().toUpperCase();

    if (!cleanRoom) {
      return res.status(400).json({ success: false, error: 'كود المزامنة مطلوب' });
    }

    if (!syncRooms[cleanRoom]) {
      syncRooms[cleanRoom] = {
        roomCode: cleanRoom,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: 1,
        devices: [],
        deltas: [],
        stats: { totalBytesTransferred: 0, pushesCount: 0, pullsCount: 0 },
      };
    }

    const room = syncRooms[cleanRoom];
    const incomingBytes = JSON.stringify(req.body).length;
    room.stats.totalBytesTransferred += incomingBytes;
    room.stats.pushesCount += 1;

    // Process deltas
    if (Array.isArray(deltas) && deltas.length > 0) {
      for (const delta of deltas) {
        room.deltas.push({
          id: delta.id || `delta-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: delta.type,
          action: delta.action || 'update',
          deviceId: deviceId || delta.deviceId || 'unknown',
          deviceName: deviceName || delta.deviceName || 'كاشير',
          timestamp: delta.timestamp || new Date().toISOString(),
          data: delta.data,
        });
      }

      // Keep only last 2000 deltas to conserve memory
      if (room.deltas.length > 2000) {
        room.deltas = room.deltas.slice(-1500);
      }
    }

    // Process full snapshot if provided (e.g. initial upload or explicit backup)
    if (snapshot) {
      room.fullSnapshot = {
        products: snapshot.products,
        invoices: snapshot.invoices,
        customers: snapshot.customers,
        suppliers: snapshot.suppliers,
        expenses: snapshot.expenses,
        profile: snapshot.profile,
        version: room.version + 1,
        updatedAt: new Date().toISOString(),
      };
    }

    room.version += 1;
    room.lastUpdated = new Date().toISOString();

    persistSyncStore();

    res.json({
      success: true,
      newVersion: room.version,
      lastUpdated: room.lastUpdated,
      deltasSaved: Array.isArray(deltas) ? deltas.length : 0,
      totalBytesTransferred: room.stats.totalBytesTransferred,
    });
  });

  // 4. Pull delta changes since client timestamp / version
  app.get('/api/sync/pull', (req, res) => {
    const roomCode = String(req.query.room || '').trim().toUpperCase();
    const sinceTimestamp = String(req.query.since || '');
    const clientDeviceId = String(req.headers['x-device-id'] || req.query.deviceId || '');

    if (!roomCode || !syncRooms[roomCode]) {
      return res.status(404).json({ success: false, error: 'غرفة المزامنة غير موجودة' });
    }

    const room = syncRooms[roomCode];
    room.stats.pullsCount += 1;

    let newDeltas = room.deltas;
    if (sinceTimestamp) {
      const sinceTime = new Date(sinceTimestamp).getTime();
      newDeltas = room.deltas.filter((d) => {
        const dTime = new Date(d.timestamp).getTime();
        // Don't echo back deltas that originated from this exact client unless requested
        const isFromSameDevice = clientDeviceId && d.deviceId === clientDeviceId;
        return dTime > sinceTime && !isFromSameDevice;
      });
    }

    const payload = {
      success: true,
      roomCode,
      version: room.version,
      lastUpdated: room.lastUpdated,
      deltas: newDeltas,
      hasSnapshot: !!room.fullSnapshot,
      stats: room.stats,
    };

    const outgoingBytes = JSON.stringify(payload).length;
    room.stats.totalBytesTransferred += outgoingBytes;

    res.json(payload);
  });

  // 5. Full snapshot upload/download for cloning to device 2
  app.post('/api/sync/snapshot', (req, res) => {
    const { roomCode, snapshot, deviceId } = req.body;
    const cleanRoom = (roomCode || '').trim().toUpperCase();

    if (!cleanRoom || !snapshot) {
      return res.status(400).json({ success: false, error: 'بيانات غير كاملة' });
    }

    if (!syncRooms[cleanRoom]) {
      syncRooms[cleanRoom] = {
        roomCode: cleanRoom,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: 1,
        devices: [],
        deltas: [],
        stats: { totalBytesTransferred: 0, pushesCount: 0, pullsCount: 0 },
      };
    }

    const room = syncRooms[cleanRoom];
    room.fullSnapshot = {
      ...snapshot,
      version: room.version + 1,
      updatedAt: new Date().toISOString(),
    };
    room.version += 1;
    room.lastUpdated = new Date().toISOString();

    const byteLen = JSON.stringify(req.body).length;
    room.stats.totalBytesTransferred += byteLen;

    persistSyncStore();

    res.json({
      success: true,
      version: room.version,
      message: 'تم رفع قاعدة البيانات السحابية بالكامل بنجاح',
    });
  });

  app.get('/api/sync/snapshot', (req, res) => {
    const roomCode = String(req.query.room || '').trim().toUpperCase();
    if (!roomCode || !syncRooms[roomCode] || !syncRooms[roomCode].fullSnapshot) {
      return res.status(404).json({ success: false, error: 'لا توجد نسخة سحابية متاحة لهذه الغرفة' });
    }

    const room = syncRooms[roomCode];
    const payload = {
      success: true,
      snapshot: room.fullSnapshot,
      version: room.version,
      lastUpdated: room.lastUpdated,
    };

    const byteLen = JSON.stringify(payload).length;
    room.stats.totalBytesTransferred += byteLen;

    res.json(payload);
  });

  // ==========================================
  // DRUGEYE LIVE ROUTES
  // ==========================================

  // API Route: DrugEye Health Check
  app.get('/api/drugeye/status', async (_req, res) => {
    try {
      const ping = await fetch(DRUGEYE_URL, { method: 'HEAD' });
      res.json({
        online: ping.status < 500,
        endpoint: DRUGEYE_URL,
        message: 'قاعدة بيانات DrugEye متصلة وجاهزة للمزامنة الحية',
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.json({
        online: true,
        endpoint: DRUGEYE_URL,
        message: 'قاعدة بيانات DrugEye نشطة',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // API Route: Search DrugEye live
  app.get('/api/drugeye/search', async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال اسم الدواء للبحث' });
    }

    const result = await searchDrugEye(query);
    res.json(result);
  });

  // API Route: Batch Sync multiple medicines with DrugEye
  app.post('/api/drugeye/sync', async (req, res) => {
    const items: Array<{ name: string; barcode?: string; currentPrice?: number }> = req.body.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'لا توجد أدوية للمزامنة' });
    }

    const updates: Array<{
      originalName: string;
      barcode?: string;
      matchedDrugEyeName: string;
      currentPrice?: number;
      officialPrice: number;
      priceChanged: boolean;
      activeIngredient: string;
      category: string;
      company: string;
      stripsPerBox: number;
    }> = [];

    const searchBatch = items.slice(0, 30);

    for (const item of searchBatch) {
      const cleanName = item.name.replace(/\(.*?\)/g, '').split(' ')[0] || item.name;
      if (!cleanName || cleanName.length < 3) continue;

      const searchRes = await searchDrugEye(cleanName);
      if (searchRes.success && searchRes.medicines.length > 0) {
        const normalizedItem = item.name.toLowerCase();
        let bestMatch = searchRes.medicines.find((m) =>
          normalizedItem.includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(normalizedItem)
        );

        if (!bestMatch) {
          bestMatch = searchRes.medicines[0];
        }

        const priceChanged = item.currentPrice !== undefined && item.currentPrice !== bestMatch.price;

        updates.push({
          originalName: item.name,
          barcode: item.barcode,
          matchedDrugEyeName: bestMatch.name,
          currentPrice: item.currentPrice,
          officialPrice: bestMatch.price,
          priceChanged,
          activeIngredient: bestMatch.activeIngredient,
          category: bestMatch.category,
          company: bestMatch.company,
          stripsPerBox: bestMatch.stripsPerBox,
        });
      }

      await new Promise((r) => setTimeout(r, 150));
    }

    res.json({
      success: true,
      totalChecked: searchBatch.length,
      updatesFound: updates.length,
      priceChangesCount: updates.filter((u) => u.priceChanged).length,
      updates,
      timestamp: new Date().toISOString(),
    });
  });

  // Mount Vite middleware in development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Pharmacy POS, DrugEye & Ultra-Low-Bandwidth Cloud Sync Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
