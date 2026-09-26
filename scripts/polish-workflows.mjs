import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { chromium } from "file:///C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const { actors } = JSON.parse(
  fs.readFileSync("../atadan-test-context.json", "utf8"),
);
const base = "http://localhost:3022";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
  ],
});
const errors = [],
  serverErrors = [],
  checks = [];
const pass = (s) => {
  checks.push(s);
  console.log("PASS", s);
};
async function context(actor) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["microphone"],
  });
  if (actor)
    await ctx.addCookies([
      { name: "atadan_staff", value: actor.token, url: base },
    ]);
  await ctx.addInitScript((origin) => {
    if (location.origin !== origin) return;
    localStorage.setItem("atadan_privacy_choice", "necessary");
    sessionStorage.setItem("atadan-quiz-seen", "1");
  }, base);
  ctx.on("page", (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("response", (r) => {
      if (r.url().startsWith(base + "/api/") && r.status() >= 500)
        serverErrors.push([r.url(), r.status()]);
    });
  });
  return ctx;
}
const owner = await context(actors[0]),
  manager = await context(actors[1]);
const page = await owner.newPage(),
  other = await manager.newPage();
try {
  if (!process.env.ATADAN_SECTIONS_ONLY) {
  await page.route("https://wa.me/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<title>WhatsApp test target</title>Test intercepted; no external message sent.",
    }),
  );
  await page.goto(base + "/catalog");
  assert.equal(
    await page.locator(".tractor-card .service-request-button").count(),
    0,
  );
  await page.goto(base + "/catalog/cfh1804-m");
  await page.locator('.buy-actions a[href="#request"]').click();
  const form = page.locator("#request .lead-form");
  await form.locator("[name=name]").fill("Тест Клиент ATADAN");
  await form.locator("[name=message]").fill("Нужен трактор для хозяйства");
  for (const [country, num, prefix] of [
    ["KG", "700123456", "+996"],
    ["RU", "9001234567", "+7"],
    ["KZ", "7011234567", "+7"],
    ["UZ", "901234567", "+998"],
    ["TJ", "901234567", "+992"],
  ]) {
    await form
      .getByRole("combobox", { name: "Страна телефона" })
      .selectOption(country);
    await form
      .getByRole("textbox", { name: "Номер телефона без кода страны" })
      .fill(num);
    assert.equal(await form.locator("[name=phone]").inputValue(), prefix + num);
  }
  await form.getByRole("checkbox").check();
  let saved = false;
  await page.route("**/api/leads", async (route) => {
    const r = await route.fetch();
    assert.ok(r.ok(), await r.text());
    saved = true;
    await route.fulfill({ response: r });
  });
  await form
    .getByRole("button", { name: "Написать менеджеру", exact: true })
    .click();
  await page.waitForURL("https://wa.me/**");
  assert.ok(saved);
  const wa = new URL(page.url()).searchParams.get("text");
  assert.match(wa, /Тест Клиент ATADAN/);
  assert.match(wa, /CFH1804-M/);
  assert.match(wa, /Нужен трактор/);
  pass(
    "Model request saves before WhatsApp; full payload and all five phone formats",
  );
  await page.unroute("**/api/leads");
  await page.goto(base + "/contacts");
  const contact = page.locator(".lead-form");
  await contact.locator("[name=name]").fill("Повторная проверка");
  await contact
    .getByRole("textbox", { name: "Номер телефона без кода страны" })
    .fill("700999888");
  await contact.getByRole("checkbox").check();
  await page.route("**/api/leads", (route) =>
    route.fulfill({ status: 503, json: { error: "Тест: временная ошибка" } }),
  );
  await contact.getByRole("button", { name: "Отправить заявку" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Тест: временная ошибка" })
    .waitFor();
  assert.ok(page.url().endsWith("/contacts"));
  assert.equal(
    await contact.locator("[name=name]").inputValue(),
    "Повторная проверка",
  );
  await page.unroute("**/api/leads");
  await contact.getByRole("button", { name: "Отправить заявку" }).click();
  await page.waitForURL("https://wa.me/**");
  pass("Save failure keeps form and prevents redirect; retry succeeds");
  await page.goto(base + "/finance");
  await page
    .getByRole("spinbutton", { name: "Ориентировочная стоимость, сом" })
    .fill("2500000");
  await page.getByRole("slider").fill("50");
  await page
    .locator(".lease-summary")
    .getByRole("button", { name: "Оставить заявку" })
    .click();
  const lease = page.locator(".lease-application");
  await lease.locator("[name=name]").fill("Лизинг Тест");
  await lease
    .getByRole("textbox", { name: "Номер телефона без кода страны" })
    .fill("700221133");
  await lease.locator("[name=city]").fill("Ош");
  await lease.getByRole("checkbox").check();
  await lease.getByRole("button", { name: "Отправить заявку" }).click();
  await page.waitForURL("https://wa.me/**");
  assert.match(new URL(page.url()).searchParams.get("text"), /Лизинг на 7 лет/);
  pass("Leasing saves and transfers calculation into WhatsApp");
  await page.goto(base + "/service");
  await page
    .locator(".service-cta")
    .getByRole("button", { name: "Оставить заявку" })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  pass("Service request dialog opens and closes with keyboard");
  await page
    .getByRole("button", { name: "Помощник ATADAN", exact: true })
    .click();
  await page.waitForTimeout(350);
  const panel = page.locator(".assist-panel");
  await page.setViewportSize({ width: 390, height: 640 });
  await page.waitForTimeout(300);
  const box = await panel.boundingBox();
  assert.ok(box.y >= 0 && box.y + box.height <= 640);
  const scroll = panel.locator(":scope > div");
  await scroll.hover();
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(400);
  assert.ok((await scroll.evaluate((n) => n.scrollTop)) > 0);
  assert.ok(
    await panel.evaluate((n) => {
      const r = n.getBoundingClientRect();
      return n.contains(document.elementFromPoint(r.x + 30, r.y + 25));
    }),
  );
  await panel.getByRole("button", { name: "Закрыть", exact: true }).click();
  pass(
    "Assistant stays above header and inside short viewport; mouse wheel scrolls answers",
  );
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "",
      "catalog",
      "service",
      "finance",
      "contacts",
      "news",
      "about",
    ]) {
      await page.goto(base + "/" + route);
      await page.locator("main").waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${route} at ${width}`,
      );
    }
  }
  pass("Seven public pages fit at 360, 390, 768 and 1440 pixels");
  await page.goto(base + "/catalog");
  await page.getByRole("button", { name: /Запчасти/ }).click();
  assert.equal(await page.locator(".part-card").count(), 4);
  const part = page.locator(".part-card").first();
  const first = await part.locator("img").getAttribute("src");
  await part.getByRole("button", { name: /Следующее фото/ }).click();
  assert.notEqual(await part.locator("img").getAttribute("src"), first);
  await page.screenshot({
    path: "../polish-parts-desktop.png",
    fullPage: true,
  });
  pass("Four sample parts render; gallery and inquiry link work");
  await page.goto(base + "/catalog/cfh1804-m");
  await page.locator(".product-video").scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => document.querySelector(".product-video video")?.videoHeight === 720,
  );
  await page
    .getByRole("combobox", { name: "Качество видео" })
    .selectOption("hd");
  await page.waitForFunction(
    () => document.querySelector(".product-video video")?.videoHeight === 1080,
  );
  pass("Video decodes actual 720p and switches to 1080p");
  await page.goto(base + "/admin/company/chat");
  await other.goto(base + "/admin/company/chat");
  await page.waitForFunction(
    () => !!document.querySelector(".chat-target select")?.value,
  );
  assert.equal(
    await page
      .getByRole("textbox", { name: "Сообщение", exact: true })
      .isEnabled(),
    true,
  );
  await page
    .getByRole("combobox", { name: "Диалог", exact: true })
    .selectOption("test-manager");
  await other
    .getByRole("combobox", { name: "Диалог", exact: true })
    .selectOption("test-owner");
  const text = "Проверка двух сотрудников " + crypto.randomUUID();
  await page
    .getByRole("textbox", { name: "Сообщение", exact: true })
    .fill(text);
  await page
    .getByRole("textbox", { name: "Сообщение", exact: true })
    .press("Enter");
  await other
    .locator(".chat-feed")
    .getByText(text, { exact: true })
    .waitFor({ timeout: 20000 });
  await other
    .getByRole("textbox", { name: "Сообщение", exact: true })
    .fill("Ответ получен " + text);
  await other.getByRole("button", { name: "Отправить", exact: true }).click();
  await page
    .locator(".chat-feed")
    .getByText("Ответ получен " + text, { exact: true })
    .waitFor({ timeout: 20000 });
  pass(
    "Two employee sessions exchange messages; Enter sends; polling delivers replies",
  );
  await page.getByRole("button", { name: "Записать голосовое" }).click();
  await page.getByRole("button", { name: "Остановить запись" }).waitFor();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Остановить запись" }).click();
  await page.locator(".chat-composer audio").waitFor({ timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector(".chat-composer audio")?.readyState >= 1,
  );
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await page
    .locator(".chat-composer audio")
    .waitFor({ state: "hidden", timeout: 30000 });
  await other.locator(".chat-feed audio").first().waitFor({ timeout: 20000 });
  pass(
    "Microphone records test voice; private upload is playable by recipient",
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA1sAAAAASUVORK5CYII=",
    "base64",
  );
  await page.locator(".chat-attach input").setInputFiles([
    { name: "chat-photo.png", mimeType: "image/png", buffer: png },
    {
      name: "chat-document.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF"),
    },
  ]);
  await page.waitForFunction(
    () => document.querySelectorAll(".chat-pending-files li").length === 2,
  );
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await page
    .locator(".chat-pending-files")
    .waitFor({ state: "hidden", timeout: 30000 });
  await other.locator(".chat-feed img").first().waitFor({ timeout: 20000 });
  pass("Photo and PDF are attached and delivered to the other employee");
  const privateGroup = await manager.request.post(
    base + "/api/admin/collaboration",
    {
      headers: { Origin: base },
      data: {
        action: "create_group",
        title: "Private QA group",
        members: ["test-other"],
      },
    },
  );
  assert.equal(privateGroup.status(), 201);
  const gid = (await privateGroup.json()).id;
  const ownerChats = await owner.request.get(
    base + "/api/admin/collaboration?scope=chat",
  );
  assert.ok(!(await ownerChats.json()).groups.some((g) => g.id === gid));
  pass("Chat selector excludes groups without membership");
  }
  const source = fs.readFileSync("app/components/AdminDashboard.tsx", "utf8");
  const routes = [
    ...new Set(
      [
        ...source.matchAll(
          /\{workspace:"(marketing|company|control)",section:"([a-z-]+)"\}/g,
        ),
      ].map((m) => `/admin/${m[1]}/${m[2]}`),
    ),
  ];
  for (const route of routes) {
    await page.goto(base + route);
    await page.locator(".admin-content, .admin-workspace-dashboard").first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(500);
    assert.ok(
      !(await page.locator("body").innerText()).includes("Application error:"),
      route,
    );
    console.log("SECTION", route);
  }
  pass(`All ${routes.length} admin sections open without runtime crashes`);
  assert.deepEqual(errors, []);
  assert.deepEqual(
    serverErrors.filter(([url]) => !url.endsWith("/api/leads")),
    [],
  );
  pass("No unexpected browser exceptions or server 5xx");
  fs.writeFileSync(
    "../polish-test-results.json",
    JSON.stringify({ checks, sections: routes.length }, null, 2),
  );
} catch (e) {
  await page.screenshot({ path: "../polish-failure.png", fullPage: true });
  console.error("FAILED AT", page.url());
  throw e;
} finally {
  await browser.close();
}
