/**
 * Отдел продаж: правила и операции (docs/admin-redesign/03-architecture.md §3.2, §4, §5.1, §12).
 *
 * Связи, которые держит этот модуль:
 *  - продажа резервирует машины на складе и снимает резерв при отмене;
 *  - платёж = строка продажи + проводка в кассе/счёте (account_transactions) в одной транзакции;
 *  - сторно не удаляет платёж: создаёт обратную проводку и помечает платёж void;
 *  - выдача переводит машины в «Выдана» и закрывает продажу, если долга нет;
 *  - заявка, из которой оформлена продажа, закрывается со ссылкой на продажу.
 * Все проверки на сервере: интерфейс только помогает.
 */
import type { PoolClient } from "pg";
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { normalizePhone } from "../../lib/business";
import { HttpError } from "../../lib/security";
import { getCatalog, suggestedPriceUsd } from "../../lib/catalog";
import { notify } from "./db-kit";

export type SaleCurrency = "USD" | "KGS";
export type PaymentMethod = "full" | "prepay" | "installment" | "bank_leasing" | "state_leasing";
export type SaleStatus = "booked" | "delivered" | "closed" | "cancelled";

export const METHOD: Record<PaymentMethod, { label: string; short: string; tone: "green" | "sun" | "lilac" | "sky" | "teal"; hint: string }> = {
  full: { label: "Полная оплата", short: "Полная", tone: "green", hint: "наличные или перевод, выдача после 100%" },
  prepay: { label: "Предоплата + остаток", short: "Предоплата", tone: "sun", hint: "остаток до выдачи" },
  installment: { label: "Рассрочка ATADAN", short: "Рассрочка", tone: "lilac", hint: "первый взнос и график; выдача с разрешения владельца" },
  bank_leasing: { label: "Банковский лизинг", short: "Лизинг", tone: "sky", hint: "аванс клиента, остаток платит банк" },
  state_leasing: { label: "Гослизинг 6%", short: "Гослизинг", tone: "teal", hint: "банк платит траншем, резерв длиннее" },
};
export const METHODS = Object.keys(METHOD) as PaymentMethod[];
export const BANKS = ["Айыл Банк", "Элдик Банк", "РКФР (через банк-партнёр)", "Оптима Банк", "Другой банк"];

export const LEAD_REJECT_REASONS: Record<string, string> = {
  price: "Дорого",
  financing: "Не одобрили лизинг / нет денег",
  competitor: "Купил у другого",
  timing: "Отложил покупку",
  no_contact: "Не дозвонились",
  model: "Нет нужной модели",
  duplicate: "Повторная заявка",
  other: "Другое",
};

/** Правила продаж. Позже будут редактироваться в Настройки → Компания (site_settings: sales_policy). */
export type SalesPolicy = { reserveDays: number; stateLeasingReserveDays: number; maxReserveDays: number; belowCost: "owner" | "nobody"; warrantyMonths: number; warrantyHours: number };
const DEFAULT_POLICY: SalesPolicy = { reserveDays: 14, stateLeasingReserveDays: 60, maxReserveDays: 90, belowCost: "owner", warrantyMonths: 12, warrantyHours: 1000 };

export async function salesPolicy(): Promise<SalesPolicy> {
  const row = await getRawDb().prepare("SELECT value FROM site_settings WHERE key='sales_policy'").first<{ value: string }>();
  try {
    const v = row ? (JSON.parse(row.value) as Partial<SalesPolicy>) : {};
    const max = Math.min(90, Math.max(1, Number(v.maxReserveDays) || DEFAULT_POLICY.maxReserveDays));
    return {
      reserveDays: Math.min(max, Math.max(1, Number(v.reserveDays) || DEFAULT_POLICY.reserveDays)),
      stateLeasingReserveDays: Math.min(max, Math.max(1, Number(v.stateLeasingReserveDays) || DEFAULT_POLICY.stateLeasingReserveDays)),
      maxReserveDays: max,
      belowCost: v.belowCost === "nobody" ? "nobody" : "owner",
      warrantyMonths: Math.min(120, Math.max(0, Number(v.warrantyMonths ?? DEFAULT_POLICY.warrantyMonths) || 0)),
      warrantyHours: Math.min(20000, Math.max(0, Number(v.warrantyHours ?? DEFAULT_POLICY.warrantyHours) || 0)),
    };
  } catch {
    return DEFAULT_POLICY;
  }
}

// ───────────────────────── права ─────────────────────────
export const isCompany = (a: Pick<Actor, "role">) => a.role === "owner" || a.role === "director" || a.role === "accountant";
export const isBoss = (a: Pick<Actor, "role">) => a.role === "owner" || a.role === "director";
const canSell = (a: Actor) => isBoss(a) || a.role === "manager" || a.permissions.includes("sales") || a.permissions.includes("deals");
const canMoney = (a: Actor) => isCompany(a) || a.permissions.includes("payments");

function assertSeller(a: Actor) {
  if (!canSell(a)) throw new HttpError(403, "Оформлять продажи могут менеджеры, директор и владелец");
}

/** Менеджер видит и меняет только свои продажи; бухгалтер, директор, владелец: все. */
function scopeSql(a: Actor, alias = "o") {
  return isCompany(a) ? { sql: "", args: [] as unknown[] } : { sql: `AND ${alias}.manager_id=?`, args: [a.id] as unknown[] };
}

// ───────────────────────── вспомогательное ─────────────────────────
type Q = <T = Record<string, unknown>>(sql: string, ...args: unknown[]) => Promise<T[]>;
function query(client: PoolClient): Q {
  return async <T,>(sql: string, ...args: unknown[]) => (await getRawDb().prepare(sql).bind(...args).execute<T>(client)).results;
}

