import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("analytics is gated behind an explicit privacy choice", async () => {
  const tracker=await readFile(new URL("../app/components/AnalyticsTracker.tsx",import.meta.url),"utf8");
  assert.match(tracker,/getItem\(PRIVACY_CHOICE_KEY\) !== "analytics"/);
  assert.match(tracker,/PRIVACY_CHOICE_EVENT/);
});

test("lead consent is required and persisted with source metadata", async () => {
  const [route,migration,adminSchema]=await Promise.all([
    readFile(new URL("../app/api/leads/route.ts",import.meta.url),"utf8"),
    readFile(new URL("../drizzle/0003_violet_joshua_kane.sql",import.meta.url),"utf8"),
    readFile(new URL("../db/admin-v2-schema.ts",import.meta.url),"utf8"),
  ]);
  assert.match(route,/body\.consent !== true/);
  assert.match(route,/consent_version,consent_at,source_path/);
  assert.match(route,/utm_source,utm_medium,utm_campaign,utm_content,utm_term/);
  assert.match(route,/db\.transaction/);
  assert.match(migration,/consent_version/);
  assert.match(adminSchema,/ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content/);
  assert.match(adminSchema,/ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term/);
});

test("home highlights four strongest models and admin has three workspaces", async () => {
  const [home,portal]=await Promise.all([
    readFile(new URL("../app/components/HomeContent.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/components/AdminPortalHome.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(home,/sort\(\(a,b\)=>b\.hp-a\.hp\)\.slice\(0, 4\)/);
  assert.match(home,/popular=1/);
  assert.match(portal,/id:"marketing"/);
  assert.match(portal,/id:"company"/);
  assert.match(portal,/id:"control"/);
});
