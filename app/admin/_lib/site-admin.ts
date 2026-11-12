/**
 * Общие настройки сайта (site_settings key='public'): контакты и параметры калькулятора,
 * плюс аналитика посещений (interest_events) и заявок (leads).
 * Переводы и замены картинок, которые хранятся в тех же настройках, не трогаем: сохраняем как есть.
 */
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { canUseSection } from "../../lib/admin-auth";
import { HttpError } from "../../lib/security";
import { getSiteSettings } from "../../lib/site-settings";
import { getLeaseTermSettings } from "../../lib/leasing-public";
import { formatLeaseTerm, LEASE_TERM_HARD_MAX, leaseTermChoices } from "../../lib/leasing";
import { audit, newId, num, query, safeJson, text } from "./db-kit";
import { canRecords, listRecords } from "./records-admin";

export const canSite = (a: Actor) => canUseSection(a, "site-settings");
export const canAnalytics = (a: Actor) => canUseSection(a, "site-analytics");
export { getSiteSettings, getLeaseTermSettings };

export type ContactsInput = { phone: string; address: string; instagram: string; email: string; workingHours: string; annualRate: string; downPercent: string; fee: string; method: string; version: number };

export async function saveContacts(actor: Actor, input: ContactsInput) {
  if (!canSite(actor)) throw new HttpError(403, "Настройки сайта меняют владелец, директор или сотрудник с доступом «Настройки сайта»");
  const phone = text(input.phone, 40), address = text(input.address, 300), instagram = text(input.instagram, 300), email = text(input.email, 160);
  if (!/^\+?[\d\s()-]{8,40}$/.test(phone)) throw new HttpError(400, "Проверьте телефон: например +996 706 131 404");
  if (!address) throw new HttpError(400, "Укажите адрес");
  if (!/^https:\/\/(www\.)?instagram\.com\//.test(instagram)) throw new HttpError(400, "Ссылка Instagram должна начинаться с https://instagram.com/");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Проверьте email");
  const annualRate = num(input.annualRate, "Годовая ставка, %", { max: 100, optional: true });
  const downPercent = num(input.downPercent, "Первый взнос, %", { max: 100 })!;
  const fee = num(input.fee, "Комиссия, сом", { max: 100_000_000, optional: true }) ?? 0;
  const method = input.method === "differentiated" ? "differentiated" : "annuity";
  const { settings, version } = await getSiteSettings();
  const next = { ...settings, phone, address, instagram, email, workingHours: text(input.workingHours, 160), annualRate, downPercent, fee, method };
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    if (version === 0) await q("INSERT INTO site_settings(key,value,version) VALUES('public',?,1) ON CONFLICT(key) DO NOTHING", JSON.stringify(next));
    else {
      const rows = await q<{ key: string }>("UPDATE site_settings SET value=?, version=version+1 WHERE key='public' AND version=? RETURNING key", JSON.stringify(next), input.version || version);
      if (!rows.length) throw new HttpError(409, "Настройки уже изменил другой сотрудник. Обновите страницу");
    }
    await audit(q, actor, "site.settings", "public", `Контакты: ${phone}, ${address}`);
  });
}

export async function analytics(days: number) {
  const db = getRawDb();
  const since = `${Math.max(1, Math.min(365, days))} days`;
  const [daily, models, pages, sources, regions, totals] = await Promise.all([
    db.prepare(`SELECT created_at::date::text AS day, COUNT(*) FILTER (WHERE event_type='page_view')::int AS views, COUNT(DISTINCT visitor_id)::int AS visitors
      FROM interest_events WHERE created_at >= CURRENT_DATE - ?::interval GROUP BY 1 ORDER BY 1`).bind(since).all<{ day: string; views: number; visitors: number }>(),
    db.prepare(`SELECT tractor_slug AS slug, COUNT(*) FILTER (WHERE event_type='page_view')::int AS views, COUNT(*) FILTER (WHERE event_type='model_interest')::int AS interest
      FROM interest_events WHERE created_at >= CURRENT_DATE - ?::interval AND COALESCE(tractor_slug,'')<>'' GROUP BY 1 ORDER BY COUNT(*) FILTER (WHERE event_type='page_view') + 3 * COUNT(*) FILTER (WHERE event_type='model_interest') DESC LIMIT 12`).bind(since).all<{ slug: string; views: number; interest: number }>(),
    db.prepare(`SELECT path, COUNT(*)::int AS views FROM interest_events WHERE event_type='page_view' AND created_at >= CURRENT_DATE - ?::interval GROUP BY 1 ORDER BY 2 DESC LIMIT 12`).bind(since).all<{ path: string; views: number }>(),
    db.prepare(`SELECT COALESCE(NULLIF(utm_source,''), NULLIF(source,''), 'сайт') AS source, COUNT(*)::int AS leads FROM leads WHERE created_at >= CURRENT_DATE - ?::interval GROUP BY 1 ORDER BY 2 DESC`).bind(since).all<{ source: string; leads: number }>(),
    db.prepare(`SELECT COALESCE(NULLIF(region,''),'не определён') AS region, COUNT(DISTINCT visitor_id)::int AS visitors FROM interest_events WHERE created_at >= CURRENT_DATE - ?::interval GROUP BY 1 ORDER BY 2 DESC LIMIT 10`).bind(since).all<{ region: string; visitors: number }>(),
    db.prepare(`SELECT COUNT(*) FILTER (WHERE event_type='page_view')::int AS views, COUNT(DISTINCT visitor_id)::int AS visitors,
      (SELECT COUNT(*)::int FROM leads WHERE created_at >= CURRENT_DATE - ?::interval) AS leads FROM interest_events WHERE created_at >= CURRENT_DATE - ?::interval`).bind(since, since).first<{ views: number; visitors: number; leads: number }>(),
  ]);
  return { daily: daily.results, models: models.results, pages: pages.results, sources: sources.results, regions: regions.results, totals: totals ?? { views: 0, visitors: 0, leads: 0 } };
}

