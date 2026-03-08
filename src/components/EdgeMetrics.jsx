import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { fmt$, fmt$signed } from '../utils/formatters.js';

export function EdgeMetrics({ portfolioStats, loading }) {
  const {
    sharpe, streak, bigWin, bigLoss,
    makerPnL, takerPnL, makerCount, takerCount,
    stats = {},
  } = portfolioStats || {};

  const makerData = [
    { name: 'Maker', value: makerCount || 0, pnl: makerPnL || 0, fill: '#22C55E' },
    { name: 'Taker', value: takerCount || 0, pnl: takerPnL || 0, fill: '#EF4444' },
  ].filter(d => d.value > 0);

  const totalTrades = (makerCount || 0) + (takerCount || 0);

  return (
    <div className="card">
      <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Edge Metrics</h2>

      <div className="grid grid-cols-2 gap-4">

        {/* Maker vs Taker */}
        <div>
          <div className="muted text-xs mb-2">Maker vs Taker</div>
          {loading ? <div className="skeleton h-24 rounded" /> : (
            <>
              <ResponsiveContainer width="100%" height={80}>
                <PieChart>
                  <Pie data={makerData} cx="50%" cy="50%" innerRadius={22} outerRadius={35} dataKey="value" paddingAngle={2}>
                    {makerData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v, n, p) => [fmt$(p.payload.pnl), n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-1">
                {makerData.map(d => (
                  <div key={d.name} className="flex justify-between text-xs">
                    <span style={{ color: d.fill }}>● {d.name} ({totalTrades ? Math.round(d.value/totalTrades*100) : 0}%)</span>
                    <span className={`mono ${d.pnl >= 0 ? 'positive' : 'negative'}`}>{fmt$signed(d.pnl)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sharpe + Streak */}
        <div className="space-y-3">
          <Metric label="Sharpe Ratio" loading={loading}
            value={sharpe !== null && sharpe !== undefined ? sharpe.toFixed(2) : 'Insufficient data'}
            color={sharpe >= 1 ? 'positive' : sharpe >= 0 ? '' : 'negative'} />

          <Metric label="Current Streak" loading={loading}
            value={streak?.count ? `${streak.count} ${streak.type?.toUpperCase()}${streak.count > 1 ? 'S' : ''}` : '—'}
            color={streak?.type === 'win' ? 'positive' : streak?.type === 'loss' ? 'negative' : ''} />
        </div>

        {/* Biggest win/loss */}
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <div>
            <div className="muted text-xs mb-1">Largest Win</div>
            {loading ? <div className="skeleton h-8 rounded" /> : (
              bigWin
                ? <>
                    <div className="mono text-lg font-semibold positive">{fmt$signed(bigWin.pnl)}</div>
                    <div className="muted text-xs truncate" title={bigWin.ticker}>{bigWin.ticker?.slice(-24)}</div>
                  </>
                : <div className="muted text-sm">—</div>
            )}
          </div>
          <div>
            <div className="muted text-xs mb-1">Largest Loss</div>
            {loading ? <div className="skeleton h-8 rounded" /> : (
              bigLoss
                ? <>
                    <div className="mono text-lg font-semibold negative">{fmt$signed(bigLoss.pnl)}</div>
                    <div className="muted text-xs truncate" title={bigLoss.ticker}>{bigLoss.ticker?.slice(-24)}</div>
                  </>
                : <div className="muted text-sm">—</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color = '', loading }) {
  return (
    <div>
      <div className="muted text-xs">{label}</div>
      {loading
        ? <div className="skeleton h-5 w-24 rounded mt-0.5" />
        : <div className={`mono text-sm font-semibold ${color}`}>{value}</div>}
    </div>
  );
}
