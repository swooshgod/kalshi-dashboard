export function StatusBadge({ ok, label, detail }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className={`text-base ${ok ? 'text-green-400' : 'text-red-400'}`}>
        {ok ? '✅' : '❌'}
      </span>
      <span className="text-sm" style={{ color: 'var(--text)' }}>{label}</span>
      {detail && <span className="mono text-xs muted ml-auto">{detail}</span>}
    </div>
  );
}
