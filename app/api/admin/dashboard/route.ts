import { isAdmin } from "../../../lib/admin-auth";
import { getCatalog } from "../../../lib/catalog";
import { getNewsPosts } from "../../../lib/news";
import { ensureDb, getRawDb } from "../../../../db";

function unauthorized() {
  return Response.json({ error: "Требуется вход" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!(await isAdmin(request))) return unauthorized();
  await ensureDb();
  const db = getRawDb();
  const [catalog, posts, leads, popular, popularPosts, totals, daily, profile] = await Promise.all([
    getCatalog(),
    getNewsPosts(true),
    db.prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT 200").all(),
    db.prepare(`SELECT tractor_slug, COUNT(*) AS views FROM interest_events
      WHERE tractor_slug IS NOT NULL GROUP BY tractor_slug ORDER BY views DESC LIMIT 8`).all(),
    db.prepare(`SELECT path, COUNT(*) AS views FROM interest_events
      WHERE path LIKE '/news/%' GROUP BY path ORDER BY views DESC LIMIT 20`).all(),
    db.prepare(`SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
      FROM interest_events`).first(),
    db.prepare(`SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS views FROM interest_events
      WHERE created_at >= datetime('now', '-6 days') GROUP BY day ORDER BY day`).all(),
    db.prepare("SELECT * FROM admin_profile WHERE id = 1").first(),
  ]);
  return Response.json({ catalog, posts, leads: leads.results, popular: popular.results, popularPosts: popularPosts.results, totals, daily: daily.results, profile });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin(request))) return unauthorized();
  await ensureDb();
  const db = getRawDb();
  const body = await request.json() as Record<string, unknown>;
  const action = String(body.action ?? "");

  if (action === "save_product") {
    const product = body.product as { slug?: string; model?: string } | undefined;
    if (!product?.slug || !product.model) return Response.json({ error: "Модель и slug обязательны" }, { status: 400 });
    await db.prepare(`INSERT INTO product_overrides (slug, data_json, is_deleted, updated_at)
      VALUES (?, ?, 0, CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET data_json = excluded.data_json, is_deleted = 0, updated_at = CURRENT_TIMESTAMP`)
      .bind(product.slug, JSON.stringify(product)).run();
  } else if (action === "save_news") {
    const post = body.post as { slug?: string; title?: { ru?: string }; status?: string; category?: string; featured?: boolean } | undefined;
    const originalSlug = String(body.originalSlug ?? "");
    if (!post?.slug || !post.title?.ru) return Response.json({ error: "Заголовок и slug обязательны" }, { status: 400 });
    if (!new Set(["draft", "published", "archived"]).has(String(post.status))) return Response.json({ error: "Некорректный статус" }, { status: 400 });
    if (!new Set(["selection", "technology", "field", "service", "company"]).has(String(post.category))) return Response.json({ error: "Некорректная категория" }, { status: 400 });
    if (post.featured) {
      const posts = await getNewsPosts(true);
      const statements = posts.filter((item) => item.slug !== post.slug && item.featured).map((item) => db.prepare(`INSERT INTO news_posts (slug, data_json, is_deleted, updated_at)
        VALUES (?, ?, 0, CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET data_json = excluded.data_json, is_deleted = 0, updated_at = CURRENT_TIMESTAMP`).bind(item.slug, JSON.stringify({ ...item, featured: false })));
      if (statements.length) await db.batch(statements);
    }
    await db.prepare(`INSERT INTO news_posts (slug, data_json, is_deleted, updated_at)
      VALUES (?, ?, 0, CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET data_json = excluded.data_json, is_deleted = 0, updated_at = CURRENT_TIMESTAMP`)
      .bind(post.slug, JSON.stringify(post)).run();
    if (originalSlug && originalSlug !== post.slug) {
      await db.prepare(`INSERT INTO news_posts (slug, data_json, is_deleted, updated_at) VALUES (?, '{}', 1, CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP`).bind(originalSlug).run();
    }
  } else if (action === "delete_news") {
    const slug = String(body.slug ?? "");
    if (!slug) return Response.json({ error: "Slug обязателен" }, { status: 400 });
    await db.prepare(`INSERT INTO news_posts (slug, data_json, is_deleted, updated_at) VALUES (?, '{}', 1, CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP`).bind(slug).run();
  } else if (action === "delete_product") {
    const slug = String(body.slug ?? "");
    if (!slug) return Response.json({ error: "Slug обязателен" }, { status: 400 });
    await db.prepare(`INSERT INTO product_overrides (slug, data_json, is_deleted, updated_at)
      VALUES (?, '{}', 1, CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP`).bind(slug).run();
  } else if (action === "lead_status") {
    const id = String(body.id ?? "");
    const status = String(body.status ?? "new");
    if (!new Set(["new", "contacted", "closed"]).has(status)) return Response.json({ error: "Некорректный статус" }, { status: 400 });
    await db.prepare("UPDATE leads SET status = ? WHERE id = ?").bind(status, id).run();
  } else if (action === "save_profile") {
    const profile = body.profile as { displayName?: string; phone?: string; email?: string } | undefined;
    await db.prepare(`UPDATE admin_profile SET display_name = ?, phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`)
      .bind(profile?.displayName?.trim() || "Администратор ATADAN", profile?.phone?.trim() || "+996 706 131 404", profile?.email?.trim() || "admin@atadan.kg").run();
  } else {
    return Response.json({ error: "Неизвестное действие" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
