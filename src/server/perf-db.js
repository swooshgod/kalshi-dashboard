/**
 * perf-db.js — Self-contained strategy performance database
 * Lives inside the kalshi-dashboard repo so it deploys to Railway.
 * DB file: /tmp/strategy-perf.db (writable on Railway) or PERF_DB_PATH env var.
 *
 * Strategies: weather | walters | goal_ladder | spread_dip
 *
 * API:
 *   logBet(fields)          → id
 *   settleBet(id, fields)
 *   settleBetByOrderId(orderId, fields)
 *   getStrategyStats(strategy) → stats object
 *   getAllStats()            → array of 4 strategy stats
 *   getRecentBets(limit)    → array
 */

import Database from 'better-sqlite3';
import { join }  from 'path';
import { mkdirSync } from 'fs';

// Use /tmp on Railway (writable), local ./data/ for dev
const DB_PATH = process.env.PERF_DB_PATH
  || (process.env.RAILWAY_ENVIRONMENT ? '/tmp/strategy-perf.db'
  : join(process.cwd(), 'data', 'strategy-perf.db'));

function ensureDir(p) {
  const dir = p.replace(/\/[^/]+$/, '');
  if (dir && dir !== p) {
    try { mkdirSync(dir, { recursive: true }); } catch {}
  }
}

