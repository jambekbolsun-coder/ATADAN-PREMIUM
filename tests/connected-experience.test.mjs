import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const project = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, project), "utf8");

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
  assert.match(i18n, /language-options-label/);
  assert.match(i18n, /document\.addEventListener\("pointerdown", closeOutside\)/);
  assert.match(css, /\.language-options::before/);
});

test("floating contact order is Instagram, WhatsApp, then chatbot", async () => {
  const assist = await source("app/components/SiteAssist.tsx");
  const instagram = assist.indexOf('className="assist-instagram"');
  const whatsapp = assist.indexOf('className="assist-whatsapp"');
  const bot = assist.indexOf('className="assist-bot"');
  assert.ok(instagram >= 0 && instagram < whatsapp && whatsapp < bot);
});

test("every 160-240 hp product clip is a real ten-second local MP4", async () => {
  const names = ["cfg1600", "cfg1600-h", "cfg1604-a", "cfh1604-m", "cfh1804-m", "cfj1804-g4", "cfj2004-g4", "cfj2204-g4", "cfk2304-g4", "cfk2404-g4"];
  for (const name of names) {
    const buffer = await readFile(new URL(`public/videos/${name}-10s.mp4`, project));
    const offset = buffer.indexOf(Buffer.from("mvhd"));
    assert.ok(offset > 0, `${name} has an mvhd atom`);
    const version = buffer[offset + 4];
    const timescale = version === 0 ? buffer.readUInt32BE(offset + 16) : buffer.readUInt32BE(offset + 28);
    const duration = version === 0 ? buffer.readUInt32BE(offset + 20) : Number(buffer.readBigUInt64BE(offset + 32));
    assert.ok(duration / timescale >= 9.95, `${name} duration is at least 9.95 seconds`);
  }
  const component = await source("app/components/ProductVideo.tsx");
  assert.match(component, /new IntersectionObserver/);
  assert.match(component, /void v\.play\(\)/);
  assert.match(component, /else v\.pause\(\)/);
  assert.doesNotMatch(component, /<video[^>]* controls/);
});

test("admin navigation exposes only the requested marketing and company modules", async () => {
  const dashboard = await source("app/components/AdminDashboard.tsx");
  const marketing = dashboard.match(/marketing:\[(.*?)\],\s*company:/s)?.[1] ?? "";
  const company = dashboard.match(/company:\[(.*?)\],\s*control:/s)?.[1] ?? "";
  for (const id of ["catalog", "news", "public-service", "faq", "leasing"]) assert.match(marketing, new RegExp(`id:"${id}"`));
  for (const id of ["deals", "inventory-units", "sales", "suppliers", "finance", "team"]) assert.match(company, new RegExp(`id:"${id}"`));
  for (const id of ["documents", "meetings", "customers", "tasks"]) assert.doesNotMatch(company, new RegExp(`id:"${id}"`));
});

test("deal movement creates an idempotent sale and can update linked stock", async () => {
  const [crm, ui] = await Promise.all([
    source("app/api/admin/crm/route.ts"),
    source("app/components/AdminCRM.tsx"),
  ]);
  assert.match(ui, /className="crm-kanban"/);
  assert.match(ui, /draggable onDragStart/);
  assert.match(ui, /action:"move_deal"/);
  assert.match(crm, /action==="update_deal"\|\|action==="move_deal"/);
  assert.match(crm, /WHERE NOT EXISTS\(SELECT 1 FROM admin_records WHERE kind='sales'/);
  assert.match(crm, /json_set\(data_json,'\$\.unitStatus','Продан'/);
  assert.match(crm, /json_extract\(data_json,'\$\.saleDealId'\)/);
  assert.match(crm, /json_remove\(json_set\(data_json,'\$\.unitStatus','На складе'/);
});

test("published service and FAQ records reach their public surfaces", async () => {
  const [layout, service, assist] = await Promise.all([
    source("app/layout.tsx"),
    source("app/service/page.tsx"),
    source("app/components/SiteAssist.tsx"),
  ]);
  assert.match(layout, /getPublishedRecords\("faq"\)/);
  assert.match(assist, /faqs\.length\?faqs/);
  assert.match(service, /getPublishedRecords\("service_pages"\)/);
  assert.match(service, /service-material-image/);
});
