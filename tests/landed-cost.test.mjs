import assert from "node:assert/strict";
import test from "node:test";
import { computeOrder, paymentPlan, unitResults } from "../app/admin/_lib/landed-cost.ts";

const rate = 87.5;
const usd = (n) => n * 100;

test("plan only: cost per tractor like the owner's Excel", () => {
  const { lines } = computeOrder({
    rate,
    lines: [{ id: "L1", qty: 2, price: usd(70000) }],
    plan: [
      { lineId: "L1", category: "duty", perUnit: usd(3500) },
      { lineId: "L1", category: "freight", perUnit: usd(4200) },
      { lineId: "L1", category: "vat", perUnit: usd(9271) },
    ],
    facts: [], units: [], shipments: [],
  });
  assert.equal(lines[0].totalPo, usd(86971));
  assert.equal(Math.round(lines[0].totalKgs), Math.round(usd(86971) * rate));
  assert.equal(lines[0].hasPlan, true);
  assert.equal(lines[0].items.duty.source, "plan");
});

test("fact replaces plan per category; order-wide fact spreads over ordered qty, not shipped units", () => {
  const { lines, slots } = computeOrder({
    rate,
    lines: [{ id: "L1", qty: 2, price: usd(70000) }, { id: "L2", qty: 1, price: usd(35000) }],
    plan: [{ lineId: "L1", category: "freight", perUnit: usd(4000) }, { lineId: "L1", category: "duty", perUnit: usd(3000) }],
    facts: [{ category: "freight", kgs: usd(10500) * rate, po: usd(10500), lineId: null, shipmentId: null }],
    units: [{ id: "U1", lineId: "L1", shipmentId: "S1", legacyKgs: 0, manual: null }],
    shipments: [{ id: "S1", method: "value" }],
  });
  // 10 500 $ на заказ: L1 стоит 2 × 70 000, L2 35 000 → 4 200 $ на трактор L1, 2 100 $ на L2
  assert.equal(Math.round(lines[0].items.freight.po), usd(4200));
  assert.equal(lines[0].items.freight.source, "fact");
  assert.equal(lines[0].items.duty.source, "plan");
  assert.equal(Math.round(lines[1].items.freight.po), usd(2100));
  const [u1] = unitResults(slots);
  assert.equal(u1.unitId, "U1");
  assert.equal(u1.purchase, Math.round(usd(70000) * rate));
  assert.equal(u1.fact, Math.round(usd(4200) * rate));
  assert.equal(u1.plan, Math.round(usd(3000) * rate));
});

test("shipment cost goes only to units of that shipment, manual split keeps exact amounts", () => {
  const base = {
    rate,
    lines: [{ id: "L1", qty: 3, price: usd(50000) }],
    plan: [{ lineId: "L1", category: "storage", perUnit: usd(300) }],
    facts: [{ category: "storage", kgs: 90000_00, po: Math.round(90000_00 / rate), lineId: null, shipmentId: "S1" }],
    units: [
      { id: "U1", lineId: "L1", shipmentId: "S1", legacyKgs: 0, manual: 60000_00 },
      { id: "U2", lineId: "L1", shipmentId: "S1", legacyKgs: 0, manual: 30000_00 },
    ],
  };
  const equal = unitResults(computeOrder({ ...base, shipments: [{ id: "S1", method: "equal" }] }).slots);
  assert.deepEqual(equal.map((u) => u.fact), [45000_00, 45000_00]);
  assert.deepEqual(equal.map((u) => u.plan), [0, 0]);
  const manual = unitResults(computeOrder({ ...base, shipments: [{ id: "S1", method: "manual" }] }).slots);
  assert.deepEqual(manual.map((u) => u.fact), [60000_00, 30000_00]);
  // третье, ещё не отгруженное место считается по плану
  const { lines } = computeOrder({ ...base, shipments: [{ id: "S1", method: "equal" }] });
  assert.equal(lines[0].items.storage.source, "mixed");
  assert.equal(lines[0].hasPlan, true);
  assert.equal(Math.round(lines[0].items.storage.kgs), Math.round((90000_00 + 300_00 * rate) / 3));
});

test("legacy units without an order line keep their purchase price", () => {
  const [u] = unitResults(computeOrder({ rate, lines: [], plan: [], facts: [], units: [{ id: "U9", lineId: null, shipmentId: "S9", legacyKgs: 5_000_000_00, manual: null }], shipments: [] }).slots);
  assert.equal(u.legacy, true);
  assert.equal(u.purchase, 5_000_000_00);
  assert.equal(u.fact + u.plan, 0);
});

test("payment schedule 20/80", () => {
  const rows = paymentPlan([{ label: "Оплата 1", percent: 20 }, { label: "Оплата 2", percent: 80 }], usd(100000), usd(30000));
  assert.deepEqual(rows.map((r) => [r.amount, r.covered, r.done]), [[usd(20000), usd(20000), true], [usd(80000), usd(10000), false]]);
});