/**
 * Банки и ставки (Маркетинг → Страницы сайта → Банки и ставки).
 * Банк = запись admin_records kind='leasing_terms', те же «Программы банков», что в разделе Лизинг:
 * одно хранилище, поэтому два раздела не расходятся. Здесь меняются только название, годовая ставка,
 * минимальный первый взнос, комиссия в %, включён ли банк и порядок показа. Остальные поля программы
 * (страховка, опции, даты действия и т.д.) сохраняются как есть.
 * Включён = status 'published' (виден в калькуляторе), выключен = 'hidden'.
 * Удаление = архив: заявки, где банк уже выбран, не теряют ссылку.
 */
export const canBanks = (a: Actor) => canRecords(a, "leasing_terms");
const BANK_DENIED = "Банки и ставки меняют владелец, директор или сотрудник с доступом «Лизинг»";

export type Bank = { id: string; name: string; annualRate: number | null; minDownPercent: number | null; commissionPercent: number | null; active: boolean; status: string; sortOrder: number; version: number; extras: string[] };

/** Дополнительные условия, которые меняются только в разделе Лизинг (показываем подсказкой). */
const EXTRAS: [string, string][] = [["fixedCommission", "фикс. комиссия"], ["markupPercent", "удорожание"], ["insurance", "страховка"], ["processingFee", "оформление"], ["delivery", "доставка"], ["options", "опции"], ["zeroPercent", "0%"], ["startsAt", "дата начала"], ["endsAt", "дата окончания"]];
const pct = (v: string | undefined) => (v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export async function listBanks(): Promise<Bank[]> {
  const rows = await listRecords("leasing_terms");
  return rows.map((r) => ({
    id: r.id, name: r.title, status: r.status, active: r.status === "published", sortOrder: r.sort_order, version: r.version,
    annualRate: pct(r.data.annualRate), minDownPercent: pct(r.data.minDownPercent), commissionPercent: pct(r.data.commissionPercent),
    extras: EXTRAS.filter(([k]) => { const v = r.data[k]; return !!v && v !== "0" && v !== "Нет"; }).map(([, label]) => label),
  }));
}

export type BankInput = { id?: string; version?: number; name: string; annualRate: string; minDownPercent: string; commissionPercent: string; active: boolean; sortOrder: string };

export async function saveBank(actor: Actor, input: BankInput) {
  if (!canBanks(actor)) throw new HttpError(403, BANK_DENIED);
  const name = text(input.name, 120);
  if (name.length < 2) throw new HttpError(400, "Укажите название банка, например «Айыл Банк»");
  const annualRate = num(input.annualRate, "Годовая ставка, %", { max: 100 })!;
  const minDown = num(input.minDownPercent, "Минимальный первый взнос, %", { max: 100 })!;
  const commission = num(input.commissionPercent, "Комиссия, %", { max: 100, optional: true }) ?? 0;
  const sortOrder = num(input.sortOrder, "Порядок", { max: 100_000, int: true, optional: true });
  const status = input.active ? "published" : "hidden";
  const fields = { annualRate: String(annualRate), minDownPercent: String(minDown), commissionPercent: String(commission) };
  const checkDown = (data: Record<string, string>) => {
    const maxDown = Number(data.maxDownPercent || 90);
    if (Number.isFinite(maxDown) && minDown > maxDown) throw new HttpError(400, `Минимальный взнос ${minDown}% больше максимального (${maxDown}%). Уменьшите взнос или поменяйте максимум в разделе Лизинг`);
  };
  const { maxMonths } = await getLeaseTermSettings();
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    if (input.id) {
      const [row] = await q<{ data_json: string; version: number; sort_order: number }>("SELECT data_json, version, sort_order FROM admin_records WHERE id=? AND kind='leasing_terms' AND archived=0 FOR UPDATE", input.id);
      if (!row) throw new HttpError(404, "Банк не найден. Обновите страницу");
      if (input.version && row.version !== input.version) throw new HttpError(409, "Банк уже изменил другой сотрудник. Обновите страницу");
      const data = { ...safeJson<Record<string, string>>(row.data_json, {}), ...fields };
      checkDown(data);
      await q("UPDATE admin_records SET title=?, status=?, sort_order=?, data_json=?, version=version+1, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", name, status, sortOrder ?? row.sort_order, JSON.stringify(data), actor.id, input.id);
      await audit(q, actor, "leasing_terms.update", input.id, `Банк ${name}: ${annualRate}% годовых, взнос от ${minDown}%, комиссия ${commission}%, ${input.active ? "включён" : "выключен"}`);
      return input.id;
    }
    const id = newId();
    const [last] = await q<{ m: number }>("SELECT COALESCE(MAX(sort_order),0)::int AS m FROM admin_records WHERE kind='leasing_terms' AND archived=0");
    // termsMonths нужен разделу Лизинг для публикации; на сайте срок выбирает клиент (до максимума из настроек).
    const data = { programType: "Лизинг", currency: "KGS", partner: name, termsMonths: leaseTermChoices(maxMonths).join(", "), ...fields };
    checkDown(data);
    await q("INSERT INTO admin_records(id,kind,title,subtitle,status,category,sort_order,data_json,created_by,updated_by) VALUES(?,'leasing_terms',?,'',?,'',?,?,?,?)", id, name, status, sortOrder ?? Math.min(100_000, (last?.m ?? 0) + 10), JSON.stringify(data), actor.id, actor.id);
    await audit(q, actor, "leasing_terms.create", id, `Банк ${name}: ${annualRate}% годовых, взнос от ${minDown}%, комиссия ${commission}%`);
    return id;
  });
}

