/**
 * Calculate impermanent loss as a signed decimal.
 * Standard IL formula: IL = (2√k / (1+k)) - 1  where k = currentRatio / entryRatio
 * Returns a negative number (e.g. -0.05 = 5% IL loss)
 */
export function calcIL(entryRatio: number, currentRatio: number): number {
  if (entryRatio <= 0 || currentRatio <= 0) {
    throw new Error(
      `calcIL: ratios must be positive (entry=${entryRatio}, current=${currentRatio})`
    );
  }
  const k = currentRatio / entryRatio;
  return (2 * Math.sqrt(k)) / (1 + k) - 1;
}

/**
 * Calculate Net Effective Yield.
 * NEY = fee_revenue_period - IL_for_period
 * Both expressed as decimals (e.g. 0.005 = 0.5%)
 */
export function calcNEY(feeRevenue: number, ilDecimal: number): number {
  return feeRevenue - Math.abs(ilDecimal);
}

/**
 * Annualise a per-period rate.
 * period_minutes: how long each snapshot period is (default 30 min)
 */
export function annualise(periodRate: number, periodMinutes = 30): number {
  const periodsPerYear = (365 * 24 * 60) / periodMinutes;
  return periodRate * periodsPerYear;
}
