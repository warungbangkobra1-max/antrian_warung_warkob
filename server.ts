import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { QueueItem, QueueStats } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Kredensial Keamanan Server-Side (Environment Variables)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_PIN = process.env.ADMIN_PIN || '9999';

const KASIR_USERNAME = process.env.KASIR_USERNAME || 'kasir';
const KASIR_PASSWORD = process.env.KASIR_PASSWORD || 'kasir123';
const KASIR_PIN = process.env.KASIR_PIN || '1234';

// Ensure data folder and file exists for persistent storage
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'queues.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Format date helpers (Indonesian local format YYYY-MM-DD and HH:mm)
function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTimeString(timestamp?: number): string {
  const d = timestamp ? new Date(timestamp) : new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

// Initial sample data if file is newly created
const todayStr = getTodayDateString();
const now = Date.now();

const INITIAL_DATA: QueueItem[] = [
  {
    id: 'q-020',
    number: 'A020',
    name: 'Faris',
    date: todayStr,
    createdAt: now - 1000 * 60 * 45,
    jamMasuk: '07:05',
    calledAt: now - 1000 * 60 * 38,
    jamDipanggil: '07:12',
    completedAt: now - 1000 * 60 * 35,
    jamSelesai: '07:15',
    status: 'Selesai',
    operator: 'Kasir 1',
    counter: 'Loket 1',
    callCount: 1,
    waitingDurationMinutes: 7,
    serviceDurationMinutes: 3,
  },
  {
    id: 'q-021',
    number: 'A021',
    name: 'Hasan',
    date: todayStr,
    createdAt: now - 1000 * 60 * 40,
    jamMasuk: '07:10',
    calledAt: now - 1000 * 60 * 33,
    jamDipanggil: '07:17',
    completedAt: now - 1000 * 60 * 29,
    jamSelesai: '07:21',
    status: 'Selesai',
    operator: 'Kasir 1',
    counter: 'Loket 1',
    callCount: 1,
    waitingDurationMinutes: 7,
    serviceDurationMinutes: 4,
  },
  {
    id: 'q-022',
    number: 'A022',
    name: 'Umar',
    date: todayStr,
    createdAt: now - 1000 * 60 * 35,
    jamMasuk: '07:15',
    calledAt: now - 1000 * 60 * 27,
    jamDipanggil: '07:23',
    completedAt: null,
    jamSelesai: null,
    status: 'Dilewati',
    operator: 'Kasir 1',
    counter: 'Loket 1',
    callCount: 2,
    waitingDurationMinutes: 8,
    serviceDurationMinutes: 0,
  },
  {
    id: 'q-023',
    number: 'A023',
    name: 'Zaki',
    date: todayStr,
    createdAt: now - 1000 * 60 * 30,
    jamMasuk: '07:20',
    calledAt: null,
    jamDipanggil: null,
    completedAt: null,
    jamSelesai: null,
    status: 'Dibatalkan',
    operator: 'Kasir 1',
    counter: 'Loket 1',
    callCount: 0,
    waitingDurationMinutes: 0,
    serviceDurationMinutes: 0,
  },
  {
    id: 'q-025',
    number: 'A025',
    name: 'Ahmad',
    date: todayStr,
    createdAt: now - 1000 * 60 * 15,
    jamMasuk: '07:35',
    calledAt: null,
    jamDipanggil: null,
    completedAt: null,
    jamSelesai: null,
    status: 'Menunggu',
    operator: 'Kasir 1',
    counter: 'Loket 1',
    callCount: 0,
  },
  {
    id: 'q-026',
    number: 'A026',
    name: 'Budi',
    date: todayStr,
    createdAt: now - 1000 * 60 * 12,
    jamMasuk: '07:38',
    calledAt: null,
    jamDipanggil: null,
    completedAt: null,
    jamSelesai: null,
    status: 'Menunggu',
    operator: 'Kasir 1',
    counter: 'Loket 1',
    callCount: 0,
  },
  {
    id: 'q-027',
    number: 'A027',
    name: 'Rian',
    date: todayStr,
    createdAt: now - 1000 * 60 * 8,
    jamMasuk: '07:42',
    calledAt: null,
    jamDipanggil: null,
    completedAt: null,
    jamSelesai: null,
    status: 'Menunggu',
    operator: 'Kasir 1',
    counter: 'Loket 1',
    callCount: 0,
  },
  {
    id: 'q-028',
    number: 'A028',
    name: 'Deni',
    date: todayStr,
    createdAt: now - 1000 * 60 * 4,
    jamMasuk: '07:46',
    calledAt: null,
    jamDipanggil: null,
    completedAt: null,
    jamSelesai: null,
    status: 'Menunggu',
    operator: 'Kasir 1',
    counter: 'Loket 1',
    callCount: 0,
  },
];

let queues: QueueItem[] = [];

// Load queues from disk
function loadQueues(): void {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Normalize fields if needed
        queues = parsed.map((item: QueueItem) => ({
          ...item,
          status: item.status === ('Batal' as unknown) ? 'Dibatalkan' : item.status,
          date: item.date || getTodayDateString(),
          jamMasuk: item.jamMasuk || getTimeString(item.createdAt),
          callCount: item.callCount || 0,
        }));
      } else {
        queues = [...INITIAL_DATA];
      }
    } else {
      queues = [...INITIAL_DATA];
      saveQueues();
    }
  } catch (err) {
    console.error('Failed to load queues from disk:', err);
    queues = [...INITIAL_DATA];
  }
}

