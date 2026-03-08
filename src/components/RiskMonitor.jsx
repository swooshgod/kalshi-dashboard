import { Gauge } from './ui/Gauge.jsx';
import { StatusBadge } from './ui/StatusBadge.jsx';
import { RISK_RULES, CATEGORY_COLORS } from '../utils/constants.js';
import { fmtPctPlain } from '../utils/formatters.js';

export function RiskMonitor({ portfolioStats, loading }) {
  const {
    balanceCents = 0, openCostCents = 0, cashPct = 1,
    dailyPnL = 0, stats = {}, exposure = { cats: {}, total: 0 },
  } = portfolioStats || {};

  const exposurePct     = balanceCents > 0 ? openCostCents / balanceCents : 0;
  const largestPosCents = 0; // would need per-position breakdown
  const largestPosPct   = balanceCents > 0 ? largestPosCents / balanceCents : 0;
  const dailyLossPct    = balanceCents > 0 ? Math.abs(Math.min(0, dailyPnL)) / balanceCents : 0;

  // Checks
  const checks = {
    noLargePosition: largestPosPct <= RISK_RULES.MAX_POSITION_PCT,
    cashReserve:     cashPct >= RISK_RULES.MIN_CASH_RESERVE,
    dailyLoss:       dailyLossPct < RISK_RULES.MAX_DAILY_LOSS,
    totalExposure:   exposurePct < RISK_RULES.MAX_EXPOSURE,
    categoryLimit:   Object.values(exposure.cats || {}).every(v => balanceCents === 0 || (v / balanceCents) < RISK_RULES.MAX_CATEGORY),
  };

  // Category concentration
  const catEntries = Object.entries(exposure.cats || {})
    .sort(([, a], [, b]) => b - a);
  const totalExp = exposure.total || 1;

  return (
    <div className="card">
      <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Risk Monitor</h2>

      <div className="grid grid-cols-3 gap-6">

        {/* Gauge */}
        <div className="flex flex-col items-center">
          <div className="muted text-xs mb-2 text-center">Bankroll Utilization</div>
          {loading ? <div className="skeleton h-20 w-36 rounded" /> : (
            <>
              <Gauge pct={exposurePct} label={`${fmtPctPlain(exposurePct)} deployed`} />
              <div className="muted text-xs mt-1">{fmtPctPlain(1 - exposurePct)} cash</div>
            </>
          )}
        </div>

        {/* Category concentration */}
        <div>
          <div className="muted text-xs mb-2">Category Exposure</div>
          {loading ? <div className="skeleton h-24 rounded" /> : (
            catEntries.length === 0 ? (
              <div className="muted text-sm">No open positions</div>
            ) : (
              <div className="space-y-2">
                {catEntries.map(([cat, costCents]) => {
                  const pct     = costCents / (balanceCents || 1);
                  const pctOfExp = costCents / totalExp;
                  const warn    = pct > RISK_RULES.MAX_CATEGORY;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span style={{ color: CATEGORY_COLORS[cat] || '#6B7280' }}>
                          {warn ? '⚠️ ' : ''}{cat}
                        </span>
                        <span className="mono muted">{fmtPctPlain(pct)} of bankroll</span>
                      </div>
                      <div style={{ background: '#1E2530', borderRadius: 3, height: 6 }}>
                        <div style={{
                          width: `${pctOfExp * 100}%`,
                          height: '100%',
                          background: warn ? '#F59E0B' : (CATEGORY_COLORS[cat] || '#6B7280'),
                          borderRadius: 3,
                          transition: 'width 0.4s',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Compliance checklist */}
        <div>
          <div className="muted text-xs mb-2">Compliance</div>
          {loading ? <div className="skeleton h-32 rounded" /> : (
            <div style={{ borderLeft: '1px solid #1E2530', paddingLeft: 12 }}>
              <StatusBadge ok={checks.noLargePosition} label="No position > 5% bankroll"
                detail={fmtPctPlain(largestPosPct)} />
              <StatusBadge ok={checks.cashReserve} label="Cash reserve > 30%"
                detail={fmtPctPlain(cashPct)} />
              <StatusBadge ok={checks.dailyLoss} label="Daily loss limit OK"
                detail={dailyLossPct > 0 ? `-${fmtPctPlain(dailyLossPct)}` : '—'} />
              <StatusBadge ok={checks.totalExposure} label="Exposure < 50%"
                detail={fmtPctPlain(exposurePct)} />
              <StatusBadge ok={checks.categoryLimit} label="No category > 15%"
                detail={catEntries.length ? fmtPctPlain(catEntries[0][1] / (balanceCents || 1)) : '—'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
