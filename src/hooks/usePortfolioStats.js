import { useMemo } from 'react';
import {
  calcPortfolioStats, calcDailyPnL, calcEquityCurve,
  calcCategoryStats, calcSharpe, calcRollingAvg,
  calcStreak, calcExposureByCategory, calcTradePnL,
} from '../utils/calculations.js';

export function usePortfolioStats({ settlements = [], positions = [], balance = null }) {
  return useMemo(() => {
    // Normalize balance to cents
    const balanceCents = balance
      ? (balance.balance || balance.portfolio_value || 0)
      : 0;

    const stats    = calcPortfolioStats(settlements, balanceCents);
    const daily    = calcDailyPnL(settlements);
    const dailyMA  = calcRollingAvg(daily, 7);
    const equity   = calcEquityCurve(settlements, balanceCents - stats.totalPnLCents);
    const byCat    = calcCategoryStats(settlements);
    const sharpe   = calcSharpe(settlements);
    const streak   = calcStreak(settlements);
    const exposure = calcExposureByCategory(positions);

    const openCostCents = exposure.total;
    const cashPct       = balanceCents > 0 ? (balanceCents - openCostCents) / balanceCents : 1;

    // Biggest win / loss
    const pnls = settlements.map(t => ({ pnl: calcTradePnL(t), t })).filter(x => x.pnl !== null);
    const bigWin  = pnls.reduce((best, x) => x.pnl > (best?.pnl || -Infinity) ? x : best, null);
    const bigLoss = pnls.reduce((best, x) => x.pnl < (best?.pnl || Infinity)  ? x : best, null);

    // Maker vs taker
    const makerTrades = settlements.filter(t => t.maker);
    const takerTrades = settlements.filter(t => !t.maker);
    const makerPnL    = makerTrades.reduce((s, t) => s + (calcTradePnL(t) || 0), 0);
    const takerPnL    = takerTrades.reduce((s, t) => s + (calcTradePnL(t) || 0), 0);

    // Today's P&L
    const today      = new Date().toISOString().slice(0, 10);
    const todayEntry = daily.find(d => d.date === today);
    const dailyPnL   = todayEntry?.pnlCents || 0;

    return {
      stats, daily: dailyMA, equity, byCat, sharpe, streak, exposure,
      cashPct, openCostCents, balanceCents, dailyPnL,
      bigWin: bigWin ? { pnl: bigWin.pnl, ticker: bigWin.t.ticker } : null,
      bigLoss: bigLoss ? { pnl: bigLoss.pnl, ticker: bigLoss.t.ticker } : null,
      makerPnL, takerPnL,
      makerCount: makerTrades.length, takerCount: takerTrades.length,
    };
  }, [settlements, positions, balance]);
}
