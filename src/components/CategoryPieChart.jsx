import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CATEGORY_COLORS } from '../utils/constants.js';
import { fmt$ } from '../utils/formatters.js';

export function CategoryPieChart({ byCat = [], loading }) {
  const sorted = [...byCat].sort((a, b) => b.pnlCents - a.pnlCents);
  const total  = byCat.reduce((s, c) => s + Math.abs(c.pnlCents), 0) || 1;

  const data = sorted.filter(c => c.pnlCents !== 0).map(c => ({
    name:  c.category,
    value: Math.abs(c.pnlCents),
    pnl:   c.pnlCents,
    fill:  CATEGORY_COLORS[c.category] || '#6B7280',
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { name, pnl, value } = payload[0].payload;
    return (
      <div className="card text-xs mono" style={{ padding: '8px 12px' }}>
        <div style={{ color: CATEGORY_COLORS[name] }}>{name}</div>
        <div className={pnl >= 0 ? 'positive' : 'negative'}>{fmt$(pnl)}</div>
        <div className="muted">{(value / total * 100).toFixed(1)}% of P&L</div>
      </div>
    );
  };

  return (
    <div className="card h-full">
      <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>P&L by Category</h2>
      <p className="muted text-xs mb-4">Where your edge is strongest</p>

      {loading ? (
        <div className="skeleton h-48 rounded-lg" />
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-48 muted text-sm">No resolved trades</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-3 space-y-1">
            {sorted.map((c, i) => (
              <div key={c.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full"
                    style={{ background: CATEGORY_COLORS[c.category] || '#6B7280' }} />
                  <span className="muted">{i + 1}. {c.category}</span>
                </div>
                <span className={`mono ${c.pnlCents >= 0 ? 'positive' : 'negative'}`}>
                  {fmt$(c.pnlCents)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