const id = () => crypto.randomUUID();
const toMinor = (value: unknown, label: string, { allowZero = false } = {}) => {
  const n = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0) || n > 1_000_000_000) throw new HttpError(400, `${label}: проверьте сумму`);
  return Math.round(n * 100);
};
const rate = (value: unknown) => {
  const n = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < 1 || n > 1000) throw new HttpError(400, "Курс доллара: проверьте значение (сколько сомов за $1)");
  return Math.round(n * 10000) / 10000;
};
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const dateOnly = (value: unknown, label: string) => {
  const s = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(new Date(s).getTime())) throw new HttpError(400, `${label}: укажите дату`);
  return s;
};
const addDays = (days: number, from = new Date()) => {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const addMonths = (iso: string, months: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months, 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
};

/** Сумма в валюте продажи → сомы по курсу продажи. */
export const toKgs = (minor: number, currency: SaleCurrency, fx: number) => (currency === "KGS" ? minor : Math.round(minor * fx));

async function event(q: Q, saleId: string, actor: Actor | null, type: string, detail: string) {
  await q("INSERT INTO sale_events(id,sale_id,type,detail,actor_id) VALUES(?,?,?,?,?)", id(), saleId, type, detail.slice(0, 2000), actor?.id ?? null);
  if (actor) await q("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)", id(), actor.id, `sale.${type}`, saleId, detail.slice(0, 2000));
}

async function nextNumber(q: Q) {
  await q("SELECT pg_advisory_xact_lock(hashtext('atadan-sale-number'))");
  const year = new Date().getUTCFullYear();
  const [row] = await q<{ n: number | null }>(
    "SELECT MAX(CAST(substring(number from '^П-[0-9]{4}-([0-9]{4,})$') AS INTEGER)) AS n FROM sale_orders WHERE number LIKE ?",
    `П-${year}-%`,
  );
  return `П-${year}-${String(Number(row?.n ?? 0) + 1).padStart(4, "0")}`;
}

// ───────────────────────── чтение ─────────────────────────
export type SaleRow = {
  id: string; number: string; status: SaleStatus; sold_at: string; currency: SaleCurrency; fx_rate: number;
  payment_method: PaymentMethod; bank_name: string; bank_decision: string; total_minor: number; paid_minor: number;
  customer_id: string; customer: string; phone: string; region: string; manager: string | null; manager_id: string | null;
  items: string; reserve_until: string | null; debt_allowed_at: string | null; delivered_at: string | null; cost_kgs_minor: number;
};

const SALE_SELECT = `
  SELECT o.id, o.number, o.status, o.sold_at, o.currency, o.fx_rate::float AS fx_rate, o.payment_method, o.bank_name, o.bank_decision,
    o.total_minor, o.cost_kgs_minor, o.reserve_until::text AS reserve_until, o.debt_allowed_at, o.delivered_at, o.customer_id, o.manager_id,
    c.name AS customer, c.phone, c.region, s.display_name AS manager,
    COALESCE((SELECT SUM(CASE WHEN p.direction='in' THEN p.amount_sale_minor ELSE -p.amount_sale_minor END) FROM sale_payments p WHERE p.sale_id=o.id AND p.status='posted'),0)::bigint AS paid_minor,
    COALESCE((SELECT string_agg(CASE WHEN i.qty>1 THEN i.qty||' × '||i.title ELSE i.title END, ', ' ORDER BY i.created_at) FROM sale_order_items i WHERE i.sale_id=o.id AND (i.active=1 OR o.status='cancelled')),'') AS items
  FROM sale_orders o
  JOIN crm_customers c ON c.id=o.customer_id
  LEFT JOIN staff s ON s.id=o.manager_id`;

export type SaleView = "all" | "unpaid" | "awaiting_bank" | "ready" | "debt" | "closed" | "cancelled";
export const SALE_VIEWS: { key: SaleView; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "unpaid", label: "Ждём оплату" },
  { key: "awaiting_bank", label: "Ждём банк" },
  { key: "ready", label: "Оплачена, к выдаче" },
  { key: "debt", label: "Выдана в долг" },
  { key: "closed", label: "Закрыта" },
  { key: "cancelled", label: "Отменена" },
];

export function viewOf(s: Pick<SaleRow, "status" | "payment_method" | "bank_decision" | "total_minor" | "paid_minor">): SaleView {
  if (s.status === "cancelled") return "cancelled";
  if (s.status === "closed") return "closed";
  if (s.status === "delivered") return "debt";
  if (s.paid_minor >= s.total_minor) return "ready";
  if ((s.payment_method === "bank_leasing" || s.payment_method === "state_leasing") && s.bank_decision !== "rejected") return "awaiting_bank";
  return "unpaid";
}

export function statusLabel(s: Pick<SaleRow, "status" | "payment_method" | "bank_decision" | "total_minor" | "paid_minor">): { label: string; tone: "good" | "warn" | "bad" | "info" | "mute" } {
  const v = viewOf(s);
  if (v === "cancelled") return { label: "Отменена", tone: "mute" };
  if (v === "closed") return { label: "Закрыта", tone: "good" };
  if (v === "debt") return { label: "Выдана в долг", tone: "info" };
  if (v === "ready") return { label: "Оплачена, к выдаче", tone: "good" };
  if (v === "awaiting_bank") return s.bank_decision === "approved" ? { label: "Ждём оплату банка", tone: "warn" } : { label: "Ждём решение банка", tone: "warn" };
  if (s.bank_decision === "rejected") return { label: "Банк отказал", tone: "bad" };
  return s.paid_minor > 0 ? { label: "Частично оплачена", tone: "warn" } : { label: "Ждём оплату", tone: "warn" };
}

const VIEW_SQL: Record<SaleView, string> = {
  all: "",
  cancelled: "AND o.status='cancelled'",
  closed: "AND o.status='closed'",
  debt: "AND o.status='delivered'",
  ready: "AND o.status='booked' AND paid.v >= o.total_minor",
  awaiting_bank: "AND o.status='booked' AND paid.v < o.total_minor AND o.payment_method IN ('bank_leasing','state_leasing') AND o.bank_decision<>'rejected'",
  unpaid: "AND o.status='booked' AND paid.v < o.total_minor AND (o.payment_method NOT IN ('bank_leasing','state_leasing') OR o.bank_decision='rejected')",
};

export async function listSales(actor: Actor, f: { view: SaleView; q: string; method: string; page: number }) {
  const scope = scopeSql(actor);
  const where: string[] = ["1=1", scope.sql];
  const args: unknown[] = [...scope.args];
  if (f.q) {
    where.push("AND (lower(c.name) LIKE ? OR regexp_replace(c.phone,'\\D','','g') LIKE ? OR lower(o.number) LIKE ? OR EXISTS (SELECT 1 FROM sale_order_items i LEFT JOIN inventory_units_v2 u ON u.id=i.inventory_unit_id WHERE i.sale_id=o.id AND (lower(i.title) LIKE ? OR lower(COALESCE(u.vin,'')) LIKE ?)))");
    const like = `%${f.q.toLowerCase().replace(/[%_\\]/g, "")}%`;
    const digits = f.q.replace(/\D/g, "");
    args.push(like, digits.length >= 4 ? `%${digits}%` : "__none__", like, like, like);
  }
  if ((METHODS as string[]).includes(f.method)) {
    where.push("AND o.payment_method=?");
    args.push(f.method);
  }
  const base = `FROM sale_orders o JOIN crm_customers c ON c.id=o.customer_id
    CROSS JOIN LATERAL (SELECT COALESCE(SUM(CASE WHEN p.direction='in' THEN p.amount_sale_minor ELSE -p.amount_sale_minor END),0) AS v FROM sale_payments p WHERE p.sale_id=o.id AND p.status='posted') paid
    WHERE ${where.join(" ")}`;
  const db = getRawDb();
  const pageSize = 30;
  const [rows, counts] = await Promise.all([
    db.prepare(`${SALE_SELECT} WHERE o.id IN (SELECT o.id ${base} ${VIEW_SQL[f.view]} ORDER BY o.sold_at DESC LIMIT ${pageSize + 1} OFFSET ${(f.page - 1) * pageSize}) ORDER BY o.sold_at DESC`).bind(...args).all<SaleRow>(),
    db.prepare(`SELECT
        COUNT(*)::int AS all,
        COUNT(*) FILTER (WHERE true ${VIEW_SQL.unpaid})::int AS unpaid,
        COUNT(*) FILTER (WHERE true ${VIEW_SQL.awaiting_bank})::int AS awaiting_bank,
        COUNT(*) FILTER (WHERE true ${VIEW_SQL.ready})::int AS ready,
        COUNT(*) FILTER (WHERE true ${VIEW_SQL.debt})::int AS debt,
        COUNT(*) FILTER (WHERE true ${VIEW_SQL.closed})::int AS closed,
        COUNT(*) FILTER (WHERE true ${VIEW_SQL.cancelled})::int AS cancelled
      ${base}`).bind(...args).first<Record<SaleView, number>>(),
  ]);
  const list = rows.results.map(normalizeRow);
  return { rows: list.slice(0, pageSize), hasMore: list.length > pageSize, counts: counts ?? ({} as Record<SaleView, number>) };
}

function normalizeRow<T extends SaleRow>(r: T): T {
  return { ...r, total_minor: Number(r.total_minor), paid_minor: Number(r.paid_minor), cost_kgs_minor: Number(r.cost_kgs_minor), fx_rate: Number(r.fx_rate) };
}

