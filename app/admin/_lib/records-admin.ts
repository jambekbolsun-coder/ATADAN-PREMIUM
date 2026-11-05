/**
 * Записи сайта в admin_records: акции, программы лизинга, условия по моделям, FAQ, страницы сервиса.
 * Поля и форматы те же, что читает публичный сайт (все значения - строки в data_json).
 *
 * Правила: публикуется только заполненная запись (обязательные поля, даты «с» ≤ «по»);
 * удаление - архив; порядок показа меняется стрелками; каждое изменение в журнале.
 */
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { canUseSection } from "../../lib/admin-auth";
import { HttpError } from "../../lib/security";
import { audit, mediaUrl, newId, query, slugOf, text } from "./db-kit";
import { RECORD_KINDS, type RecordKind } from "./record-kinds";

export const RECORD_SECTION: Record<RecordKind, { perm: string; href: string }> = {
  promotions: { perm: "promotions", href: "/admin/marketing/promotions" },
  leasing_terms: { perm: "leasing", href: "/admin/marketing/leasing" },
  leasing_model_terms: { perm: "leasing-models", href: "/admin/marketing/leasing?tab=models" },
  faq: { perm: "faq", href: "/admin/marketing/pages?tab=faq" },
  service_pages: { perm: "public-service", href: "/admin/marketing/pages?tab=service" },
};
export const RECORD_STATUS: Record<string, { label: string; tone: "good" | "warn" | "mute" }> = {
  published: { label: "На сайте", tone: "good" },
  draft: { label: "Черновик", tone: "warn" },
  hidden: { label: "Скрыто", tone: "mute" },
};

export function isKind(k: string): k is RecordKind {
  return Object.prototype.hasOwnProperty.call(RECORD_KINDS, k);
}
export function canRecords(a: Actor, kind: RecordKind) {
  return canUseSection(a, RECORD_SECTION[kind].perm);
}

export type AdminRecord = { id: string; title: string; subtitle: string; status: string; sort_order: number; data: Record<string, string>; version: number; updated_at: string; author: string | null };

export async function listRecords(kind: RecordKind): Promise<AdminRecord[]> {
  const { results } = await getRawDb().prepare(`SELECT r.id, r.title, r.subtitle, r.status, r.sort_order, r.data_json, r.version, r.updated_at, s.display_name AS author
    FROM admin_records r LEFT JOIN staff s ON s.id=r.updated_by WHERE r.kind=? AND r.archived=0 ORDER BY r.sort_order, r.updated_at DESC`).bind(kind).all<Omit<AdminRecord, "data"> & { data_json: string }>();
  return results.map(({ data_json, ...r }) => {
    let data: Record<string, string> = {};
    try { data = JSON.parse(data_json || "{}"); } catch { /* старый битый JSON остаётся пустым */ }
    return { ...r, data };
  });
}

export type RecordInput = { id?: string; version?: number; title: string; subtitle: string; status: string; data: Record<string, string> };

function clean(kind: RecordKind, input: RecordInput, publishing: boolean) {
  const cfg = RECORD_KINDS[kind];
  const data: Record<string, string> = {};
  for (const f of cfg.fields) {
    let v = text(input.data?.[f.key], f.type === "textarea" ? 20_000 : 2000);
    if (f.type === "number" && v) {
      const n = Number(v.replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > 10_000_000_000) throw new HttpError(400, `${f.label}: проверьте число`);
      v = String(n);
    }
    if (f.type === "date" && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, `${f.label}: дата в формате ГГГГ-ММ-ДД`);
    if (f.type === "select" && v && f.options && !f.options.includes(v)) throw new HttpError(400, `${f.label}: выберите из списка`);
    if ((f.type === "file" || f.type === "url") && v) v = mediaUrl(v, f.label);
    if (f.type === "files" && v) v = v.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 20).map((x) => mediaUrl(x, f.label)).join("\n");
    if (f.key === "slug" && v) v = slugOf(v);
    if (publishing && f.required && !v) throw new HttpError(400, `Чтобы показать на сайте, заполните: ${f.label}`);
    if (v) data[f.key] = v;
  }
  if (data.startsAt && data.endsAt && data.startsAt > data.endsAt) throw new HttpError(400, "Дата окончания раньше даты начала");
  if (kind === "faq") {
    if (!data.question) data.question = text(input.title, 180);
  }
  const title = text(input.title, 180) || data.question || "";
  if (!title) throw new HttpError(400, `Укажите название (${cfg.singular})`);
  return { title, subtitle: text(input.subtitle, 600), data };
}

