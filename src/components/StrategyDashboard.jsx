import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Empty string = relative URL — works on any host (Railway, local, Vercel)
// Set VITE_PROXY_URL only if the API server is on a different origin
const PROXY = import.meta.env.VITE_PROXY_URL || '';

const STRATEGIES = [
  { key: 'weather',     label: 'Weather Hunter',   color: '#06B6D4', icon: '🌡️' },
  { key: 'walters',     label: 'Billy Walters NBA', color: '#8B5CF6', icon: '🏀' },
  { key: 'goal_ladder', label: 'NHL Goal Ladder',   color: '#3B82F6', icon: '🏒' },
  { key: 'spread_dip',  label: 'NBA Spread Dip',    color: '#22C55E', icon: '📉' },
];

function fmt$(n) {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(n);
  return (n < 0 ? '-' : '+') + '$' + abs.toFixed(2);
}
function fmtPct(n) {
  if (n === null || n === undefined) return '—';
  return (n * 100).toFixed(1) + '%';
}
function fmtROI(n) {
  if (!n) return '—';
  return (n >= 0 ? '+' : '') + (n * 100).toFixed(1) + '%';
}

function StatCell({ value, className = '' }) {
  return <td className={`px-3 py-2 text-right tabular-nums ${className}`}>{value}</td>;
}

function PnlBadge({ val }) {
  if (val === null || val === undefined) return <span className="text-[var(--muted)]">—</span>;
  const color = val >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]';
  return <span className={color}>{fmt$(val)}</span>;
}

