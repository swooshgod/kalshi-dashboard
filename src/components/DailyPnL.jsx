import { useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import { fmt$, fmt$signed, fmtDateShort } from '../utils/formatters.js';

export function DailyPnL({ daily = [], loading }) {
  const [days, setDays] = useState(30);
  const data = daily.slice(-days);

  const winDays  = data.filter(d => d.pnlCents > 0).length;
  const bestDay  = data.reduce((b, d) => d.pnlCents > b ? d.pnlCents : b, 0);
  const worstDay = data.reduce((b, d) => d.pnlCents < b ? d.pnlCents : b, 0);
  const avgDay   = data.length ? Math.round(data.reduce((s, d) => s + d.pnlCents, 0) / data.length) : 0;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="card text-xs mono" style={{ padding: '8px 12px' }}>
        <div className="muted">{payload[0].payload.date}</div>
        <div className={payload[0].payload.pnlCents >= 0 ? 'positive' : 'negative'}>
          {fmt$signed(payload[0].payload.pnlCents)}
        </div>
        {payload[1] && <div className="muted">7d MA: {fmt$(payload[1].value)}</div>}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Daily P&L</h2>
          <p className="muted text-xs">
            Winning days: {winDays}/{data.length} ({data.length ? Math.round(winDays/data.length*100) : 0}%)
            &nbsp;·&nbsp;Best: <span className="positive">{fmt$signed(bestDay)}</span>
            &nbsp;·&nbsp;Worst: <span className="negative">{fmt$signed(worstDay)}</span>
            &nbsp;·&nbsp;Avg: <span className={avgDay >= 0 ? 'positive' : 'negative'}>{fmt$signed(avgDay)}</span>
          </p>
        </div>
        <div className="flex gap-1">
          {[14, 30, 60].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className="px-2.5 py-1 rounded text-xs mono"
              style={{ background: days === d ? '#3B82F6' : '#1E2530', color: days === d ? '#fff' : '#6B7A8D' }}>
              {d}D
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-48 rounded-lg" />
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-48 muted text-sm">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2530" />
            <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={{ fill: '#6B7A8D', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `$${(v/100).toFixed(0)}`} tick={{ fill: '#6B7A8D', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={55} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pnlCents" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => <Cell key={i} fill={entry.pnlCents >= 0 ? '#22C55E' : '#EF4444'} fillOpacity={0.8} />)}
            </Bar>
            <Line type="monotone" dataKey="ma" stroke="#3B82F6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
