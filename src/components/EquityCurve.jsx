import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fmt$, fmtDateShort } from '../utils/formatters.js';

const WINDOWS = ['1W', '1M', '3M', 'ALL'];

export function EquityCurve({ equity = [], startingBalance = 0, loading }) {
  const [window, setWindow] = useState('ALL');

  const now    = Date.now();
  const cutoff = { '1W': 7, '1M': 30, '3M': 90, 'ALL': Infinity };
  const days   = cutoff[window];
  const data   = equity.filter(d => {
    if (days === Infinity) return true;
    return (now - new Date(d.date).getTime()) < days * 86400000;
  });

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { date, value } = payload[0].payload;
    const change = data.length > 1
      ? value - data[data.indexOf(payload[0].payload) - 1]?.value || 0
      : 0;
    return (
      <div className="card text-xs mono" style={{ padding: '8px 12px' }}>
        <div className="muted">{date}</div>
        <div style={{ color: 'var(--text)' }} className="font-semibold">{fmt$(value)}</div>
        {change !== 0 && <div className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{fmt$(change)}</div>}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Equity Curve</h2>
          <p className="muted text-xs">Cumulative portfolio value</p>
        </div>
        <div className="flex gap-1">
          {WINDOWS.map(w => (
            <button key={w} onClick={() => setWindow(w)}
              className="px-2.5 py-1 rounded text-xs font-medium mono"
              style={{
                background: w === window ? '#3B82F6' : '#1E2530',
                color: w === window ? '#fff' : 'var(--muted)',
              }}>
              {w}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-56 rounded-lg" />
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-56 muted text-sm">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2530" />
            <XAxis dataKey="date" tickFormatter={fmtDateShort} tick={{ fill: '#6B7A8D', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `$${(v/100).toFixed(0)}`} tick={{ fill: '#6B7A8D', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={60} />
            <Tooltip content={<CustomTooltip />} />
            {startingBalance > 0 && (
              <ReferenceLine y={startingBalance} stroke="#6B7A8D" strokeDasharray="4 4" label={{ value: 'Start', fill: '#6B7A8D', fontSize: 10 }} />
            )}
            <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#equityGrad)" dot={false} activeDot={{ r: 4, fill: '#3B82F6' }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
