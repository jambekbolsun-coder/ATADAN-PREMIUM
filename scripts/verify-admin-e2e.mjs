import assert from "node:assert/strict";
import crypto from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;
loadEnvConfig(process.cwd());

const base = process.env.E2E_BASE_URL || "http://localhost:3000";
const rawConnection = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!rawConnection) throw new Error("DATABASE_URL is required");
const connection = new URL(rawConnection);
const sslMode = connection.searchParams.get("sslmode");
connection.searchParams.delete("sslmode");
const pool = new Pool({ connectionString: connection.toString(), ssl: sslMode && sslMode !== "disable" ? { rejectUnauthorized: true } : undefined, max: 2, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000, keepAlive: true });
pool.on("error", (error) => console.warn("[E2E] Neon retired an idle connection; continuing with a fresh client:", error.code || error.message));
const marker = `e2e-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const token = crypto.randomBytes(32).toString("hex");
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
const restrictedToken = crypto.randomBytes(32).toString("hex");
const restrictedTokenHash = crypto.createHash("sha256").update(restrictedToken).digest("hex");
const restrictedStaffId = crypto.randomUUID();
const testIp = `198.51.100.${Math.max(1, Math.min(254, Number(String(Date.now()).slice(-3)) % 255))}`;
const ids = { records: [], deals: [], customers: [], leads: [], backups: [] };
function step(name) { console.log(`[E2E] ${name}`); }

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Origin", base);
  if (options.auth !== false) headers.set("Cookie", `atadan_staff=${options.authToken || token}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${base}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("json") ? await response.json() : await response.text();
  return { response, body };
}

async function post(path, body, expected = 200, auth = true) {
  const result = await request(path, { method: "POST", body: JSON.stringify(body), auth });
  assert.equal(result.response.status, expected, `${path}: expected ${expected}, got ${result.response.status}: ${JSON.stringify(result.body)}`);
  return result.body;
}

async function createRecord(kind, title, data, status = "active") {
  const body = await post("/api/admin/records", { action: "create", kind, title, subtitle: marker, category: "E2E", status, sortOrder: 0, data }, 201);
  ids.records.push(body.id);
  return body.id;
}

async function crmData(mode) {
  const result = await request(`/api/admin/crm?mode=${mode}`);
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  return result.body;
}

async function dealRow(id) {
  const data = await crmData("deals");
  const row = data.deals.find((item) => item.id === id);
  assert.ok(row, `Deal ${id} missing`);
  return row;
}

