/**
 * Сервис и гарантия. Обращение привязывается к машине (VIN) и продаже; гарантия считается сама:
 * дата выдачи + срок из правил продаж (месяцы и моточасы, что раньше).
 *
 * Правила:
 *  - номер обращения С-ГГГГ-NNN;
 *  - гарантийное обращение по машине без действующей гарантии требует подтверждения (флаг в форме);
 *  - каждое изменение статуса пишется в историю обращения;
 *  - закрыть можно только с описанием, что сделано.
 */
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { canUseSection } from "../../lib/admin-auth";
import { HttpError } from "../../lib/security";
import { audit, isBoss, newId, notify, num, query, text, toMinor, type Q } from "./db-kit";
import { salesPolicy } from "./sales";

export const SERVICE_KIND: Record<string, string> = { warranty: "Гарантия", paid: "Платный ремонт", maintenance: "Плановое ТО", pdi: "Предпродажная подготовка" };
export const SERVICE_STATUS: Record<string, { label: string; tone: "good" | "warn" | "bad" | "info" | "mute" }> = {
  new: { label: "Новое", tone: "warn" },
  diagnosis: { label: "Диагностика", tone: "info" },
  waiting_parts: { label: "Ждём запчасти", tone: "warn" },
  in_work: { label: "В работе", tone: "info" },
  done: { label: "Готово, ждёт клиента", tone: "good" },
  closed: { label: "Закрыто", tone: "mute" },
  rejected: { label: "Отказ", tone: "bad" },
};
export const canService = (a: Actor) => isBoss(a) || a.role === "manager" || canUseSection(a, "service-cases");

export type Warranty = { until: string | null; active: boolean; months: number; hours: number; deliveredAt: string | null };
export async function warrantyFor(deliveredAt: string | null): Promise<Warranty> {
  const p = await salesPolicy();
  if (!deliveredAt) return { until: null, active: false, months: p.warrantyMonths, hours: p.warrantyHours, deliveredAt };
  const d = new Date(deliveredAt);
  d.setMonth(d.getMonth() + p.warrantyMonths);
  const until = d.toISOString().slice(0, 10);
  return { until, active: until >= new Date().toISOString().slice(0, 10), months: p.warrantyMonths, hours: p.warrantyHours, deliveredAt };
}

export async function listTickets(f: { status?: string; q?: string; mine?: string }) {
  const where = ["1=1"], args: unknown[] = [];
  if (f.status === "open") where.push("t.status NOT IN ('closed','rejected')");
  else if (f.status && SERVICE_STATUS[f.status]) { where.push("t.status=?"); args.push(f.status); }
  if (f.mine) { where.push("t.assigned_to=?"); args.push(f.mine); }
  if (f.q) { const like = `%${f.q.toLowerCase().replace(/[%_\\]/g, "")}%`; where.push("(lower(t.number) LIKE ? OR lower(c.name) LIKE ? OR lower(COALESCE(u.vin,'')) LIKE ? OR lower(t.issue) LIKE ?)"); args.push(like, like, like, like); }
  const { results } = await getRawDb().prepare(`SELECT t.id, t.number, t.kind, t.status, t.issue, t.opened_at, t.due_at::text AS due_at, t.price_minor, c.name AS customer, c.phone, u.vin, u.model, s.display_name AS assignee, o.number AS sale_number
    FROM service_tickets t LEFT JOIN crm_customers c ON c.id=t.customer_id LEFT JOIN inventory_units_v2 u ON u.id=t.unit_id LEFT JOIN staff s ON s.id=t.assigned_to LEFT JOIN sale_orders o ON o.id=t.sale_id
    WHERE ${where.join(" AND ")} ORDER BY CASE WHEN t.status IN ('closed','rejected') THEN 1 ELSE 0 END, t.opened_at DESC LIMIT 300`).bind(...args).all<{ id: string; number: string; kind: string; status: string; issue: string; opened_at: string; due_at: string | null; price_minor: number; customer: string | null; phone: string | null; vin: string | null; model: string | null; assignee: string | null; sale_number: string | null }>();
  return results.map((r) => ({ ...r, price_minor: Number(r.price_minor) }));
}

export async function ticketCounts() {
  const { results } = await getRawDb().prepare("SELECT status, COUNT(*)::int AS n FROM service_tickets GROUP BY status").all<{ status: string; n: number }>();
  return Object.fromEntries(results.map((r) => [r.status, r.n])) as Record<string, number>;
}

