/**
 * Перевозки: любая доставка техники (клиенту, с таможни, между складами).
 * Кто получает, откуда, куда, когда, какие модели, кто везёт и сколько стоит. Оплата перевозки = расход в кассе.
 */
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { HttpError } from "../../lib/security";
import { audit, newId, num, query, type Q, text } from "./db-kit";
import { catalogModels } from "./sales";
import { canMoney } from "./money";
import { canLogistics } from "./stock";

export const DELIVERY_KIND: Record<string, string> = { to_client: "Клиенту", from_customs: "С таможни на склад", between_warehouses: "Между складами", other: "Другое" };
export const DELIVERY_STATUS: Record<string, { label: string; tone: "info" | "warn" | "good" | "mute" }> = {
  planned: { label: "Запланирована", tone: "info" },
  in_transit: { label: "В пути", tone: "warn" },
  delivered: { label: "Доставлена", tone: "good" },
  cancelled: { label: "Отменена", tone: "mute" },
};
const NEXT: Record<string, string[]> = { planned: ["in_transit", "delivered", "cancelled"], in_transit: ["delivered", "planned", "cancelled"], delivered: ["in_transit"], cancelled: ["planned"] };

export type DeliveryInput = {
  kind: string; clientName?: string; clientPhone?: string; saleId?: string; customerId?: string; fromPlace: string; toPlace: string; plannedAt: string;
  carrier?: string; driverName?: string; driverPhone?: string; vehicle?: string; cost?: string; note?: string; items: { slug: string; qty: string | number; vin?: string }[];
};
export type DeliveryRow = {
  id: string; number: string; kind: string; status: string; client_name: string; client_phone: string; from_place: string; to_place: string; planned_at: string; departed_at: string | null; delivered_at: string | null;
  carrier: string; driver_name: string; driver_phone: string; vehicle: string; cost_minor: number; tx_id: string | null; models: string | null;
};

function assertEdit(a: Actor) {
  if (!canLogistics(a)) throw new HttpError(403, "Перевозки ведут логистика, бухгалтер, директор и владелец");
}
const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const FIELDS = "d.id, d.number, d.kind, d.status, d.client_name, d.client_phone, d.from_place, d.to_place, d.planned_at, d.departed_at, d.delivered_at, d.carrier, d.driver_name, d.driver_phone, d.vehicle, d.cost_minor, d.tx_id, (SELECT string_agg(i.model || CASE WHEN i.qty>1 THEN ' × ' || i.qty ELSE '' END, ', ') FROM delivery_items i WHERE i.delivery_id=d.id) AS models";

export async function listDeliveries(status = "", search = "") {
  const where: string[] = [], args: unknown[] = [];
  if (DELIVERY_STATUS[status]) { where.push("d.status=?"); args.push(status); }
  if (search) { const like = `%${search.toLowerCase().replace(/[%_\\]/g, "")}%`; where.push("(lower(d.client_name) LIKE ? OR d.client_phone LIKE ? OR lower(d.number) LIKE ?)"); args.push(like, like, like); }
  const { results } = await getRawDb().prepare(`SELECT ${FIELDS} FROM deliveries d ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY d.planned_at DESC LIMIT 300`).bind(...args).all<DeliveryRow>();
  return results.map((d) => ({ ...d, cost_minor: Number(d.cost_minor) }));
}

export async function getDelivery(id: string) {
  const db = getRawDb();
  const row = await db.prepare(`SELECT ${FIELDS}, d.note, d.sale_id, d.customer_id, to_char(d.planned_at AT TIME ZONE 'Asia/Bishkek','YYYY-MM-DD"T"HH24:MI') AS planned_local, o.number AS sale_number, a.name AS paid_account, t.occurred_at AS paid_at, s.display_name AS author
    FROM deliveries d LEFT JOIN sale_orders o ON o.id=d.sale_id LEFT JOIN account_transactions t ON t.id=d.tx_id LEFT JOIN financial_accounts a ON a.id=t.account_id LEFT JOIN staff s ON s.id=d.created_by WHERE d.id=?`).bind(id)
    .first<DeliveryRow & { note: string; sale_id: string | null; customer_id: string | null; planned_local: string; sale_number: string | null; paid_account: string | null; paid_at: string | null; author: string | null }>();
  if (!row) return null;
  const items = await db.prepare("SELECT id, tractor_slug, model, qty, unit_id, vin FROM delivery_items WHERE delivery_id=? ORDER BY model").bind(id).all<{ id: string; tractor_slug: string | null; model: string; qty: number; unit_id: string | null; vin: string }>();
  return { delivery: { ...row, cost_minor: Number(row.cost_minor) }, items: items.results };
}

