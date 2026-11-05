/**
 * Склад и логистика (docs/admin-redesign/03-architecture.md §3.1, §3.3, §5.2).
 *
 * Связи, которые держит этот модуль:
 *  - заказ заводу → оплаты заводу с курсом → эффективный курс заказа → закупочная цена машин в сомах;
 *  - поставка создаёт машины по VIN из упаковочного листа; этапы пути меняют статус машин;
 *  - расходы поставки распределяются на машины (по цене / поровну / вручную) → себестоимость;
 *  - пересчёт себестоимости обновляет ещё не выданные продажи (маржа «предварительная» до выдачи);
 *  - оплата заводу и оплаченный расход поставки - это проводки в кассе (account_transactions).
 */
import type { PoolClient } from "pg";
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { normalizeVin } from "../../lib/business";
import { HttpError } from "../../lib/security";
import { catalogModels } from "./sales";

export type PoCurrency = "USD" | "CNY" | "KGS";
export const UNIT_STATUS: Record<string, { label: string; tone: "good" | "warn" | "bad" | "info" | "mute" }> = {
  ordered: { label: "Заказана", tone: "mute" },
  production: { label: "В производстве", tone: "mute" },
  transit: { label: "В пути", tone: "info" },
  customs: { label: "На таможне", tone: "warn" },
  stock: { label: "На складе", tone: "good" },
  reserved: { label: "Резерв", tone: "info" },
  sold: { label: "Продана", tone: "mute" },
  delivered: { label: "Выдана", tone: "mute" },
};
export const SHIPMENT_STEPS = [
  { key: "planned", label: "Планируется", unit: "ordered" },
  { key: "shipped", label: "Отгружено с завода", unit: "transit" },
  { key: "transit", label: "В пути", unit: "transit" },
  { key: "customs", label: "На таможне", unit: "customs" },
  { key: "cleared", label: "Растаможено", unit: "customs" },
  { key: "received", label: "Принято на склад", unit: "stock" },
] as const;
export const COST_CATEGORY: Record<string, string> = {
  freight: "Доставка (фрахт)", duty: "Таможенная пошлина", vat: "НДС на импорт", broker: "Брокер",
  certification: "Сертификация", unloading: "Разгрузка", storage: "Хранение", other: "Другое",
};
export const ALLOCATION: Record<string, string> = { value: "Пропорционально закупочной цене", equal: "Поровну на машину", manual: "Вручную по каждой машине" };

export const isBoss = (a: Pick<Actor, "role">) => a.role === "owner" || a.role === "director";
export const canLogistics = (a: Actor) => isBoss(a) || a.role === "accountant" || ["purchases", "shipments", "suppliers"].some((p) => a.permissions.includes(p as never));
export const canStockEdit = (a: Actor) => isBoss(a) || a.role === "manager" || a.role === "accountant" || a.permissions.includes("inventory-units");