export async function getTicket(id: string) {
  const db = getRawDb();
  const t = await db.prepare(`SELECT t.*, t.due_at::text AS due_at, c.name AS customer, c.phone, u.vin, u.model, u.engine_number, o.number AS sale_number, o.delivered_at, s.display_name AS assignee
    FROM service_tickets t LEFT JOIN crm_customers c ON c.id=t.customer_id LEFT JOIN inventory_units_v2 u ON u.id=t.unit_id LEFT JOIN sale_orders o ON o.id=t.sale_id LEFT JOIN staff s ON s.id=t.assigned_to WHERE t.id=?`).bind(id).first<{ id: string; number: string; kind: string; status: string; issue: string; resolution: string; customer_id: string | null; unit_id: string | null; sale_id: string | null; delivered_at: string | null; price_minor: number; assigned_to: string | null; engine_hours: number | null; opened_at: string; due_at: string | null; assignee: string | null; model: string | null; vin: string | null; engine_number: string | null; customer: string | null; phone: string | null; sale_number: string | null }>();
  if (!t) return null;
  const { results } = await db.prepare("SELECT e.kind, e.note, e.created_at, s.display_name AS author FROM service_events e LEFT JOIN staff s ON s.id=e.actor_id WHERE e.ticket_id=? ORDER BY e.created_at DESC").bind(id).all<{ kind: string; note: string; created_at: string; author: string | null }>();
  return { ticket: { ...t, price_minor: Number(t.price_minor) }, events: results, warranty: await warrantyFor(t.delivered_at) };
}

/** Машины, по которым можно открыть обращение: проданные/выданные и на складе (PDI). */
export async function serviceUnits(q: string) {
  const like = `%${q.toLowerCase().replace(/[%_\\]/g, "")}%`;
  const { results } = await getRawDb().prepare(`SELECT u.id, u.vin, u.model, u.status, u.tractor_slug, o.id AS sale_id, o.number AS sale_number, o.customer_id, c.name AS customer, c.phone, o.delivered_at
    FROM inventory_units_v2 u
    LEFT JOIN sale_order_items i ON i.inventory_unit_id=u.id AND i.active=1
    LEFT JOIN sale_orders o ON o.id=i.sale_id AND o.status<>'cancelled'
    LEFT JOIN crm_customers c ON c.id=o.customer_id
    WHERE u.archived=0 AND (lower(u.vin) LIKE ? OR lower(COALESCE(c.name,'')) LIKE ? OR COALESCE(c.phone,'') LIKE ?) ORDER BY o.delivered_at DESC NULLS LAST LIMIT 20`).bind(like, like, like).all<{ id: string; vin: string; model: string; status: string; tractor_slug: string; sale_id: string | null; sale_number: string | null; customer_id: string | null; customer: string | null; phone: string | null; delivered_at: string | null }>();
  return results;
}

async function event(q: Q, ticketId: string, actor: Actor, kind: string, note: string) {
  await q("INSERT INTO service_events(id,ticket_id,actor_id,kind,note) VALUES(?,?,?,?,?)", newId(), ticketId, actor.id, kind, note.slice(0, 1000));
}

