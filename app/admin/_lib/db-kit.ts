/** Общие мелочи для серверной логики новых разделов: запросы в транзакции, id, текст, журнал. */
import type { PoolClient } from "pg";
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { HttpError } from "../../lib/security";

export type Q = <T = Record<string, unknown>>(sql: string, ...args: unknown[]) => Promise<T[]>;
export const query = (client: PoolClient): Q => async <T,>(sql: string, ...args: unknown[]) => (await getRawDb().prepare(sql).bind(...args).execute<T>(client)).results;
export const newId = () => crypto.randomUUID();
/** JSON из базы: битая старая запись не должна ронять страницу. */
export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  try { return (JSON.parse(value || "") as T) ?? fallback; } catch { return fallback; }
}
export const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
export const isBoss = (a: Pick<Actor, "role">) => a.role === "owner" || a.role === "director";

export function num(v: unknown, label: string, { min = 0, max = 1_000_000_000, int = false, optional = false } = {}): number | null {
  const raw = String(v ?? "").replace(/\s/g, "").replace(",", ".");
  if (!raw) {
    if (optional) return null;
    throw new HttpError(400, `${label}: укажите число`);
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) throw new HttpError(400, `${label}: от ${min} до ${max.toLocaleString("ru-RU")}`);
  return n;
}

export const toMinor = (v: unknown, label: string, optional = false) => {
  const n = num(v, label, { optional });
  return n === null ? null : Math.round(n * 100);
};

/** Ссылка на картинку: только свои /images, загруженные /api/media или https. */
export function mediaUrl(v: unknown, label: string) {
  const s = text(v, 2000);
  if (!s) return "";
  if (!/^(\/images\/|\/api\/media\/|https:\/\/)/.test(s) || /[\s"'<>]/.test(s)) throw new HttpError(400, `${label}: загрузите картинку или вставьте ссылку https://`);
  return s;
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export function slugOf(v: unknown, label = "Адрес страницы") {
  const s = text(v, 100).toLowerCase();
  if (!SLUG_RE.test(s)) throw new HttpError(400, `${label}: только латинские буквы, цифры и дефисы, например cfg1204-b`);
  return s;
}
/** Латиница для адреса из названия (кириллица транслитом). */
export function slugify(v: string) {
  const map: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", ң: "n", о: "o", ө: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ү: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e", ю: "yu", я: "ya" };
  return v.toLowerCase().split("").map((c) => map[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

export async function audit(q: Q, actor: Actor, action: string, entity: string, detail: string) {
  await q("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)", newId(), actor.id, action, entity, detail.slice(0, 2000));
}

/**
 * Уведомление в колокольчик. Получают активные сотрудники с нужной ролью или доступом,
 * кроме тех, кто отключил эту тему в Настройки → Уведомления. Владелец и директор получают всё,
 * что касается их ролей.
 */
export async function notify(q: Q, n: { topic: string; title: string; body?: string; url?: string; priority?: "high" | "normal"; roles?: string[]; perms?: string[]; to?: string[]; exclude?: string; entity?: { type: string; id: string } }) {
  const roles = n.roles ?? ["owner", "director"];
  const staff = await q<{ id: string; role: string; permissions_json: string; notify_json: string }>("SELECT id, role, permissions_json, notify_json FROM staff WHERE active=1");
  for (const s of staff) {
    if (s.id === n.exclude) continue;
    let perms: string[] = [];
    try { const p = JSON.parse(s.permissions_json); if (Array.isArray(p)) perms = p; } catch { perms = []; }
    const fits = n.to ? n.to.includes(s.id) : roles.includes(s.role) || (n.perms ?? []).some((p) => perms.includes(p));
    if (!fits) continue;
    let prefs: Record<string, boolean> = {};
    try { prefs = JSON.parse(s.notify_json || "{}"); } catch { prefs = {}; }
    if (prefs[n.topic] === false) continue;
    await q("INSERT INTO notifications_v2(id,recipient_id,type,priority,title,body,entity_type,entity_id,target_url) VALUES(?,?,?,?,?,?,?,?,?)", newId(), s.id, n.topic, n.priority ?? "normal", n.title.slice(0, 200), (n.body ?? "").slice(0, 600), n.entity?.type ?? null, n.entity?.id ?? null, n.url ?? null);
  }
}
