import { useState } from 'react';
import { getCategory } from '../utils/categoryMapper.js';
import { calcTradePnL } from '../utils/calculations.js';
import { fmt$, fmt$signed, fmtDate } from '../utils/formatters.js';
import { CATEGORY_COLORS } from '../utils/constants.js';

const CATEGORIES = ['All', 'Economics', 'Weather', 'Sports', 'Politics', 'Earnings', 'Entertainment', 'Other'];

export function TradeHistory({ settlements = [], loading }) {
  const [filter,   setFilter]   = useState('All');
  const [sortKey,  setSortKey]  = useState('resolved_at');
  const [sortDesc, setSortDesc] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const filtered = settlements
    .filter(t => filter === 'All' || getCategory(t.ticker) === filter)
    .map(t => ({ ...t, pnlCents: calcTradePnL(t) }))
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') return sortDesc ? bv.localeCompare(av) : av.localeCompare(bv);
      return sortDesc ? bv - av : av - bv;
    })
    .slice(0, 25);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDesc(d => !d);
    else { setSortKey(key); setSortDesc(true); }
  };

  const Th = ({ label, k }) => (
    <th className="text-left py-2 px-3 muted text-xs font-medium cursor-pointer hover:text-white select-none"
      onClick={() => toggleSort(k)}>
      {label}{sortKey === k ? (sortDesc ? ' ▼' : ' ▲') : ''}
    </th>
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Recent Trades</h2>
          <p className="muted text-xs">Last 25 resolved positions</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="px-2 py-1 rounded text-xs"
              style={{
                background: filter === cat ? (CATEGORY_COLORS[cat] || '#3B82F6') : '#1E2530',
                color: filter === cat ? '#fff' : '#6B7A8D',
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1E2530' }}>
                <Th label="Date"     k="resolved_at" />
                <Th label="Market"   k="ticker" />
                <Th label="Side"     k="side" />
                <Th label="Entry"    k="yes_price" />
                <Th label="Result"   k="result" />
                <Th label="P&L"      k="pnlCents" />
                <Th label="ROI"      k="pnlCents" />
                <th className="text-left py-2 px-3 muted text-xs font-medium">Category</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center muted text-sm py-8">No trades yet</td></tr>
              )}
              {filtered.map((t, i) => {
                const cat     = getCategory(t.ticker);
                const roiPct  = t.yes_price ? ((t.pnlCents / (t.yes_price * (t.count || 1))) * 100).toFixed(1) : '—';
                const isOpen  = expanded === i;
                return (
                  <>
                    <tr key={i}
                      onClick={() => setExpanded(isOpen ? null : i)}
                      style={{ borderBottom: '1px solid #1E2530', cursor: 'pointer' }}
                      className="hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 muted text-xs mono">{fmtDate(t.resolved_at)}</td>
                      <td className="py-2 px-3 text-xs mono" style={{ color: 'var(--text)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={t.ticker}>{t.ticker?.slice(-20)}</td>
                      <td className="py-2 px-3">
                        <span className="text-xs px-1.5 py-0.5 rounded mono"
                          style={{ background: t.side === 'yes' ? '#22C55E20' : '#3B82F620', color: t.side === 'yes' ? '#22C55E' : '#3B82F6' }}>
                          {(t.side || '?').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-3 mono text-xs" style={{ color: 'var(--muted)' }}>{t.yes_price ?? t.entry_price ?? '—'}¢</td>
                      <td className="py-2 px-3 text-xs">{t.result === true ? '✅ YES' : t.result === false ? '❌ NO' : '—'}</td>
                      <td className={`py-2 px-3 mono text-xs font-semibold ${t.pnlCents >= 0 ? 'positive' : 'negative'}`}>
                        {fmt$signed(t.pnlCents)}
                      </td>
                      <td className={`py-2 px-3 mono text-xs ${t.pnlCents >= 0 ? 'positive' : 'negative'}`}>
                        {t.pnlCents >= 0 ? '+' : ''}{roiPct}%
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: (CATEGORY_COLORS[cat] || '#6B7280') + '25', color: CATEGORY_COLORS[cat] || '#6B7280' }}>
                          {cat}
                        </span>
                        {t.maker ? <span className="ml-1 text-xs muted" title="Maker order">M</span> : <span className="ml-1 text-xs muted" title="Taker order">T</span>}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`exp-${i}`} style={{ background: '#0D0F11', borderBottom: '1px solid #1E2530' }}>
                        <td colSpan={8} className="px-4 py-3">
                          <div className="grid grid-cols-4 gap-4 text-xs mono">
                            <div><span className="muted">Ticker: </span>{t.ticker}</div>
                            <div><span className="muted">Qty: </span>{t.count}</div>
                            <div><span className="muted">Fees: </span>{fmt$(t.fees_paid || 0)}</div>
                            <div><span className="muted">Created: </span>{fmtDate(t.created_at)}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
