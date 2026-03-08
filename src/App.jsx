import { useMemo } from 'react';
import { useKalshiData }     from './hooks/useKalshiData.js';
import { usePortfolioStats } from './hooks/usePortfolioStats.js';
import { useWebSocket }      from './hooks/useWebSocket.js';
import { calcTradePnL }      from './utils/calculations.js';

import { Header }           from './components/Header.jsx';
import { EquityCurve }      from './components/EquityCurve.jsx';
import { CategoryPieChart } from './components/CategoryPieChart.jsx';
import { WinRateChart }     from './components/WinRateChart.jsx';
import { TradeHistory }     from './components/TradeHistory.jsx';
import { OpenPositions }    from './components/OpenPositions.jsx';
import { DailyPnL }         from './components/DailyPnL.jsx';
import { EdgeMetrics }      from './components/EdgeMetrics.jsx';
import { RiskMonitor }      from './components/RiskMonitor.jsx';

export default function App() {
  const { settlements, positions, balance, equityCurve, loading, error, lastUpdated, refresh } =
    useKalshiData();

  const portfolioStats = usePortfolioStats({ settlements, positions, balance });

  // Subscribe to WebSocket for all open position tickers
  const tickers = useMemo(() => positions.map(p => p.ticker || p.market_ticker).filter(Boolean), [positions]);
  const { prices, flashes } = useWebSocket(tickers);

  // Merge WebSocket prices into open positions for unrealized P&L
  const enrichedPositions = useMemo(() =>
    positions.map(p => ({
      ...p,
      current_yes_bid: prices[p.ticker || p.market_ticker]?.bid ?? p.current_yes_bid,
    })),
  [positions, prices]);

  const headerStats = {
    ...portfolioStats,
    stats: {
      ...portfolioStats.stats,
      openPositions: positions.length,
    },
  };

  const startingBalance = portfolioStats.balanceCents - portfolioStats.stats?.totalPnLCents;

  return (
    <div style={{ minHeight: '100vh', background: '#0D0F11' }}>
      <Header stats={headerStats} loading={loading} lastUpdated={lastUpdated} onRefresh={refresh} />

      {/* Main content — pushed below fixed header */}
      <main style={{ paddingTop: 72 }} className="px-4 pb-8 max-w-screen-2xl mx-auto">

        {error && (
          <div className="mt-4 px-4 py-3 rounded text-sm"
            style={{ background: '#EF444420', border: '1px solid #EF4444', color: '#EF4444' }}>
            ⚠️ API Error: {error} — showing cached or mock data.
          </div>
        )}

        {/* Section 1: Equity Curve */}
        <section className="mt-4">
          <EquityCurve equity={equityCurve.length ? equityCurve : portfolioStats.equity}
            startingBalance={startingBalance} loading={loading} />
        </section>

        {/* Section 2: Category charts */}
        <section className="mt-4 grid grid-cols-2 gap-4">
          <CategoryPieChart byCat={portfolioStats.byCat} loading={loading} />
          <WinRateChart byCat={portfolioStats.byCat} overallWinRate={portfolioStats.stats?.winRate || 0} loading={loading} />
        </section>

        {/* Section 3: Trades + Positions */}
        <section className="mt-4 grid grid-cols-2 gap-4">
          <TradeHistory settlements={settlements} loading={loading} />
          <OpenPositions positions={enrichedPositions} prices={prices} flashes={flashes} loading={loading} />
        </section>

        {/* Section 4: Performance analytics */}
        <section className="mt-4 grid grid-cols-2 gap-4">
          <DailyPnL daily={portfolioStats.daily} loading={loading} />
          <EdgeMetrics portfolioStats={portfolioStats} loading={loading} />
        </section>

        {/* Section 5: Risk monitor */}
        <section className="mt-4">
          <RiskMonitor portfolioStats={portfolioStats} loading={loading} />
        </section>

        <footer className="mt-8 text-center muted text-xs py-4"
          style={{ borderTop: '1px solid #1E2530' }}>
          Data from Kalshi API. Not financial advice. For personal use only.
        </footer>
      </main>
    </div>
  );
}