export type SaleItem = { id: string; kind: "unit" | "model_order" | "part" | "service"; inventory_unit_id: string | null; tractor_slug: string | null; title: string; qty: number; price_minor: number; list_price_minor: number; cost_kgs_minor: number; vin: string | null; unit_status: string | null; active: number };
export type SalePayment = { id: string; direction: "in" | "out"; payer: "client" | "bank"; account: string; currency: SaleCurrency; amount_minor: number; fx_rate: number; amount_sale_minor: number; paid_at: string; method: string; reference: string; status: "posted" | "void"; void_reason: string; author: string | null };
export type SaleScheduleRow = { id: string; kind: string; payer: string; due_date: string; amount_minor: number; note: string };
export type SaleEvent = { id: string; type: string; detail: string; created_at: string; author: string | null };

export async function getSale(actor: Actor, saleId: string) {
  const scope = scopeSql(actor);
  const db = getRawDb();
  const sale = await db.prepare(`${SALE_SELECT} WHERE o.id=? ${scope.sql}`).bind(saleId, ...scope.args).first<SaleRow & { notes: string; below_cost_reason: string; cancel_reason: string; cancelled_at: string | null; dossier_json: string; bank_note: string; list_total_minor: number; lead_id: string | null; legacy_deal_id: string | null; debt_allowed_by_name: string | null }>();
  if (!sale) return null;
  const extra = await db.prepare("SELECT o.notes, o.below_cost_reason, o.cancel_reason, o.cancelled_at, o.dossier_json, o.bank_note, o.list_total_minor, o.lead_id, o.legacy_deal_id, s.display_name AS debt_allowed_by_name FROM sale_orders o LEFT JOIN staff s ON s.id=o.debt_allowed_by WHERE o.id=?").bind(saleId).first<Record<string, unknown>>();
  const [items, payments, schedule, events] = await Promise.all([
    db.prepare("SELECT i.*, u.vin, u.status AS unit_status FROM sale_order_items i LEFT JOIN inventory_units_v2 u ON u.id=i.inventory_unit_id WHERE i.sale_id=? ORDER BY i.created_at").bind(saleId).all<SaleItem>(),
    db.prepare("SELECT p.*, p.fx_rate::float AS fx_rate, a.name AS account, s.display_name AS author FROM sale_payments p JOIN financial_accounts a ON a.id=p.account_id LEFT JOIN staff s ON s.id=p.created_by WHERE p.sale_id=? ORDER BY p.paid_at, p.created_at").bind(saleId).all<SalePayment>(),
    db.prepare("SELECT id, kind, payer, due_date::text AS due_date, amount_minor, note FROM sale_schedule WHERE sale_id=? ORDER BY due_date").bind(saleId).all<SaleScheduleRow>(),
    db.prepare("SELECT e.id, e.type, e.detail, e.created_at, s.display_name AS author FROM sale_events e LEFT JOIN staff s ON s.id=e.actor_id WHERE e.sale_id=? ORDER BY e.created_at DESC LIMIT 100").bind(saleId).all<SaleEvent>(),
  ]);
  return {
    sale: normalizeRow({ ...sale, ...extra, list_total_minor: Number(extra?.list_total_minor ?? 0) }),
    items: items.results.map((i) => ({ ...i, price_minor: Number(i.price_minor), cost_kgs_minor: Number(i.cost_kgs_minor), list_price_minor: Number(i.list_price_minor) })),
    payments: payments.results.map((p) => ({ ...p, amount_minor: Number(p.amount_minor), amount_sale_minor: Number(p.amount_sale_minor) })),
    schedule: schedule.results.map((s) => ({ ...s, amount_minor: Number(s.amount_minor) })),
    events: events.results,
  };
}

/** Машины, которые можно продать: не зарезервированы, не проданы. В пути и на таможне тоже можно (предоплата). */
export async function sellableUnits() {
  const { results } = await getRawDb()
    .prepare(`SELECT u.id, u.vin, u.model, u.tractor_slug, u.status, u.list_price_minor, CASE WHEN u.landed_cost_minor>0 THEN u.landed_cost_minor ELSE u.purchase_cost_minor END AS cost_minor
      FROM inventory_units_v2 u
      WHERE u.archived=0 AND u.status IN ('stock','ordered','production','transit','customs') AND u.reserved_sale_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM sale_order_items i WHERE i.inventory_unit_id=u.id AND i.active=1)
      ORDER BY CASE u.status WHEN 'stock' THEN 0 ELSE 1 END, u.model, u.vin LIMIT 500`)
    .all<{ id: string; vin: string; model: string; tractor_slug: string; status: string; list_price_minor: number; cost_minor: number }>();
  return results.map((u) => ({ ...u, list_price_minor: Number(u.list_price_minor), cost_minor: Number(u.cost_minor) }));
}

export async function catalogModels() {
  const catalog = await getCatalog();
  return catalog.map((t) => ({ slug: t.slug, model: t.model, hp: t.hp, priceUsd: t.approximatePriceUsd ?? suggestedPriceUsd(t.hp) }));
}

export async function moneyAccounts() {
  const { results } = await getRawDb().prepare("SELECT id, name, currency, account_type FROM financial_accounts WHERE active=1 AND account_type IN ('cash','bank') ORDER BY account_type, name").all<{ id: string; name: string; currency: string; account_type: string }>();
  return results;
}

// ───────────────────────── оформление ─────────────────────────
export type NewSaleInput = {
  customerId?: string;
  customer?: { name: string; phone: string; region?: string };
  leadId?: string;
  currency: SaleCurrency;
  fxRate: number | string;
  method: PaymentMethod;
  bankName?: string;
  items: { kind: "unit" | "model_order" | "part" | "service"; unitId?: string; partId?: string; slug?: string; title?: string; qty?: number; price: number | string }[];
  advance?: number | string;
  advanceDue?: string;
  months?: number;
  firstDue?: string;
  reserveDays?: number;
  belowCostReason?: string;
  notes?: string;
};

