/**
 * Публикации «АгроЖурнал». Базовые статьи в app/data/news.ts, правки и новые - в news_posts
 * (полный объект NewsPost). Сайт читает через app/lib/news.ts.
 *
 * Правила: без заголовка, анонса, текста (по-русски) и обложки опубликовать нельзя; «главная»
 * статья одна; удаление - мягкое (is_deleted), адрес можно сменить только до публикации.
 */
import { getRawDb } from "../../../db";
import { newsCategoryLabels, seedNews } from "../../data/news";
import type { Actor } from "../../lib/admin-auth";
import { canUseSection } from "../../lib/admin-auth";
import { HttpError } from "../../lib/security";
import type { Locale, NewsCategory, NewsPost } from "../../types";
import { audit, mediaUrl, query, safeJson, slugOf, text } from "./db-kit";

export const POST_STATUS: Record<string, { label: string; tone: "good" | "warn" | "mute" }> = {
  published: { label: "Опубликовано", tone: "good" },
  draft: { label: "Черновик", tone: "warn" },
  archived: { label: "В архиве", tone: "mute" },
};
export const POST_CATEGORIES = newsCategoryLabels.ru as Record<NewsCategory, string>;
export const LOCALES: { key: Locale; label: string }[] = [{ key: "ru", label: "Русский" }, { key: "ky", label: "Кыргызча" }, { key: "en", label: "English" }];
export const canNews = (a: Actor) => canUseSection(a, "news");

export type AdminPost = NewsPost & { custom: boolean; views: number };

export async function listPosts(): Promise<AdminPost[]> {
  const db = getRawDb();
  const [rows, views] = await Promise.all([
    db.prepare("SELECT slug, data_json, is_deleted FROM news_posts").all<{ slug: string; data_json: string; is_deleted: number }>(),
    db.prepare("SELECT substr(path, 7) AS slug, COUNT(*)::int AS n FROM interest_events WHERE event_type='page_view' AND path LIKE '/news/%' GROUP BY 1").all<{ slug: string; n: number }>(),
  ]);
  const ch = new Map(rows.results.map((r) => [r.slug, r]));
  const v = new Map(views.results.map((r) => [r.slug, r.n]));
  const out: AdminPost[] = [];
  for (const p of seedNews) {
    const c = ch.get(p.slug);
    if (c?.is_deleted) { ch.delete(p.slug); continue; }
    out.push({ ...(c ? { ...p, ...safeJson<Partial<NewsPost>>(c.data_json, {}) } : p), custom: false, views: v.get(p.slug) ?? 0 });
    ch.delete(p.slug);
  }
  for (const c of ch.values()) if (!c.is_deleted) { const p = safeJson<NewsPost | null>(c.data_json, null); if (p?.slug && p.title?.ru) out.push({ ...p, publishedAt: p.publishedAt ?? "", custom: true, views: v.get(p.slug) ?? 0 }); }
  const rank = (s: string) => (s === "draft" ? 0 : s === "published" ? 1 : 2);
  return out.sort((a, b) => rank(a.status) - rank(b.status) || Number(b.featured) - Number(a.featured) || b.publishedAt.localeCompare(a.publishedAt));
}

export async function getPost(slug: string) {
  return (await listPosts()).find((p) => p.slug === slug) ?? null;
}

export type PostInput = {
  originalSlug?: string;
  slug: string; category: string; status: string; featured: boolean;
  coverImage: string; gallery: string[]; publishedAt: string; author: string;
  relatedTractorSlug: string; sourceUrl: string; tags: string;
  title: Record<Locale, string>; excerpt: Record<Locale, string>; content: Record<Locale, string>;
};

const loc = (v: Record<Locale, string> | undefined, max: number) => ({ ru: text(v?.ru, max), ky: text(v?.ky, max), en: text(v?.en, max) });

async function write(q: ReturnType<typeof query>, slug: string, post: NewsPost) {
  await q(`INSERT INTO news_posts(slug,data_json,is_deleted,updated_at) VALUES(?,?,0,CURRENT_TIMESTAMP)
    ON CONFLICT(slug) DO UPDATE SET data_json=excluded.data_json, is_deleted=0, updated_at=CURRENT_TIMESTAMP`, slug, JSON.stringify(post));
}