export async function setBankActive(actor: Actor, id: string, active: boolean) {
  if (!canBanks(actor)) throw new HttpError(403, BANK_DENIED);
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [row] = await q<{ title: string }>("UPDATE admin_records SET status=?, version=version+1, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND kind='leasing_terms' AND archived=0 RETURNING title", active ? "published" : "hidden", actor.id, id);
    if (!row) throw new HttpError(404, "Банк не найден. Обновите страницу");
    await audit(q, actor, "leasing_terms.update", id, `Банк ${row.title}: ${active ? "включён" : "выключен"}`);
  });
}

export async function deleteBank(actor: Actor, id: string) {
  if (!canBanks(actor)) throw new HttpError(403, BANK_DENIED);
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [row] = await q<{ title: string }>("UPDATE admin_records SET archived=1, status='hidden', version=version+1, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND kind='leasing_terms' AND archived=0 RETURNING title", actor.id, id);
    if (!row) throw new HttpError(404, "Банк не найден. Обновите страницу");
    await audit(q, actor, "leasing_terms.archive", id, `Банк ${row.title} удалён`);
  });
}

/** Максимальный срок лизинга на сайте: site_settings key='leasing' (см. app/lib/leasing-public.ts). */
export async function saveLeaseTerm(actor: Actor, input: { maxMonths: string; version: number }) {
  if (!canBanks(actor)) throw new HttpError(403, BANK_DENIED);
  const maxMonths = num(input.maxMonths, "Максимальный срок, месяцев", { min: 1, max: LEASE_TERM_HARD_MAX, int: true })!;
  const value = JSON.stringify({ maxMonths });
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const rows = input.version
      ? await q<{ key: string }>("UPDATE site_settings SET value=?, version=version+1 WHERE key='leasing' AND version=? RETURNING key", value, input.version)
      : await q<{ key: string }>("INSERT INTO site_settings(key,value,version) VALUES('leasing',?,1) ON CONFLICT(key) DO NOTHING RETURNING key", value);
    if (!rows.length) throw new HttpError(409, "Срок уже изменил другой сотрудник. Обновите страницу");
    await audit(q, actor, "site.leasing_term", "leasing", `Максимальный срок лизинга: ${formatLeaseTerm(maxMonths)}`);
  });
}