export async function createSale(actor: Actor, input: NewSaleInput) {
  assertSeller(actor);
  const policy = await salesPolicy();
  const currency: SaleCurrency = input.currency === "KGS" ? "KGS" : "USD";
  const fx = currency === "KGS" ? 1 : rate(input.fxRate);
  if (!METHODS.includes(input.method)) throw new HttpError(400, "Выберите способ оплаты");
  const method = input.method;
  const bankName = text(input.bankName, 120);
  if ((method === "bank_leasing" || method === "state_leasing") && !bankName) throw new HttpError(400, "Укажите банк или программу лизинга");
  if (!Array.isArray(input.items) || !input.items.length) throw new HttpError(400, "Добавьте хотя бы одну позицию: машину, запчасть или услугу");
  if (input.items.length > 50) throw new HttpError(400, "Слишком много позиций в одной продаже");
  const defaultDays = method === "state_leasing" ? policy.stateLeasingReserveDays : policy.reserveDays;
  const reserveDays = Math.round(Number(input.reserveDays) || defaultDays);
  if (reserveDays < 1 || reserveDays > policy.maxReserveDays) throw new HttpError(400, `Резерв: от 1 до ${policy.maxReserveDays} дней`);
  const catalog = new Map((await catalogModels()).map((m) => [m.slug, m]));

  return getRawDb().transaction(async (client) => {
    const q = query(client);
    // 1. Клиент: выбранный или новый (дубликат по телефону не создаём: берём существующего)
    let customerId = text(input.customerId, 100);
    let customerNote = "";
    if (customerId) {
      const [c] = await q<{ id: string }>("SELECT id FROM crm_customers WHERE id=? AND archived=0", customerId);
      if (!c) throw new HttpError(404, "Клиент не найден. Выберите другого или создайте нового");
    } else {
      const name = text(input.customer?.name, 160);
      if (name.length < 2) throw new HttpError(400, "Укажите имя клиента или название хозяйства");
      const phone = normalizePhone(text(input.customer?.phone, 40));
      const [existing] = await q<{ id: string; name: string }>("SELECT id, name FROM crm_customers WHERE normalized_phone=? AND archived=0", phone);
      if (existing) {
        customerId = existing.id;
        customerNote = `Клиент с телефоном +${phone} уже был в базе (${existing.name}), продажа оформлена на него`;
      } else {
        customerId = id();
        await q("INSERT INTO crm_customers(id,name,phone,region,source,normalized_phone,assigned_to) VALUES(?,?,?,?,?,?,?)", customerId, name, `+${phone}`, text(input.customer?.region, 80), input.leadId ? "website" : "office", phone, actor.id);
      }
    }

    // 2. Позиции: блокируем машины, проверяем, что их никто не продал раньше
    let total = 0, listTotal = 0, costKgs = 0, unknownCost = false;
    const rows: { kind: string; unitId: string | null; partId?: string; slug: string | null; title: string; qty: number; price: number; list: number; cost: number }[] = [];
    for (const item of input.items) {
      const price = toMinor(item.price, "Цена позиции");
      if (item.kind === "unit") {
        const unitId = text(item.unitId, 100);
        const [u] = await q<{ id: string; vin: string; model: string; tractor_slug: string; status: string; reserved_sale_id: string | null; list_price_minor: number; cost: number }>(
          "SELECT id, vin, model, tractor_slug, status, reserved_sale_id, list_price_minor, CASE WHEN landed_cost_minor>0 THEN landed_cost_minor ELSE purchase_cost_minor END AS cost FROM inventory_units_v2 WHERE id=? AND archived=0 FOR UPDATE",
          unitId,
        );
        if (!u) throw new HttpError(404, "Машина не найдена на складе");
        if (u.reserved_sale_id || ["reserved", "sold", "delivered"].includes(u.status)) throw new HttpError(409, `VIN ${u.vin} уже зарезервирован или продан. Выберите другую машину`);
        if (rows.some((r) => r.unitId === u.id)) throw new HttpError(400, `VIN ${u.vin} добавлен дважды`);
        const listSale = currency === "KGS" ? Number(u.list_price_minor) : Math.round(Number(u.list_price_minor) / fx);
        rows.push({ kind: "unit", unitId: u.id, slug: u.tractor_slug, title: `${u.model} · VIN ${u.vin}`, qty: 1, price, list: listSale, cost: Number(u.cost) });
        if (!Number(u.cost)) unknownCost = true;
      } else if (item.kind === "model_order") {
        const m = catalog.get(text(item.slug, 80));
        if (!m) throw new HttpError(400, "Выберите модель из каталога");
        const qty = Math.max(1, Math.min(50, Math.round(Number(item.qty) || 1)));
        const listUsd = m.priceUsd * 100;
        rows.push({ kind: "model_order", unitId: null, slug: m.slug, title: `${m.model} · под заказ`, qty, price, list: currency === "USD" ? listUsd : Math.round(listUsd * fx), cost: 0 });
        unknownCost = true;
      } else if (item.kind === "part" && item.partId) {
        // запчасть со склада: блокируем строку, проверяем остаток; списание ниже, вместе с продажей
        const qty = Math.max(1, Math.min(10_000, Math.round(Number(item.qty) || 1)));
        const [pt] = await q<{ id: string; sku: string; name: string; qty: number; cost_minor: number; price_minor: number; archived: number }>("SELECT id, sku, name, qty, cost_minor, price_minor, archived FROM parts WHERE id=? FOR UPDATE", text(item.partId, 100));
        if (!pt || pt.archived) throw new HttpError(404, "Запчасть не найдена на складе");
        const already = rows.filter((r) => r.partId === pt.id).reduce((n, r) => n + r.qty, 0);
        if (pt.qty < already + qty) throw new HttpError(409, `${pt.name} (${pt.sku}): на складе только ${pt.qty}`);
        const costInSale = Number(pt.cost_minor);
        rows.push({ kind: "part", unitId: null, partId: pt.id, slug: null, title: `${pt.name} · ${pt.sku}`, qty, price, list: currency === "KGS" ? Number(pt.price_minor) : Math.round(Number(pt.price_minor) / fx), cost: costInSale });
      } else if (item.kind === "part" || item.kind === "service") {
        const title = text(item.title, 200);
        if (title.length < 2) throw new HttpError(400, "Укажите название запчасти или услуги");
        const qty = Math.max(1, Math.min(1000, Math.round(Number(item.qty) || 1)));
        rows.push({ kind: item.kind, unitId: null, slug: null, title, qty, price, list: price, cost: 0 });
      } else throw new HttpError(400, "Неизвестный тип позиции");
    }
    for (const r of rows) {
      total += r.price * r.qty;
      listTotal += r.list * r.qty;
      costKgs += r.cost * r.qty;
    }
    if (total <= 0) throw new HttpError(400, "Сумма продажи должна быть больше нуля");

    // 3. Цена не ниже себестоимости (решение владельца от 05.11.2026)
    const belowCostReason = text(input.belowCostReason, 500);
    if (costKgs > 0 && toKgs(total, currency, fx) < costKgs) {
      if (policy.belowCost === "nobody" || actor.role !== "owner") throw new HttpError(409, "Цена ниже допустимой: продать дешевле себестоимости может только владелец, с причиной");
      if (belowCostReason.length < 5) throw new HttpError(400, "Цена ниже себестоимости: укажите причину (не короче 5 символов)");
    }

    // 4. Аванс и график по способу оплаты
    const reserveUntil = addDays(reserveDays);
    const schedule: { kind: string; payer: string; due: string; amount: number }[] = [];
    const advance = input.advance === undefined || input.advance === "" ? 0 : toMinor(input.advance, "Аванс", { allowZero: true });
    if (advance > total) throw new HttpError(400, "Аванс больше суммы продажи");
    const advanceDue = input.advanceDue ? dateOnly(input.advanceDue, "Срок аванса") : addDays(3);
    if (method === "full") schedule.push({ kind: "balance", payer: "client", due: reserveUntil, amount: total });
    if (method === "prepay") {
      if (!advance) throw new HttpError(400, "Предоплата: укажите сумму предоплаты");
      schedule.push({ kind: "advance", payer: "client", due: advanceDue, amount: advance });
      if (total - advance > 0) schedule.push({ kind: "balance", payer: "client", due: reserveUntil, amount: total - advance });
    }
    if (method === "installment") {
      if (!advance) throw new HttpError(400, "Рассрочка: укажите первый взнос");
      const months = Math.round(Number(input.months) || 0);
      if (months < 1 || months > 36) throw new HttpError(400, "Рассрочка: срок от 1 до 36 месяцев");
      const firstDue = input.firstDue ? dateOnly(input.firstDue, "Первый платёж по графику") : addMonths(advanceDue, 1);
      schedule.push({ kind: "advance", payer: "client", due: advanceDue, amount: advance });
      const rest = total - advance, part = Math.floor(rest / months);
      for (let m = 0; m < months; m++) {
        const amount = m === months - 1 ? rest - part * (months - 1) : part;
        if (amount > 0) schedule.push({ kind: "installment", payer: "client", due: addMonths(firstDue, m), amount });
      }
    }
    if (method === "bank_leasing" || method === "state_leasing") {
      if (advance) schedule.push({ kind: "advance", payer: "client", due: advanceDue, amount: advance });
      if (total - advance > 0) schedule.push({ kind: "bank", payer: "bank", due: reserveUntil, amount: total - advance });
    }

    // 5. Запись продажи
    const saleId = id();
    const number = await nextNumber(q);
    const leadId = text(input.leadId, 100) || null;
    if (leadId) {
      const [lead] = await q<{ id: string; sale_id: string | null }>("SELECT id, sale_id FROM leads WHERE id=? FOR UPDATE", leadId);
      if (!lead) throw new HttpError(404, "Заявка не найдена");
      if (lead.sale_id) throw new HttpError(409, "По этой заявке продажа уже оформлена");
    }
    await q(
      `INSERT INTO sale_orders(id,number,customer_id,lead_id,manager_id,status,currency,fx_rate,payment_method,bank_name,bank_decision,total_minor,list_total_minor,cost_kgs_minor,below_cost_reason,reserve_until,notes,created_by)
       VALUES(?,?,?,?,?,'booked',?,?,?,?,?,?,?,?,?,?,?,?)`,
      saleId, number, customerId, leadId, actor.id, currency, fx, method, bankName, method.endsWith("leasing") ? "pending" : "none",
      total, listTotal, costKgs, belowCostReason, reserveUntil, text(input.notes, 2000), actor.id,
    );
    for (const r of rows) {
      await q("INSERT INTO sale_order_items(id,sale_id,kind,inventory_unit_id,tractor_slug,title,qty,price_minor,list_price_minor,cost_kgs_minor,part_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)", id(), saleId, r.kind, r.unitId, r.slug, r.title, r.qty, r.price, r.list, r.cost, r.partId ?? null);
      if (r.partId) {
        const [pt] = await q<{ qty: number; min_qty: number }>("UPDATE parts SET qty=qty-?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND qty>=? RETURNING qty, min_qty", r.qty, r.partId, r.qty);
        if (!pt) throw new HttpError(409, `${r.title}: не хватает на складе`);
        if (pt.min_qty > 0 && pt.qty <= pt.min_qty && pt.qty + r.qty > pt.min_qty) await notify(q, { topic: "parts", title: `Пора заказать: ${r.title}`, body: `Осталось ${pt.qty}, минимум ${pt.min_qty}`, url: `/admin/work/parts/${r.partId}`, roles: ["owner", "director", "accountant"], perms: ["inventory-units"] });
        await q("INSERT INTO part_movements(id,part_id,kind,qty_delta,qty_after,unit_cost_minor,sale_id,note,created_by) VALUES(?,?,'sale',?,?,?,?,?,?)", id(), r.partId, -r.qty, pt.qty, r.cost, saleId, `Продажа ${number}`, actor.id);
      }
      if (r.unitId) {
        const [u] = await q<{ status: string }>("SELECT status FROM inventory_units_v2 WHERE id=?", r.unitId);
        await q("UPDATE inventory_units_v2 SET reserved_sale_id=?, status=CASE WHEN status='stock' THEN 'reserved' ELSE status END, updated_by=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", saleId, actor.id, r.unitId);
        await q("INSERT INTO inventory_lifecycle_events(id,inventory_unit_id,from_status,to_status,actor_id,note) VALUES(?,?,?,?,?,?)", id(), r.unitId, u.status, u.status === "stock" ? "reserved" : u.status, actor.id, `Резерв под продажу ${number} до ${reserveUntil}`);
      }
    }
    for (const s of schedule) await q("INSERT INTO sale_schedule(id,sale_id,kind,payer,due_date,amount_minor) VALUES(?,?,?,?,?,?)", id(), saleId, s.kind, s.payer, s.due, s.amount);
    if (leadId) await q("UPDATE leads SET status='closed', sale_id=?, handled_at=COALESCE(handled_at,CURRENT_TIMESTAMP), assigned_to=COALESCE(assigned_to,?) WHERE id=?", saleId, actor.id, leadId);
    await event(q, saleId, actor, "created", `Продажа оформлена: ${METHOD[method].label}${bankName ? `, ${bankName}` : ""}. Резерв до ${reserveUntil}.${unknownCost ? " Есть позиции без себестоимости: маржа предварительная." : ""}`);
    if (customerNote) await event(q, saleId, actor, "customer", customerNote);
    if (belowCostReason) await event(q, saleId, actor, "below_cost", `Цена ниже себестоимости. Причина: ${belowCostReason}`);
    if (belowCostReason) await notify(q, { topic: "approvals", priority: "high", title: `Продажа ${number} ниже себестоимости`, body: belowCostReason, url: `/admin/work/sales/${saleId}`, exclude: actor.id, entity: { type: "sale", id: saleId } });
    return { id: saleId, number };
  });
}

