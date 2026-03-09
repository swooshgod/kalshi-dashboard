console.log('[proxy] Server starting — node', process.version, 'pid', process.pid);
console.log('[proxy] ENV check — PORT:', process.env.PORT, 'KEY_ID set:', !!process.env.KALSHI_API_KEY_ID);

// Catch anything that slips through before we're fully set up
process.on('uncaughtException',  e => { console.error('[proxy] uncaughtException:', e); process.exit(1); });
process.on('unhandledRejection', e => { console.error('[proxy] unhandledRejection:', e); process.exit(1); });

/**
 * proxy.js — Local Express proxy server for Kalshi API
 * All RSA-PSS auth signing happens here (never in browser).
 * Run: node src/server/proxy.js
 */
import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import { createSign }            from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { homedir }               from 'os';

console.log('[proxy] Imports loaded OK');

// Strategy performance DB (SQLite) — local only; graceful no-op on Railway
let getStrategyStats, getAllStats, getRecentBets;
try {
  // Only attempt if the file actually exists (local dev environment)
  const { fileURLToPath } = await import('url');
  const { join }           = await import('path');
  const __dir  = fileURLToPath(new URL('.', import.meta.url));
  const dbPath = join(__dir, '../../../../clawd/skills/kalshi-weather/strategy-db.mjs');
  if (existsSync(dbPath)) {
    console.log('[proxy] Loading strategy-db from', dbPath);
    const mod    = await import(dbPath);
    getStrategyStats = mod.getStrategyStats;
    getAllStats       = mod.getAllStats;
    getRecentBets     = mod.getRecentBets;
    console.log('[proxy] strategy-db loaded OK');
  } else {
    console.log('[proxy] strategy-db not found at path — perf endpoints will return empty (Railway mode)');
  }
} catch (e) {
  console.warn('[proxy] strategy-db load skipped:', e.message);
}

const app  = express();
const PORT = process.env.PROXY_PORT || process.env.PORT || 3001;
const BASE = 'https://api.elections.kalshi.com/trade-api/v2';

// Accept both naming conventions
const KEY_ID = process.env.KALSHI_API_KEY_ID || process.env.KALSHI_API_KEY;
if (!KEY_ID) {
  console.error('[proxy] FATAL: Missing env var KALSHI_API_KEY_ID (or KALSHI_API_KEY)');
  process.exit(1);
}
console.log('[proxy] Key ID:', KEY_ID.slice(0, 8) + '...');

// Private key — env var takes priority (Railway), fall back to file (local dev)
let privKey;
try {
  if (process.env.KALSHI_PRIVATE_KEY) {
    privKey = process.env.KALSHI_PRIVATE_KEY.replace(/\\n/g, '\n');
    console.log('[proxy] Using KALSHI_PRIVATE_KEY from env var');
  } else {
    const keyPath = (process.env.KALSHI_PRIVATE_KEY_PATH || '~/.kalshi/private_key.pem')
      .replace(/^~/, homedir());
    privKey = readFileSync(keyPath, 'utf8');
    console.log('[proxy] Using private key from file:', keyPath);
  }
} catch (e) {
  console.error('[proxy] FATAL: Cannot load private key —', e.message);
  console.error('[proxy] Set KALSHI_PRIVATE_KEY env var on Railway, or KALSHI_PRIVATE_KEY_PATH for local');
  process.exit(1);
}

function kalshiHeaders(method, path) {
  const ts  = Date.now().toString();
  const s   = createSign('SHA256');
  s.update(ts + method.toUpperCase() + path);
  const sig = s.sign({ key: privKey, padding: 6, saltLength: 32 }, 'base64');
  return {
    'KALSHI-ACCESS-KEY':       KEY_ID,
    'KALSHI-ACCESS-TIMESTAMP': ts,
    'KALSHI-ACCESS-SIGNATURE': sig,
    'Content-Type':            'application/json',
  };
}

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.ALLOWED_ORIGIN,
  /\.vercel\.app$/,
  /\.railway\.app$/,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const ok = ALLOWED_ORIGINS.some(o =>
      o instanceof RegExp ? o.test(origin) : o === origin
    );
    cb(ok ? null : new Error('Not allowed by CORS'), ok);
  },
  credentials: true,
}));
app.use(express.json());

// ── Kalshi proxy — /api/* → Kalshi ──────────────────────────────────────────
app.all('/api/*', async (req, res) => {
  const kalshiPath = req.path.replace('/api', '');
  const qs  = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const url = BASE + kalshiPath + qs;
  try {
    const response = await fetch(url, {
      method:  req.method,
      headers: kalshiHeaders(req.method, '/trade-api/v2' + kalshiPath),
      body:    ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });
    if (response.status === 429) { res.status(429).json({ error: 'Rate limited' }); return; }
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('[proxy] Kalshi fetch error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── Strategy Performance API ─────────────────────────────────────────────────
app.get('/perf/all', (_, res) => {
  if (!getAllStats) return res.json({ strategies: [], note: 'DB not available (Railway mode)' });
  try { res.json({ strategies: getAllStats(), updatedAt: new Date().toISOString() }); }
  catch (e) { console.error('[proxy] /perf/all error:', e.message); res.status(500).json({ error: e.message }); }
});

app.get('/perf/:strategy', (req, res) => {
  if (!getStrategyStats) return res.json({ strategy: req.params.strategy, totalBets: 0, note: 'DB not available' });
  try { res.json(getStrategyStats(req.params.strategy)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/perf-bets/recent', (req, res) => {
  if (!getRecentBets) return res.json({ bets: [] });
  try { res.json({ bets: getRecentBets(parseInt(req.query.limit) || 50) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/health', (_, res) => {
  res.json({ ok: true, keyId: KEY_ID.slice(0, 8) + '...', perfDb: !!getAllStats });
});

// ── Start ─────────────────────────────────────────────────────────────────────
try {
  app.listen(PORT, () => {
    console.log(`[proxy] ✅ Listening on port ${PORT}`);
    console.log(`[proxy] Kalshi key: ${KEY_ID.slice(0, 8)}... | perf DB: ${!!getAllStats}`);
  });
} catch (e) {
  console.error('[proxy] FATAL: app.listen failed —', e.message);
  process.exit(1);
}