/** Данные продажи для новой перевозки: клиент, куда и какие машины. */
export async function saleDeliveryDraft(saleId: string) {
  const db = getRawDb();
  const sale = await db.prepare("SELECT o.id, o.number, c.id AS customer_id, c.name, c.phone, c.address, c.region FROM sale_orders o JOIN crm_customers c ON c.id=o.customer_id WHERE o.id=?").bind(saleId).first<{ id: string; number: string; customer_id: string; name: string; phone: string; address: string; region: string }>();
  if (!sale) return null;
  const { results } = await db.prepare("SELECT i.tractor_slug, i.qty, u.vin FROM sale_order_items i LEFT JOIN inventory_units_v2 u ON u.id=i.inventory_unit_id WHERE i.sale_id=? AND i.active=1 AND i.kind IN ('unit','model_order')").bind(saleId).all<{ tractor_slug: string | null; qty: number; vin: string | null }>();
  return { sale, items: results.filter((i) => i.tractor_slug).map((i) => ({ slug: i.tractor_slug as string, qty: String(i.qty), vin: i.vin ?? "" })) };
}

async function parse(input: DeliveryInput) {
  const kind = DELIVERY_KIND[input.kind] ? input.kind : "other";
  const clientName = text(input.clientName, 160), clientPhone = text(input.clientPhone, 40);
  if (kind === "to_client" && clientName.length < 2) throw new HttpError(400, "Укажите ФИО клиента");
  if (kind === "to_client" && clientPhone.replace(/\D/g, "").length < 8) throw new HttpError(400, "Укажите телефон клиента");
  const fromPlace = text(input.fromPlace, 200), toPlace = text(input.toPlace, 200);
  if (fromPlace.length < 2) throw new HttpError(400, "Укажите, откуда везём");
  if (toPlace.length < 2) throw new HttpError(400, "Укажите, куда везём");
  const plannedAt = text(input.plannedAt, 16);
  if (!LOCAL.test(plannedAt) || Number.isNaN(Date.parse(plannedAt))) throw new HttpError(400, "Укажите дату и время");
  const costValue = num(input.cost, "Стоимость", { optional: true });
  const models = new Map((await catalogModels()).map((m) => [m.slug, m.model]));
  if (!Array.isArray(input.items) || !input.items.length) throw new HttpError(400, "Добавьте хотя бы одну модель");
  if (input.items.length > 50) throw new HttpError(400, "Слишком много строк");
  const items = input.items.map((it, i) => {
    const slug = text(it.slug, 100), model = models.get(slug);
    if (!model) throw new HttpError(400, `Строка ${i + 1}: выберите модель`);
    const qty = Math.round(Number(it.qty));
    if (!(qty >= 1 && qty <= 100)) throw new HttpError(400, `Строка ${i + 1}: количество от 1 до 100`);
    return { slug, model, qty, vin: text(it.vin, 40).toUpperCase() };
  });
  return { kind, clientName, clientPhone, fromPlace, toPlace, plannedAt, costMinor: costValue === null ? 0 : Math.round(costValue * 100), items, carrier: text(input.carrier, 160), driverName: text(input.driverName, 120), driverPhone: text(input.driverPhone, 40), vehicle: text(input.vehicle, 120), note: text(input.note, 2000), saleId: text(input.saleId, 100) || null, customerId: text(input.customerId, 100) || null };
}