let _db = null;
function db() {
  if (_db) return _db;
  ensureDir(DB_PATH);
  console.log('[perf-db] Opening DB at', DB_PATH);
  _db = new Database(DB_PATH);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS strategy_bets (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      strategy      TEXT    NOT NULL,
      ticker        TEXT    NOT NULL,
      game_desc     TEXT,
      entry_price   REAL    NOT NULL,
      exit_price    REAL,
      bet_size      REAL    NOT NULL,
      contracts     INTEGER DEFAULT 0,
      result        TEXT,
      pnl           REAL,
      edge_at_entry REAL    DEFAULT 0,
      status        TEXT    NOT NULL DEFAULT 'open',
      order_id      TEXT,
      placed_at     TEXT    NOT NULL,
      settled_at    TEXT,
      notes         TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sb_strategy ON strategy_bets(strategy);
    CREATE INDEX IF NOT EXISTS idx_sb_placed   ON strategy_bets(placed_at);
    CREATE INDEX IF NOT EXISTS idx_sb_order    ON strategy_bets(order_id);
  `);
  console.log('[perf-db] Schema ready');
  return _db;
}

// ── Write ────────────────────────────────────────────────────────────────────
export function logBet({ strategy, ticker, gameDesc = '', entryPrice, betSize,
                         contracts = 0, edgeAtEntry = 0, orderId = '', notes = '' }) {
  return db().prepare(`
    INSERT INTO strategy_bets
      (strategy, ticker, game_desc, entry_price, bet_size, contracts, edge_at_entry, order_id, status, placed_at, notes)
    VALUES (?,?,?,?,?,?,?,?,'open',?,?)
  `).run(strategy, ticker, gameDesc, entryPrice, betSize, contracts, edgeAtEntry,
         orderId, new Date().toISOString(), notes).lastInsertRowid;
}

export function settleBet(id, { exitPrice, pnl, result }) {
  db().prepare(`
    UPDATE strategy_bets SET exit_price=?, pnl=?, result=?, status='settled', settled_at=? WHERE id=?
  `).run(exitPrice, pnl, result, new Date().toISOString(), id);
}

export function settleBetByOrderId(orderId, { exitPrice, pnl, result }) {
  db().prepare(`
    UPDATE strategy_bets SET exit_price=?, pnl=?, result=?, status='settled', settled_at=?
    WHERE order_id=? AND status='open'
  `).run(exitPrice, pnl, result, new Date().toISOString(), orderId);
}

// ── Read ─────────────────────────────────────────────────────────────────────
export function getStrategyStats(strategy) {
  const all      = db().prepare(`SELECT * FROM strategy_bets WHERE strategy=? ORDER BY placed_at`).all(strategy);
  const settled  = all.filter(b => b.status === 'settled' && b.result != null);
  const wins     = settled.filter(b => b.result === 'win');
  const losses   = settled.filter(b => b.result === 'loss');

  const totalPnl    = settled.reduce((s, b) => s + (b.pnl || 0), 0);
  const totalRisked = settled.reduce((s, b) => s + (b.bet_size || 0), 0);
  const largestWin  = wins.length   ? Math.max(...wins.map(b => b.pnl || 0))   : 0;
  const largestLoss = losses.length ? Math.min(...losses.map(b => b.pnl || 0)) : 0;
  const avgEdge     = all.length    ? all.reduce((s, b) => s + (b.edge_at_entry || 0), 0) / all.length : 0;

  // Running equity curve
  let running = 0;
  const equity = settled.map(b => {
    running += (b.pnl || 0);
    return {
      date: (b.settled_at || b.placed_at || '').slice(0, 10),
      pnl:  Math.round(running * 100) / 100,
      bet:  Math.round((b.pnl || 0) * 100) / 100,
    };
  });

  return {
    strategy,
    totalBets:   all.length,
    openBets:    all.filter(b => b.status === 'open').length,
    settledBets: settled.length,
    wins:        wins.length,
    losses:      losses.length,
    winRate:     settled.length ? wins.length / settled.length : 0,
    totalPnl:    Math.round(totalPnl * 100) / 100,
    totalRisked: Math.round(totalRisked * 100) / 100,
    roi:         totalRisked > 0 ? totalPnl / totalRisked : 0,
    largestWin:  Math.round(largestWin * 100) / 100,
    largestLoss: Math.round(largestLoss * 100) / 100,
    avgEdge,
    equity,
    recentBets:  all.slice(-20).reverse(),
  };
}

export function getAllStats() {
  return ['weather', 'walters', 'goal_ladder', 'spread_dip'].map(getStrategyStats);
}

export function getRecentBets(limit = 50) {
  return db().prepare(`SELECT * FROM strategy_bets ORDER BY placed_at DESC LIMIT ?`).all(limit);
}

// Seed demo rows (dev only) so the dashboard isn't blank on first load
export function seedDemoIfEmpty() {
  const count = db().prepare(`SELECT COUNT(*) as n FROM strategy_bets`).get().n;
  if (count > 0) return;
  console.log('[perf-db] Seeding demo data...');
  const rows = [
    // weather
    { strategy:'weather', ticker:'KXHIGHNY-26MAR08-T72', game_desc:'NYC High Mar 8', entry_price:0.18, bet_size:8.50, contracts:47, result:'win', pnl:3.20, edge:0.09, placed:'2026-03-08T08:31:00Z', settled:'2026-03-08T22:00:00Z' },
    { strategy:'weather', ticker:'KXHIGHCHI-26MAR08-T58', game_desc:'Chicago High Mar 8', entry_price:0.22, bet_size:7.80, contracts:35, result:'loss', pnl:-7.80, edge:0.11, placed:'2026-03-08T08:32:00Z', settled:'2026-03-08T22:00:00Z' },
    { strategy:'weather', ticker:'KXHIGHAUS-26MAR08-T69', game_desc:'Austin High Mar 8', entry_price:0.20, bet_size:16.97, contracts:36, result:null, pnl:null, edge:0.08, placed:'2026-03-08T08:33:00Z', settled:null },
    // walters
    { strategy:'walters', ticker:'KXNBAGAME-26MAR10CHAPOR-POR', game_desc:'POR vs IND', entry_price:0.39, bet_size:10.92, contracts:28, result:null, pnl:null, edge:0.07, placed:'2026-03-08T18:00:00Z', settled:null },
    { strategy:'walters', ticker:'KXNBAGAME-26MAR09MEMBKN-MEM', game_desc:'MEM vs BKN', entry_price:0.50, bet_size:2.00, contracts:4, result:null, pnl:null, edge:0.06, placed:'2026-03-08T14:00:00Z', settled:null },
    // spread_dip (placeholder — no bets yet)
    // goal_ladder (placeholder — no bets yet)
  ];
  const ins = db().prepare(`
    INSERT INTO strategy_bets (strategy,ticker,game_desc,entry_price,bet_size,contracts,edge_at_entry,result,pnl,status,order_id,placed_at,settled_at,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  for (const r of rows) {
    ins.run(r.strategy, r.ticker, r.game_desc, r.entry_price, r.bet_size, r.contracts,
            r.edge, r.result, r.pnl, r.result === null ? 'open' : 'settled',
            '', r.placed, r.settled || null, '');
  }
  console.log('[perf-db] Demo data seeded');
}

// Init on import — create tables and seed if empty
try {
  db();
  seedDemoIfEmpty();
} catch (e) {
  console.error('[perf-db] Init error:', e.message);
}
