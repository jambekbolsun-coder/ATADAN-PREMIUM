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

test("agrojournal ships with 12 multilingual published stories", async () => {
  const source = await readFile(new URL("../app/data/news.ts", import.meta.url), "utf8");
  assert.equal((source.match(/status: "published"/g) ?? []).length, 12);
  assert.equal((source.match(/slug:/g) ?? []).length, 12);
  assert.match(source, /title: text\(/);
  assert.match(source, /content: text\(/);
  assert.match(source, /journal-hero-4k\.webp/);
});

test("news publishing is connected to the admin dashboard", async () => {
  const [dashboard, editor, api] = await Promise.all([
    readFile(new URL("../app/components/AdminDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AdminNewsManager.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/dashboard/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(dashboard, /Публикации/);
  assert.match(editor, /Опубликовать/);
  assert.match(editor, /Кыргызча/);
  assert.match(api, /save_news/);
  assert.match(api, /delete_news/);
});

test("admin tools retain the shared locale context", async () => {
  const [chrome, dashboard, calculator] = await Promise.all([
    readFile(new URL("../app/components/AppChrome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AdminDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/FinanceCalculator.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(dashboard, /<FinanceCalculator/);
  assert.match(calculator, /useI18n\(\)/);
  assert.match(chrome, /pathname\.startsWith\("\/admin"\).*<I18nProvider>/s);
});
