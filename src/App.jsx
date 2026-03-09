import { useMemo, useState } from 'react';
import { useKalshiData }     from './hooks/useKalshiData.js';
import { usePortfolioStats } from './hooks/usePortfolioStats.js';
import { useWebSocket }      from './hooks/useWebSocket.js';

import { Header }            from './components/Header.jsx';
import { EquityCurve }       from './components/EquityCurve.jsx';
import { CategoryPieChart }  from './components/CategoryPieChart.jsx';
import { WinRateChart }      from './components/WinRateChart.jsx';
import { TradeHistory }      from './components/TradeHistory.jsx';
import { OpenPositions }     from './components/OpenPositions.jsx';
import { DailyPnL }          from './components/DailyPnL.jsx';
import { EdgeMetrics }       from './components/EdgeMetrics.jsx';
import { RiskMonitor }       from './components/RiskMonitor.jsx';
import StrategyDashboard     from './components/StrategyDashboard.jsx';
import { ErrorBoundary }     from './components/ErrorBoundary.jsx';

const HEADER_H = 56; // px — fixed header height
const NAV_H    = 41; // px — sticky tab nav height

export default function App() {
  // Default to strategies page — that's what Franky wants to see
  const [page, setPage] = useState('strategies');

  const { settlements, positions, balance, equityCurve, loading, error, lastUpdated, refresh } =
    useKalshiData();

  const portfolioStats = usePortfolioStats({ settlements, positions, balance });

  const tickers = useMemo(
    () => positions.map(p => p.ticker || p.market_ticker).filter(Boolean),
    [positions]
  );
  const { prices, flashes } = useWebSocket(tickers);

  const enrichedPositions = useMemo(() =>
    positions.map(p => ({
      ...p,
      current_yes_bid: prices[p.ticker || p.market_ticker]?.bid ?? p.current_yes_bid,
    })),
  [positions, prices]);

  const headerStats = {
    ...portfolioStats,
    stats: { ...portfolioStats.stats, openPositions: positions.length },
  };

  const startingBalance = portfolioStats.balanceCents - (portfolioStats.stats?.totalPnLCents || 0);

  const tabs = [
    { id: 'strategies', label: '🔭 Strategy Performance' },
    { id: 'portfolio',  label: '📊 Portfolio' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0D0F11' }}>

      {/* Fixed top header */}
      <Header
        stats={headerStats}
        loading={loading}
        lastUpdated={lastUpdated}
        onRefresh={refresh}
      />

      {/* Sticky tab nav — sits below fixed header */}
      <div style={{
        position: 'sticky',
        top: HEADER_H,
        zIndex: 40,
        background: '#0D0F11',
        borderBottom: '1px solid #1E2530',
      }}>
        <div className="px-4 max-w-screen-2xl mx-auto flex">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setPage(t.id)}
              style={{
                padding: '0.625rem 1rem',
                fontSize: '0.875rem',
                background: 'none',
                border: 'none',
                borderBottom: page === t.id ? '2px solid #3B82F6' : '2px solid transparent',
                color: page === t.id ? '#E8ECF1' : '#6B7A8D',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'color 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page content — padded below both fixed layers */}
      <div style={{ paddingTop: HEADER_H + NAV_H }}>

        {/* ── Strategy Performance ── */}
        {page === 'strategies' && (
          <ErrorBoundary>
            <StrategyDashboard />
          </ErrorBoundary>
        )}

        {/* ── Portfolio ── */}
        {page === 'portfolio' && (
          <ErrorBoundary>
            <main className="px-4 pb-8 max-w-screen-2xl mx-auto">

              {error && (
                <div className="mt-4 px-4 py-3 rounded text-sm"
                  style={{ background: '#EF444420', border: '1px solid #EF4444', color: '#EF4444' }}>
                  ⚠️ API Error: {error} — showing cached or mock data.
                </div>
              )}

              <section className="mt-4">
                <EquityCurve
                  equity={equityCurve.length ? equityCurve : portfolioStats.equity}
                  startingBalance={startingBalance}
                  loading={loading}
                />
              </section>

              <section className="mt-4 grid grid-cols-2 gap-4">
                <CategoryPieChart byCat={portfolioStats.byCat} loading={loading} />
                <WinRateChart
                  byCat={portfolioStats.byCat}
                  overallWinRate={portfolioStats.stats?.winRate || 0}
                  loading={loading}
                />
              </section>

              <section className="mt-4 grid grid-cols-2 gap-4">
                <TradeHistory settlements={settlements} loading={loading} />
                <OpenPositions
                  positions={enrichedPositions}
                  prices={prices}
                  flashes={flashes}
                  loading={loading}
                />
              </section>

              <section className="mt-4 grid grid-cols-2 gap-4">
                <DailyPnL daily={portfolioStats.daily} loading={loading} />
                <EdgeMetrics portfolioStats={portfolioStats} loading={loading} />
              </section>

              <section className="mt-4">
                <RiskMonitor portfolioStats={portfolioStats} loading={loading} />
              </section>

              <footer className="mt-8 text-center text-xs py-4"
                style={{ borderTop: '1px solid #1E2530', color: '#6B7A8D' }}>
                Data from Kalshi API · Not financial advice · Personal use only
              </footer>
            </main>
          </ErrorBoundary>
        )}

      </div>
    </div>
  );
}
