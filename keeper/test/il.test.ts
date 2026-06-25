import { describe, it, expect } from "vitest";
import { calcIL } from "../src/lib/il";

describe("calcIL", () => {
  it("returns exactly 0 when entry ratio equals current ratio", () => {
    expect(calcIL(1.0, 1.0)).toBe(0);
    expect(calcIL(2.5, 2.5)).toBe(0);
    expect(calcIL(0.5, 0.5)).toBe(0);
  });

  it("returns ~-0.0572 when price doubles (currentRatio = 2 * entryRatio)", () => {
    const result = calcIL(1.0, 2.0);
    expect(result).toBeCloseTo(-0.0572, 4);
  });

  it("returns same magnitude when price halves (symmetry under inversion)", () => {
    const doubleResult = calcIL(1.0, 2.0);
    const halfResult = calcIL(2.0, 1.0);
    expect(halfResult).toBeCloseTo(doubleResult, 4);
  });

  it("throws for zero entry ratio", () => {
    expect(() => calcIL(0, 1.0)).toThrow("ratios must be positive");
  });

  it("throws for negative entry ratio", () => {
    expect(() => calcIL(-1, 1.0)).toThrow("ratios must be positive");
  });

  it("throws for zero current ratio", () => {
    expect(() => calcIL(1.0, 0)).toThrow("ratios must be positive");
  });

  it("throws for negative current ratio", () => {
    expect(() => calcIL(1.0, -1)).toThrow("ratios must be positive");
  });
});