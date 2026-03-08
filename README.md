# Kalshi Trading Dashboard

Real-time portfolio dashboard for Kalshi prediction market trading. Dark theme, trading terminal aesthetic.

## Features

- Live equity curve with 1W/1M/3M/ALL zoom
- P&L by category (donut chart)
- Win rate by category (bar chart)
- Recent trades table with expandable rows + filters
- Open positions with WebSocket live price updates + flash animations
- Daily P&L bars with 7-day MA overlay
- Edge metrics: Sharpe, streak, maker vs taker split, biggest win/loss
- Risk monitor: bankroll utilization gauge, category concentration, compliance checklist

## Setup

```bash
cd kalshi-dashboard
cp .env.example .env
# Edit .env — set KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY_PATH
npm install
```

## Run (mock data — no API needed)

```bash
# .env: VITE_USE_MOCK_DATA=true
npm run dev
# Open http://localhost:5173
```

## Run (live Kalshi data)

```bash
# Terminal 1: start proxy server (handles RSA-PSS auth)
node src/server/proxy.js

# Terminal 2: start Vite dev server
# .env: VITE_USE_MOCK_DATA=false
npm run dev
```

Or both at once:
```bash
npm run start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_USE_MOCK_DATA` | No | `true` = use mock data, no API calls |
| `VITE_PROXY_URL` | No | Proxy server URL (default: `/api` → proxied by Vite) |
| `KALSHI_API_KEY_ID` | Yes (live) | Kalshi API key ID |
| `KALSHI_PRIVATE_KEY_PATH` | Yes (live) | Path to RSA private key PEM file |

## Tech Stack

- React 18 + Vite
- Tailwind CSS v4 (dark theme)
- Recharts (all charts)
- Express proxy server for RSA-PSS auth signing

---

*Data from Kalshi API. Not financial advice. For personal use only.*
