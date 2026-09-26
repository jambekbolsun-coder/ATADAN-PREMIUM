import fs from "node:fs";
import { chromium } from "file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await ctx.addInitScript(() => {
    localStorage.setItem("atadan_privacy_choice", "necessary");
    sessionStorage.setItem("atadan-quiz-seen", "1");
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("JS ERROR", e.message));
  for (const route of ["contacts", "service", "catalog", ""]) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("http://localhost:3022/" + route);
    await page.waitForTimeout(1000);
    if (route === "contacts")
      await page.locator(".contacts-grid").scrollIntoViewIfNeeded();
    if (route === "service")
      await page.locator(".service-cta").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `../polish-${route || "home"}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `../polish-${route || "home"}-mobile.png`,
      fullPage: route === "contacts",
    });
    console.log(
      "LAYOUT",
      route || "home",
      await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      })),
    );
  }
  await page
    .getByRole("button", { name: "Помощник ATADAN", exact: true })
    .click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "../polish-assistant-mobile.png" });
  const videos = fs
    .readdirSync("public/videos/models/sd")
    .map((f) => "/videos/models/sd/" + f);
  console.log(
    "VIDEOS",
    await page.evaluate(async (sources) => {
      const results = [];
      for (const src of sources) {
        results.push(
          await new Promise((resolve) => {
            const v = document.createElement("video");
            const timer = setTimeout(
              () => resolve({ src, error: "timeout" }),
              10000,
            );
            v.onloadedmetadata = () => {
              clearTimeout(timer);
              resolve({
                src,
                width: v.videoWidth,
                height: v.videoHeight,
                duration: v.duration,
              });
              v.removeAttribute("src");
              v.load();
            };
            v.onerror = () => {
              clearTimeout(timer);
              resolve({ src, error: "load" });
            };
            v.preload = "metadata";
            v.src = src;
          }),
        );
      }
      return results;
    }, videos),
  );
} finally {
  await browser.close();
}
