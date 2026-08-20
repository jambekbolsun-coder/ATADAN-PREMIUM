import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("catalog contains the full official Changfa tractor range", async () => {
  const tractors = JSON.parse(await readFile(new URL("../app/data/tractors.json", import.meta.url), "utf8"));
  assert.equal(tractors.length, 41);
  assert.equal(Math.min(...tractors.map((tractor) => tractor.hp)), 50);
  assert.equal(Math.max(...tractors.map((tractor) => tractor.hp)), 240);
  assert.ok(tractors.every((tractor) => tractor.model && tractor.image && tractor.sourceUrl));
});

test("production metadata and contact channel are configured", async () => {
  const [layout, home, leads] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/leads/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /ATADAN Changfa/);
  assert.doesNotMatch(layout, /codex-preview|Starter Project/);
  assert.match(home, /6 лет/);
  assert.match(home, /getCatalog/);
  assert.match(leads, /INSERT INTO leads/);
});