// ───────────────────────── операции с продажей ─────────────────────────
type LockedSale = { id: string; number: string; status: SaleStatus; currency: SaleCurrency; fx_rate: number; payment_method: PaymentMethod; total_minor: number; manager_id: string | null; sold_at: string; reserve_until: string | null; debt_allowed_at: string | null; bank_decision: string };

async function lockSale(q: Q, actor: Actor, saleId: string) {
  const [s] = await q<LockedSale>("SELECT id, number, status, currency, fx_rate::float AS fx_rate, payment_method, total_minor, manager_id, sold_at, reserve_until::text AS reserve_until, debt_allowed_at, bank_decision FROM sale_orders WHERE id=? FOR UPDATE", saleId);
  if (!s || (!isCompany(actor) && s.manager_id !== actor.id)) throw new HttpError(404, "Продажа не найдена");
  return { ...s, total_minor: Number(s.total_minor), fx_rate: Number(s.fx_rate) };
}

async function paidOf(q: Q, saleId: string) {
  const [r] = await q<{ v: number }>("SELECT COALESCE(SUM(CASE WHEN direction='in' THEN amount_sale_minor ELSE -amount_sale_minor END),0)::bigint AS v FROM sale_payments WHERE sale_id=? AND status='posted'", saleId);
  return Number(r?.v ?? 0);
}

async function refreshClosed(q: Q, s: LockedSale) {
  const paid = await paidOf(q, s.id);
  if (s.status === "delivered" && paid >= s.total_minor) {
    await q("UPDATE sale_orders SET status='closed', updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", s.id);
    await event(q, s.id, null, "closed", "Долг погашен, продажа закрыта");
  }
  if (s.status === "closed" && paid < s.total_minor) {
    await q("UPDATE sale_orders SET status='delivered', updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", s.id);
    await event(q, s.id, null, "reopened", "После сторно появился долг: продажа снова «Выдана в долг»");
  }
}

export type PaymentInput = { payer: "client" | "bank"; accountId: string; currency: SaleCurrency; amount: string | number; fxRate?: string | number; paidAt: string; method: string; reference?: string };

/** Пересчёт платежа в валюту продажи. Курс: сомов за $1 на дату платежа. */
export function convertPayment(amountMinor: number, payCurrency: SaleCurrency, saleCurrency: SaleCurrency, fx: number) {
  const kgs = payCurrency === "KGS" ? amountMinor : Math.round(amountMinor * fx);
  const sale = payCurrency === saleCurrency ? amountMinor : saleCurrency === "KGS" ? kgs : Math.round(amountMinor / fx);
  return { kgs, sale };
}

