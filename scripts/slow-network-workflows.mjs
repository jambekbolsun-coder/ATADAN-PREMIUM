import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const { actors } = JSON.parse(
    fs.readFileSync("../atadan-test-context.json", "utf8"),
  ),
  base = "http://localhost:3022";
const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({
      storageState: "../atadan-test-state.json",
      viewport: { width: 1440, height: 1000 },
    }),
    page = await ctx.newPage();
  await page.route("**/api/admin/dashboard", (route) =>
    route.fulfill({ status: 503, json: { error: "Тест соединения" } }),
  );
  await page.goto(base + "/admin/company/chat");
  await page.getByRole("button", { name: "Повторить", exact: true }).waitFor();
  await page.unroute("**/api/admin/dashboard");
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await page.getByRole("combobox", { name: "Диалог", exact: true }).waitFor();
  console.log(
    "PASS Dashboard failure exposes retry and recovers without re-login",
  );
  const r = await ctx.request.get(
    base + "/api/admin/collaboration?scope=chat&target=test-manager",
  );
  assert.equal(r.status(), 200);
  const data = await r.json();
  let pending = 0,
    maximum = 0,
    calls = 0;
  await page.route("**/api/admin/collaboration?**", async (route) => {
    pending++;
    calls++;
    maximum = Math.max(maximum, pending);
    await new Promise((resolve) => setTimeout(resolve, 6500));
    try {
      await route.fulfill({ json: data });
    } finally {
      pending--;
    }
  });
  await page
    .getByRole("combobox", { name: "Диалог", exact: true })
    .selectOption(actors[2].id);
  await page.waitForTimeout(18000);
  assert.ok(calls >= 2);
  assert.equal(maximum, 1);
  await page.unrouteAll({ behavior: "wait" });
  console.log(
    "PASS Slow 6.5-second responses never overlap with the next chat poll",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base + "/");
  await page.evaluate(() => {
    localStorage.setItem("atadan_privacy_choice", "necessary");
    sessionStorage.setItem("atadan-quiz-seen", "1");
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await page
    .getByRole("button", { name: "Помощник ATADAN", exact: true })
    .click();
  await page.waitForTimeout(250);
  const panel = page.locator(".assist-panel");
  const box = await panel.boundingBox();
  assert.ok(box.y >= 0 && box.y + box.height <= 390);
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "hidden" });
  assert.equal(
    await page
      .getByRole("button", { name: "Помощник ATADAN", exact: true })
      .evaluate((n) => n === document.activeElement),
    true,
  );
  console.log(
    "PASS Reduced motion, landscape viewport and Escape/focus restoration",
  );
} finally {
  await browser.close();
}
