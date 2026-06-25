import { calcIL } from "./il";
import type { PoolSnapshot, HealthStatus } from "../types";

export function normalizeFeeRevenue(snapshot: PoolSnapshot): number {
  const reserveAval = Number(snapshot.reserve_a);
  const reserveBval = Number(snapshot.reserve_b);
  const feeRevenue = Number(snapshot.fee_revenue_30m);
  const totalValue = reserveAval + reserveBval;
  if (totalValue === 0) return 0;
  return feeRevenue / totalValue;
}

export function evalRaw(
  ney: number,
  yellowThreshold: number
): "GREEN" | "YELLOW" | "RED" {
  if (ney > 0) return "GREEN";
  if (ney > yellowThreshold) return "YELLOW";
  return "RED";
}

export function computeNey(snapshot: PoolSnapshot): number {
  const entryRatio = snapshot.entry_price_ratio;
  if (!entryRatio || entryRatio <= 0) {
    throw new Error("computeNey: snapshot must have a positive entry_price_ratio");
  }
  const ilRate = calcIL(entryRatio, snapshot.current_price_ratio);
  const feeRevenueFraction = normalizeFeeRevenue(snapshot);
  return feeRevenueFraction - Math.abs(ilRate);
}

export async function evalPoolHealth(
  snapshot: PoolSnapshot,
  recentHistory: PoolSnapshot[],
  cfg: { yellowThreshold: number; redStreakToAlert: number }
): Promise<{ status: HealthStatus; ney: number }> {
  const ney = computeNey(snapshot);
  const raw = evalRaw(ney, cfg.yellowThreshold);
  if (raw !== "RED") return { status: raw, ney };

  const lastN = [...recentHistory.slice(-(cfg.redStreakToAlert - 1)), snapshot];
  const allRed =
    lastN.length === cfg.redStreakToAlert &&
    lastN.every((s) => evalRaw(computeNey(s), cfg.yellowThreshold) === "RED");

  if (allRed) return { status: "RED_CRITICAL", ney };
  return { status: "RED", ney };
}