export async function addPayment(actor: Actor, saleId: string, input: PaymentInput) {
  if (!canMoney(actor) && actor.role !== "manager") throw new HttpError(403, "Платежи записывают бухгалтер, менеджер, директор и владелец");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const s = await lockSale(q, actor, saleId);
    if (s.status === "cancelled") throw new HttpError(409, "Продажа отменена: платёж не принимается");
    const payer = input.payer === "bank" ? "bank" : "client";
    if (actor.role === "manager" && payer === "bank") throw new HttpError(403, "Оплату банка записывает бухгалтер");
    if (payer === "bank" && !s.payment_method.endsWith("leasing")) throw new HttpError(400, "Банк платит только при лизинге");
    const [account] = await q<{ id: string; currency: string; name: string }>("SELECT id, currency, name FROM financial_accounts WHERE id=? AND active=1 AND account_type IN ('cash','bank')", text(input.accountId, 100));
    if (!account) throw new HttpError(400, "Выберите кассу или счёт");
    const currency: SaleCurrency = input.currency === "USD" ? "USD" : "KGS";
    if (account.currency !== currency) throw new HttpError(400, `«${account.name}» ведётся в ${account.currency}: выберите платёж в этой валюте или другую кассу`);
    const amount = toMinor(input.amount, "Сумма платежа");
    const needsRate = currency !== s.currency || currency === "USD";
    const fx = needsRate ? rate(input.fxRate) : 1;
    const { kgs, sale } = convertPayment(amount, currency, s.currency, fx);
    const paid = await paidOf(q, s.id);
    if (paid + sale > s.total_minor) throw new HttpError(409, `Платёж больше остатка по продаже. Осталось оплатить: ${((s.total_minor - paid) / 100).toLocaleString("ru-RU")} ${s.currency === "USD" ? "$" : "с"}`);
    const paidAt = dateOnly(input.paidAt, "Дата платежа");
    if (new Date(paidAt) > new Date(addDays(1))) throw new HttpError(400, "Дата платежа не может быть в будущем");
    const paymentId = id(), txId = id();
    await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,payment_id,occurred_at,description,created_by) VALUES(?,?, 'in', ?, 'Оплата продажи', ?, ?, ?, ?)", txId, account.id, amount, paymentId, paidAt, `Продажа ${s.number}${payer === "bank" ? " · оплата банка" : ""}`, actor.id);
    await q(
      "INSERT INTO sale_payments(id,sale_id,direction,payer,account_id,currency,amount_minor,fx_rate,amount_sale_minor,amount_kgs_minor,paid_at,method,reference,transaction_id,created_by) VALUES(?,?,'in',?,?,?,?,?,?,?,?,?,?,?,?)",
      paymentId, s.id, payer, account.id, currency, amount, fx, sale, kgs, paidAt, text(input.method, 40) || "bank_transfer", text(input.reference, 200), txId, actor.id,
    );
    if (payer === "bank" && s.bank_decision !== "approved") await q("UPDATE sale_orders SET bank_decision='approved' WHERE id=?", s.id);
    await event(q, s.id, actor, "payment", `Платёж ${(amount / 100).toLocaleString("ru-RU")} ${currency === "USD" ? "$" : "с"} от ${payer === "bank" ? "банка" : "клиента"} · ${account.name}`);
    if (s.manager_id && s.manager_id !== actor.id) await notify(q, { topic: "payments", title: `Оплата по продаже ${s.number}`, body: `${(amount / 100).toLocaleString("ru-RU")} ${currency === "USD" ? "$" : "с"} от ${payer === "bank" ? "банка" : "клиента"}`, url: `/admin/work/sales/${s.id}`, to: [s.manager_id], entity: { type: "sale", id: s.id } });
    await q("UPDATE sale_orders SET updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", s.id);
    await refreshClosed(q, s);
    return { paymentId };
  });
}

/** Сторно: ошибочный платёж не удаляется, создаётся обратная проводка. */
export async function voidPayment(actor: Actor, paymentId: string, reason: string) {
  if (!isCompany(actor)) throw new HttpError(403, "Сторно делает бухгалтер, директор или владелец");
  const why = text(reason, 500);
  if (why.length < 5) throw new HttpError(400, "Укажите причину сторно (не короче 5 символов)");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [p] = await q<{ id: string; sale_id: string; status: string; direction: string; account_id: string; amount_minor: number; currency: string }>("SELECT id, sale_id, status, direction, account_id, amount_minor, currency FROM sale_payments WHERE id=? FOR UPDATE", paymentId);
    if (!p) throw new HttpError(404, "Платёж не найден");
    if (p.status === "void") throw new HttpError(409, "Платёж уже сторнирован");
    const s = await lockSale(q, actor, p.sale_id);
    const txId = id();
    await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,payment_id,occurred_at,description,created_by) VALUES(?,?,?,?, 'Сторно оплаты', ?, CURRENT_TIMESTAMP, ?, ?)", txId, p.account_id, p.direction === "in" ? "out" : "in", p.amount_minor, p.id, `Сторно платежа по продаже ${s.number}: ${why}`, actor.id);
    await q("UPDATE sale_payments SET status='void', void_reason=?, void_transaction_id=? WHERE id=?", why, txId, p.id);
    await event(q, s.id, actor, "void", `Сторно платежа ${(Number(p.amount_minor) / 100).toLocaleString("ru-RU")} ${p.currency === "USD" ? "$" : "с"}: ${why}`);
    await refreshClosed(q, s);
  });
}

/** Возврат денег клиенту (например, при отмене после аванса). */
export async function refund(actor: Actor, saleId: string, input: { accountId: string; currency: SaleCurrency; amount: string | number; fxRate?: string | number; reason: string }) {
  if (!isCompany(actor)) throw new HttpError(403, "Возврат оформляет бухгалтер, директор или владелец");
  const why = text(input.reason, 500);
  if (why.length < 5) throw new HttpError(400, "Укажите причину возврата");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const s = await lockSale(q, actor, saleId);
    const [account] = await q<{ id: string; currency: string; name: string }>("SELECT id, currency, name FROM financial_accounts WHERE id=? AND active=1 AND account_type IN ('cash','bank')", text(input.accountId, 100));
    if (!account) throw new HttpError(400, "Выберите кассу или счёт");
    const currency: SaleCurrency = input.currency === "USD" ? "USD" : "KGS";
    if (account.currency !== currency) throw new HttpError(400, `«${account.name}» ведётся в ${account.currency}`);
    const amount = toMinor(input.amount, "Сумма возврата");
    const fx = currency !== s.currency || currency === "USD" ? rate(input.fxRate) : 1;
    const { kgs, sale } = convertPayment(amount, currency, s.currency, fx);
    if (sale > (await paidOf(q, s.id))) throw new HttpError(409, "Возврат больше, чем клиент заплатил");
    const paymentId = id(), txId = id();
    await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,payment_id,occurred_at,description,created_by) VALUES(?,?, 'out', ?, 'Возврат клиенту', ?, CURRENT_TIMESTAMP, ?, ?)", txId, account.id, amount, paymentId, `Возврат по продаже ${s.number}: ${why}`, actor.id);
    await q("INSERT INTO sale_payments(id,sale_id,direction,payer,account_id,currency,amount_minor,fx_rate,amount_sale_minor,amount_kgs_minor,paid_at,method,reference,transaction_id,created_by) VALUES(?,?,'out','client',?,?,?,?,?,?,CURRENT_TIMESTAMP,'refund',?,?,?)", paymentId, s.id, account.id, currency, amount, fx, sale, kgs, why, txId, actor.id);
    await event(q, s.id, actor, "refund", `Возврат клиенту ${(amount / 100).toLocaleString("ru-RU")} ${currency === "USD" ? "$" : "с"} · ${account.name}: ${why}`);
    await refreshClosed(q, s);
  });
}

export async function setBankDecision(actor: Actor, saleId: string, decision: "approved" | "rejected", note: string) {
  assertSeller(actor);
  const why = text(note, 500);
  if (decision === "rejected" && why.length < 3) throw new HttpError(400, "Укажите причину отказа банка");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const s = await lockSale(q, actor, saleId);
    if (!s.payment_method.endsWith("leasing")) throw new HttpError(400, "Решение банка нужно только для лизинга");
    if (s.status !== "booked") throw new HttpError(409, "Продажа уже выдана или отменена");
    await q("UPDATE sale_orders SET bank_decision=?, bank_note=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", decision, why, s.id);
    await event(q, s.id, actor, "bank", decision === "approved" ? `Банк одобрил лизинг${why ? `: ${why}` : ""}` : `Банк отказал: ${why}. Дальше: сменить банк, сменить способ оплаты или отменить продажу`);
  });
}

