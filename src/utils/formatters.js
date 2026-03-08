export const fmt$ = (cents) => {
  const dollars = cents / 100;
  const sign    = dollars >= 0 ? '' : '-';
  return `${sign}$${Math.abs(dollars).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const fmt$signed = (cents) => {
  const dollars = cents / 100;
  const sign    = dollars >= 0 ? '+' : '';
  return `${sign}${fmt$(cents)}`;
};

export const fmtPct = (ratio, decimals = 1) => {
  const pct = ratio * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(decimals)}%`;
};

export const fmtPctPlain = (ratio, decimals = 1) => `${(ratio * 100).toFixed(decimals)}%`;

export const fmtDate = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
};

export const fmtDateShort = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return `${d.getMonth()+1}/${d.getDate()}`;
};

export const fmtPrice = (cents) => `${cents}¢`;

export const daysUntil = (isoString) => {
  if (!isoString) return null;
  const diff = new Date(isoString) - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
};
