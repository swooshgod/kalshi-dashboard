export function StatCard({ label, value, sub, color, large, loading }) {
  if (loading) return (
    <div className="card flex flex-col gap-2">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-7 w-32" />
    </div>
  );
  return (
    <div className="card">
      <div className="muted text-xs font-medium tracking-wide uppercase mb-1">{label}</div>
      <div className={`mono font-semibold ${large ? 'text-3xl' : 'text-xl'} ${color || ''}`}>{value}</div>
      {sub && <div className="muted text-xs mt-1">{sub}</div>}
    </div>
  );
}