export async function changeMethod(actor: Actor, saleId: string, method: PaymentMethod, bankName: string) {
  assertSeller(actor);
  if (!METHODS.includes(method)) throw new HttpError(400, "Выберите способ оплаты");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const s = await lockSale(q, actor, saleId);
    if (s.status !== "booked") throw new HttpError(409, "Способ оплаты меняется только до выдачи");
    const bank = text(bankName, 120);
    if (method.endsWith("leasing") && !bank) throw new HttpError(400, "Укажите банк");
    await q("UPDATE sale_orders SET payment_method=?, bank_name=?, bank_decision=?, bank_note='', updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", method, method.endsWith("leasing") ? bank : "", method.endsWith("leasing") ? "pending" : "none", s.id);
    await q("DELETE FROM sale_schedule WHERE sale_id=? AND kind IN ('bank','balance')", s.id);
    const paid = await paidOf(q, s.id);
    const rest = s.total_minor - paid;
    if (rest > 0) await q("INSERT INTO sale_schedule(id,sale_id,kind,payer,due_date,amount_minor) VALUES(?,?,?,?,?,?)", id(), s.id, method.endsWith("leasing") ? "bank" : "balance", method.endsWith("leasing") ? "bank" : "client", s.reserve_until ?? addDays(14), rest);
    await event(q, s.id, actor, "method", `Способ оплаты изменён: ${METHOD[method].label}${bank && method.endsWith("leasing") ? `, ${bank}` : ""}`);
  });
}

/** Разрешить выдачу в долг (рассрочка или особый случай): только владелец. */
export async function allowDebt(actor: Actor, saleId: string) {
  if (actor.role !== "owner") throw new HttpError(403, "Разрешить выдачу в долг может только владелец");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const s = await lockSale(q, actor, saleId);
    if (s.status !== "booked") throw new HttpError(409, "Продажа уже выдана или отменена");
    const paid = await paidOf(q, s.id);
    if (s.payment_method === "installment" && paid <= 0) throw new HttpError(409, "Рассрочка: сначала нужен первый взнос");
    await q("UPDATE sale_orders SET debt_allowed_by=?, debt_allowed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", actor.id, s.id);
    await event(q, s.id, actor, "debt_allowed", `Владелец разрешил выдачу в долг. Остаток: ${((s.total_minor - paid) / 100).toLocaleString("ru-RU")} ${s.currency === "USD" ? "$" : "с"}`);
  });
}

export async function deliver(actor: Actor, saleId: string) {
  assertSeller(actor);
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const s = await lockSale(q, actor, saleId);
    if (s.status !== "booked") throw new HttpError(409, "Продажа уже выдана или отменена");
    const paid = await paidOf(q, s.id);
    if (paid < s.total_minor && !s.debt_allowed_at) throw new HttpError(409, "Выдача возможна после полной оплаты или с разрешения владельца");
    const items = await q<{ id: string; kind: string; inventory_unit_id: string | null; title: string }>("SELECT id, kind, inventory_unit_id, title FROM sale_order_items WHERE sale_id=? AND active=1", s.id);
    const pending = items.filter((i) => i.kind === "model_order");
    if (pending.length) throw new HttpError(409, `Сначала привяжите VIN к позиции «${pending[0].title}»: машина под заказ ещё не выбрана`);
    for (const it of items.filter((i) => i.inventory_unit_id)) {
      const [u] = await q<{ status: string; vin: string }>("SELECT status, vin FROM inventory_units_v2 WHERE id=? FOR UPDATE", it.inventory_unit_id);
      if (!["stock", "reserved"].includes(u.status)) throw new HttpError(409, `VIN ${u.vin} ещё не на складе (статус: ${u.status}). Выдать можно только машину на складе`);
      await q("UPDATE inventory_units_v2 SET status='delivered', updated_by=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", actor.id, it.inventory_unit_id);
      await q("INSERT INTO inventory_lifecycle_events(id,inventory_unit_id,from_status,to_status,actor_id,note) VALUES(?,?,?,'delivered',?,?)", id(), it.inventory_unit_id, u.status, actor.id, `Выдана по продаже ${s.number}`);
    }
    const status = paid >= s.total_minor ? "closed" : "delivered";
    await q("UPDATE sale_orders SET status=?, delivered_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", status, s.id);
    await event(q, s.id, actor, "delivered", status === "closed" ? "Техника выдана клиенту, продажа закрыта" : "Техника выдана в долг");
  });
}

export async function attachUnit(actor: Actor, itemId: string, unitId: string) {
  assertSeller(actor);
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [item] = await q<{ id: string; sale_id: string; kind: string; tractor_slug: string; qty: number; price_minor: number; list_price_minor: number }>("SELECT id, sale_id, kind, tractor_slug, qty, price_minor, list_price_minor FROM sale_order_items WHERE id=? AND active=1 FOR UPDATE", itemId);
    if (!item || item.kind !== "model_order") throw new HttpError(404, "Позиция «под заказ» не найдена");
    const s = await lockSale(q, actor, item.sale_id);
    if (s.status !== "booked") throw new HttpError(409, "Продажа уже выдана или отменена");
    const [u] = await q<{ id: string; vin: string; model: string; tractor_slug: string; status: string; reserved_sale_id: string | null; cost: number }>("SELECT id, vin, model, tractor_slug, status, reserved_sale_id, CASE WHEN landed_cost_minor>0 THEN landed_cost_minor ELSE purchase_cost_minor END AS cost FROM inventory_units_v2 WHERE id=? AND archived=0 FOR UPDATE", text(unitId, 100));
    if (!u) throw new HttpError(404, "Машина не найдена");
    if (u.tractor_slug !== item.tractor_slug) throw new HttpError(400, "Это машина другой модели");
    if (u.reserved_sale_id || ["reserved", "sold", "delivered"].includes(u.status)) throw new HttpError(409, `VIN ${u.vin} уже занят`);
    const perUnit = Math.round(Number(item.price_minor));
    const listPer = Math.round(Number(item.list_price_minor));
    await q("INSERT INTO sale_order_items(id,sale_id,kind,inventory_unit_id,tractor_slug,title,qty,price_minor,list_price_minor,cost_kgs_minor) VALUES(?,?,'unit',?,?,?,1,?,?,?)", id(), s.id, u.id, u.tractor_slug, `${u.model} · VIN ${u.vin}`, perUnit, listPer, Number(u.cost));
    if (Number(item.qty) > 1) await q("UPDATE sale_order_items SET qty=qty-1 WHERE id=?", item.id);
    else await q("UPDATE sale_order_items SET active=0 WHERE id=?", item.id);
    await q("UPDATE inventory_units_v2 SET reserved_sale_id=?, status=CASE WHEN status='stock' THEN 'reserved' ELSE status END, updated_by=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", s.id, actor.id, u.id);
    await q("UPDATE sale_orders SET cost_kgs_minor=(SELECT COALESCE(SUM(cost_kgs_minor*qty),0) FROM sale_order_items WHERE sale_id=? AND active=1), updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", s.id, s.id);
    await event(q, s.id, actor, "unit", `К позиции под заказ привязан VIN ${u.vin}`);
  });
}

export async function extendReserve(actor: Actor, saleId: string, until: string, reason: string) {
  assertSeller(actor);
  const policy = await salesPolicy();
  const date = dateOnly(until, "Новый срок резерва");
  const why = text(reason, 500);
  if (why.length < 3) throw new HttpError(400, "Укажите причину продления");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const s = await lockSale(q, actor, saleId);
    if (s.status !== "booked") throw new HttpError(409, "Резерв меняется только до выдачи");
    const limit = addDays(policy.maxReserveDays, new Date(s.sold_at));
    if (date > limit) throw new HttpError(400, `Резерв не дольше ${policy.maxReserveDays} дней от даты продажи: до ${limit}`);
    if (date < new Date().toISOString().slice(0, 10)) throw new HttpError(400, "Срок резерва не может быть в прошлом");
    await q("UPDATE sale_orders SET reserve_until=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", date, s.id);
    await event(q, s.id, actor, "reserve", `Резерв продлён до ${date}: ${why}`);
  });
}

