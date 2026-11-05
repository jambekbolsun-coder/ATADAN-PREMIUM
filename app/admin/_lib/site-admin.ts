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
import { audit, num, query, text } from "./db-kit";

export const canSite = (a: Actor) => canUseSection(a, "site-settings");
export const canAnalytics = (a: Actor) => canUseSection(a, "site-analytics");
export { getSiteSettings };

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