async function updateDeal(id, stage, extra = {}) {
  const row = await dealRow(id);
  await post("/api/admin/crm", { action: "update_deal", id, version: row.version, stage, amount: extra.amount ?? row.amount_minor / 100, assignedTo: row.assigned_to, probability: extra.probability ?? 50, nextStepAt: extra.nextStepAt ?? new Date(Date.now() + 86_400_000).toISOString(), inventoryUnitId: extra.inventoryUnitId ?? row.inventory_unit_id ?? "", lossReasonCode: extra.lossReasonCode ?? "", lossReason: extra.lossReason ?? "" });
}

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (ids.deals.length) {
      const linked = await client.query("SELECT DISTINCT customer_id FROM crm_deals WHERE id=ANY($1)", [ids.deals]);
      for (const row of linked.rows) if (!ids.customers.includes(row.customer_id)) ids.customers.push(row.customer_id);
    }
    await client.query("DELETE FROM service_cases_v2 WHERE id = ANY($1)", [ids.records]);
    await client.query("DELETE FROM sales_v2 WHERE deal_id = ANY($1)", [ids.deals]);
    await client.query("DELETE FROM account_transactions WHERE payment_id IN (SELECT id FROM payments_v2 WHERE deal_id = ANY($1)) OR expense_record_id = ANY($2)", [ids.deals, ids.records]);
    await client.query("DELETE FROM payments_v2 WHERE deal_id = ANY($1)", [ids.deals]);
    await client.query("DELETE FROM receivables_v2 WHERE deal_id = ANY($1)", [ids.deals]);
    await client.query("DELETE FROM documents_v2 WHERE deal_id = ANY($1) OR id = ANY($2)", [ids.deals, ids.records]);
    await client.query("DELETE FROM contracts_v2 WHERE deal_id = ANY($1)", [ids.deals]);
    await client.query("DELETE FROM proposals_v2 WHERE deal_id = ANY($1)", [ids.deals]);
    await client.query("DELETE FROM meetings_v2 WHERE deal_id = ANY($1)", [ids.deals]);
    await client.query("DELETE FROM crm_notes WHERE deal_id = ANY($1)", [ids.deals]);
    await client.query("DELETE FROM crm_tasks WHERE deal_id = ANY($1) OR customer_id = ANY($2)", [ids.deals, ids.customers]);
    await client.query("DELETE FROM deal_stage_events WHERE deal_id = ANY($1)", [ids.deals]);
    await client.query("DELETE FROM notifications_v2 WHERE entity_id = ANY($1)", [ids.deals]);
    await client.query("UPDATE crm_deals SET inventory_unit_id=NULL WHERE id = ANY($1)", [ids.deals]);
    await client.query("UPDATE inventory_units_v2 SET reserved_deal_id=NULL WHERE id = ANY($1)", [ids.records]);
    await client.query("DELETE FROM inventory_lifecycle_events WHERE inventory_unit_id = ANY($1)", [ids.records]);
    await client.query("DELETE FROM inventory_units_v2 WHERE id = ANY($1)", [ids.records]);
    await client.query("DELETE FROM shipments_v2 WHERE id = ANY($1)", [ids.records]);
    await client.query("DELETE FROM purchase_orders_v2 WHERE id = ANY($1)", [ids.records]);
    await client.query("DELETE FROM suppliers_v2 WHERE id = ANY($1)", [ids.records]);
    await client.query("DELETE FROM account_transactions WHERE account_id = ANY($1)", [ids.records]);
    await client.query("DELETE FROM financial_accounts WHERE id = ANY($1) AND name LIKE $2", [ids.records, `${marker}%`]);
    await client.query("DELETE FROM backup_runs WHERE id = ANY($1)", [ids.backups]);
    await client.query("DELETE FROM audit_logs WHERE entity_id = ANY($1) OR detail LIKE $2", [[...ids.records, ...ids.deals, ...ids.customers], `%${marker}%`]);
    await client.query("DELETE FROM admin_records WHERE (data_json::jsonb->>'dealId')=ANY($1) OR subtitle LIKE $2", [ids.deals, `%${marker}%`]);
    await client.query("DELETE FROM admin_records WHERE id = ANY($1)", [ids.records]);
    await client.query("DELETE FROM lead_requests WHERE lead_id = ANY($1)", [ids.leads]);
    await client.query("DELETE FROM crm_deals WHERE id = ANY($1)", [ids.deals]);
    await client.query("DELETE FROM leads WHERE id = ANY($1)", [ids.leads]);
    await client.query("DELETE FROM crm_customers WHERE id = ANY($1)", [ids.customers]);
    await client.query("DELETE FROM staff_sessions WHERE token_hash=$1", [tokenHash]);
    await client.query("DELETE FROM staff_sessions WHERE token_hash=$1", [restrictedTokenHash]);
    await client.query("DELETE FROM staff WHERE id=$1", [restrictedStaffId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

try {
  const owner = (await pool.query("SELECT id FROM staff WHERE active=1 AND role IN ('owner','director') ORDER BY CASE role WHEN 'owner' THEN 0 ELSE 1 END LIMIT 1")).rows[0];
  assert.ok(owner, "An active owner/director is required");
  await pool.query("INSERT INTO staff_sessions(token_hash,staff_id,expires_at,id,user_agent) VALUES($1,$2,$3,$4,'ATADAN E2E verifier')", [tokenHash, owner.id, Math.floor(Date.now() / 1000) + 1800, crypto.randomUUID()]);
  step("temporary authenticated session");

  const unauth = await request("/api/admin/records?kind=sales", { auth: false });
  assert.equal(unauth.response.status, 401, "Protected records must reject unauthenticated users");
  await pool.query("INSERT INTO staff(id,email,display_name,role,permissions_json) VALUES($1,$2,'E2E restricted manager','manager','[]')", [restrictedStaffId, `${marker}@example.invalid`]);
  await pool.query("INSERT INTO staff_sessions(token_hash,staff_id,expires_at,id,user_agent) VALUES($1,$2,$3,$4,'ATADAN E2E restricted RBAC')", [restrictedTokenHash, restrictedStaffId, Math.floor(Date.now() / 1000) + 1800, crypto.randomUUID()]);
  const forbidden = await request("/api/admin/records?kind=sales", { authToken: restrictedToken });
  assert.equal(forbidden.response.status, 403, "A manager without Finance permission must be rejected by the API");
  step("authentication and server-side RBAC denial");

  const phone = `+996700${String(Date.now()).slice(-6)}`;
  const leadPayload = { name: `E2E Клиент ${marker}`, phone, tractorSlug: "cfb504-x", message: "Полный интеграционный тест", consent: true, consentVersion: "e2e-v1", consentedAt: new Date().toISOString(), sourcePath: "/e2e" };
  const leadOne = await request("/api/leads", { method: "POST", auth: false, headers: { "Content-Type": "application/json", "Idempotency-Key": `${marker}-lead-1`, "X-Forwarded-For": testIp }, body: JSON.stringify(leadPayload) });
  assert.equal(leadOne.response.status, 201, JSON.stringify(leadOne.body));
  ids.leads.push(leadOne.body.id);ids.deals.push(leadOne.body.dealId);
  const repeat = await request("/api/leads", { method: "POST", auth: false, headers: { "Content-Type": "application/json", "Idempotency-Key": `${marker}-lead-1`, "X-Forwarded-For": testIp }, body: JSON.stringify(leadPayload) });
  assert.equal(repeat.response.status, 200);assert.equal(repeat.body.duplicate, true);
  const second = await request("/api/leads", { method: "POST", auth: false, headers: { "Content-Type": "application/json", "Idempotency-Key": `${marker}-lead-2`, "X-Forwarded-For": testIp }, body: JSON.stringify({ ...leadPayload, message: "Повторное обращение" }) });
  assert.equal(second.response.status, 201, JSON.stringify(second.body));ids.leads.push(second.body.id);ids.deals.push(second.body.dealId);
  const customerRows = await pool.query("SELECT id FROM crm_customers WHERE normalized_phone=regexp_replace($1,'\\D','','g') AND archived=0", [phone]);
  assert.equal(customerRows.rowCount, 1, "Repeated phone must reuse one customer");const customerId = customerRows.rows[0].id;ids.customers.push(customerId);
  step("lead idempotency and customer deduplication");

  const accountId = await createRecord("financial_accounts", `${marker}-касса`, { name: `${marker}-касса`, accountType: "bank", currency: "KGS", openingBalance: "1000" });
  const supplierId = await createRecord("suppliers", `${marker}-поставщик`, { company: `${marker}-поставщик`, contact: "E2E", phone, email: "e2e@example.invalid", country: "Китай", terms: "E2E" });
  const purchaseId = await createRecord("purchases", `${marker}-PO`, { supplierId, orderNumber: `${marker}-PO`, amount: "1000000", orderDate: "2026-09-01", expectedAt: "2026-09-10" });
  const shipmentId = await createRecord("shipments", `${marker}-shipment`, { purchaseOrderId: purchaseId, route: "Китай → Бишкек", transport: "Автовоз", eta: "2026-09-10", tracking: `${marker}-TRACK` });
  const inventoryData = { vin: `ATDN${String(Date.now()).slice(-12)}`.toUpperCase(), model: "Changfa CFB504-X E2E", tractorSlug: "cfb504-x", unitStatus: "На складе", purchaseOrderId: purchaseId, shipmentId, responsibleId: owner.id, purchaseCost: "1000000", expenses: "100000", salePrice: "1500000", location: "E2E склад" };
  const inventoryId = await createRecord("inventory_units", `${marker}-VIN`, inventoryData);
  const duplicateVin = await post("/api/admin/records", { action: "create", kind: "inventory_units", title: `${marker}-duplicate`, status: "active", data: inventoryData }, 409);
  assert.match(duplicateVin.error, /уникаль|VIN/i);
  step("supplier, purchase, shipment, VIN and uniqueness");

  const dealId = leadOne.body.dealId;
  await updateDeal(dealId, "qualified", { probability: 30, amount: 1500000 });
  await createRecord("meetings", `${marker}-meeting`, { customerId, dealId, responsibleId: owner.id, date: new Date(Date.now() + 3_600_000).toISOString(), location: "ATADAN", result: "Клиент квалифицирован", nextStep: "КП" });
  await updateDeal(dealId, "meeting", { probability: 45 });
  await createRecord("documents", `${marker}-КП`, { documentType: "Коммерческое предложение", number: `${marker}-QUOTE`, customerId, dealId, inventoryUnitId: inventoryId, basePrice: "1500000", discount: "50000", optionsPrice: "50000", validUntil: "2026-12-31", contractStatus: "draft", fileUrl: "/api/media/e2e-placeholder.pdf" });
  await updateDeal(dealId, "negotiation", { probability: 60 });
  await updateDeal(dealId, "reserved", { probability: 75, inventoryUnitId: inventoryId });
  step("qualification, meeting, proposal and VIN reservation");
  await createRecord("documents", `${marker}-договор`, { documentType: "Договор", number: `${marker}-CONTRACT`, customerId, dealId, inventoryUnitId: inventoryId, amount: "1500000", contractStatus: "signed", fileUrl: "/api/media/e2e-placeholder.pdf" });
  await updateDeal(dealId, "contract", { probability: 85, inventoryUnitId: inventoryId });

  await createRecord("payments", `${marker}-аванс`, { customerId, dealId, accountId, amount: "500000", date: new Date().toISOString(), dueAt: new Date(Date.now() + 86_400_000).toISOString(), method: "Банк", reference: `${marker}-PAY-1` });
  await updateDeal(dealId, "awaiting_payment", { probability: 95, inventoryUnitId: inventoryId });
  const debtList = await request("/api/admin/records?kind=debts&q=" + encodeURIComponent(marker));
  assert.equal(debtList.response.status, 200, JSON.stringify(debtList.body));assert.equal(debtList.body.records.length, 1);assert.equal(JSON.parse(debtList.body.records[0].data_json).amount, 1000000);
  step("signed contract and partial-payment debt");
  await createRecord("payments", `${marker}-остаток`, { customerId, dealId, accountId, amount: "1000000", date: new Date().toISOString(), dueAt: new Date(Date.now() + 86_400_000).toISOString(), method: "Банк", reference: `${marker}-PAY-2` });
  await post("/api/admin/records", { action: "create", kind: "payments", title: `${marker}-переплата`, status: "active", data: { customerId, dealId, accountId, amount: "1", date: new Date().toISOString(), method: "Банк" } }, 409);
  await updateDeal(dealId, "won", { probability: 100, inventoryUnitId: inventoryId });
  await updateDeal(dealId, "won", { probability: 100, inventoryUnitId: inventoryId });
  const saleRows = await pool.query("SELECT id FROM sales_v2 WHERE deal_id=$1", [dealId]);assert.equal(saleRows.rowCount, 1, "Won deal must create one sale");const saleId=saleRows.rows[0].id;
  const salesList = await request("/api/admin/records?kind=sales&q=" + encodeURIComponent(marker));assert.equal(salesList.response.status, 200, JSON.stringify(salesList.body));assert.equal(salesList.body.records.length, 1);const saleData=JSON.parse(salesList.body.records[0].data_json);assert.equal(saleData.paid, 1500000);assert.equal(saleData.balance, 0);
  step("full payment and idempotent sale");

  const inventoryRecords = await request("/api/admin/records?kind=inventory_units&q=" + encodeURIComponent(marker));const inventoryRecord=inventoryRecords.body.records.find((item)=>item.id===inventoryId);assert.ok(inventoryRecord);
  await post("/api/admin/records", { action: "update", kind: "inventory_units", id: inventoryId, version: inventoryRecord.version, title: inventoryRecord.title, subtitle: inventoryRecord.subtitle, category: inventoryRecord.category, status: inventoryRecord.status, sortOrder: inventoryRecord.sort_order, data: { ...inventoryData, unitStatus: "Выдан" } });
  await createRecord("service_cases", `${marker}-service`, { customerId, saleId, inventoryUnitId: inventoryId, responsibleId: owner.id, issue: "Первое ТО", resolution: "Диагностика", date: new Date().toISOString() });
  step("delivery and service");

  const lostDeal = await dealRow(second.body.dealId);
  await post("/api/admin/crm", { action: "update_deal", id: lostDeal.id, version: lostDeal.version, stage: "lost", amount: lostDeal.amount_minor / 100, assignedTo: lostDeal.assigned_to, probability: 0 }, 400);
  await updateDeal(lostDeal.id, "lost", { probability: 0, lossReasonCode: "timing", lossReason: "Покупка перенесена клиентом" });

  const supplierRecords = await request("/api/admin/records?kind=suppliers&q=" + encodeURIComponent(marker));const supplier=supplierRecords.body.records.find((item)=>item.id===supplierId);assert.ok(supplier);
  const updatePayload={action:"update",kind:"suppliers",id:supplier.id,version:supplier.version,title:supplier.title,subtitle:supplier.subtitle,category:supplier.category,status:supplier.status,sortOrder:supplier.sort_order,data:JSON.parse(supplier.data_json)};
  const concurrent=await Promise.all([request("/api/admin/records",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(updatePayload)}),request("/api/admin/records",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(updatePayload)})]);assert.deepEqual(concurrent.map(item=>item.response.status).sort(),[200,409]);
  step("structured loss and optimistic locking");

  const timeline = await request(`/api/admin/crm?mode=timeline&entityType=customer&entityId=${customerId}`);assert.equal(timeline.response.status,200,JSON.stringify(timeline.body));for(const type of ["lead","stage","meeting","proposal","contract","payment","sale","service"])assert.ok(timeline.body.events.some((event)=>event.type===type),`Timeline missing ${type}`);
  const dashboard = await request("/api/admin/dashboard");assert.equal(dashboard.response.status,200,JSON.stringify(dashboard.body));assert.ok(dashboard.body.director.deals.revenue_minor>=150000000);assert.ok(dashboard.body.director.deals.paid_minor>=150000000);
  const csv = await request("/api/admin/data?type=sales");assert.equal(csv.response.status,200);assert.match(csv.body,new RegExp(marker));
  const backup = await post("/api/admin/data",{action:"backup_check"});ids.backups.push(backup.id);assert.equal(backup.providerBackupVerified,false);
  step("timeline, dashboard, export and backup integrity");

  console.log(JSON.stringify({ ok:true, marker, checks: { phoneDedup:true, vinUnique:true, partialDebt:true, fullPaymentSale:true, oneSalePerDeal:true, timeline:true, optimisticLock:true, rbac:true, dashboard:true, export:true, backupIntegrity:true } }, null, 2));
} finally {
  await cleanup().catch((error)=>console.error("E2E cleanup failed", error));
  await pool.end();
}