// Save queues to disk atomically
function saveQueues(): void {
  try {
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(queues, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('Failed to save queues to disk:', err);
  }
}

loadQueues();

// Calculate queue stats
function getStats(): QueueStats {
  return {
    total: queues.length,
    waiting: queues.filter((q) => q.status === 'Menunggu').length,
    called: queues.filter((q) => q.status === 'Dipanggil').length,
    completed: queues.filter((q) => q.status === 'Selesai').length,
    skipped: queues.filter((q) => q.status === 'Dilewati').length,
    cancelled: queues.filter((q) => q.status === 'Dibatalkan').length,
  };
}

// SSE Clients Registry
const sseClients = new Set<Response>();

function broadcast(eventType: string, payload: unknown) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Helper to broadcast full queue state
function broadcastStateUpdate(actionType: string, affectedItem?: QueueItem) {
  broadcast('queue_update', {
    action: actionType,
    item: affectedItem || null,
    queues,
    stats: getStats(),
    timestamp: Date.now(),
  });
}

// Middleware
app.use(express.json());

// CORS & No-Cache for API
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// 1. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    online: true,
    serverTime: Date.now(),
    clientsCount: sseClients.size,
  });
});

// 2. Real-time Server-Sent Events stream
app.get('/api/queues/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(': connected\n\n');

  // Immediately send initial full state
  res.write(`event: queue_init\ndata: ${JSON.stringify({ queues, stats: getStats() })}\n\n`);

  sseClients.add(res);

  // Heartbeat ping every 20 seconds to prevent proxy disconnect
  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

// 3. Authentication for Petugas (Kasir & Admin) via Environment Variables
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const cleanUser = String(username || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  // Admin login check
  if (
    cleanUser === ADMIN_USERNAME.toLowerCase() &&
    (cleanPass === ADMIN_PASSWORD || cleanPass === ADMIN_PIN)
  ) {
    res.json({
      success: true,
      user: {
        username: ADMIN_USERNAME,
        role: 'admin',
        name: 'Administrator Kantin',
        token: 'auth-token-admin-' + Date.now(),
      },
    });
    return;
  }

  // Kasir login check
  if (
    cleanUser === KASIR_USERNAME.toLowerCase() &&
    (cleanPass === KASIR_PASSWORD || cleanPass === KASIR_PIN)
  ) {
    res.json({
      success: true,
      user: {
        username: KASIR_USERNAME,
        role: 'kasir',
        name: 'Petugas Kasir',
        token: 'auth-token-kasir-' + Date.now(),
      },
    });
    return;
  }

  res.status(401).json({
    success: false,
    error: 'Username, password, atau PIN tidak valid!',
  });
});