export async function createTicket(actor: Actor, input: { unitId: string; kind: string; issue: string; engineHours?: string; dueAt?: string; assignedTo?: string; outOfWarranty?: boolean }) {
  if (!canService(actor)) throw new HttpError(403, "Нет доступа к сервису");
  const kind = SERVICE_KIND[input.kind] ? input.kind : "warranty";
  const issue = text(input.issue, 3000);
  if (issue.length < 5) throw new HttpError(400, "Опишите неисправность или работу");
  const hours = num(input.engineHours, "Моточасы", { max: 100_000, int: true, optional: true });
  const due = input.dueAt && /^\d{4}-\d{2}-\d{2}$/.test(input.dueAt) ? input.dueAt : null;
  const u = await getRawDb().prepare(`SELECT u.id, u.vin, u.model, u.tractor_slug, o.id AS sale_id, o.customer_id, o.delivered_at FROM inventory_units_v2 u
      LEFT JOIN sale_order_items i ON i.inventory_unit_id=u.id AND i.active=1 LEFT JOIN sale_orders o ON o.id=i.sale_id AND o.status<>'cancelled' WHERE u.id=?`).bind(text(input.unitId, 100)).first<{ id: string; vin: string; model: string; tractor_slug: string; sale_id: string | null; customer_id: string | null; delivered_at: string | null }>();
  if (!u) throw new HttpError(404, "Выберите машину по VIN");
  if (kind === "warranty") {
    const w = await warrantyFor(u.delivered_at);
    if (!u.delivered_at) throw new HttpError(400, "Машина ещё не выдана клиенту: для неё подойдёт «Предпродажная подготовка»");
    const overHours = w.hours && hours !== null && hours > w.hours;
    if ((!w.active || overHours) && !input.outOfWarranty) throw new HttpError(409, `Гарантия ${!w.active ? `закончилась ${w.until}` : `превышена по моточасам (${hours} > ${w.hours})`}. Отметьте «Всё равно как гарантия», если руководство согласовало`);
  }
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    await q("SELECT pg_advisory_xact_lock(hashtext('service-number'))");
    const year = new Date().getFullYear();
    const [r] = await q<{ n: number | null }>("SELECT MAX(NULLIF(regexp_replace(substr(number, 8), '[^0-9]', '', 'g'), '')::int) AS n FROM service_tickets WHERE number ~ ?", `^С-${year}-[0-9]+$`);
    const number = `С-${year}-${String(Number(r?.n ?? 0) + 1).padStart(3, "0")}`;
    const id = newId();
    const assigned = input.assignedTo ? text(input.assignedTo, 100) : actor.id;
    await q("INSERT INTO service_tickets(id,number,customer_id,sale_id,unit_id,tractor_slug,kind,status,issue,engine_hours,assigned_to,due_at,created_by) VALUES(?,?,?,?,?,?,?, 'new', ?,?,?,?,?)", id, number, u.customer_id, u.sale_id, u.id, u.tractor_slug, kind, issue, hours, assigned, due, actor.id);
    await event(q, id, actor, "created", `${SERVICE_KIND[kind]}: ${issue}${input.outOfWarranty ? " (гарантия вне срока, согласовано)" : ""}`);
    if (assigned !== actor.id) await notify(q, { topic: "service", title: `Новое обращение ${number}`, body: `${u.model} · VIN ${u.vin}: ${issue.slice(0, 120)}`, url: `/admin/work/service/${id}`, to: [assigned], entity: { type: "service", id } });
    await audit(q, actor, "service.create", id, `${number} ${u.vin}`);
    return id;
  });
}

export async function updateTicket(actor: Actor, id: string, input: { status: string; note?: string; resolution?: string; price?: string; assignedTo?: string; dueAt?: string }) {
  if (!canService(actor)) throw new HttpError(403, "Нет доступа к сервису");
  if (!SERVICE_STATUS[input.status]) throw new HttpError(400, "Выберите статус");
  const resolution = text(input.resolution, 3000);
  if ((input.status === "closed" || input.status === "done") && resolution.length < 5) throw new HttpError(400, "Опишите, что сделано");
  const price = input.price ? toMinor(input.price, "Стоимость работ", true) ?? 0 : null;
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [t] = await q<{ status: string; number: string; assigned_to: string | null; kind: string }>("SELECT status, number, assigned_to, kind FROM service_tickets WHERE id=? FOR UPDATE", id);
    if (!t) throw new HttpError(404, "Обращение не найдено");
    if (t.status === "closed" && input.status !== "closed" && !isBoss(actor)) throw new HttpError(403, "Закрытое обращение открывает только руководство");
    const assigned = input.assignedTo ? text(input.assignedTo, 100) : t.assigned_to;
    await q(`UPDATE service_tickets SET status=?, resolution=CASE WHEN ?<>'' THEN ? ELSE resolution END, price_minor=COALESCE(?, price_minor), assigned_to=?, due_at=COALESCE(?::date, due_at),
      closed_at=CASE WHEN ? IN ('closed','rejected') THEN CURRENT_TIMESTAMP ELSE NULL END, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      input.status, resolution, resolution, price, assigned, input.dueAt && /^\d{4}-\d{2}-\d{2}$/.test(input.dueAt) ? input.dueAt : null, input.status, id);
    const note = [t.status !== input.status ? `${SERVICE_STATUS[t.status]?.label} → ${SERVICE_STATUS[input.status].label}` : "", text(input.note, 1000), resolution ? `Сделано: ${resolution}` : "", price !== null && t.kind !== "warranty" ? `Стоимость ${price / 100} с` : ""].filter(Boolean).join(". ");
    await event(q, id, actor, input.status, note || "Обновлено");
    if (assigned && assigned !== t.assigned_to && assigned !== actor.id) await notify(q, { topic: "service", title: `Вам передано обращение ${t.number}`, url: `/admin/work/service/${id}`, to: [assigned], entity: { type: "service", id } });
    await audit(q, actor, "service.update", id, `${t.number}: ${note}`);
  });
}
