export function calcIL(entryRatio: number, currentRatio: number): number {
  if (entryRatio <= 0 || currentRatio <= 0) {
    throw new Error(
      `calcIL: ratios must be positive (entry=${entryRatio}, current=${currentRatio})`
    );
  }
  const k = Math.sqrt(currentRatio / entryRatio);
  return (2 * k) / (1 + k * k) - 1;
}