async function writeItems(q: Q, deliveryId: string, items: Awaited<ReturnType<typeof parse>>["items"]) {
  for (const it of items) {
    const [unit] = it.vin ? await q<{ id: string }>("SELECT id FROM inventory_units_v2 WHERE upper(vin)=? AND archived=0", it.vin) : [];
    await q("INSERT INTO delivery_items(id,delivery_id,tractor_slug,model,qty,unit_id,vin) VALUES(?,?,?,?,?,?,?)", newId(), deliveryId, it.slug, it.model, it.qty, unit?.id ?? null, it.vin);
  }
}

export async function saveDelivery(actor: Actor, input: DeliveryInput, deliveryId?: string) {
  assertEdit(actor);
  const p = await parse(input);
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    if (p.saleId && !(await q("SELECT 1 FROM sale_orders WHERE id=?", p.saleId)).length) throw new HttpError(404, "Продажа не найдена");
    if (deliveryId) {
      const [d] = await q<{ id: string; tx_id: string | null; cost_minor: number; number: string }>("SELECT id, tx_id, cost_minor, number FROM deliveries WHERE id=? FOR UPDATE", deliveryId);
      if (!d) throw new HttpError(404, "Перевозка не найдена");
      if (d.tx_id && Number(d.cost_minor) !== p.costMinor) throw new HttpError(409, "Перевозка уже оплачена: чтобы изменить стоимость, сначала сторнируйте оплату");
      await q(`UPDATE deliveries SET kind=?, client_name=?, client_phone=?, from_place=?, to_place=?, planned_at=?::timestamp AT TIME ZONE 'Asia/Bishkek', carrier=?, driver_name=?, driver_phone=?, vehicle=?, cost_minor=?, note=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, p.kind, p.clientName, p.clientPhone, p.fromPlace, p.toPlace, p.plannedAt, p.carrier, p.driverName, p.driverPhone, p.vehicle, p.costMinor, p.note, actor.id, d.id);
      await q("DELETE FROM delivery_items WHERE delivery_id=?", d.id);
      await writeItems(q, d.id, p.items);
      await audit(q, actor, "delivery.update", d.id, d.number);
      return d.id;
    }
    await q("SELECT pg_advisory_xact_lock(hashtext('deliveries-number'))");
    const year = new Date().getFullYear();
    const [n] = await q<{ n: number }>("SELECT COALESCE(MAX(substring(number from '[0-9]+$')::int),0)+1 AS n FROM deliveries WHERE number LIKE ?", `ДС-${year}-%`);
    const id = newId(), number = `ДС-${year}-${String(n.n).padStart(4, "0")}`;
    await q(`INSERT INTO deliveries(id,number,kind,sale_id,customer_id,client_name,client_phone,from_place,to_place,planned_at,carrier,driver_name,driver_phone,vehicle,cost_minor,note,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?::timestamp AT TIME ZONE 'Asia/Bishkek',?,?,?,?,?,?,?,?)`, id, number, p.kind, p.saleId, p.customerId, p.clientName, p.clientPhone, p.fromPlace, p.toPlace, p.plannedAt, p.carrier, p.driverName, p.driverPhone, p.vehicle, p.costMinor, p.note, actor.id, actor.id);
    await writeItems(q, id, p.items);
    await audit(q, actor, "delivery.create", id, number);
    return id;
  });
}

export async function setDeliveryStatus(actor: Actor, deliveryId: string, status: string) {
  assertEdit(actor);
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [d] = await q<{ id: string; number: string; status: string; tx_id: string | null }>("SELECT id, number, status, tx_id FROM deliveries WHERE id=? FOR UPDATE", deliveryId);
    if (!d) throw new HttpError(404, "Перевозка не найдена");
    if (!NEXT[d.status]?.includes(status)) throw new HttpError(409, "Такой переход статуса невозможен");
    if (status === "cancelled" && d.tx_id) throw new HttpError(409, "Перевозка оплачена: сначала сторнируйте оплату");
    await q(`UPDATE deliveries SET status=?,
      departed_at=CASE WHEN ? IN ('in_transit','delivered') THEN COALESCE(departed_at,CURRENT_TIMESTAMP) WHEN ?='planned' THEN NULL ELSE departed_at END,
      delivered_at=CASE WHEN ?='delivered' THEN CURRENT_TIMESTAMP ELSE NULL END,
      updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, status, status, status, status, actor.id, d.id);
    await audit(q, actor, "delivery.status", d.id, `${d.number}: ${DELIVERY_STATUS[status].label}`);
  });
}

