import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("employee permissions are persisted and enforced by server routes", async () => {
  const [auth, dashboard, records, migration] = await Promise.all([
    source("../app/lib/admin-auth.ts"),
    source("../app/api/admin/dashboard/route.ts"),
    source("../app/api/admin/records/route.ts"),
    source("../drizzle/0007_remarkable_thing.sql"),
  ]);
  assert.match(auth, /permissionSections/);
  assert.match(auth, /canUseSection/);
  assert.match(dashboard, /const safeOperations/);
  assert.match(dashboard, /canFinance \? Number\(rawOperations\.expenses_som/);
  assert.match(records, /canUseSection\(actor,section\)/);
  assert.match(migration, /permissions_json/);
});

test("tasks include priority, description, customer and assignee context", async () => {
  const [schema, route, crm] = await Promise.all([
    source("../db/schema.ts"),
    source("../app/api/admin/crm/route.ts"),
    source("../app/components/AdminCRM.tsx"),
  ]);
  assert.match(schema, /priority: text\("priority"\)/);
  assert.match(schema, /customerId: text\("customer_id"\)/);
  assert.match(route, /INSERT INTO crm_tasks\(id,deal_id,title,description,priority,customer_id,assigned_to,due_at\)/);
  assert.match(crm, /Срочно/);
  assert.match(crm, /Клиент/);
});

test("leasing applications support calculation variants, history and protected proposal export", async () => {
  const [manager, proposal] = await Promise.all([
    source("../app/components/AdminRecordsManager.tsx"),
    source("../app/api/admin/leasing-proposal/route.ts"),
  ]);
  assert.match(manager, /calculationVariants/);
  assert.match(manager, /История изменений/);
  assert.match(manager, /leasing-proposal\?id=/);
  assert.match(proposal, /canUseSection\(actor,"leasing-applications"\)/);
  assert.match(proposal, /Content-Disposition/);
  assert.match(proposal, /Расчёт является предварительным/);
});

test("lead submission stays inside CRM without WhatsApp automation", async () => {
  const form = await source("../app/components/LeadForm.tsx");
  assert.doesNotMatch(form, /wa\.me|window\.open/);
  assert.match(form, /\/api\/leads/);
});

test("staff login uses a PostgreSQL-safe rate-limit upsert", async () => {
  const [security, session] = await Promise.all([
    source("../app/lib/security.ts"),
    source("../app/api/admin/session/route.ts"),
  ]);
  assert.match(security, /SET hits=request_limits\.hits\+1 RETURNING hits/);
  assert.match(session, /authenticateStaff\(username, password, request\)/);
  assert.match(session, /createStaffSession\(actor, request\)/);
});
