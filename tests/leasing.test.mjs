import assert from "node:assert/strict";
import test from "node:test";
import { calculateLease, salePrice } from "../app/lib/leasing.ts";

test("zero-rate lease preserves principal exactly", () => {
  const result = calculateLease({ price: 3_000_000, downPercent: 30, months: 84, annualRate: 0, fee: 0, method: "annuity" });
  assert.equal(result.down, 90_000_000);
  assert.equal(result.financed, 210_000_000);
  assert.equal(result.interest, 0);
  assert.equal(result.schedule.at(-1).balance, 0);
  assert.equal(result.schedule.reduce((sum, row) => sum + row.principal, 0), result.financed);
});

test("annuity schedule closes balance and includes interest", () => {
  const result = calculateLease({ price: 5_750_000, downPercent: 25, months: 60, annualRate: 16, fee: 25_000, method: "annuity" });
  assert.equal(result.schedule.length, 60);
  assert.equal(result.schedule.at(-1).balance, 0);
  assert.ok(result.interest > 0);
  assert.equal(result.total, result.down + result.fee + result.financed + result.interest);
});

test("differentiated payments decrease and sale discount is bounded", () => {
  const result = calculateLease({ price: 4_000_000, downPercent: 20, months: 36, annualRate: 12, fee: 0, method: "differentiated" });
  assert.ok(result.schedule[0].payment > result.schedule.at(-1).payment);
  assert.equal(result.schedule.at(-1).balance, 0);
  assert.equal(salePrice(4_000_000, 10), 3_600_000);
  assert.equal(salePrice(4_000_000, 150), 400_000);
});

test("invalid financial values are rejected", () => {
  assert.throws(() => calculateLease({ price: 0, downPercent: 20, months: 36, annualRate: 12, fee: 0, method: "annuity" }));
  assert.throws(() => calculateLease({ price: 1_000_000, downPercent: 20, months: 85, annualRate: 12, fee: 0, method: "annuity" }));
});
