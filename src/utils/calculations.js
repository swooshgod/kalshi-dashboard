import { getCategory } from './categoryMapper.js';

// All P&L in INTEGER CENTS to avoid floating point errors

export function calcTradePnL(trade) {
  const { side, entry_price, yes_price, no_price, count, fees_paid, result } = trade;
  const entryCents = side === 'yes' ? (yes_price || entry_price) : (no_price || entry_price);
  const qty = count || 1;
  const fees = fees_paid || 0;

  if (result === undefined || result === null) return null; // unresolved

  let grossCents;
  if (side === 'yes') {
    grossCents = result === true ? (100 - entryCents) * qty : -entryCents * qty;
  } else {
    grossCents = result === false ? (100 - entryCents) * qty : -entryCents * qty;
  }
  return grossCents - fees;
}

export function calcUnrealizedPnL(position, currentYesBid) {
  const { side, yes_price, no_price, contracts } = position;
  const entryCents = side === 'yes' ? yes_price : (100 - (no_price || 0));
  const currentCents = side === 'yes' ? currentYesBid : (100 - currentYesBid);
  return (currentCents - entryCents) * (contracts || 1);
}

export function calcPortfolioStats(trades = [], balance = 0) {
  const resolved = trades.filter(t => t.result !== undefined && t.result !== null);
  const wins     = resolved.filter(t => calcTradePnL(t) > 0);
  const totalPnL = resolved.reduce((s, t) => s + (calcTradePnL(t) || 0), 0);

  return {
    totalTrades:  resolved.length,
    wins:         wins.length,
    losses:       resolved.length - wins.length,
    winRate:      resolved.length ? wins.length / resolved.length : 0,
    totalPnLCents: totalPnL,
    avgPnLCents:  resolved.length ? Math.round(totalPnL / resolved.length) : 0,
  };
}

export function calcDailyPnL(trades = []) {
  const byDay = {};
  for (const t of trades) {
    if (t.result === undefined) continue;
    const day = (t.resolved_at || t.created_at || '').slice(0, 10);
    if (!day) continue;
    if (!byDay[day]) byDay[day] = 0;
    byDay[day] += calcTradePnL(t) || 0;
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnlCents]) => ({ date, pnlCents }));
}

export function calcEquityCurve(trades = [], startingBalance = 5000) {
  const daily = calcDailyPnL(trades);
  let running = startingBalance;
  return daily.map(({ date, pnlCents }) => {
    running += pnlCents;
    return { date, value: running };
  });
}

export function calcCategoryStats(trades = []) {
  const cats = {};
  for (const t of trades) {
    if (t.result === undefined) continue;
    const cat = getCategory(t.ticker);
    if (!cats[cat]) cats[cat] = { wins: 0, total: 0, pnlCents: 0 };
    const pnl = calcTradePnL(t) || 0;
    cats[cat].total++;
    cats[cat].pnlCents += pnl;
    if (pnl > 0) cats[cat].wins++;
  }
  return Object.entries(cats).map(([category, s]) => ({
    category,
    ...s,
    winRate: s.total ? s.wins / s.total : 0,
  }));
}

export function calcSharpe(trades = []) {
  const daily = calcDailyPnL(trades);
  if (daily.length < 7) return null;
  const returns = daily.map(d => d.pnlCents);
  const mean    = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
  const std     = Math.sqrt(variance);
  if (!std) return null;
  return (mean / std) * Math.sqrt(365);
}

export function calcRollingAvg(data, window = 7) {
  return data.map((point, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1);
    const avg   = slice.reduce((s, d) => s + d.pnlCents, 0) / slice.length;
    return { ...point, ma: avg };
  });
}

export function calcStreak(trades = []) {
  const resolved = [...trades]
    .filter(t => t.result !== undefined)
    .sort((a, b) => new Date(a.resolved_at) - new Date(b.resolved_at));
  if (!resolved.length) return { type: null, count: 0 };
  let count = 1;
  const last = calcTradePnL(resolved[resolved.length - 1]) > 0 ? 'win' : 'loss';
  for (let i = resolved.length - 2; i >= 0; i--) {
    const isWin = calcTradePnL(resolved[i]) > 0;
    if ((last === 'win') === isWin) count++;
    else break;
  }
  return { type: last, count };
}

export function calcExposureByCategory(positions = []) {
  const cats = {};
  let total  = 0;
  for (const p of positions) {
    const cat  = getCategory(p.ticker);
    const cost = (p.yes_price || p.no_price || 0) * (p.contracts || 1);
    if (!cats[cat]) cats[cat] = 0;
    cats[cat] += cost;
    total      += cost;
  }
  return { cats, total };
}
