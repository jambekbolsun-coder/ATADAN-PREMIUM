import assert from "node:assert/strict";
import test from "node:test";
import { computeOrder, unitResults } from "../app/admin/_lib/landed-cost.ts";

const rate = 87.5;
const usd = (n) => n * 100;

test("order-wide expense spreads over ordered qty by factory price, not only shipped units", () => {
  const [u1] = unitResults(computeOrder({
    rate,
    lines: [{ id: "L1", qty: 2, price: usd(70000) }, { id: "L2", qty: 1, price: usd(35000) }],
    facts: [{ kgs: usd(10500) * rate, lineId: null, shipmentId: null }],
    units: [{ id: "U1", lineId: "L1", shipmentId: "S1", legacyKgs: 0, manual: null }],
    shipments: [{ id: "S1", method: "value" }],
  }));
  // 10 500 $ на заказ: L1 стоит 2 × 70 000, L2 35 000 → 4 200 $ на трактор L1
  assert.equal(u1.purchase, Math.round(usd(70000) * rate));
  assert.equal(u1.fact, Math.round(usd(4200) * rate));
});

test("model expense goes only to that model", () => {
  const res = unitResults(computeOrder({
    rate,
    lines: [{ id: "L1", qty: 2, price: usd(50000) }, { id: "L2", qty: 1, price: usd(30000) }],
    facts: [{ kgs: 200000_00, lineId: "L2", shipmentId: null }],
    units: [{ id: "U1", lineId: "L1", shipmentId: "S1", legacyKgs: 0, manual: null }, { id: "U3", lineId: "L2", shipmentId: "S1", legacyKgs: 0, manual: null }],
    shipments: [{ id: "S1", method: "value" }],
  }));
  assert.deepEqual(res.map((u) => u.fact), [0, 200000_00]);
});

test("shipment cost goes only to units of that shipment, manual split keeps exact amounts", () => {
  const base = {
    rate,
    lines: [{ id: "L1", qty: 3, price: usd(50000) }],
    facts: [{ kgs: 90000_00, lineId: null, shipmentId: "S1" }],
    units: [
      { id: "U1", lineId: "L1", shipmentId: "S1", legacyKgs: 0, manual: 60000_00 },
      { id: "U2", lineId: "L1", shipmentId: "S1", legacyKgs: 0, manual: 30000_00 },
    ],
  };
  assert.deepEqual(unitResults(computeOrder({ ...base, shipments: [{ id: "S1", method: "equal" }] })).map((u) => u.fact), [45000_00, 45000_00]);
  assert.deepEqual(unitResults(computeOrder({ ...base, shipments: [{ id: "S1", method: "manual" }] })).map((u) => u.fact), [60000_00, 30000_00]);
});

test("legacy units without an order line keep their purchase price", () => {
  const [u] = unitResults(computeOrder({ rate, lines: [], facts: [], units: [{ id: "U9", lineId: null, shipmentId: "S9", legacyKgs: 5_000_000_00, manual: null }], shipments: [] }));
  assert.equal(u.legacy, true);
  assert.equal(u.purchase, 5_000_000_00);
  assert.equal(u.fact, 0);
});
