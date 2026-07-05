import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcIL, calcNEY, annualise } from '../src/il.ts';

describe('calcIL', () => {
  it('returns 0 when entry equals current', () => {
    assert.equal(calcIL(1.0, 1.0), 0);
  });

  it('returns negative when current > entry (price increased)', () => {
    const il = calcIL(1.0, 2.0);
    assert.ok(il < 0, `Expected negative IL, got ${il}`);
    assert.ok(Math.abs(il - (-0.0572)) < 0.001, `Expected ~-5.7%, got ${il}`);
  });

  it('returns negative when current < entry (price decreased)', () => {
    const il = calcIL(2.0, 1.0);
    assert.ok(il < 0, `Expected negative IL, got ${il}`);
  });

  it('is symmetric: calcIL(a,b) === calcIL(b,a)', () => {
    const il1 = calcIL(1.0, 2.0);
    const il2 = calcIL(2.0, 1.0);
    assert.equal(il1, il2);
  });

  it('throws on zero entry ratio', () => {
    assert.throws(() => calcIL(0, 1.0), /ratios must be positive/);
  });

  it('throws on negative current ratio', () => {
    assert.throws(() => calcIL(1.0, -1.0), /ratios must be positive/);
  });
});

describe('calcNEY', () => {
  it('returns fee minus absolute IL', () => {
    const result = calcNEY(0.05, -0.02);
    assert.ok(Math.abs(result - 0.03) < 0.0001, `Expected ~0.03, got ${result}`);
  });

  it('returns positive NEY when fee > IL', () => {
    assert.ok(calcNEY(0.10, -0.05) > 0);
  });

  it('returns negative NEY when fee < IL', () => {
    assert.ok(calcNEY(0.02, -0.05) < 0);
  });
});

describe('annualise', () => {
  it('annualises 30-minute period rate correctly', () => {
    const periodRate = 0.001; // 0.1% per 30 min
    const result = annualise(periodRate, 30);
    const expected = 0.001 * (365 * 24 * 60) / 30;
    assert.equal(result, expected);
  });

  it('uses 30 minutes as default period', () => {
    const result = annualise(0.001);
    const expected = 0.001 * (365 * 24 * 60) / 30;
    assert.equal(result, expected);
  });
});