// Verifikasi PIN Mode Operator & Admin di Meja Kasir (Server-side check)
app.post('/api/auth/verify-pin', (req, res) => {
  const { pin } = req.body || {};
  const cleanPin = String(pin || '').trim();

  if (!cleanPin) {
    res.status(400).json({ success: false, error: 'PIN wajib diisi!' });
    return;
  }

  if (cleanPin === ADMIN_PIN) {
    res.json({
      success: true,
      role: 'admin',
      user: {
        username: ADMIN_USERNAME,
        role: 'admin',
        name: 'Administrator Kantin',
        token: 'pin-token-admin-' + Date.now(),
      },
    });
    return;
  }

  if (cleanPin === KASIR_PIN) {
    res.json({
      success: true,
      role: 'kasir',
      user: {
        username: KASIR_USERNAME,
        role: 'kasir',
        name: 'Petugas Kasir',
        token: 'pin-token-kasir-' + Date.now(),
      },
    });
    return;
  }

  res.status(401).json({
    success: false,
    error: 'PIN salah! Silakan periksa kembali.',
  });
});

// 4. Get all queues and current stats
app.get('/api/queues', (req, res) => {
  res.json({
    queues,
    stats: getStats(),
    serverTime: Date.now(),
  });
});

// 5. Add new queue (Santri or Kasir) with DUPLICATE NUMBER CHECK
app.post('/api/queues', (req, res) => {
  const { number, name, operator, counter } = req.body || {};

  const cleanName = String(name || '').trim();
  const rawNum = String(number || '').trim().toUpperCase();

  if (!rawNum) {
    res.status(400).json({ error: 'Nomor antrean wajib diisi!' });
    return;
  }

  if (!cleanName) {
    res.status(400).json({ error: 'Nama santri wajib diisi!' });
    return;
  }

  // Format number: e.g. "025" or "25" -> "A025"
  let formattedNum = rawNum;
  if (/^\d+$/.test(formattedNum)) {
    formattedNum = 'A' + formattedNum.padStart(3, '0');
  }

  // Check duplicate active queue
  const isDuplicateActive = queues.some(
    (q) =>
      q.number.toUpperCase() === formattedNum.toUpperCase() &&
      (q.status === 'Menunggu' || q.status === 'Dipanggil')
  );

  if (isDuplicateActive) {
    res.status(400).json({
      error: `Nomor antrean ${formattedNum} sudah digunakan.`,
    });
    return;
  }

  const createdAt = Date.now();
  const newItem: QueueItem = {
    id: `q-${createdAt}-${Math.random().toString(36).substring(2, 7)}`,
    number: formattedNum,
    name: cleanName,
    date: getTodayDateString(),
    createdAt,
    jamMasuk: getTimeString(createdAt),
    calledAt: null,
    jamDipanggil: null,
    completedAt: null,
    jamSelesai: null,
    status: 'Menunggu',
    operator: operator || 'Kasir 1',
    counter: counter || 'Loket 1',
    callCount: 0,
    waitingDurationMinutes: 0,
    serviceDurationMinutes: 0,
  };

  queues.push(newItem);
  saveQueues();
  broadcastStateUpdate('CREATE', newItem);

  res.status(201).json({
    success: true,
    item: newItem,
  });
});

// 6. Call queue (PANGGIL)
app.post('/api/queues/:id/call', (req, res) => {
  const { id } = req.params;
  const { operator, counter } = req.body || {};

  const itemIndex = queues.findIndex((q) => q.id === id);
  if (itemIndex === -1) {
    res.status(404).json({ error: 'Antrean tidak ditemukan' });
    return;
  }

  const target = queues[itemIndex];
  const nowMs = Date.now();
  target.status = 'Dipanggil';
  target.calledAt = nowMs;
  target.jamDipanggil = getTimeString(nowMs);
  target.callCount = (target.callCount || 0) + 1;
  target.waitingDurationMinutes = Math.max(1, Math.round((nowMs - target.createdAt) / 60000));

  if (operator) target.operator = operator;
  if (counter) target.counter = counter;

  saveQueues();
  broadcastStateUpdate('CALL', target);

  res.json({ success: true, item: target });
});

