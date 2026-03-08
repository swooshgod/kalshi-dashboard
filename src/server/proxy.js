/**
 * proxy.js — Local Express proxy server for Kalshi API
 * All RSA-PSS auth signing happens here (never in browser).
 * Run: node src/server/proxy.js
 */
import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import { createSign } from 'crypto';
import { readFileSync } from 'fs';
import { homedir } from 'os';

const app  = express();
const PORT = process.env.PROXY_PORT || process.env.PORT || 3001;
const BASE = 'https://api.elections.kalshi.com/trade-api/v2';

// Accept both naming conventions
const KEY_ID = process.env.KALSHI_API_KEY_ID || process.env.KALSHI_API_KEY;
if (!KEY_ID) { console.error('Missing env var: KALSHI_API_KEY_ID (or KALSHI_API_KEY)'); process.exit(1); }

// Private key — env var takes priority (Railway), fall back to file (local dev)
let privKey;
if (process.env.KALSHI_PRIVATE_KEY) {
  // Stored in Railway as a multi-line env var — normalise escaped newlines
  privKey = process.env.KALSHI_PRIVATE_KEY.replace(/\\n/g, '\n');
  console.log('Using KALSHI_PRIVATE_KEY from environment variable');
} else {
  const keyPath = (process.env.KALSHI_PRIVATE_KEY_PATH || '~/.kalshi/private_key.pem')
    .replace(/^~/, homedir());
  try {
    privKey = readFileSync(keyPath, 'utf8');
    console.log(`Using private key from file: ${keyPath}`);
  } catch (e) {
    console.error(`Cannot read private key — set KALSHI_PRIVATE_KEY env var or fix path: ${e.message}`);
    process.exit(1);
  }
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
  // Vercel deployments — set ALLOWED_ORIGIN env var in Railway to lock to your domain
  process.env.ALLOWED_ORIGIN,
  /\.vercel\.app$/,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow non-browser / same-origin
    const ok = ALLOWED_ORIGINS.some(o =>
      o instanceof RegExp ? o.test(origin) : o === origin
    );
    cb(ok ? null : new Error('Not allowed by CORS'), ok);
  },
  credentials: true,
}));
app.use(express.json());

// Proxy all /api/* → Kalshi
app.all('/api/*', async (req, res) => {
  const kalshiPath = req.path.replace('/api', '');
  const url        = BASE + kalshiPath + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');

  try {
    const response = await fetch(url, {
      method:  req.method,
      headers: kalshiHeaders(req.method, '/trade-api/v2' + kalshiPath),
      body:    ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    if (response.status === 429) {
      res.status(429).json({ error: 'Rate limited' });
      return;
    }

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/health', (_, res) => res.json({ ok: true, keyId: KEY_ID.slice(0, 8) + '...' }));

app.listen(PORT, () => {
  console.log(`Kalshi proxy running at http://localhost:${PORT}`);
  console.log(`Key ID: ${KEY_ID.slice(0, 8)}...`);
});
