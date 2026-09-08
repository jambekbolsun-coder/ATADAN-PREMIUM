import { requireActor } from "../../../lib/admin-auth";
import { getCatalog } from "../../../lib/catalog";
import { getNewsPosts } from "../../../lib/news";
import { cleanText, fail, jsonBody, safeMedia, sameOrigin } from "../../../lib/security";
import type { Tractor } from "../../../types";
import { ensureDb, getRawDb } from "../../../../db";

const newsStatuses = new Set(["draft", "published", "archived"]);
const newsCategories = new Set(["selection", "technology", "field", "service", "company"]);

function normalizedProduct(value: unknown): Tractor {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("product");
  const raw = value as Record<string, unknown>;
  const slug = cleanText(raw.slug, 100, true).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("slug");
  const model = cleanText(raw.model, 80, true);
  const hp = Number(raw.hp);
  if (!Number.isInteger(hp) || hp < 20 || hp > 500) throw new Error("hp");
  const price = raw.price === null || raw.price === "" ? null : Number(raw.price);
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1_000_000_000)) throw new Error("price");
  const discountPercent = raw.discountPercent === null || raw.discountPercent === "" ? null : Number(raw.discountPercent);
  if (discountPercent !== null && (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 90)) throw new Error("discount");
  const image = safeMedia(raw.image);
  const images = Array.isArray(raw.images) ? raw.images.slice(0, 12).map((item) => safeMedia(item)) : [image];
  const equipment = Array.isArray(raw.equipment) ? raw.equipment.slice(0, 60).map((item) => cleanText(item, 200, true)) : [];
  const specs: Record<string, string> = {};
  if (raw.specs && typeof raw.specs === "object" && !Array.isArray(raw.specs)) {
    for (const [key, value] of Object.entries(raw.specs).slice(0, 80)) specs[cleanText(key, 100, true)] = cleanText(value, 300, true);
  }
  return {
    id: cleanText(raw.id || crypto.randomUUID(), 100, true),
    slug, model, hp,
    category: cleanText(raw.category, 100, true),
    farmArea: cleanText(raw.farmArea ?? "", 100),
    price,
    discountPercent,
    promotionLabel: raw.promotionLabel ? cleanText(raw.promotionLabel, 120) : null,
    inStock: Boolean(raw.inStock),
    recommended: Boolean(raw.recommended),
    popular: Boolean(raw.popular),
    image,
    images: Array.from(new Set([image, ...images])),
    videoUrl: raw.videoUrl ? safeMedia(raw.videoUrl, true) : null,
    description: cleanText(raw.description ?? "", 3000),
    comfort: cleanText(raw.comfort ?? "", 2000),
    equipment,
    specs,
  };
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    await ensureDb();
    const db = getRawDb();
    const owner = actor.role === "owner";
    const [catalog, posts, leads, popular, popularPosts, totals, daily] = await Promise.all([
      getCatalog(),
      owner ? getNewsPosts(true) : Promise.resolve([]),
      owner ? db.prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT 200").all() : Promise.resolve({ results: [] }),
      db.prepare(`SELECT tractor_slug, COUNT(*) AS views FROM interest_events WHERE tractor_slug IS NOT NULL GROUP BY tractor_slug ORDER BY views DESC LIMIT 8`).all(),
      owner ? db.prepare(`SELECT path, COUNT(*) AS views FROM interest_events WHERE path LIKE '/news/%' GROUP BY path ORDER BY views DESC LIMIT 20`).all() : Promise.resolve({ results: [] }),
      db.prepare("SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM interest_events").first(),
      db.prepare(`SELECT substr(created_at,1,10) AS day,COUNT(*) AS views FROM interest_events WHERE created_at>=datetime('now','-6 days') GROUP BY day ORDER BY day`).all(),
    ]);
    return Response.json({
      actor,
      catalog,
      posts,
      leads: leads.results,
      popular: popular.results,
      popularPosts: popularPosts.results,
      totals,
      daily: daily.results,
      profile: { display_name: actor.display_name, phone: actor.phone, email: actor.email, avatar: actor.avatar, theme: actor.theme },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const actor = await requireActor(request);
    const body = await jsonBody(request, 300_000);
    const action = String(body.action ?? "");
    const db = getRawDb();
    const ownerOnly = () => {
      if (actor.role !== "owner") throw Object.assign(new Error("Действие доступно только управляющему"), { status: 403 });
    };

    if (action === "save_product") {
      ownerOnly();
      let product: Tractor;
      try { product = normalizedProduct(body.product); } catch { return Response.json({ error: "Проверьте поля товара, ссылки и числовые значения" }, { status: 400 }); }
      await db.prepare(`INSERT INTO product_overrides(slug,data_json,is_deleted,updated_at) VALUES(?,?,0,CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET data_json=excluded.data_json,is_deleted=0,updated_at=CURRENT_TIMESTAMP`).bind(product.slug, JSON.stringify(product)).run();
    } else if (action === "delete_product") {
      ownerOnly();
      const slug = cleanText(body.slug, 100, true);
      await db.prepare(`INSERT INTO product_overrides(slug,data_json,is_deleted,updated_at) VALUES(?,'{}',1,CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET is_deleted=1,updated_at=CURRENT_TIMESTAMP`).bind(slug).run();
    } else if (action === "save_news") {
      ownerOnly();
      const post = body.post as Record<string, unknown> | undefined;
      const title = post?.title as Record<string, unknown> | undefined;
      const slug = cleanText(post?.slug, 100, true);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !title?.ru || !newsStatuses.has(String(post?.status)) || !newsCategories.has(String(post?.category))) {
        return Response.json({ error: "Проверьте заголовок, slug, категорию и статус публикации" }, { status: 400 });
      }
      const json = JSON.stringify(post);
      if (json.length > 250_000) return Response.json({ error: "Публикация слишком большая" }, { status: 413 });
      if (post?.featured) {
        const posts = await getNewsPosts(true);
        const statements = posts.filter((item) => item.slug !== slug && item.featured).map((item) => db.prepare(`INSERT INTO news_posts(slug,data_json,is_deleted,updated_at) VALUES(?,?,0,CURRENT_TIMESTAMP)
          ON CONFLICT(slug) DO UPDATE SET data_json=excluded.data_json,is_deleted=0,updated_at=CURRENT_TIMESTAMP`).bind(item.slug, JSON.stringify({ ...item, featured: false })));
        if (statements.length) await db.batch(statements);
      }
      await db.prepare(`INSERT INTO news_posts(slug,data_json,is_deleted,updated_at) VALUES(?,?,0,CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET data_json=excluded.data_json,is_deleted=0,updated_at=CURRENT_TIMESTAMP`).bind(slug, json).run();
      const original = cleanText(body.originalSlug ?? "", 100);
      if (original && original !== slug) await db.prepare(`INSERT INTO news_posts(slug,data_json,is_deleted,updated_at) VALUES(?,'{}',1,CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET is_deleted=1,updated_at=CURRENT_TIMESTAMP`).bind(original).run();
    } else if (action === "delete_news") {
      ownerOnly();
      const slug = cleanText(body.slug, 100, true);
      await db.prepare(`INSERT INTO news_posts(slug,data_json,is_deleted,updated_at) VALUES(?,'{}',1,CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET is_deleted=1,updated_at=CURRENT_TIMESTAMP`).bind(slug).run();
    } else if (action === "lead_status") {
      ownerOnly();
      const id = cleanText(body.id, 100, true);
      const status = cleanText(body.status, 20, true);
      if (!new Set(["new", "contacted", "closed"]).has(status)) return Response.json({ error: "Некорректный статус" }, { status: 400 });
      await db.prepare("UPDATE leads SET status=? WHERE id=?").bind(status, id).run();
    } else if (action === "save_profile") {
      const profile = body.profile as Record<string, unknown>;
      const theme = String(profile?.theme ?? "field");
      if (!["field","light","dark"].includes(theme)) return Response.json({ error:"Неизвестная тема" },{status:400});
      await db.prepare("UPDATE staff SET display_name=?,phone=?,avatar=?,theme=? WHERE id=?")
        .bind(cleanText(profile?.displayName, 120, true), cleanText(profile?.phone ?? "", 40), safeMedia(profile?.avatar ?? "", true) || null, theme, actor.id).run();
    } else {
      return Response.json({ error: "Неизвестное действие" }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status: number }).status) : undefined;
    if (status === 403) return Response.json({ error: "Действие доступно только управляющему" }, { status: 403 });
    return fail(error);
  }
}