// 7. Recall queue (PANGGIL ULANG)
app.post('/api/queues/:id/recall', (req, res) => {
  const { id } = req.params;
  const itemIndex = queues.findIndex((q) => q.id === id);
  if (itemIndex === -1) {
    res.status(404).json({ error: 'Antrean tidak ditemukan' });
    return;
  }

  const target = queues[itemIndex];
  target.calledAt = Date.now();
  target.callCount = (target.callCount || 0) + 1;

  saveQueues();
  broadcastStateUpdate('RECALL', target);

  res.json({ success: true, item: target });
});

// 8. Complete queue (SELESAI)
app.post('/api/queues/:id/complete', (req, res) => {
  const { id } = req.params;
  const itemIndex = queues.findIndex((q) => q.id === id);
  if (itemIndex === -1) {
    res.status(404).json({ error: 'Antrean tidak ditemukan' });
    return;
  }

  const target = queues[itemIndex];
  const nowMs = Date.now();
  target.status = 'Selesai';
  target.completedAt = nowMs;
  target.jamSelesai = getTimeString(nowMs);

  if (target.calledAt) {
    target.serviceDurationMinutes = Math.max(1, Math.round((nowMs - target.calledAt) / 60000));
  } else {
    target.serviceDurationMinutes = 1;
  }

  if (!target.waitingDurationMinutes && target.createdAt) {
    target.waitingDurationMinutes = Math.max(1, Math.round((nowMs - target.createdAt) / 60000));
  }

  saveQueues();
  broadcastStateUpdate('COMPLETE', target);

  res.json({ success: true, item: target });
});

// 9. Skip queue (LEWATI)
app.post('/api/queues/:id/skip', (req, res) => {
  const { id } = req.params;
  const itemIndex = queues.findIndex((q) => q.id === id);
  if (itemIndex === -1) {
    res.status(404).json({ error: 'Antrean tidak ditemukan' });
    return;
  }

  const target = queues[itemIndex];
  target.status = 'Dilewati';

  saveQueues();
  broadcastStateUpdate('SKIP', target);

  res.json({ success: true, item: target });
});

// 10. Cancel queue (DIBATALKAN)
app.post('/api/queues/:id/cancel', (req, res) => {
  const { id } = req.params;
  const itemIndex = queues.findIndex((q) => q.id === id);
  if (itemIndex === -1) {
    res.status(404).json({ error: 'Antrean tidak ditemukan' });
    return;
  }

  const target = queues[itemIndex];
  target.status = 'Dibatalkan';

  saveQueues();
  broadcastStateUpdate('CANCEL', target);

  res.json({ success: true, item: target });
});

// 11. Delete queue (HAPUS YANG SALAH - Admin only)
app.delete('/api/queues/:id', (req, res) => {
  const { id } = req.params;
  const itemIndex = queues.findIndex((q) => q.id === id);
  if (itemIndex === -1) {
    res.status(404).json({ error: 'Antrean tidak ditemukan' });
    return;
  }

  const removed = queues.splice(itemIndex, 1)[0];
  saveQueues();
  broadcastStateUpdate('DELETE', removed);

  res.json({ success: true, removed });
});

// 12. Reset today's queue (RESET ANTREAN HARIAN - Admin only)
app.post('/api/queues/reset', (req, res) => {
  queues = [];
  saveQueues();
  broadcastStateUpdate('RESET');

  res.json({ success: true, message: 'Semua antrean hari ini telah di-reset.' });
});

// Setup Vite or Static File Serving
async function startServer() {
  if (!isProd) {
    // Development mode with Vite dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files from dist
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Antrean Kantin Santri centralized server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
});