export async function savePost(actor: Actor, input: PostInput) {
  if (!canNews(actor)) throw new HttpError(403, "Нет доступа к публикациям");
  const slug = slugOf(input.slug);
  const status = (["draft", "published", "archived"].includes(input.status) ? input.status : "draft") as NewsPost["status"];
  const category = (Object.keys(POST_CATEGORIES).includes(input.category) ? input.category : "company") as NewsCategory;
  const title = loc(input.title, 200), excerpt = loc(input.excerpt, 600), content = loc(input.content, 60_000);
  if (!title.ru) throw new HttpError(400, "Укажите заголовок на русском");
  const cover = mediaUrl(input.coverImage, "Обложка");
  if (status === "published") {
    if (!excerpt.ru) throw new HttpError(400, "Для публикации нужен короткий анонс");
    if (!content.ru || content.ru.length < 200) throw new HttpError(400, "Для публикации нужен текст статьи (хотя бы 200 знаков)");
    if (!cover) throw new HttpError(400, "Для публикации нужна обложка");
  }
  const publishedAt = /^\d{4}-\d{2}-\d{2}$/.test(input.publishedAt) ? input.publishedAt : new Date().toISOString().slice(0, 10);
  const words = content.ru.split(/\s+/).filter(Boolean).length;
  const post: NewsPost = {
    slug, category, status, featured: !!input.featured, coverImage: cover,
    gallery: (input.gallery ?? []).slice(0, 12).map((g, i) => mediaUrl(g, `Фото ${i + 1}`)).filter(Boolean),
    publishedAt, readingMinutes: Math.max(1, Math.round(words / 180)), author: text(input.author, 80) || actor.display_name,
    relatedTractorSlug: input.relatedTractorSlug ? slugOf(input.relatedTractorSlug, "Модель") : null,
    sourceUrl: input.sourceUrl ? mediaUrl(input.sourceUrl, "Источник") : null,
    tags: String(input.tags ?? "").split(",").map((t) => text(t, 40)).filter(Boolean).slice(0, 12),
    title, excerpt, content,
  };
  if (JSON.stringify(post).length > 250_000) throw new HttpError(413, "Публикация слишком большая");

  // читаем до транзакции: внутри неё работаем только через её соединение
  const all = await listPosts();
  const original = input.originalSlug ? slugOf(input.originalSlug) : null;
  const before = original ? all.find((p) => p.slug === original) : null;
  if (original && !before) throw new HttpError(404, "Публикация не найдена");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    await q("SELECT pg_advisory_xact_lock(hashtext('news-posts'))");
    if (original !== slug) {
      const taken = seedNews.some((p) => p.slug === slug) || (await q("SELECT 1 FROM news_posts WHERE slug=? AND is_deleted=0", slug)).length > 0;
      if (taken) throw new HttpError(409, `Адрес ${slug} уже занят`);
      if (before && before.status === "published") throw new HttpError(409, "Адрес опубликованной статьи не меняется: на неё уже ведут ссылки");
    }
    if (post.featured) for (const p of all) if (p.featured && p.slug !== slug && p.slug !== original) {
      const { custom: _c, views: _v, ...rest } = p; void _c; void _v;
      await write(q, p.slug, { ...rest, featured: false });
    }
    await write(q, slug, post);
    if (original && original !== slug) await q("UPDATE news_posts SET is_deleted=1, updated_at=CURRENT_TIMESTAMP WHERE slug=?", original);
    await audit(q, actor, before ? "news.update" : "news.create", slug, `${title.ru}: ${POST_STATUS[status].label}`);
    return slug;
  });
}

export async function setPostStatus(actor: Actor, slug: string, status: string) {
  const p = await getPost(slug);
  if (!p) throw new HttpError(404, "Публикация не найдена");
  const { custom: _c, views: _v, ...rest } = p; void _c; void _v;
  await savePost(actor, { ...rest, originalSlug: slug, status, gallery: rest.gallery ?? [], relatedTractorSlug: rest.relatedTractorSlug ?? "", sourceUrl: rest.sourceUrl ?? "", tags: rest.tags.join(", ") });
}

export async function deletePost(actor: Actor, slug: string) {
  if (!canNews(actor)) throw new HttpError(403, "Нет доступа к публикациям");
  const p = await getPost(slug);
  if (!p) throw new HttpError(404, "Публикация не найдена");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    await q(`INSERT INTO news_posts(slug,data_json,is_deleted,updated_at) VALUES(?,'{}',1,CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET is_deleted=1, updated_at=CURRENT_TIMESTAMP`, slug);
    await audit(q, actor, "news.delete", slug, p.title.ru);
  });
}
