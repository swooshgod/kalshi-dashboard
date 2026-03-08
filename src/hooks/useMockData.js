/**
 * useMockData.js — Realistic mock data for dashboard preview.
 */
import { useMemo } from 'react';

function randomBetween(lo, hi) { return lo + Math.random() * (hi - lo); }

const TICKERS = [
  { ticker: 'KXNBAGAME-26MAR09NYKLAC-LAC', category: 'Sports',    side: 'no' },
  { ticker: 'KXMORTGAGERATE-26-T6',        category: 'Economics', side: 'no' },
  { ticker: 'KXHIGHNY-26MAR10-B55',        category: 'Weather',   side: 'yes' },
  { ticker: 'KXCPI-26FEB-B03',             category: 'Economics', side: 'yes' },
  { ticker: 'KXNHLGAME-26MAR08BOSTBL-BOS', category: 'Sports',    side: 'yes' },
  { ticker: 'KXNBAGAME-26MAR07GSWUTA-GSW', category: 'Sports',    side: 'yes' },
  { ticker: 'KXFED-2026MAY-T525',          category: 'Economics', side: 'no'  },
  { ticker: 'KXHIGHCHI-26MAR12-B45',       category: 'Weather',   side: 'yes' },
  { ticker: 'KXMLSGAME-26MAR08LAGATL-LA',  category: 'Sports',    side: 'yes' },
  { ticker: 'KXMLBGAME-26APR01NYYMIA-NYY', category: 'Sports',    side: 'yes' },
];

function makeSettlements() {
  const now = Date.now();
  return TICKERS.map((t, i) => {
    const entryCents = Math.round(randomBetween(45, 85));
    const won        = Math.random() > 0.38;
    const pnl        = won ? (100 - entryCents) : -entryCents;
    return {
      id:          `settle-${i}`,
      ticker:      t.ticker,
      side:        t.side,
      yes_price:   entryCents,
      no_price:    100 - entryCents,
      entry_price: entryCents,
      count:       Math.ceil(randomBetween(2, 8)),
      contracts:   Math.ceil(randomBetween(2, 8)),
      result:      won,
      resolved_at: new Date(now - (i + 1) * 86400000 * randomBetween(0.5, 3)).toISOString(),
      created_at:  new Date(now - (i + 2) * 86400000 * randomBetween(1, 4)).toISOString(),
      maker:       Math.random() > 0.3,
      fees_paid:   Math.round(randomBetween(1, 8)),
    };
  });
}

function makePositions() {
  return [
    { ticker: 'KXNBAGAME-26MAR09NYKLAC-LAC', side: 'no',  yes_price: 43, contracts: 5, resolution_date: new Date(Date.now() + 86400000 * 1).toISOString() },
    { ticker: 'KXMORTGAGERATE-26-T6.3',       side: 'no',  yes_price: 34, contracts: 3, resolution_date: new Date(Date.now() + 86400000 * 4).toISOString() },
    { ticker: 'KXHIGHNY-26MAR12-B58',         side: 'yes', yes_price: 72, contracts: 4, resolution_date: new Date(Date.now() + 86400000 * 4).toISOString() },
  ].map((p, i) => ({
    ...p,
    current_yes_bid: p.yes_price + Math.round(randomBetween(-8, 12)),
    id: `pos-${i}`,
  }));
}

function makeBalance() {
  return { balance: 4627, portfolio_value: 5200, buying_power: 3800 };
}

export function useMockData() {
  return useMemo(() => {
    const settlements = makeSettlements();
    const positions   = makePositions();
    const balance     = makeBalance();

    // Build equity curve from settlements
    const sortedTrades = [...settlements].sort((a, b) => new Date(a.resolved_at) - new Date(b.resolved_at));
    let equity = balance.portfolio_value - 1200;
    const equityCurve = sortedTrades.map(t => {
      const pnl = (t.result ? (100 - t.yes_price) : -t.yes_price) * t.count;
      equity += pnl;
      return { date: t.resolved_at.slice(0, 10), value: equity };
    });

    return { settlements, positions, balance, equityCurve };
  }, []);
}