/** Оплата перевозки: расход в сомовой кассе, виден в расходах с категорией «Логистика». */
export async function payDelivery(actor: Actor, deliveryId: string, input: { accountId: string; amount: string; paidAt: string }) {
  if (!canMoney(actor)) throw new HttpError(403, "Оплату записывают бухгалтер, директор и владелец");
  const amountValue = num(input.amount, "Сумма", { min: 0.01 });
  const amount = Math.round((amountValue as number) * 100);
  const paidAt = text(input.paidAt, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) throw new HttpError(400, "Укажите дату оплаты");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [d] = await q<{ id: string; number: string; tx_id: string | null; carrier: string }>("SELECT id, number, tx_id, carrier FROM deliveries WHERE id=? FOR UPDATE", deliveryId);
    if (!d) throw new HttpError(404, "Перевозка не найдена");
    if (d.tx_id) throw new HttpError(409, "Перевозка уже оплачена");
    const [acc] = await q<{ id: string; name: string; currency: string; balance: number }>("SELECT a.id, a.name, a.currency, (a.opening_balance_minor + COALESCE((SELECT SUM(CASE WHEN direction='in' THEN amount_minor ELSE -amount_minor END) FROM account_transactions WHERE account_id=a.id),0))::bigint AS balance FROM financial_accounts a WHERE a.id=? AND a.active=1 AND a.account_type IN ('cash','bank') FOR UPDATE OF a", text(input.accountId, 100));
    if (!acc || acc.currency !== "KGS") throw new HttpError(400, "Выберите кассу или счёт в сомах");
    if (actor.role !== "owner" && Number(acc.balance) < amount) throw new HttpError(409, `В «${acc.name}» не хватает денег. Уйти в минус может только владелец`);
    const tx = newId();
    await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,occurred_at,description,counterparty,created_by,link_type,link_id) VALUES(?,?,'out',?,'Логистика',?,?,?,?,'delivery',?)", tx, acc.id, amount, paidAt, `Перевозка ${d.number}`, d.carrier, actor.id, d.id);
    await q("UPDATE deliveries SET cost_minor=?, tx_id=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", amount, tx, actor.id, d.id);
    await audit(q, actor, "delivery.pay", d.id, `${d.number}: ${amount / 100} с`);
  });
}

export async function voidDeliveryPayment(actor: Actor, deliveryId: string, reason: string) {
  if (!canMoney(actor)) throw new HttpError(403, "Сторно делают бухгалтер, директор и владелец");
  const why = text(reason, 300);
  if (why.length < 5) throw new HttpError(400, "Укажите причину сторно (не короче 5 символов)");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [d] = await q<{ id: string; number: string; tx_id: string | null }>("SELECT id, number, tx_id FROM deliveries WHERE id=? FOR UPDATE", deliveryId);
    if (!d?.tx_id) throw new HttpError(409, "Оплаты нет");
    const [t] = await q<{ id: string; account_id: string; amount_minor: number; reversed_by: string | null }>("SELECT id, account_id, amount_minor, reversed_by FROM account_transactions WHERE id=? FOR UPDATE", d.tx_id);
    if (!t || t.reversed_by) throw new HttpError(409, "Оплата уже сторнирована");
    const rid = newId();
    await q("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,occurred_at,description,created_by,link_type,link_id) VALUES(?,?,'in',?,'Сторно',CURRENT_TIMESTAMP,?,?,'delivery',?)", rid, t.account_id, t.amount_minor, `Сторно оплаты перевозки ${d.number}: ${why}`, actor.id, d.id);
    await q("UPDATE account_transactions SET reversed_by=? WHERE id=?", rid, t.id);
    await q("UPDATE deliveries SET tx_id=NULL, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", actor.id, d.id);
    await audit(q, actor, "delivery.void", d.id, why);
  });
}
