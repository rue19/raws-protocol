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
