export function Gauge({ pct = 0, label }) {
  const clamped = Math.min(1, Math.max(0, pct));
  const angle   = -180 + clamped * 180; // -180° (empty) to 0° (full)
  const color   = clamped < 0.40 ? '#22C55E' : clamped < 0.60 ? '#F59E0B' : '#EF4444';

  // SVG arc params
  const r  = 54;
  const cx = 70, cy = 70;
  const rad = (deg) => (deg * Math.PI) / 180;
  const arcX = (deg) => cx + r * Math.cos(rad(deg - 180));
  const arcY = (deg) => cy + r * Math.sin(rad(deg - 180));

  const startDeg = 0;
  const endDeg   = clamped * 180;
  const largeArc = endDeg > 90 ? 1 : 0;

  const bgPath   = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const fillPath = endDeg > 0
    ? `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${arcX(endDeg)} ${arcY(endDeg)}`
    : null;

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        <path d={bgPath} fill="none" stroke="#1E2530" strokeWidth="12" strokeLinecap="round" />
        {fillPath && (
          <path d={fillPath} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" />
        )}
        <text x="70" y="68" textAnchor="middle" fontSize="18" fontFamily="JetBrains Mono" fontWeight="600" fill={color}>
          {Math.round(clamped * 100)}%
        </text>
      </svg>
      {label && <div className="text-xs muted -mt-1">{label}</div>}
    </div>
  );
}