export async function saveRecord(actor: Actor, kindRaw: string, input: RecordInput) {
  if (!isKind(kindRaw)) throw new HttpError(400, "Неизвестный раздел");
  const kind = kindRaw;
  if (!canRecords(actor, kind)) throw new HttpError(403, "Нет доступа к разделу");
  const status = RECORD_STATUS[input.status] ? input.status : "draft";
  const { title, subtitle, data } = clean(kind, input, status === "published");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    if (data.slug) {
      const [dup] = await q<{ id: string }>("SELECT id FROM admin_records WHERE kind=? AND archived=0 AND data_json::json->>'slug'=? AND id<>?", kind, data.slug, input.id ?? "");
      if (dup) throw new HttpError(409, `Адрес ${data.slug} уже занят другой страницей`);
    }
    if (input.id) {
      const [row] = await q<{ version: number }>("SELECT version FROM admin_records WHERE id=? AND kind=? AND archived=0 FOR UPDATE", input.id, kind);
      if (!row) throw new HttpError(404, "Запись не найдена");
      if (input.version && row.version !== input.version) throw new HttpError(409, "Запись уже изменил другой сотрудник. Обновите страницу");
      await q("UPDATE admin_records SET title=?, subtitle=?, status=?, data_json=?, version=version+1, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", title, subtitle, status, JSON.stringify(data), actor.id, input.id);
      await audit(q, actor, `${kind}.update`, input.id, `${title}: ${RECORD_STATUS[status].label}`);
      return input.id;
    }
    const id = newId();
    const [last] = await q<{ m: number }>("SELECT COALESCE(MAX(sort_order),0)::int AS m FROM admin_records WHERE kind=?", kind);
    await q("INSERT INTO admin_records(id,kind,title,subtitle,status,category,sort_order,data_json,created_by,updated_by) VALUES(?,?,?,?,?,'',?,?,?,?)", id, kind, title, subtitle, status, Math.min(100_000, (last?.m ?? 0) + 10), JSON.stringify(data), actor.id, actor.id);
    await audit(q, actor, `${kind}.create`, id, `${title}: ${RECORD_STATUS[status].label}`);
    return id;
  });
}

async function one(kind: RecordKind, id: string) {
  const r = (await listRecords(kind)).find((x) => x.id === id);
  if (!r) throw new HttpError(404, "Запись не найдена");
  return r;
}

export async function setRecordStatus(actor: Actor, kind: string, id: string, status: string) {
  if (!isKind(kind)) throw new HttpError(400, "Неизвестный раздел");
  const r = await one(kind, id);
  await saveRecord(actor, kind, { id, version: r.version, title: r.title, subtitle: r.subtitle, status, data: r.data });
}

export async function moveRecord(actor: Actor, kind: string, id: string, dir: -1 | 1) {
  if (!isKind(kind)) throw new HttpError(400, "Неизвестный раздел");
  if (!canRecords(actor, kind)) throw new HttpError(403, "Нет доступа к разделу");
  const list = await listRecords(kind);
  const i = list.findIndex((x) => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  const order = list.map((x) => x.id);
  [order[i], order[j]] = [order[j], order[i]];
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    for (let k = 0; k < order.length; k++) await q("UPDATE admin_records SET sort_order=? WHERE id=?", (k + 1) * 10, order[k]);
    await audit(q, actor, `${kind}.order`, id, dir < 0 ? "выше" : "ниже");
  });
}

export async function archiveRecord(actor: Actor, kind: string, id: string) {
  if (!isKind(kind)) throw new HttpError(400, "Неизвестный раздел");
  if (!canRecords(actor, kind)) throw new HttpError(403, "Нет доступа к разделу");
  const r = await one(kind, id);
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    await q("UPDATE admin_records SET archived=1, status='hidden', version=version+1, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", actor.id, id);
    await audit(q, actor, `${kind}.archive`, id, r.title);
  });
}
