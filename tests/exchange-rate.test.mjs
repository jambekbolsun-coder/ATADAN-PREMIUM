import assert from "node:assert/strict";
import test from "node:test";
import { approximateSomPrice, getUsdKgsRate } from "../app/lib/exchange-rate.ts";

test("the official USD quote converts a public price to a SOM estimate", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    '<CurrencyRates Date="23.09.2026"><Currency ISOCode="USD"><Nominal>1</Nominal><Value>87,4500</Value></Currency></CurrencyRates>',
    { status: 200 },
  );
  try {
    const rate = await getUsdKgsRate();
    assert.deepEqual(rate, { value: 87.45, date: "23.09.2026" });
    assert.equal(approximateSomPrice(10_000, rate), 874_500);
  } finally {
    globalThis.fetch = original;
  }
});

test("a missing quote leaves the calculator to request a manual SOM estimate", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  try {
    assert.equal(await getUsdKgsRate(), null);
    assert.equal(approximateSomPrice(10_000, null), null);
  } finally {
    globalThis.fetch = original;
  }
});