type Q = <T = Record<string, unknown>>(sql: string, ...args: unknown[]) => Promise<T[]>;
const query = (client: PoolClient): Q => async <T,>(sql: string, ...args: unknown[]) => (await getRawDb().prepare(sql).bind(...args).execute<T>(client)).results;
const id = () => crypto.randomUUID();
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const toMinor = (v: unknown, label: string, { allowZero = false } = {}) => {
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0) || n > 1_000_000_000) throw new HttpError(400, `${label}: проверьте сумму`);
  return Math.round(n * 100);
};
const rateOf = (v: unknown, cur: string, label = "Курс") => {
  if (cur === "KGS") return 1;
  const n = Number(String(v ?? "").replace(",", "."));
  const [min, max] = cur === "CNY" ? [1, 100] : [1, 1000];
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${label}: сколько сомов за 1 ${cur === "USD" ? "$" : "юань"}`);
  return Math.round(n * 10000) / 10000;
};
const dateOnly = (v: unknown, label: string) => {
  const s = String(v ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new HttpError(400, `${label}: укажите дату`);
  return s;
};
const cur = (v: unknown): PoCurrency => (v === "USD" || v === "CNY" ? v : "KGS");

async function audit(q: Q, actor: Actor, action: string, entity: string, detail: string) {
  await q("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)", id(), actor.id, action, entity, detail.slice(0, 2000));
}
async function unitEvent(q: Q, actor: Actor | null, unitId: string, from: string | null, to: string, note: string) {
  await q("INSERT INTO inventory_lifecycle_events(id,inventory_unit_id,from_status,to_status,actor_id,note) VALUES(?,?,?,?,?,?)", id(), unitId, from, to, actor?.id ?? null, note.slice(0, 500));
}

// ───────────────────────── себестоимость ─────────────────────────
/** Эффективный курс заказа: по фактическим оплатам заводу, если их нет, курс из заказа. */
async function poRate(q: Q, poId: string) {
  const [r] = await q<{ kgs: number | null; po: number | null; rate: number }>(
    "SELECT (SELECT SUM(amount_kgs_minor) FROM supplier_payments WHERE purchase_order_id=o.id AND status='posted')::bigint AS kgs, (SELECT SUM(amount_po_minor) FROM supplier_payments WHERE purchase_order_id=o.id AND status='posted')::bigint AS po, o.fx_rate::float AS rate, o.currency FROM purchase_orders_v2 o WHERE o.id=?",
    poId,
  );
  if (!r) return 1;
  return r.po && Number(r.po) > 0 ? Number(r.kgs) / Number(r.po) : Number(r.rate) || 1;
}

/**
 * Пересчитать себестоимость машин поставки: закупка (цена позиции × курс заказа) + доля расходов.
 * Выданные машины не трогаем: их маржа уже зафиксирована. Невыданные продажи получают новую себестоимость.
 */
export async function recalcShipment(q: Q, shipmentId: string) {
  const [sh] = await q<{ id: string; purchase_order_id: string; allocation_method: string }>("SELECT id, purchase_order_id, allocation_method FROM shipments_v2 WHERE id=?", shipmentId);
  if (!sh) return;
  const rate = await poRate(q, sh.purchase_order_id);
  const units = await q<{ id: string; status: string; unit_price_minor: number | null; manual_cost_minor: number | null; purchase_cost_minor: number }>(
    "SELECT u.id, u.status, l.unit_price_minor, u.manual_cost_minor, u.purchase_cost_minor FROM inventory_units_v2 u LEFT JOIN purchase_order_lines l ON l.id=u.purchase_order_line_id WHERE u.shipment_id=? AND u.archived=0 ORDER BY u.vin",
    shipmentId,
  );
  if (!units.length) return;
  const [costs] = await q<{ v: number }>("SELECT COALESCE(SUM(amount_kgs_minor),0)::bigint AS v FROM shipment_costs WHERE shipment_id=? AND status='posted'", shipmentId);
  const extra = Number(costs?.v ?? 0);
  // Машины из старой админки без позиции заказа сохраняют закупочную цену, введённую раньше.
  const purchase = units.map((u) => (u.unit_price_minor ? Math.round(Number(u.unit_price_minor) * rate) : Number(u.purchase_cost_minor ?? 0)));
  const base = purchase.reduce((s, v) => s + v, 0);
  let left = extra;
  for (const [i, u] of units.entries()) {
    let share: number;
    if (sh.allocation_method === "manual") share = Number(u.manual_cost_minor ?? 0);
    else if (sh.allocation_method === "equal" || base === 0) share = i === units.length - 1 ? left : Math.floor(extra / units.length);
    else share = i === units.length - 1 ? left : Math.floor((extra * purchase[i]) / base);
    left -= share;
    if (u.status === "delivered") continue;
    // старая машина без позиции заказа и без расходов поставки: себестоимость не трогаем
    if (!u.unit_price_minor && extra === 0) continue;
    await q("UPDATE inventory_units_v2 SET purchase_cost_minor=?, allocated_cost_minor=?, landed_cost_minor=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", purchase[i], share, purchase[i] + share, u.id);
    // продажа ещё не выдана: обновляем себестоимость позиции и продажи
    const items = await q<{ id: string; sale_id: string }>("SELECT i.id, i.sale_id FROM sale_order_items i JOIN sale_orders o ON o.id=i.sale_id WHERE i.inventory_unit_id=? AND i.active=1 AND o.status='booked'", u.id);
    for (const it of items) {
      await q("UPDATE sale_order_items SET cost_kgs_minor=? WHERE id=?", purchase[i] + share, it.id);
      await q("UPDATE sale_orders SET cost_kgs_minor=(SELECT COALESCE(SUM(cost_kgs_minor*qty),0) FROM sale_order_items WHERE sale_id=? AND active=1) WHERE id=?", it.sale_id, it.sale_id);
    }
  }
}

async function recalcOrder(q: Q, poId: string) {
  const shipments = await q<{ id: string }>("SELECT id FROM shipments_v2 WHERE purchase_order_id=? AND archived=0", poId);
  for (const s of shipments) await recalcShipment(q, s.id);
}

// ───────────────────────── чтение ─────────────────────────
export type UnitRow = { id: string; vin: string; model: string; tractor_slug: string; status: string; location: string; received_at: string | null; days: number | null; purchase_cost_minor: number; landed_cost_minor: number; list_price_minor: number; pdi_done_at: string | null; damage_note: string; sale_id: string | null; sale_number: string | null; customer: string | null; shipment: string | null; written_off_at: string | null };

export const UNIT_VIEWS = [
  { key: "all", label: "Все", sql: "u.archived=0 AND u.status NOT IN ('delivered')" },
  { key: "ready", label: "Готовы к продаже", sql: "u.archived=0 AND u.status='stock' AND u.reserved_sale_id IS NULL" },
  { key: "reserved", label: "Резерв", sql: "u.archived=0 AND u.reserved_sale_id IS NOT NULL AND u.status NOT IN ('delivered')" },
  { key: "transit", label: "В пути и на таможне", sql: "u.archived=0 AND u.status IN ('ordered','production','transit','customs')" },
  { key: "old", label: "Больше 90 дней", sql: "u.archived=0 AND u.status IN ('stock','reserved') AND u.received_at < CURRENT_TIMESTAMP - INTERVAL '90 days'" },
  { key: "delivered", label: "Выданы", sql: "u.archived=0 AND u.status='delivered'" },
  { key: "written_off", label: "Списаны", sql: "u.written_off_at IS NOT NULL" },
] as const;

const UNIT_SELECT = `SELECT u.id, u.vin, u.model, u.tractor_slug, u.status, u.location, u.received_at,
    CASE WHEN u.received_at IS NOT NULL AND u.status IN ('stock','reserved') THEN (CURRENT_DATE - u.received_at::date) END AS days,
    u.purchase_cost_minor, u.landed_cost_minor, u.list_price_minor, u.pdi_done_at, u.damage_note, u.written_off_at,
    o.id AS sale_id, o.number AS sale_number, c.name AS customer, s.tracking_number AS shipment
  FROM inventory_units_v2 u
  LEFT JOIN sale_order_items i ON i.inventory_unit_id=u.id AND i.active=1
  LEFT JOIN sale_orders o ON o.id=i.sale_id AND o.status<>'cancelled'
  LEFT JOIN crm_customers c ON c.id=o.customer_id
  LEFT JOIN shipments_v2 s ON s.id=u.shipment_id`;

export async function listUnits(view: string, q: string) {
  const v = UNIT_VIEWS.find((x) => x.key === view) ?? UNIT_VIEWS[0];
  const args: unknown[] = [];
  let where = v.sql;
  if (q) {
    where += " AND (lower(u.vin) LIKE ? OR lower(u.model) LIKE ? OR lower(u.location) LIKE ?)";
    const like = `%${q.toLowerCase().replace(/[%_\\]/g, "")}%`;
    args.push(like, like, like);
  }
  const db = getRawDb();
  const [rows, counts] = await Promise.all([
    db.prepare(`${UNIT_SELECT} WHERE ${where} ORDER BY CASE u.status WHEN 'stock' THEN 0 WHEN 'reserved' THEN 1 WHEN 'customs' THEN 2 WHEN 'transit' THEN 3 ELSE 4 END, u.received_at NULLS LAST, u.model LIMIT 300`).bind(...args).all<UnitRow>(),
    db.prepare(`SELECT ${UNIT_VIEWS.map((x) => `COUNT(*) FILTER (WHERE ${x.sql})::int AS "${x.key}"`).join(", ")} FROM inventory_units_v2 u`).first<Record<string, number>>(),
  ]);
  return { rows: rows.results.map((r) => ({ ...r, purchase_cost_minor: Number(r.purchase_cost_minor), landed_cost_minor: Number(r.landed_cost_minor), list_price_minor: Number(r.list_price_minor), days: r.days === null ? null : Number(r.days) })), counts: counts ?? {} };
}

export async function getUnit(unitId: string) {
  const db = getRawDb();
  const unit = await db.prepare(`${UNIT_SELECT.replace("SELECT u.id,", "SELECT u.*, u.id,")} WHERE u.id=?`).bind(unitId).first<UnitRow & Record<string, unknown>>();
  if (!unit) return null;
  const [events, order] = await Promise.all([
    db.prepare("SELECT e.id, e.from_status, e.to_status, e.note, e.occurred_at, s.display_name AS author FROM inventory_lifecycle_events e LEFT JOIN staff s ON s.id=e.actor_id WHERE e.inventory_unit_id=? ORDER BY e.occurred_at DESC LIMIT 100").bind(unitId).all<{ id: string; from_status: string | null; to_status: string; note: string; occurred_at: string; author: string | null }>(),
    unit.purchase_order_id ? db.prepare("SELECT o.id, o.order_number, o.currency, p.name AS supplier FROM purchase_orders_v2 o JOIN suppliers_v2 p ON p.id=o.supplier_id WHERE o.id=?").bind(unit.purchase_order_id).first<{ id: string; order_number: string; currency: string; supplier: string }>() : null,
  ]);
  return { unit, events: events.results, order };
}

export async function listSuppliers() {
  return (await getRawDb().prepare("SELECT id, name, country, contact_name, phone, terms FROM suppliers_v2 WHERE archived=0 ORDER BY name").all<{ id: string; name: string; country: string; contact_name: string; phone: string; terms: string }>()).results;
}

export type OrderRow = { id: string; order_number: string; supplier: string; currency: PoCurrency; fx_rate: number; status: string; ordered_at: string | null; expected_at: string | null; total_minor: number; paid_po_minor: number; paid_kgs_minor: number; qty: number; shipped: number; received: number };

export async function listOrders() {
  const { results } = await getRawDb().prepare(`SELECT o.id, o.order_number, p.name AS supplier, o.currency, o.fx_rate::float AS fx_rate, o.status, o.ordered_at::text AS ordered_at, o.expected_at::text AS expected_at,
      COALESCE((SELECT SUM(l.qty*l.unit_price_minor) FROM purchase_order_lines l WHERE l.purchase_order_id=o.id), o.total_minor)::bigint AS total_minor,
      COALESCE((SELECT SUM(amount_po_minor) FROM supplier_payments WHERE purchase_order_id=o.id AND status='posted'),0)::bigint AS paid_po_minor,
      COALESCE((SELECT SUM(amount_kgs_minor) FROM supplier_payments WHERE purchase_order_id=o.id AND status='posted'),0)::bigint AS paid_kgs_minor,
      COALESCE((SELECT SUM(qty) FROM purchase_order_lines WHERE purchase_order_id=o.id),0)::int AS qty,
      (SELECT COUNT(*) FROM inventory_units_v2 u WHERE u.purchase_order_id=o.id AND u.archived=0)::int AS shipped,
      (SELECT COUNT(*) FROM inventory_units_v2 u WHERE u.purchase_order_id=o.id AND u.archived=0 AND u.received_at IS NOT NULL)::int AS received
    FROM purchase_orders_v2 o JOIN suppliers_v2 p ON p.id=o.supplier_id WHERE o.archived=0 ORDER BY o.created_at DESC LIMIT 100`).all<OrderRow>();
  return results.map((r) => ({ ...r, total_minor: Number(r.total_minor), paid_po_minor: Number(r.paid_po_minor), paid_kgs_minor: Number(r.paid_kgs_minor) }));
}

export type ShipmentRow = { id: string; tracking_number: string | null; status: string; route: string; transport: string; eta: string | null; order_number: string; purchase_order_id: string; units: number; costs_kgs: number; late: boolean; allocation_method: string };

export async function listShipments() {
  const { results } = await getRawDb().prepare(`SELECT s.id, s.tracking_number, s.status, s.route, s.transport, s.eta::text AS eta, s.allocation_method, o.order_number, s.purchase_order_id,
      (SELECT COUNT(*) FROM inventory_units_v2 u WHERE u.shipment_id=s.id AND u.archived=0)::int AS units,
      COALESCE((SELECT SUM(amount_kgs_minor) FROM shipment_costs c WHERE c.shipment_id=s.id AND c.status='posted'),0)::bigint AS costs_kgs,
      (s.eta IS NOT NULL AND s.eta < CURRENT_DATE AND s.status NOT IN ('received')) AS late
    FROM shipments_v2 s JOIN purchase_orders_v2 o ON o.id=s.purchase_order_id WHERE s.archived=0 ORDER BY s.created_at DESC LIMIT 100`).all<ShipmentRow>();
  return results.map((r) => ({ ...r, costs_kgs: Number(r.costs_kgs), late: Boolean(r.late) }));
}

export async function getOrder(poId: string) {
  const db = getRawDb();
  const order = (await listOrders()).find((o) => o.id === poId);
  if (!order) return null;
  const [lines, payments, shipments] = await Promise.all([
    db.prepare(`SELECT l.id, l.tractor_slug, l.model, l.qty, l.unit_price_minor, (SELECT COUNT(*) FROM inventory_units_v2 u WHERE u.purchase_order_line_id=l.id AND u.archived=0)::int AS shipped FROM purchase_order_lines l WHERE l.purchase_order_id=? ORDER BY l.created_at`).bind(poId).all<{ id: string; tractor_slug: string; model: string; qty: number; unit_price_minor: number; shipped: number }>(),
    db.prepare("SELECT p.*, p.fx_rate::float AS fx_rate, a.name AS account FROM supplier_payments p JOIN financial_accounts a ON a.id=p.account_id WHERE p.purchase_order_id=? ORDER BY p.paid_at").bind(poId).all<{ id: string; account: string; currency: string; amount_minor: number; fx_rate: number; amount_kgs_minor: number; amount_po_minor: number; paid_at: string; note: string; status: string; void_reason: string }>(),
    (await listShipments()).filter((s) => s.purchase_order_id === poId),
  ]);
  return { order, lines: lines.results.map((l) => ({ ...l, unit_price_minor: Number(l.unit_price_minor) })), payments: payments.results.map((p) => ({ ...p, amount_minor: Number(p.amount_minor), amount_kgs_minor: Number(p.amount_kgs_minor), amount_po_minor: Number(p.amount_po_minor) })), shipments, effectiveRate: order.paid_po_minor ? order.paid_kgs_minor / order.paid_po_minor : order.fx_rate };
}

export async function getShipment(shipmentId: string) {
  const db = getRawDb();
  const shipment = await db.prepare(`SELECT s.*, s.eta::text AS eta, o.order_number, o.currency, p.name AS supplier FROM shipments_v2 s JOIN purchase_orders_v2 o ON o.id=s.purchase_order_id JOIN suppliers_v2 p ON p.id=o.supplier_id WHERE s.id=?`).bind(shipmentId).first<Record<string, unknown> & { id: string; status: string; tracking_number: string | null; purchase_order_id: string; allocation_method: string; eta: string | null; order_number: string; currency: string; supplier: string }>();
  if (!shipment) return null;
  const [units, costs] = await Promise.all([
    db.prepare("SELECT u.id, u.vin, u.model, u.status, u.engine_number, u.purchase_cost_minor, u.allocated_cost_minor, u.landed_cost_minor, u.manual_cost_minor, u.received_at, u.damage_note FROM inventory_units_v2 u WHERE u.shipment_id=? AND u.archived=0 ORDER BY u.model, u.vin").bind(shipmentId).all<{ id: string; vin: string; model: string; status: string; engine_number: string; purchase_cost_minor: number; allocated_cost_minor: number; landed_cost_minor: number; manual_cost_minor: number | null; received_at: string | null; damage_note: string }>(),
    db.prepare("SELECT c.*, c.fx_rate::float AS fx_rate, a.name AS account FROM shipment_costs c LEFT JOIN financial_accounts a ON a.id=c.account_id WHERE c.shipment_id=? ORDER BY c.paid_at").bind(shipmentId).all<{ id: string; category: string; currency: string; amount_minor: number; fx_rate: number; amount_kgs_minor: number; account: string | null; paid_at: string; note: string; status: string; void_reason: string }>(),
  ]);
  return {
    shipment,
    units: units.results.map((u) => ({ ...u, purchase_cost_minor: Number(u.purchase_cost_minor), allocated_cost_minor: Number(u.allocated_cost_minor), landed_cost_minor: Number(u.landed_cost_minor), manual_cost_minor: u.manual_cost_minor === null ? null : Number(u.manual_cost_minor) })),
    costs: costs.results.map((c) => ({ ...c, amount_minor: Number(c.amount_minor), amount_kgs_minor: Number(c.amount_kgs_minor) })),
  };
}

// ───────────────────────── операции: заказы заводу ─────────────────────────
function assertLogistics(a: Actor) {
  if (!canLogistics(a)) throw new HttpError(403, "Логистику ведут бухгалтер, директор и владелец");
}

export async function createSupplier(actor: Actor, input: { name: string; country?: string; contact?: string; phone?: string; terms?: string }) {
  assertLogistics(actor);
  const name = text(input.name, 160);
  if (name.length < 2) throw new HttpError(400, "Укажите название поставщика");
  const sid = id();
  await getRawDb().prepare("INSERT INTO suppliers_v2(id,name,country,contact_name,phone,terms,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?)").bind(sid, name, text(input.country, 80), text(input.contact, 120), text(input.phone, 40), text(input.terms, 500), actor.id, actor.id).run();
  return sid;
}

/** Следующий свободный номер вида ПРЕФИКС001 (ЗК-2026-001, ПСТ-2026-004). Вызывать внутри транзакции. */
async function nextNumber(q: Q, table: "purchase_orders_v2" | "shipments_v2", column: "order_number" | "tracking_number", prefix: string) {
  await q("SELECT pg_advisory_xact_lock(hashtext(?))", `${table}:${prefix}`);
  const [r] = await q<{ n: number | null }>(`SELECT MAX(NULLIF(regexp_replace(substr(${column}, ?), '[^0-9]', '', 'g'), '')::int) AS n FROM ${table} WHERE ${column} LIKE ?`, prefix.length + 1, `${prefix}%`);
  return `${prefix}${String(Number(r?.n ?? 0) + 1).padStart(3, "0")}`;
}

export async function createOrder(actor: Actor, input: { supplierId: string; number: string; currency: string; fxRate: string; orderedAt: string; expectedAt?: string; notes?: string; lines: { slug: string; qty: number | string; price: string | number }[] }) {
  assertLogistics(actor);
  const currency = cur(input.currency);
  const fx = rateOf(input.fxRate, currency, "Курс заказа");
  let number = text(input.number, 60);
  if (!Array.isArray(input.lines) || !input.lines.length) throw new HttpError(400, "Добавьте хотя бы одну модель в заказ");
  const models = new Map((await catalogModels()).map((m) => [m.slug, m]));
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [sup] = await q<{ id: string }>("SELECT id FROM suppliers_v2 WHERE id=? AND archived=0", text(input.supplierId, 100));
    if (!sup) throw new HttpError(400, "Выберите поставщика");
    if (!number) number = await nextNumber(q, "purchase_orders_v2", "order_number", `ЗК-${new Date().getFullYear()}-`);
    else if ((await q("SELECT 1 FROM purchase_orders_v2 WHERE lower(order_number)=lower(?)", number)).length) throw new HttpError(409, `Заказ с номером ${number} уже есть`);
    const poId = id();
    let total = 0;
    const lines = input.lines.map((l) => {
      const m = models.get(text(l.slug, 80));
      if (!m) throw new HttpError(400, "Выберите модель из каталога");
      const qty = Math.round(Number(l.qty));
      if (!(qty >= 1 && qty <= 500)) throw new HttpError(400, `Количество ${m.model}: от 1 до 500`);
      const price = toMinor(l.price, `Цена ${m.model}`);
      total += qty * price;
      return { m, qty, price };
    });
    await q("INSERT INTO purchase_orders_v2(id,supplier_id,order_number,status,currency,fx_rate,total_minor,ordered_at,expected_at,notes,created_by,updated_by) VALUES(?,?,?, 'ordered', ?,?,?,?,?,?,?,?)", poId, sup.id, number, currency, fx, total, dateOnly(input.orderedAt, "Дата заказа"), input.expectedAt ? dateOnly(input.expectedAt, "Ожидаемая дата") : null, text(input.notes, 1000), actor.id, actor.id);
    for (const l of lines) await q("INSERT INTO purchase_order_lines(id,purchase_order_id,tractor_slug,model,qty,unit_price_minor) VALUES(?,?,?,?,?,?)", id(), poId, l.m.slug, l.m.model, l.qty, l.price);
    await audit(q, actor, "po.created", poId, `Заказ ${number}: ${lines.map((l) => `${l.qty} × ${l.m.model}`).join(", ")}`);
    return poId;
  });
}

export async function addSupplierPayment(actor: Actor, poId: string, input: { accountId: string; amount: string; fxRate: string; amountPo?: string; paidAt: string; note?: string }) {
  assertLogistics(actor);
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [po] = await q<{ id: string; order_number: string; currency: PoCurrency }>("SELECT id, order_number, currency FROM purchase_orders_v2 WHERE id=? AND archived=0 FOR UPDATE", poId);
    if (!po) throw new HttpError(404, "Заказ не найден");
    const [acc] = await q<{ id: string; name: string; currency: string }>("SELECT id, name, currency FROM financial_accounts WHERE id=? AND active=1 AND account_type IN ('cash','bank')", text(input.accountId, 100));
    if (!acc) throw new HttpError(400, "Выберите кассу или счёт");
    const payCur = cur(acc.currency);
    const amount = toMinor(input.amount, "Сумма оплаты");
    const fx = rateOf(input.fxRate, payCur, "Курс оплаты");
    const kgs = Math.round(amount * fx);
    // Сколько это в валюте заказа: если валюты совпадают - та же сумма, иначе вводится вручную (например, оплата юаней долларами).
    const amountPo = payCur === po.currency ? amount : toMinor(input.amountPo, `Сколько покрыто в ${po.currency}`);
    const paidAt = dateOnly(input.paidAt, "Дата оплаты");
    const pid = id(), tx = id();
    await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,payment_id,occurred_at,description,created_by,link_type,link_id,counterparty) VALUES(?,?, 'out', ?, 'Оплата заводу', ?, ?, ?, ?, 'purchase_order', ?, ?)", tx, acc.id, amount, pid, paidAt, `Оплата заказа ${po.order_number}`, actor.id, po.id, "Поставщик");
    await q("INSERT INTO supplier_payments(id,purchase_order_id,account_id,currency,amount_minor,fx_rate,amount_kgs_minor,amount_po_minor,paid_at,note,transaction_id,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", pid, po.id, acc.id, payCur, amount, fx, kgs, amountPo, paidAt, text(input.note, 300), tx, actor.id);
    await audit(q, actor, "po.payment", po.id, `Оплата заводу ${amount / 100} ${payCur} по курсу ${fx}`);
    await recalcOrder(q, po.id);
  });
}

export async function voidSupplierPayment(actor: Actor, paymentId: string, reason: string) {
  assertLogistics(actor);
  const why = text(reason, 300);
  if (why.length < 5) throw new HttpError(400, "Укажите причину сторно");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [p] = await q<{ id: string; purchase_order_id: string; account_id: string; amount_minor: number; status: string }>("SELECT id, purchase_order_id, account_id, amount_minor, status FROM supplier_payments WHERE id=? FOR UPDATE", paymentId);
    if (!p || p.status !== "posted") throw new HttpError(409, "Платёж не найден или уже сторнирован");
    const tx = id();
    await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,payment_id,occurred_at,description,created_by,link_type,link_id) VALUES(?,?, 'in', ?, 'Сторно оплаты заводу', ?, CURRENT_TIMESTAMP, ?, ?, 'purchase_order', ?)", tx, p.account_id, p.amount_minor, p.id, `Сторно: ${why}`, actor.id, p.purchase_order_id);
    await q("UPDATE supplier_payments SET status='void', void_reason=?, void_transaction_id=? WHERE id=?", why, tx, p.id);
    await audit(q, actor, "po.payment_void", p.purchase_order_id, why);
    await recalcOrder(q, p.purchase_order_id);
  });
}

// ───────────────────────── операции: поставки ─────────────────────────
export async function createShipment(actor: Actor, input: { poId: string; tracking: string; route?: string; transport?: string; eta?: string; status?: string; allocation?: string; units: { lineId: string; vin: string; engine?: string; year?: string | number; color?: string }[] }) {
  assertLogistics(actor);
  if (!Array.isArray(input.units) || !input.units.length) throw new HttpError(400, "Добавьте машины из упаковочного листа: VIN обязателен");
  if (input.units.length > 200) throw new HttpError(400, "Не больше 200 машин в одной поставке");
  const status = SHIPMENT_STEPS.some((s) => s.key === input.status) && input.status !== "received" ? (input.status as string) : "shipped";
  const allocation = input.allocation && ALLOCATION[input.allocation] ? input.allocation : "value";
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [po] = await q<{ id: string; order_number: string }>("SELECT id, order_number FROM purchase_orders_v2 WHERE id=? AND archived=0 FOR UPDATE", text(input.poId, 100));
    if (!po) throw new HttpError(404, "Заказ не найден");
    const lines = await q<{ id: string; tractor_slug: string; model: string; qty: number; shipped: number }>("SELECT l.id, l.tractor_slug, l.model, l.qty, (SELECT COUNT(*) FROM inventory_units_v2 u WHERE u.purchase_order_line_id=l.id AND u.archived=0)::int AS shipped FROM purchase_order_lines l WHERE l.purchase_order_id=?", po.id);
    const byLine = new Map(lines.map((l) => [l.id, { ...l, adding: 0 }]));
    const vins = new Set<string>();
    const prepared = input.units.map((u, i) => {
      const line = byLine.get(text(u.lineId, 100));
      if (!line) throw new HttpError(400, `Строка ${i + 1}: выберите модель из заказа`);
      const vin = normalizeVin(u.vin);
      if (vins.has(vin)) throw new HttpError(400, `VIN ${vin} указан дважды`);
      vins.add(vin);
      line.adding += 1;
      if (line.shipped + line.adding > line.qty) throw new HttpError(400, `${line.model}: в заказе ${line.qty} шт., уже отправлено ${line.shipped}. Лишняя машина в строке ${i + 1}`);
      const year = u.year ? Math.round(Number(u.year)) : null;
      if (year !== null && !(year >= 2000 && year <= 2100)) throw new HttpError(400, `Строка ${i + 1}: проверьте год`);
      return { line, vin, engine: text(u.engine, 60), year, color: text(u.color, 40) };
    });
    const existing = await q<{ vin: string }>(`SELECT vin FROM inventory_units_v2 WHERE upper(vin) IN (${prepared.map(() => "?").join(",")})`, ...prepared.map((p) => p.vin));
    if (existing.length) throw new HttpError(409, `Эти VIN уже есть в системе: ${existing.map((e) => e.vin).join(", ")}`);
    const tracking = text(input.tracking, 60) || (await nextNumber(q, "shipments_v2", "tracking_number", `ПСТ-${new Date().getFullYear()}-`));
    const sid = id();
    const unitStatus = SHIPMENT_STEPS.find((s) => s.key === status)!.unit;
    await q("INSERT INTO shipments_v2(id,purchase_order_id,tracking_number,status,route,transport,eta,allocation_method,shipped_at,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)", sid, po.id, tracking, status, text(input.route, 200), text(input.transport, 80), input.eta ? dateOnly(input.eta, "Ожидаемая дата прибытия") : null, allocation, status === "planned" ? null : new Date().toISOString(), actor.id, actor.id);
    for (const p of prepared) {
      const uid = id();
      await q("INSERT INTO inventory_units_v2(id,vin,tractor_slug,model,status,purchase_order_id,shipment_id,purchase_order_line_id,engine_number,year,color,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", uid, p.vin, p.line.tractor_slug, p.line.model, unitStatus, po.id, sid, p.line.id, p.engine, p.year, p.color, actor.id, actor.id);
      await unitEvent(q, actor, uid, null, unitStatus, `Поставка ${tracking} по заказу ${po.order_number}`);
    }
    await audit(q, actor, "shipment.created", sid, `Поставка ${tracking}: ${prepared.length} машин`);
    await recalcShipment(q, sid);
    return sid;
  });
}

export async function advanceShipment(actor: Actor, shipmentId: string, to: string) {
  assertLogistics(actor);
  const idx = SHIPMENT_STEPS.findIndex((s) => s.key === to);
  if (idx < 0 || to === "received") throw new HttpError(400, "Принять на склад можно отдельной кнопкой с проверкой машин");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [s] = await q<{ id: string; status: string; tracking_number: string }>("SELECT id, status, tracking_number FROM shipments_v2 WHERE id=? AND archived=0 FOR UPDATE", shipmentId);
    if (!s) throw new HttpError(404, "Поставка не найдена");
    if (s.status === "received") throw new HttpError(409, "Поставка уже принята");
    const step = SHIPMENT_STEPS[idx];
    const dateCol = to === "shipped" ? "shipped_at" : to === "customs" ? "customs_at" : to === "cleared" ? "cleared_at" : null;
    await q(`UPDATE shipments_v2 SET status=?, ${dateCol ? `${dateCol}=COALESCE(${dateCol},CURRENT_TIMESTAMP),` : ""} updated_by=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?`, to, actor.id, s.id);
    const units = await q<{ id: string; status: string }>("SELECT id, status FROM inventory_units_v2 WHERE shipment_id=? AND archived=0 AND received_at IS NULL", s.id);
    for (const u of units) {
      if (u.status === step.unit) continue;
      await q("UPDATE inventory_units_v2 SET status=?, updated_by=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", step.unit, actor.id, u.id);
      await unitEvent(q, actor, u.id, u.status, step.unit, `Поставка ${s.tracking_number}: ${step.label}`);
    }
    await audit(q, actor, "shipment.status", s.id, `${s.status} → ${to}`);
  });
}

export async function receiveShipment(actor: Actor, shipmentId: string, unitIds: string[], location: string) {
  assertLogistics(actor);
  if (!unitIds.length) throw new HttpError(400, "Отметьте машины, которые пришли");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [s] = await q<{ id: string; tracking_number: string }>("SELECT id, tracking_number FROM shipments_v2 WHERE id=? AND archived=0 FOR UPDATE", shipmentId);
    if (!s) throw new HttpError(404, "Поставка не найдена");
    const units = await q<{ id: string; status: string; reserved_sale_id: string | null; received_at: string | null; vin: string }>("SELECT id, status, reserved_sale_id, received_at, vin FROM inventory_units_v2 WHERE shipment_id=? AND archived=0 FOR UPDATE", s.id);
    const pick = new Set(unitIds);
    let got = 0;
    for (const u of units) {
      if (!pick.has(u.id) || u.received_at) continue;
      const to = u.reserved_sale_id ? "reserved" : "stock";
      await q("UPDATE inventory_units_v2 SET status=?, received_at=CURRENT_TIMESTAMP, location=?, updated_by=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", to, text(location, 120) || "Склад", actor.id, u.id);
      await unitEvent(q, actor, u.id, u.status, to, `Принята на склад: поставка ${s.tracking_number}`);
      got += 1;
    }
    if (!got) throw new HttpError(409, "Отмеченные машины уже приняты");
    const missing = units.filter((u) => !u.received_at && !pick.has(u.id));
    await q(`UPDATE shipments_v2 SET status=?, received_at=CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE received_at END, arrived_at=COALESCE(arrived_at,CURRENT_TIMESTAMP), updated_by=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?`, missing.length ? "cleared" : "received", !missing.length, actor.id, s.id);
    await audit(q, actor, "shipment.received", s.id, `Принято ${got} машин${missing.length ? `, не пришли: ${missing.map((m) => m.vin).join(", ")}` : ""}`);
    await recalcShipment(q, s.id);
    return { received: got, missing: missing.length };
  });
}

export async function addShipmentCost(actor: Actor, shipmentId: string, input: { category: string; currency: string; amount: string; fxRate: string; accountId?: string; paidAt: string; note?: string }) {
  assertLogistics(actor);
  if (!COST_CATEGORY[input.category]) throw new HttpError(400, "Выберите вид расхода");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [s] = await q<{ id: string; tracking_number: string }>("SELECT id, tracking_number FROM shipments_v2 WHERE id=? AND archived=0 FOR UPDATE", shipmentId);
    if (!s) throw new HttpError(404, "Поставка не найдена");
    let currency = cur(input.currency);
    let accountId: string | null = null;
    if (input.accountId) {
      const [acc] = await q<{ id: string; currency: string }>("SELECT id, currency FROM financial_accounts WHERE id=? AND active=1 AND account_type IN ('cash','bank')", text(input.accountId, 100));
      if (!acc) throw new HttpError(400, "Выберите кассу или счёт");
      accountId = acc.id;
      currency = cur(acc.currency);
    }
    const amount = toMinor(input.amount, "Сумма расхода");
    const fx = rateOf(input.fxRate, currency);
    const kgs = Math.round(amount * fx);
    const paidAt = dateOnly(input.paidAt, "Дата");
    const cid = id();
    let tx: string | null = null;
    if (accountId) {
      tx = id();
      await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,payment_id,occurred_at,description,created_by,link_type,link_id) VALUES(?,?, 'out', ?, ?, ?, ?, ?, ?, 'shipment', ?)", tx, accountId, amount, `Поставка: ${COST_CATEGORY[input.category]}`, cid, paidAt, `${COST_CATEGORY[input.category]} · ${s.tracking_number}${input.note ? ` · ${text(input.note, 200)}` : ""}`, actor.id, s.id);
    }
    await q("INSERT INTO shipment_costs(id,shipment_id,category,currency,amount_minor,fx_rate,amount_kgs_minor,account_id,transaction_id,paid_at,note,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", cid, s.id, input.category, currency, amount, fx, kgs, accountId, tx, paidAt, text(input.note, 300), actor.id);
    await audit(q, actor, "shipment.cost", s.id, `${COST_CATEGORY[input.category]}: ${amount / 100} ${currency}`);
    await recalcShipment(q, s.id);
  });
}

export async function voidShipmentCost(actor: Actor, costId: string, reason: string) {
  assertLogistics(actor);
  const why = text(reason, 300);
  if (why.length < 5) throw new HttpError(400, "Укажите причину сторно");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [c] = await q<{ id: string; shipment_id: string; account_id: string | null; amount_minor: number; status: string; category: string }>("SELECT id, shipment_id, account_id, amount_minor, status, category FROM shipment_costs WHERE id=? FOR UPDATE", costId);
    if (!c || c.status !== "posted") throw new HttpError(409, "Расход не найден или уже сторнирован");
    let tx: string | null = null;
    if (c.account_id) {
      tx = id();
      await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,payment_id,occurred_at,description,created_by,link_type,link_id) VALUES(?,?, 'in', ?, 'Сторно расхода поставки', ?, CURRENT_TIMESTAMP, ?, ?, 'shipment', ?)", tx, c.account_id, c.amount_minor, c.id, `Сторно: ${why}`, actor.id, c.shipment_id);
    }
    await q("UPDATE shipment_costs SET status='void', void_reason=?, void_transaction_id=? WHERE id=?", why, tx, c.id);
    await audit(q, actor, "shipment.cost_void", c.shipment_id, why);
    await recalcShipment(q, c.shipment_id);
  });
}

export async function setAllocation(actor: Actor, shipmentId: string, method: string, manual: Record<string, string>) {
  assertLogistics(actor);
  if (!ALLOCATION[method]) throw new HttpError(400, "Выберите способ распределения");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [s] = await q<{ id: string }>("SELECT id FROM shipments_v2 WHERE id=? FOR UPDATE", shipmentId);
    if (!s) throw new HttpError(404, "Поставка не найдена");
    await q("UPDATE shipments_v2 SET allocation_method=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", method, actor.id, s.id);
    if (method === "manual") {
      for (const [unitId, value] of Object.entries(manual)) {
        await q("UPDATE inventory_units_v2 SET manual_cost_minor=? WHERE id=? AND shipment_id=?", toMinor(value, "Доля расходов", { allowZero: true }), unitId, s.id);
      }
    }
    await audit(q, actor, "shipment.allocation", s.id, ALLOCATION[method]);
    await recalcShipment(q, s.id);
  });
}

// ───────────────────────── операции: машина ─────────────────────────
export async function updateUnit(actor: Actor, unitId: string, input: { engine?: string; year?: string; color?: string; gtd?: string; certificate?: string; passport?: string; location?: string; listPrice?: string }) {
  if (!canStockEdit(actor)) throw new HttpError(403, "Нет прав на изменение техники");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [u] = await q<{ id: string; vin: string }>("SELECT id, vin FROM inventory_units_v2 WHERE id=? FOR UPDATE", unitId);
    if (!u) throw new HttpError(404, "Машина не найдена");
    const year = input.year ? Math.round(Number(input.year)) : null;
    if (year !== null && !(year >= 2000 && year <= 2100)) throw new HttpError(400, "Проверьте год выпуска");
    const listPrice = input.listPrice ? toMinor(input.listPrice, "Цена прайса", { allowZero: true }) : null;
    await q(
      "UPDATE inventory_units_v2 SET engine_number=?, year=?, color=?, gtd_number=?, certificate_number=?, passport_number=?, location=?, list_price_minor=COALESCE(?,list_price_minor), updated_by=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?",
      text(input.engine, 60), year, text(input.color, 40), text(input.gtd, 60), text(input.certificate, 60), text(input.passport, 60), text(input.location, 120), listPrice, actor.id, u.id,
    );
    await audit(q, actor, "unit.updated", u.id, `Данные машины VIN ${u.vin} изменены`);
  });
}

export async function markPdi(actor: Actor, unitId: string) {
  if (!canStockEdit(actor)) throw new HttpError(403, "Нет прав");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [u] = await q<{ id: string; status: string; pdi_done_at: string | null; received_at: string | null }>("SELECT id, status, pdi_done_at, received_at FROM inventory_units_v2 WHERE id=? FOR UPDATE", unitId);
    if (!u) throw new HttpError(404, "Машина не найдена");
    if (!u.received_at) throw new HttpError(409, "Предпродажную подготовку делают на складе: машина ещё не принята");
    if (u.pdi_done_at) throw new HttpError(409, "PDI уже отмечен");
    await q("UPDATE inventory_units_v2 SET pdi_done_at=CURRENT_TIMESTAMP, pdi_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", actor.id, u.id);
    await unitEvent(q, actor, u.id, u.status, u.status, "Предпродажная подготовка (PDI) выполнена");
  });
}

export async function setDamage(actor: Actor, unitId: string, note: string) {
  if (!canStockEdit(actor)) throw new HttpError(403, "Нет прав");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [u] = await q<{ id: string; status: string }>("SELECT id, status FROM inventory_units_v2 WHERE id=? FOR UPDATE", unitId);
    if (!u) throw new HttpError(404, "Машина не найдена");
    const value = text(note, 500);
    await q("UPDATE inventory_units_v2 SET damage_note=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", value, u.id);
    await unitEvent(q, actor, u.id, u.status, u.status, value ? `Повреждение: ${value}` : "Отметка о повреждении снята");
  });
}

export async function writeOff(actor: Actor, unitId: string, reason: string) {
  if (actor.role !== "owner") throw new HttpError(403, "Списать технику может только владелец");
  const why = text(reason, 500);
  if (why.length < 5) throw new HttpError(400, "Укажите причину списания");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [u] = await q<{ id: string; status: string; reserved_sale_id: string | null; vin: string }>("SELECT id, status, reserved_sale_id, vin FROM inventory_units_v2 WHERE id=? AND archived=0 FOR UPDATE", unitId);
    if (!u) throw new HttpError(404, "Машина не найдена");
    if (u.reserved_sale_id || ["sold", "delivered"].includes(u.status)) throw new HttpError(409, "Машина в продаже: сначала отмените продажу");
    await q("UPDATE inventory_units_v2 SET archived=1, written_off_at=CURRENT_TIMESTAMP, write_off_reason=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", why, actor.id, u.id);
    await unitEvent(q, actor, u.id, u.status, u.status, `Списана: ${why}`);
    await audit(q, actor, "unit.written_off", u.id, `VIN ${u.vin}: ${why}`);
  });
}
