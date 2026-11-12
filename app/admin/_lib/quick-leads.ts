/**
 * Быстрые заявки (Работа → Быстрые заявки): текст из чат-бота, WhatsApp, Instagram → обычные заявки.
 *
 * Разбор текста делает lead-parse.ts (в браузере, мгновенно). Здесь только то, что требует базы:
 * проверка дублей по телефону и сохранение пачки заявок одной транзакцией с теми же правилами,
 * что у «Новой заявки» (имя, телефон, модель из каталога, источник).
 */
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { normalizePhone } from "../../lib/business";
import { HttpError } from "../../lib/security";
import { catalogModels, isBoss } from "./sales";
import { newId, notify, query, text } from "./db-kit";
import { phoneDigits } from "./lead-parse";

export const QUICK_SOURCES: Record<string, string> = {
  chatbot: "Чат-бот", whatsapp: "WhatsApp", instagram: "Instagram", website: "Сайт", phone: "Звонок",
  office: "Визит в офис", exhibition: "Выставка", referral: "Рекомендация", lalafo: "Lalafo", other: "Другое",
};

export const canQuickLeads = (a: Actor) => isBoss(a) || a.role === "manager" || a.permissions.includes("site-leads") || a.permissions.includes("deals");

/** Кому можно отдать заявку: активные продавцы. */
export async function sellers() {
  const { results } = await getRawDb().prepare("SELECT id, display_name, role, permissions_json FROM staff WHERE active=1 ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'director' THEN 1 ELSE 2 END, display_name").all<{ id: string; display_name: string; role: string; permissions_json: string }>();
  return results
    .filter((s) => ["owner", "director", "manager"].includes(s.role) || /"(site-leads|deals|sales)"/.test(s.permissions_json || ""))
    .map((s) => ({ id: s.id, name: s.display_name }));
}

export type Duplicate = { phone: string; kind: "lead" | "client"; label: string };

/** Какие телефоны уже есть в заявках или в базе клиентов. Ключ: цифры 996XXXXXXXXX. */
export async function findDuplicates(phones: string[]): Promise<Duplicate[]> {
  const digits = [...new Set(phones.map(phoneDigits).filter(Boolean))].slice(0, 60);
  if (!digits.length) return [];
  const marks = digits.map(() => "?").join(",");
  const db = getRawDb();
  const [leads, clients] = await Promise.all([
    db.prepare(`SELECT regexp_replace(l.phone,'\\D','','g') AS phone, l.name, l.status, to_char(l.created_at AT TIME ZONE 'Asia/Bishkek','DD.MM.YYYY') AS day, s.display_name AS who
      FROM leads l LEFT JOIN staff s ON s.id=l.assigned_to WHERE regexp_replace(l.phone,'\\D','','g') IN (${marks}) ORDER BY l.created_at DESC LIMIT 100`).bind(...digits).all<{ phone: string; name: string; status: string; day: string; who: string | null }>(),
    db.prepare(`SELECT normalized_phone AS phone, name FROM crm_customers WHERE archived=0 AND normalized_phone IN (${marks}) LIMIT 100`).bind(...digits).all<{ phone: string; name: string }>(),
  ]);
  const status: Record<string, string> = { new: "новая", contacted: "в работе", closed: "закрыта" };
  return [
    ...leads.results.map((l) => ({ phone: l.phone, kind: "lead" as const, label: `Заявка от ${l.day}: ${l.name}, ${status[l.status] ?? l.status}${l.who ? `, ${l.who}` : ""}` })),
    ...clients.results.map((c) => ({ phone: c.phone, kind: "client" as const, label: `Клиент в базе: ${c.name}` })),
  ];
}

export type QuickLeadInput = { name: string; phone: string; model?: string; source: string; comment?: string; meetingAt?: string; raw?: string };

