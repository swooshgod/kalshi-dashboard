import { fmt$, fmt$signed, fmtDate, daysUntil } from '../utils/formatters.js';
import { calcUnrealizedPnL } from '../utils/calculations.js';

export function OpenPositions({ positions = [], prices = {}, flashes = {}, loading }) {
  const sorted = [...positions].sort((a, b) => {
    return new Date(a.resolution_date || 0) - new Date(b.resolution_date || 0);
  });

  return (
    <div className="card">
      <div className="mb-4">
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Open Positions</h2>
        <p className="muted text-xs">{positions.length} active · sorted by resolution date</p>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}</div>
      ) : sorted.length === 0 ? (
        <div className="flex items-center justify-center h-32 muted text-sm">No open positions</div>
      ) : (
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E2530' }}>
                {['Market', 'Side', 'Entry', 'Current', 'Unrealized P&L', 'Size', 'Expires', 'Days'].map(h => (
                  <th key={h} className="text-left py-2 px-3 muted text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const ticker      = p.ticker || p.market_ticker || '';
                const side        = p.position_type || p.side || 'yes';
                const entryYes    = p.yes_price || p.resting_order_count || 0;
                const curBid      = prices[ticker]?.bid ?? p.current_yes_bid ?? entryYes;
                const unrealized  = calcUnrealizedPnL({ ...p, side, yes_price: entryYes, no_price: 100 - entryYes, contracts: p.contracts || p.position }, curBid);
                const warnMove    = Math.abs(curBid - entryYes) > 20;
                const flashClass  = flashes[ticker] === 'up' ? 'flash-up' : flashes[ticker] === 'down' ? 'flash-down' : '';
                const days        = daysUntil(p.resolution_date || p.close_time);

                return (
                  <tr key={i} className={`${flashClass}`}
                    style={{ borderBottom: '1px solid #1E2530', transition: 'background 0.3s' }}>
                    <td className="py-2 px-3 text-xs mono" style={{ color: 'var(--text)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={ticker}>{ticker.slice(-20)}</td>
                    <td className="py-2 px-3">
                      <span className="text-xs px-1.5 py-0.5 rounded mono"
                        style={{ background: side === 'yes' ? '#22C55E20' : '#3B82F620', color: side === 'yes' ? '#22C55E' : '#3B82F6' }}>
                        {side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 mono text-xs muted">{entryYes}¢</td>
                    <td className="py-2 px-3 mono text-xs" style={{ color: 'var(--text)' }}>
                      {curBid}¢ {warnMove && <span title="Large move against entry" className="warning">⚠️</span>}
                    </td>
                    <td className={`py-2 px-3 mono text-xs font-semibold ${unrealized >= 0 ? 'positive' : 'negative'}`}>
                      {fmt$signed(unrealized)}
                    </td>
                    <td className="py-2 px-3 mono text-xs muted">{p.contracts || p.position || '—'}</td>
                    <td className="py-2 px-3 mono text-xs muted">{fmtDate(p.resolution_date || p.close_time)}</td>
                    <td className={`py-2 px-3 mono text-xs ${days !== null && days <= 1 ? 'warning' : 'muted'}`}>
                      {days !== null ? `${days}d` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