// ── Comparison table ────────────────────────────────────────────────────────
function ComparisonTable({ stats }) {
  if (!stats.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[var(--muted)] border-b border-[var(--border)]">
            <th className="px-3 py-2 text-left">Strategy</th>
            <th className="px-3 py-2 text-right">Bets</th>
            <th className="px-3 py-2 text-right">W/L</th>
            <th className="px-3 py-2 text-right">Win%</th>
            <th className="px-3 py-2 text-right">P&amp;L</th>
            <th className="px-3 py-2 text-right">ROI</th>
            <th className="px-3 py-2 text-right">Avg Edge</th>
            <th className="px-3 py-2 text-right">Best Win</th>
            <th className="px-3 py-2 text-right">Worst Loss</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => {
            const strat = STRATEGIES.find(x => x.key === s.strategy);
            return (
              <tr key={s.strategy} className="border-b border-[var(--border)] hover:bg-white/5 transition-colors">
                <td className="px-3 py-2 font-medium flex items-center gap-2">
                  <span style={{ color: strat?.color }}>{strat?.icon}</span>
                  <span>{strat?.label || s.strategy}</span>
                </td>
                <StatCell value={s.settledBets} />
                <StatCell value={`${s.wins}/${s.losses}`} />
                <StatCell
                  value={fmtPct(s.winRate)}
                  className={s.winRate >= 0.55 ? 'text-[var(--green)]' : s.winRate >= 0.45 ? 'text-[var(--amber)]' : 'text-[var(--red)]'}
                />
                <td className="px-3 py-2 text-right"><PnlBadge val={s.totalPnl} /></td>
                <StatCell
                  value={fmtROI(s.roi)}
                  className={s.roi >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}
                />
                <StatCell value={fmtPct(s.avgEdge)} className="text-[var(--cyan)]" />
                <StatCell value={fmt$(s.largestWin)} className="text-[var(--green)]" />
                <StatCell value={fmt$(s.largestLoss)} className="text-[var(--red)]" />
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="text-[var(--muted)] border-t border-[var(--border)] font-medium">
            <td className="px-3 py-2">ALL STRATEGIES</td>
            <StatCell value={stats.reduce((s, x) => s + x.settledBets, 0)} />
            <StatCell value={`${stats.reduce((s,x)=>s+x.wins,0)}/${stats.reduce((s,x)=>s+x.losses,0)}`} />
            <StatCell value={(() => {
              const w = stats.reduce((s,x)=>s+x.wins,0);
              const t = stats.reduce((s,x)=>s+x.settledBets,0);
              return t ? fmtPct(w/t) : '—';
            })()} />
            <td className="px-3 py-2 text-right">
              <PnlBadge val={stats.reduce((s,x)=>s+(x.totalPnl||0),0)} />
            </td>
            <StatCell value="—" />
            <StatCell value="—" />
            <StatCell value="—" />
            <StatCell value="—" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Equity chart ─────────────────────────────────────────────────────────────
function EquityChart({ equity, color }) {
  if (!equity?.length) {
    return (
      <div className="h-28 flex items-center justify-center text-[var(--muted)] text-xs">
        No settled bets yet
      </div>
    );
  }
  const allZero = equity.every(p => p.pnl === 0);
  return (
    <ResponsiveContainer width="100%" height={112}>
      <LineChart data={equity} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} tickLine={false} axisLine={false}
               tickFormatter={v => `$${v.toFixed(0)}`} />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11 }}
          formatter={(v) => [`$${v.toFixed(2)}`, 'Equity']}
          labelStyle={{ color: 'var(--muted)' }}
        />
        <Line type="monotone" dataKey="pnl" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Strategy card ─────────────────────────────────────────────────────────────
function StrategyCard({ data, color, icon, label }) {
  if (!data) return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <span className="font-semibold text-[var(--text)]">{label}</span>
      </div>
      <p className="text-[var(--muted)] text-sm">Loading…</p>
    </div>
  );

  const pnlColor = (data.totalPnl || 0) >= 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-[var(--text)]">{label}</span>
          {data.openBets > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--amber)]/20 text-[var(--amber)]">
              {data.openBets} live
            </span>
          )}
        </div>
        <span className="text-lg font-bold tabular-nums" style={{ color: pnlColor }}>
          {fmt$(data.totalPnl)}
        </span>
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Bets', value: data.settledBets ?? 0 },
          { label: 'Win Rate', value: fmtPct(data.winRate), color: data.winRate >= 0.55 ? 'var(--green)' : data.winRate >= 0.45 ? 'var(--amber)' : 'var(--red)' },
          { label: 'ROI', value: fmtROI(data.roi), color: (data.roi||0) >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Avg Edge', value: fmtPct(data.avgEdge), color: 'var(--cyan)' },
          { label: 'Best', value: fmt$(data.largestWin), color: 'var(--green)' },
          { label: 'Worst', value: fmt$(data.largestLoss), color: 'var(--red)' },
        ].map(({ label: l, value: v, color: c }) => (
          <div key={l} className="bg-[var(--bg)] rounded-lg p-2 text-center">
            <div className="text-[9px] text-[var(--muted)] uppercase tracking-wide mb-0.5">{l}</div>
            <div className="text-sm font-semibold tabular-nums" style={{ color: c || 'var(--text)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Equity curve */}
      <div>
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide mb-1">Equity Curve</div>
        <EquityChart equity={data.equity} color={color} />
      </div>

      {/* Recent bets */}
      {data.recentBets?.length > 0 && (
        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide mb-1">Recent Bets</div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {data.recentBets.slice(0,8).map((b, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span>{b.result === 'win' ? '✅' : b.result === 'loss' ? '❌' : '⏳'}</span>
                  <span className="text-[var(--muted)] truncate">{b.ticker}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-[var(--muted)]">{b.entry_price ? Math.round(b.entry_price * 100) + '¢' : '—'}</span>
                  <PnlBadge val={b.pnl} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Recent bets feed ──────────────────────────────────────────────────────────
function RecentFeed({ bets }) {
  if (!bets?.length) return (
    <p className="text-[var(--muted)] text-sm text-center py-4">No bets logged yet</p>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[var(--muted)] border-b border-[var(--border)]">
            <th className="px-2 py-1.5 text-left">Time</th>
            <th className="px-2 py-1.5 text-left">Strategy</th>
            <th className="px-2 py-1.5 text-left">Ticker</th>
            <th className="px-2 py-1.5 text-right">Entry</th>
            <th className="px-2 py-1.5 text-right">Size</th>
            <th className="px-2 py-1.5 text-right">Result</th>
            <th className="px-2 py-1.5 text-right">P&L</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((b, i) => {
            const strat = STRATEGIES.find(s => s.key === b.strategy);
            return (
              <tr key={i} className="border-b border-[var(--border)] hover:bg-white/5">
                <td className="px-2 py-1.5 text-[var(--muted)]">{b.placed_at?.slice(5,16).replace('T',' ')}</td>
                <td className="px-2 py-1.5">
                  <span style={{ color: strat?.color }}>{strat?.icon} {strat?.label || b.strategy}</span>
                </td>
                <td className="px-2 py-1.5 font-mono text-[10px] text-[var(--muted)] max-w-[140px] truncate">{b.ticker}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{b.entry_price ? Math.round(b.entry_price * 100) + '¢' : '—'}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">${(b.bet_size||0).toFixed(2)}</td>
                <td className="px-2 py-1.5 text-right">
                  {b.result === 'win' ? <span className="text-[var(--green)]">WIN</span>
                   : b.result === 'loss' ? <span className="text-[var(--red)]">LOSS</span>
                   : <span className="text-[var(--muted)]">OPEN</span>}
                </td>
                <td className="px-2 py-1.5 text-right"><PnlBadge val={b.pnl} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StrategyDashboard() {
  const [allStats, setAllStats]  = useState([]);
  const [recentBets, setRecent]  = useState([]);
  const [loading, setLoading]    = useState(true);
  const [error, setError]        = useState(null);
  const [lastUpdated, setUpdated] = useState(null);
  const [activeTab, setTab]      = useState('overview');

  const load = useCallback(async () => {
    try {
      const [perfRes, betsRes] = await Promise.all([
        fetch(`${PROXY}/perf/all`),
        fetch(`${PROXY}/perf-bets/recent?limit=50`),
      ]);
      const perf = await perfRes.json();
      const bets = await betsRes.json();
      setAllStats(perf.strategies || []);
      setRecent(bets.bets || []);
      setUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);  // auto-refresh every minute
    return () => clearInterval(t);
  }, [load]);

  const totalPnl   = allStats.reduce((s, x) => s + (x.totalPnl || 0), 0);
  const totalBets  = allStats.reduce((s, x) => s + (x.settledBets || 0), 0);
  const totalWins  = allStats.reduce((s, x) => s + (x.wins || 0), 0);
  const totalWR    = totalBets ? totalWins / totalBets : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans">
      {/* Page header — no top padding needed, App.jsx handles the offset */}
      <div className="border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">🔭 Scout Strategy Performance</h1>
          <p className="text-[var(--muted)] text-xs mt-0.5">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-[var(--muted)]">All-Time P&L</div>
            <div className={`text-xl font-bold tabular-nums ${totalPnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
              {loading ? '…' : fmt$(totalPnl)}
            </div>
          </div>
          <button onClick={load} className="text-xs px-2.5 py-1 rounded-md border border-[var(--border)] hover:bg-white/5 transition-colors">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] px-4">
        {['overview', 'strategies', 'all bets'].map(tab => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            className={`px-4 py-2.5 text-sm capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-[var(--blue)] text-[var(--text)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-6xl mx-auto space-y-4">
        {error && (
          <div className="rounded-lg border border-[var(--red)]/30 bg-[var(--red)]/10 p-3 text-sm text-[var(--red)]">
            ⚠️ {error}
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Top KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total P&L', value: fmt$(totalPnl), color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' },
                { label: 'Total Bets', value: String(totalBets), color: 'var(--text)' },
                { label: 'Win Rate', value: fmtPct(totalWR), color: totalWR >= 0.55 ? 'var(--green)' : 'var(--amber)' },
                { label: 'Open Bets', value: String(allStats.reduce((s,x)=>s+(x.openBets||0),0)), color: 'var(--amber)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide mb-1">{label}</div>
                  <div className="text-2xl font-bold tabular-nums" style={{ color }}>{loading ? '…' : value}</div>
                </div>
              ))}
            </div>

            {/* Comparison table */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <h2 className="font-semibold text-sm">Strategy Comparison</h2>
              </div>
              {loading ? (
                <p className="p-4 text-[var(--muted)] text-sm">Loading…</p>
              ) : (
                <ComparisonTable stats={allStats} />
              )}
            </div>

            {/* Recent bets preview */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="font-semibold text-sm">Recent Bets</h2>
                <span className="text-[var(--muted)] text-xs">{recentBets.length} total</span>
              </div>
              <RecentFeed bets={recentBets.slice(0, 10)} />
            </div>
          </>
        )}

        {/* STRATEGIES TAB */}
        {activeTab === 'strategies' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STRATEGIES.map(({ key, label, color, icon }) => {
              const data = allStats.find(s => s.strategy === key);
              return <StrategyCard key={key} data={data} color={color} icon={icon} label={label} />;
            })}
          </div>
        )}

        {/* ALL BETS TAB */}
        {activeTab === 'all bets' && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-semibold text-sm">All Bets</h2>
              <span className="text-[var(--muted)] text-xs">{recentBets.length} shown</span>
            </div>
            <RecentFeed bets={recentBets} />
          </div>
        )}
      </div>
    </div>
  );
}
