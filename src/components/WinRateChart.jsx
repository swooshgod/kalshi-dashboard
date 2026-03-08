import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell, ResponsiveContainer } from 'recharts';
import { CATEGORY_COLORS } from '../utils/constants.js';

export function WinRateChart({ byCat = [], overallWinRate = 0, loading }) {
  const data = [...byCat]
    .filter(c => c.total > 0)
    .sort((a, b) => b.winRate - a.winRate)
    .map(c => ({
      category: c.category,
      winRate:  Math.round(c.winRate * 100),
      wins:     c.wins,
      total:    c.total,
      fill:     CATEGORY_COLORS[c.category] || '#6B7280',
    }));

  const CustomLabel = ({ x, y, width, value, payload }) => (
    <text x={x + width + 6} y={y + 11} fontSize={11} fontFamily="JetBrains Mono" fill="#6B7A8D">
      {payload?.wins}/{payload?.total} ({value}%)
    </text>
  );

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="card text-xs mono" style={{ padding: '8px 12px' }}>
        <div style={{ color: d.fill }}>{d.category}</div>
        <div style={{ color: 'var(--text)' }}>{d.wins}/{d.total} ({d.winRate}%)</div>
      </div>
    );
  };

  return (
    <div className="card h-full">
      <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>Win Rate by Category</h2>
      <p className="muted text-xs mb-4">Sample size shown as wins/total</p>

      {loading ? (
        <div className="skeleton h-48 rounded-lg" />
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-48 muted text-sm">No resolved trades</div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 120, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2530" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6B7A8D', fontSize: 11, fontFamily: 'JetBrains Mono' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="category" tick={{ fill: '#6B7A8D', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={Math.round(overallWinRate * 100)} stroke="#6B7A8D" strokeDasharray="4 4" />
            <Bar dataKey="winRate" radius={[0, 4, 4, 0]} label={<CustomLabel />}>
              {data.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
