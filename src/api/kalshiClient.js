/**
 * kalshiClient.js — browser-safe API client via local proxy.
 * All auth (RSA-PSS) is handled server-side in proxy.js.
 * Never put private keys in the browser.
 */

// Always use relative URLs — works on Railway (same-origin) and Vite dev (proxied)
const PROXY = '/api';
const MOCK  = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const CACHE = new Map();
const CACHE_TTL = 30_000; // 30s

async function request(path, options = {}) {
  if (MOCK) return null; // mock hook handles data

  const cacheKey = path;
  if (options.method !== 'POST') {
    const hit = CACHE.get(cacheKey);
    if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  }

  let attempt = 0;
  while (attempt < 4) {
    try {
      const res = await fetch(`${PROXY}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      });

      if (res.status === 429) {
        const wait = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, wait));
        attempt++;
        continue;
      }

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const data = await res.json();
      if (options.method !== 'POST') CACHE.set(cacheKey, { data, ts: Date.now() });
      return data;

    } catch (err) {
      attempt++;
      if (attempt >= 4) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

export const kalshi = {
  getBalance:    ()       => request('/portfolio/balance'),
  getPositions:  ()       => request('/portfolio/positions'),
  getSettlements:(limit)  => request(`/portfolio/settlements?limit=${limit || 100}`),
  getOrders:     (limit)  => request(`/portfolio/orders?limit=${limit || 100}&status=all`),
  getMarket:     (ticker) => request(`/markets/${ticker}`),
  clearCache:    ()       => CACHE.clear(),
};