export async function cancelSale(actor: Actor, saleId: string, reason: string) {
  if (!isBoss(actor)) throw new HttpError(403, "Отменить продажу могут директор или владелец");
  const why = text(reason, 500);
  if (why.length < 5) throw new HttpError(400, "Укажите причину отмены (не короче 5 символов)");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const s = await lockSale(q, actor, saleId);
    if (s.status === "cancelled") throw new HttpError(409, "Продажа уже отменена");
    if (s.status !== "booked") throw new HttpError(409, "Выданную технику так не отменить: нужен возврат техники (появится в разделе «Склад»)");
    const paid = await paidOf(q, s.id);
    if (paid > 0) throw new HttpError(409, "Сначала верните деньги клиенту (кнопка «Возврат») или сторнируйте ошибочные платежи");
    const units = await q<{ inventory_unit_id: string }>("SELECT inventory_unit_id FROM sale_order_items WHERE sale_id=? AND active=1 AND inventory_unit_id IS NOT NULL", s.id);
    for (const u of units) {
      await q("UPDATE inventory_units_v2 SET reserved_sale_id=NULL, status=CASE WHEN status='reserved' THEN 'stock' ELSE status END, updated_by=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=? AND reserved_sale_id=?", actor.id, u.inventory_unit_id, s.id);
      await q("INSERT INTO inventory_lifecycle_events(id,inventory_unit_id,from_status,to_status,actor_id,note) VALUES(?,?, 'reserved', 'stock', ?, ?)", id(), u.inventory_unit_id, actor.id, `Резерв снят: продажа ${s.number} отменена`);
    }
    // запчасти возвращаем на склад
    const parts = await q<{ part_id: string; qty: number; cost_kgs_minor: number }>("SELECT part_id, qty, cost_kgs_minor FROM sale_order_items WHERE sale_id=? AND active=1 AND part_id IS NOT NULL", s.id);
    for (const p of parts) {
      const [pt] = await q<{ qty: number }>("UPDATE parts SET qty=qty+?, updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING qty", p.qty, p.part_id);
      await q("INSERT INTO part_movements(id,part_id,kind,qty_delta,qty_after,unit_cost_minor,sale_id,note,created_by) VALUES(?,?,'return',?,?,?,?,?,?)", id(), p.part_id, p.qty, pt?.qty ?? 0, Number(p.cost_kgs_minor), s.id, `Продажа ${s.number} отменена`, actor.id);
    }
    await q("UPDATE sale_order_items SET active=0 WHERE sale_id=?", s.id);
    await q("UPDATE sale_orders SET status='cancelled', cancelled_at=CURRENT_TIMESTAMP, cancel_reason=?, updated_at=CURRENT_TIMESTAMP, version=version+1 WHERE id=?", why, s.id);
    await q("UPDATE leads SET status='contacted', sale_id=NULL WHERE sale_id=?", s.id);
    await event(q, s.id, actor, "cancelled", `Продажа отменена: ${why}`);
  });
}

const DOSSIER_KEYS = ["passport", "income", "land", "proposal", "certificate", "bank_contract"] as const;
export const DOSSIER_LABEL: Record<(typeof DOSSIER_KEYS)[number], string> = {
  passport: "Паспорт клиента",
  income: "Справка о доходах / выписка",
  land: "Документы на землю (гос. акт / аренда)",
  proposal: "Коммерческое предложение и спецификация",
  certificate: "Сертификат ТР ТС на модель",
  bank_contract: "Договор поставки с банком",
};
export const DOSSIER = DOSSIER_KEYS;

export async function toggleDossier(actor: Actor, saleId: string, key: string, done: boolean) {
  assertSeller(actor);
  if (!(DOSSIER_KEYS as readonly string[]).includes(key)) throw new HttpError(400, "Неизвестный документ");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    await lockSale(q, actor, saleId);
    const [row] = await q<{ dossier_json: string }>("SELECT dossier_json FROM sale_orders WHERE id=?", saleId);
    const d = (() => { try { return JSON.parse(row?.dossier_json || "{}") as Record<string, boolean>; } catch { return {}; } })();
    d[key] = done;
    await q("UPDATE sale_orders SET dossier_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", JSON.stringify(d), saleId);
    await event(q, saleId, actor, "dossier", `${DOSSIER_LABEL[key as (typeof DOSSIER_KEYS)[number]]}: ${done ? "есть" : "нет"}`);
  });
}

// ───────────────────────── заявки ─────────────────────────
export async function takeLead(actor: Actor, leadId: string) {
  assertSeller(actor);
  const r = await getRawDb().prepare("UPDATE leads SET status='contacted', assigned_to=?, handled_at=COALESCE(handled_at,CURRENT_TIMESTAMP) WHERE id=? AND status='new'").bind(actor.id, leadId).run();
  if (!r.meta.changes) throw new HttpError(409, "Заявку уже взял другой сотрудник или она закрыта");
}

export async function rejectLead(actor: Actor, leadId: string, code: string, note: string) {
  assertSeller(actor);
  if (!LEAD_REJECT_REASONS[code]) throw new HttpError(400, "Выберите причину отказа");
  const reason = `${LEAD_REJECT_REASONS[code]}${text(note, 300) ? `: ${text(note, 300)}` : ""}`;
  const scope = isCompany(actor) ? "" : "AND (assigned_to IS NULL OR assigned_to=?)";
  const r = await getRawDb().prepare(`UPDATE leads SET status='closed', reject_reason=?, assigned_to=COALESCE(assigned_to,?), handled_at=COALESCE(handled_at,CURRENT_TIMESTAMP) WHERE id=? AND sale_id IS NULL ${scope}`).bind(reason, actor.id, leadId, ...(isCompany(actor) ? [] : [actor.id])).run();
  if (!r.meta.changes) throw new HttpError(409, "Заявка уже закрыта или принадлежит другому менеджеру");
}

export async function reopenLead(actor: Actor, leadId: string) {
  assertSeller(actor);
  const r = await getRawDb().prepare("UPDATE leads SET status='contacted', reject_reason='' WHERE id=? AND sale_id IS NULL AND status='closed'").bind(leadId).run();
  if (!r.meta.changes) throw new HttpError(409, "Заявку нельзя вернуть: по ней уже есть продажа");
}

export async function createLead(actor: Actor, input: { name: string; phone: string; model?: string; source: string; comment?: string }) {
  assertSeller(actor);
  const name = text(input.name, 160);
  if (name.length < 2) throw new HttpError(400, "Укажите имя");
  const phone = normalizePhone(text(input.phone, 40));
  const sources = ["phone", "office", "whatsapp", "instagram", "exhibition", "referral", "lalafo", "other"];
  const source = sources.includes(input.source) ? input.source : "other";
  const catalog = await catalogModels();
  const model = catalog.find((m) => m.slug === input.model);
  const leadId = id();
  await getRawDb()
    .prepare("INSERT INTO leads(id,tractor_slug,tractor_model,name,phone,message,status,source,assigned_to,handled_at,consent_version) VALUES(?,?,?,?,?,?,'contacted',?,?,CURRENT_TIMESTAMP,'office')")
    .bind(leadId, model?.slug ?? null, model?.model ?? null, name, `+${phone}`, text(input.comment, 1000), source, actor.id)
    .run();
  return leadId;
}
