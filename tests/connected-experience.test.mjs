import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const project = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, project), "utf8");
const mp4Duration = (buffer) => {
  const offset = buffer.indexOf(Buffer.from("mvhd"));
  assert.ok(offset > 0, "MP4 has an mvhd atom");
  const version = buffer[offset + 4];
  const timescale = version === 0 ? buffer.readUInt32BE(offset + 16) : buffer.readUInt32BE(offset + 28);
  const duration = version === 0 ? buffer.readUInt32BE(offset + 20) : Number(buffer.readBigUInt64BE(offset + 32));
  return duration / timescale;
};

test("desktop header keeps search, stable navigation and the reference-style language popover", async () => {
  const [header, i18n, css] = await Promise.all([
    source("app/components/SiteHeader.tsx"),
    source("app/components/I18n.tsx"),
    source("app/globals.css"),
  ]);
  assert.match(header, /<HeaderSearch \/>/);
  assert.match(header, /\["nav\.about", "\/about"\]/);
  assert.match(css, /header-actions>\.header-search\{display:flex!important/);
  assert.match(css, /\.desktop-nav a\{[^}]*white-space:nowrap/);
  assert.match(css, /2026-09-16[\s\S]*?@media\(min-width:1480px\)[\s\S]*?\.desktop-nav a\{[^}]*font-size:16\.5px/);
  assert.match(css, /2026-09-16[\s\S]*?@media\(min-width:1061px\) and \(max-width:1479px\)[\s\S]*?\.desktop-nav a\{[^}]*font-size:14\.5px/);
  assert.match(i18n, /language-options-label/);
  assert.match(i18n, /document\.addEventListener\("pointerdown", closeOutside\)/);
  assert.match(css, /\.language-options::before/);
});

test("floating contact order is Instagram, WhatsApp, then chatbot", async () => {
  const [assist, css] = await Promise.all([source("app/components/SiteAssist.tsx"), source("app/globals.css")]);
  const instagram = assist.indexOf('className="assist-instagram"');
  const whatsapp = assist.indexOf('className="assist-whatsapp"');
  const bot = assist.indexOf('className="assist-bot"');
  assert.ok(instagram >= 0 && instagram < whatsapp && whatsapp < bot);
  assert.match(assist, /assist-bot-symbol/);
  assert.match(css, /\.assist-instagram,\.assist-whatsapp,\.assist-bot\{[^}]*border:0!important/s);
});

test("catalog, news and home support use distinct ten-second viewport videos", async () => {
  const [catalog, news, home, viewport, contacts] = await Promise.all([
    source("app/catalog/page.tsx"),
    source("app/components/NewsHub.tsx"),
    source("app/components/HomeContent.tsx"),
    source("app/components/ViewportVideo.tsx"),
    source("app/contacts/page.tsx"),
  ]);
  const clips = ["catalog-field-10s-v2", "news-field-10s-v2", "home-cab-10s-v2", "selection-montage-10s"];
  for (const clip of clips) {
    const buffer = await readFile(new URL(`public/videos/editorial/${clip}.mp4`, project));
    assert.ok(mp4Duration(buffer) >= 9.95, `${clip} is a complete ten-second MP4`);
  }
  assert.match(catalog, /catalog-field-10s-v2\.mp4/);
  assert.match(news, /news-field-10s-v2\.mp4/);
  assert.match(news, /selection-montage-10s\.mp4/);
  assert.doesNotMatch(news, /news-hero-content|news-hero-shade/);
  assert.match(home, /home-cab-10s-v2\.mp4/);
  assert.match(viewport, /new IntersectionObserver/);
  assert.match(viewport, /prefers-reduced-motion/);
  assert.doesNotMatch(viewport, /controls\s*=/);
  assert.match(contacts, /contacts-cfk2404-g4-v3\.png/);
});

test("classic site wordmark, installable PWA assets and reference-style loaders are wired", async () => {
  const [header, footer, dashboard, chrome, loader, transition, css, layout, manifest, worker, icon192, icon512] = await Promise.all([
    source("app/components/SiteHeader.tsx"),
    source("app/components/SiteFooter.tsx"),
    source("app/components/AdminDashboard.tsx"),
    source("app/components/AppChrome.tsx"),
    source("app/components/AtadanLoader.tsx"),
    source("app/components/PageTransitionLoader.tsx"),
    source("app/globals.css"),
    source("app/layout.tsx"),
    source("public/manifest.webmanifest"),
    source("public/sw.js"),
    readFile(new URL("public/icons/atadan-app-192.png", project)),
    readFile(new URL("public/icons/atadan-app-512.png", project)),
  ]);
  assert.match(header, /atadan-logo-cropped\.png/);
  assert.match(footer, /atadan-logo-cropped\.png/);
  assert.match(dashboard, /atadan-logo-cropped\.png/);
  assert.doesNotMatch(header, /atadan-premium-logo\.png/);
  assert.match(dashboard, /<AtadanLoader/);
  assert.match(chrome, /<PageTransitionLoader key=\{pathname\}\/>/);
  assert.match(loader, /role="status"/);
  assert.match(loader, /atadan-loader-wheel/);
  assert.match(transition, /setVisible\(true\)/);
  assert.doesNotMatch(transition, /location\.assign|preventDefault/);
  assert.match(css, /#071c10/i);
  assert.match(css, /#79c94b/i);
  assert.match(layout, /atadan-app-192\.png/);
  assert.match(manifest, /"sizes":"192x192"/);
  assert.match(manifest, /"sizes":"512x512"/);
  assert.match(manifest, /"display": "standalone"/);
  assert.match(worker, /atadan-shell-v2/);
  assert.equal(icon192.readUInt32BE(16), 192);
  assert.equal(icon192.readUInt32BE(20), 192);
  assert.equal(icon512.readUInt32BE(16), 512);
  assert.equal(icon512.readUInt32BE(20), 512);
});

test("visible app copy no longer contains em dash placeholders", async () => {
  const entries = await readdir(new URL("app/", project), { recursive: true });
  const files = entries.filter((entry) => /\.(?:ts|tsx|json)$/.test(entry));
  const contents = await Promise.all(files.map((entry) => source(`app/${entry.replaceAll("\\", "/")}`)));
  assert.doesNotMatch(contents.join("\n"), /—/);
});

test("every 160-240 hp product clip is a real ten-second local MP4", async () => {
  const names = ["cfg1600", "cfg1600-h", "cfg1604-a", "cfh1604-m", "cfh1804-m", "cfj1804-g4", "cfj2004-g4", "cfj2204-g4", "cfk2304-g4", "cfk2404-g4"];
  for (const name of names) {
    const [hd, sd] = await Promise.all([
      readFile(new URL(`public/videos/models/hd/${name}-10s.mp4`, project)),
      readFile(new URL(`public/videos/models/720/${name}-10s.mp4`, project)),
    ]);
    assert.ok(mp4Duration(hd) >= 9.95 && mp4Duration(hd) <= 10.05, `${name} HD duration is exactly ten seconds`);
    assert.ok(mp4Duration(sd) >= 9.95 && mp4Duration(sd) <= 10.05, `${name} 720p duration is exactly ten seconds`);
    assert.ok(sd.byteLength > 10000, `${name} 720p is a real encoded video`);
  }
  const component = await source("app/components/ProductVideo.tsx");
  assert.match(component, /new IntersectionObserver/);
  assert.match(component, /void video\.play\(\)/);
  assert.match(component, /else video\.pause\(\)/);
  assert.doesNotMatch(component, /connection\.saveData|connection\.effectiveType/);
  assert.match(component, /videos\/models\/\$\{quality\}/);
  assert.match(component, /HD · 720p/);
  assert.match(component, /FULL HD · 1080p/);
  assert.match(component, /Качество видео/);
  assert.doesNotMatch(component, /<video[^>]* controls/);
  assert.doesNotMatch(component, /10 секунд официальной динамики модели/);
  assert.match(component, /В интерактивном видео крупным планом показаны кабина/);
});

test("admin navigation exposes connected marketing and company modules", async () => {
  const dashboard = await source("app/components/AdminDashboard.tsx");
  const marketing = dashboard.match(/marketing:\[(.*?)\],\s*company:/s)?.[1] ?? "";
  const company = dashboard.match(/company:\[(.*?)\],\s*control:/s)?.[1] ?? "";
  for (const id of ["catalog", "news", "public-service", "faq", "leasing"]) assert.match(marketing, new RegExp(`id:"${id}"`));
  assert.doesNotMatch(company, /id:"financial-accounts"/);
  for (const id of ["deals", "client-base", "inventory-units", "sales", "suppliers", "purchases", "shipments", "documents", "meetings", "service-cases", "finance", "team"]) assert.match(company, new RegExp(`id:"${id}"`));
});

test("deal movement creates one normalized sale and locks the linked VIN", async () => {
  const [crm, ui] = await Promise.all([
    source("app/api/admin/crm/route.ts"),
    source("app/components/AdminCRM.tsx"),
  ]);
  assert.match(ui, /className="crm-kanban"/);
  assert.match(ui, /draggable onDragStart/);
  assert.match(ui, /action:"move_deal"/);
  assert.match(crm, /action==="update_deal"\|\|action==="move_deal"/);
  assert.match(crm, /WHERE NOT EXISTS\(SELECT 1 FROM admin_records WHERE kind='sales'/);
  assert.match(crm, /INSERT INTO sales_v2/);
  assert.match(crm, /ON CONFLICT\(deal_id\)/);
  assert.match(crm, /status='sold'/);
  assert.match(crm, /полной фактической оплаты/);
  assert.match(crm, /подписанный договор/);
});

test("published service and FAQ records reach their public surfaces", async () => {
  const [layout, service, assist] = await Promise.all([
    source("app/layout.tsx"),
    source("app/service/page.tsx"),
    source("app/components/SiteAssist.tsx"),
  ]);
  assert.match(layout, /getPublishedRecords\("faq"\)/);
  assert.match(assist, /faqs\.length\s*\?\s*faqs/);
  assert.match(service, /getPublishedRecords\("service_pages"\)/);
  assert.match(service, /service-material-image/);
});