/** Сохранить пачку заявок. assignee: "" - в «Новые» (возьмёт любой менеджер), id сотрудника - сразу в работу к нему. */
export async function createQuickLeads(actor: Actor, input: { assignee: string; items: QuickLeadInput[] }) {
  if (!canQuickLeads(actor)) throw new HttpError(403, "Добавлять заявки могут менеджеры, директор и владелец");
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) throw new HttpError(400, "Нет заявок для сохранения: вставьте текст и нажмите «Разобрать»");
  if (items.length > 50) throw new HttpError(400, "За один раз не больше 50 заявок");
  const models = new Map((await catalogModels()).map((m) => [m.slug, m]));
  const rows = items.map((it, i) => {
    const n = i + 1;
    const name = text(it.name, 160);
    if (name.length < 2) throw new HttpError(400, `Заявка ${n}: укажите имя`);
    let phone: string;
    try { phone = normalizePhone(text(it.phone, 40)); } catch { throw new HttpError(400, `Заявка ${n} (${name}): проверьте телефон`); }
    const model = it.model ? models.get(text(it.model, 100)) : undefined;
    const meeting = text(it.meetingAt, 16);
    if (meeting && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(meeting)) throw new HttpError(400, `Заявка ${n} (${name}): проверьте дату встречи`);
    return { name, phone, model, source: QUICK_SOURCES[it.source] ? it.source : "other", comment: text(it.comment, 1000), meeting, raw: text(it.raw, 4000) };
  });
  const assignee = text(input.assignee, 100);
  if (assignee && !(await sellers()).some((s) => s.id === assignee)) throw new HttpError(400, "Выберите сотрудника отдела продаж");

  return getRawDb().transaction(async (client) => {
    const q = query(client);
    for (const r of rows) {
      await q(
        `INSERT INTO leads(id,tractor_slug,tractor_model,name,phone,message,status,source,assigned_to,handled_at,consent_version,meeting_at,created_via,created_by,raw_text)
         VALUES(?,?,?,?,?,?,?,?,?,${assignee ? "CURRENT_TIMESTAMP" : "NULL"},'office',${r.meeting ? "?::timestamp AT TIME ZONE 'Asia/Bishkek'" : "?"},'quick',?,?)`,
        newId(), r.model?.slug ?? null, r.model?.model ?? null, r.name, `+${r.phone}`, r.comment, assignee ? "contacted" : "new", r.source, assignee || null, r.meeting || null, actor.id, r.raw,
      );
    }
    const names = rows.map((r) => r.name).join(", ").slice(0, 300);
    await q("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)", newId(), actor.id, "lead.quick", "leads", `Быстрые заявки: ${rows.length} (${names})`);
    if (assignee && assignee !== actor.id) {
      await notify(q, { topic: "leads", title: rows.length === 1 ? `Вам заявка: ${rows[0].name}` : `Вам ${rows.length} заявки`, body: names, url: "/admin/work/leads?view=work", to: [assignee] });
    } else if (!assignee) {
      await notify(q, { topic: "leads", title: rows.length === 1 ? `Новая заявка: ${rows[0].name}` : `Новые заявки: ${rows.length}`, body: names, url: "/admin/work/leads", roles: ["owner", "director", "manager"], perms: ["site-leads"], exclude: actor.id });
    }
    return rows.length;
  });
}

/** Последние заявки, добавленные через быстрый ввод. */
export async function recentQuick(actor: Actor) {
  const mine = isBoss(actor) ? "" : "AND (l.created_by=? OR l.assigned_to=?)";
  const { results } = await getRawDb().prepare(`SELECT l.id, l.name, l.phone, l.tractor_model, l.source, l.status, l.created_at, l.meeting_at, s.display_name AS who
      FROM leads l LEFT JOIN staff s ON s.id=l.assigned_to WHERE l.created_via='quick' ${mine} ORDER BY l.created_at DESC LIMIT 15`).bind(...(isBoss(actor) ? [] : [actor.id, actor.id])).all<{ id: string; name: string; phone: string; tractor_model: string | null; source: string; status: string; created_at: string; meeting_at: string | null; who: string | null }>();
  return results;
}
