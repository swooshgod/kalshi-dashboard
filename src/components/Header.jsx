import { fmt$, fmt$signed, fmtPctPlain } from '../utils/formatters.js';

export function Header({ stats, loading, lastUpdated, onRefresh }) {
  const { balanceCents = 0, dailyPnL = 0, stats: s = {}, cashPct = 1 } = stats || {};

  const totalPnLCents = s.totalPnLCents || 0;
  const winRate       = s.winRate || 0;
  const openPositions = s.openPositions || 0;

  const cashWarning = cashPct < 0.30;

  return (
    <header style={{ background: '#151920', borderBottom: '1px solid #1E2530' }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-3 flex items-center gap-6 flex-wrap">

      <div className="flex-shrink-0">
        <div className="muted text-xs uppercase tracking-wide">Balance</div>
        <div className="mono text-2xl font-bold" style={{ color: 'var(--text)' }}>
          {loading ? <span className="skeleton w-24 h-6 inline-block" /> : fmt$(balanceCents)}
        </div>
      </div>

      <Divider />

      <StatItem label="Daily P&L" loading={loading}
        value={fmt$signed(dailyPnL)}
        color={dailyPnL >= 0 ? 'positive' : 'negative'} />

      <StatItem label="Total P&L" loading={loading}
        value={fmt$signed(totalPnLCents)}
        color={totalPnLCents >= 0 ? 'positive' : 'negative'} />

      <Divider />

      <StatItem label="Open Positions" loading={loading}
        value={s.openPositions ?? '—'} />

      <StatItem label="Win Rate" loading={loading}
        value={s.totalTrades ? `${fmtPctPlain(winRate)} (${s.wins}/${s.totalTrades})` : '—'} />

      <StatItem label="Cash Reserve" loading={loading}
        value={fmtPctPlain(cashPct)}
        color={cashWarning ? 'warning' : ''}
        icon={cashWarning ? '⚠️' : ''} />

      <div className="ml-auto flex items-center gap-3">
        <span className="muted text-xs mono">
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : '—'}
        </span>
        <button onClick={onRefresh}
          className="px-3 py-1.5 rounded text-xs font-medium"
          style={{ background: '#1E2530', color: 'var(--text)', border: '1px solid #2a3444' }}>
          ↻ Refresh
        </button>
      </div>
    </header>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 32, background: '#1E2530' }} className="flex-shrink-0" />;
}

function StatItem({ label, value, color = '', icon = '', loading }) {
  return (
    <div>
      <div className="muted text-xs uppercase tracking-wide">{label}</div>
      <div className={`mono text-sm font-semibold ${color}`}>
        {loading ? <span className="skeleton w-16 h-4 inline-block" /> : <>{icon}{value}</>}
      </div>
    </div>
  );
}
