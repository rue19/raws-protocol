import { describe, it, expect } from "vitest";
import { evalRaw, computeNey, evalPoolHealth } from "../src/lib/health";
import type { PoolSnapshot } from "../src/types";

function makeSnapshot(overrides: Partial<PoolSnapshot> = {}): PoolSnapshot {
  return {
    pool_id: "pool-1",
    reserve_a: BigInt(1000000000),
    reserve_b: BigInt(1000000000),
    fee_revenue_30m: BigInt(0),
    current_price_ratio: 1.0,
    entry_price_ratio: 1.0,
    cycle_timestamp: new Date(),
    ...overrides,
  };
}

describe("evalRaw", () => {
  it("returns GREEN when ney is positive", () => {
    expect(evalRaw(0.05, -0.10)).toBe("GREEN");
  });

  it("returns YELLOW when ney is negative but above threshold", () => {
    expect(evalRaw(-0.03, -0.10)).toBe("YELLOW");
  });

  it("returns RED when ney is at or below threshold", () => {
    expect(evalRaw(-0.10, -0.10)).toBe("RED");
    expect(evalRaw(-0.15, -0.10)).toBe("RED");
  });
});

describe("computeNey", () => {
  it("computes positive NEY when fee revenue outweighs IL", () => {
    const snap = makeSnapshot({
      reserve_a: BigInt(1000000000),
      reserve_b: BigInt(1000000000),
      fee_revenue_30m: BigInt(50000000),
      current_price_ratio: 1.1,
      entry_price_ratio: 1.0,
    });
    const ney = computeNey(snap);
    expect(ney).toBeGreaterThan(0);
  });

  it("computes negative NEY when IL outweighs fee revenue", () => {
    const snap = makeSnapshot({
      reserve_a: BigInt(1000000000),
      reserve_b: BigInt(1000000000),
      fee_revenue_30m: BigInt(1000000),
      current_price_ratio: 2.0,
      entry_price_ratio: 1.0,
    });
    const ney = computeNey(snap);
    expect(ney).toBeLessThan(0);
  });

  it("throws when entry_price_ratio is missing", () => {
    const snap = makeSnapshot({ entry_price_ratio: undefined });
    expect(() => computeNey(snap)).toThrow("positive entry_price_ratio");
  });

  it("throws when entry_price_ratio is zero", () => {
    const snap = makeSnapshot({ entry_price_ratio: 0 });
    expect(() => computeNey(snap)).toThrow("positive entry_price_ratio");
  });
});

describe("evalPoolHealth", () => {
  const cfg = { yellowThreshold: -0.10, redStreakToAlert: 3 };

  it("returns GREEN when NEY is positive", async () => {
    const snap = makeSnapshot({
      fee_revenue_30m: BigInt(100000000),
      current_price_ratio: 1.0,
    });
    const { status, ney } = await evalPoolHealth(snap, [], cfg);
    expect(status).toBe("GREEN");
    expect(ney).toBeGreaterThan(0);
  });

  it("returns YELLOW for slightly negative NEY within threshold", async () => {
    const snap = makeSnapshot({
      fee_revenue_30m: BigInt(1000000),
      current_price_ratio: 1.15,
      entry_price_ratio: 1.0,
    });
    const { status } = await evalPoolHealth(snap, [], cfg);
    expect(status).toBe("YELLOW");
  });

  it("returns RED for a single bad period (not 3 consecutive)", async () => {
    const snap = makeSnapshot({
      fee_revenue_30m: BigInt(0),
      current_price_ratio: 4.0,
      entry_price_ratio: 1.0,
    });
    const { status } = await evalPoolHealth(
      snap,
      [{ ...snap, current_price_ratio: 1.0, fee_revenue_30m: BigInt(100000000) }],
      cfg
    );
    expect(status).toBe("RED");
  });

  it("returns RED_CRITICAL for 3 consecutive RED periods", async () => {
    const redSnap = makeSnapshot({
      fee_revenue_30m: BigInt(0),
      current_price_ratio: 4.0,
      entry_price_ratio: 1.0,
    });
    const history = [
      { ...redSnap, cycle_timestamp: new Date(Date.now() - 60000) },
      { ...redSnap, cycle_timestamp: new Date(Date.now() - 30000) },
    ];
    const { status } = await evalPoolHealth(redSnap, history, cfg);
    expect(status).toBe("RED_CRITICAL");
  });

  it("resets RED streak when a GREEN period interrupts", async () => {
    const redSnap = makeSnapshot({
      fee_revenue_30m: BigInt(0),
      current_price_ratio: 4.0,
      entry_price_ratio: 1.0,
    });
    const greenSnap = makeSnapshot({
      fee_revenue_30m: BigInt(100000000),
      current_price_ratio: 1.0,
      entry_price_ratio: 1.0,
    });
    const history = [
      { ...redSnap, cycle_timestamp: new Date(Date.now() - 90000) },
      { ...greenSnap, cycle_timestamp: new Date(Date.now() - 60000) },
    ];
    const { status } = await evalPoolHealth(redSnap, history, cfg);
    expect(status).toBe("RED");
  });
});