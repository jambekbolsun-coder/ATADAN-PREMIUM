import { requireActor } from "../../../lib/admin-auth";
import { getCatalog } from "../../../lib/catalog";
import { getNewsPosts } from "../../../lib/news";
import { cleanText, fail, jsonBody, safeMedia, sameOrigin } from "../../../lib/security";
import type { Tractor } from "../../../types";
import { ensureDb, getRawDb } from "../../../../db";

const newsStatuses = new Set(["draft", "published", "archived"]);
const newsCategories = new Set(["selection", "technology", "field", "service", "company"]);

function parseGoals(value?:string){
  try{const parsed=JSON.parse(value??"") as Record<string,unknown>;return {sales:Math.max(0,Number(parsed.sales)||0),revenueMinor:Math.max(0,Number(parsed.revenueMinor)||0),profitMinor:Math.max(0,Number(parsed.profitMinor)||0),leads:Math.max(0,Number(parsed.leads)||0),meetings:Math.max(0,Number(parsed.meetings)||0),conversion:Math.max(0,Number(parsed.conversion)||0)}}catch{return {sales:0,revenueMinor:0,profitMinor:0,leads:0,meetings:0,conversion:0}}
}

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
    status: new Set(["draft","published","hidden","archived"]).has(String(raw.status)) ? raw.status as Tractor["status"] : "published",
    sortOrder: Math.max(0, Math.min(100_000, Math.round(Number(raw.sortOrder) || 0))),
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
    const owner = actor.role === "owner" || actor.role === "director";
    const marketing = owner || actor.role === "marketer";
    const [catalog, posts, leads, popular, popularPosts, totals, daily, dealTotals, taskTotals, pipeline, period, goalRow, operations, modelFunnel, channels, managers, comparison] = await Promise.all([
      getCatalog(true),
      marketing ? getNewsPosts(true) : Promise.resolve([]),
      marketing ? db.prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT 200").all() : Promise.resolve({ results: [] }),
      db.prepare(`SELECT tractor_slug, COUNT(*) AS views FROM interest_events WHERE tractor_slug IS NOT NULL GROUP BY tractor_slug ORDER BY views DESC LIMIT 8`).all(),
      marketing ? db.prepare(`SELECT path, COUNT(*) AS views FROM interest_events WHERE path LIKE '/news/%' GROUP BY path ORDER BY views DESC LIMIT 20`).all() : Promise.resolve({ results: [] }),
      db.prepare("SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM interest_events").first(),
      db.prepare(`SELECT substr(created_at,1,10) AS day,COUNT(*) AS views FROM interest_events WHERE created_at>=datetime('now','-6 days') GROUP BY day ORDER BY day`).all(),
      db.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN archived=0 AND stage NOT IN ('won','lost') THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN stage='won' THEN 1 ELSE 0 END) AS won,
        COALESCE(SUM(CASE WHEN stage='won' THEN amount_minor ELSE 0 END),0) AS revenue_minor,
        COALESCE(SUM(CASE WHEN stage='won' AND cost_minor IS NOT NULL THEN amount_minor-cost_minor ELSE 0 END),0) AS profit_minor
        FROM crm_deals`).first(),
      db.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN done=0 THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN done=0 AND due_at < datetime('now') THEN 1 ELSE 0 END) AS overdue
        FROM crm_tasks`).first(),
      db.prepare(`SELECT stage,COUNT(*) AS count,COALESCE(SUM(amount_minor),0) AS amount_minor FROM crm_deals WHERE archived=0 GROUP BY stage ORDER BY count DESC`).all(),
      db.prepare(`SELECT
        (SELECT COUNT(*) FROM interest_events WHERE created_at>=datetime('now','-30 days')) AS views_30,
        (SELECT COUNT(DISTINCT visitor_id) FROM interest_events WHERE created_at>=datetime('now','-30 days')) AS visitors_30,
        (SELECT COUNT(*) FROM leads WHERE created_at>=datetime('now','-30 days')) AS leads_30`).first(),
      db.prepare("SELECT value FROM site_settings WHERE key='director_goals'").first<{value:string}>(),
      db.prepare(`SELECT
        (SELECT COUNT(*) FROM admin_records WHERE kind='inventory_units' AND archived=0) AS stock_units,
        (SELECT COUNT(*) FROM admin_records WHERE kind='shipments' AND archived=0 AND status NOT IN ('closed','archived')) AS active_shipments,
        (SELECT COUNT(*) FROM admin_records WHERE kind='meetings' AND archived=0 AND created_at>=datetime('now','-30 days')) AS meetings_30,
        (SELECT COALESCE(SUM(CAST(json_extract(data_json,'$.amount') AS INTEGER)),0) FROM admin_records WHERE kind='finance_entries' AND archived=0 AND json_extract(data_json,'$.type')='Доход') AS income_som,
        (SELECT COALESCE(SUM(CAST(json_extract(data_json,'$.amount') AS INTEGER)),0) FROM admin_records WHERE kind='finance_entries' AND archived=0 AND json_extract(data_json,'$.type')='Расход') AS expenses_som,
        (SELECT COALESCE(SUM(CAST(json_extract(data_json,'$.amount') AS INTEGER)),0) FROM admin_records WHERE kind='debts' AND archived=0 AND status NOT IN ('closed','archived')) AS debts_som,
        (SELECT COALESCE(SUM(CAST(json_extract(data_json,'$.purchaseCost') AS INTEGER)+CAST(json_extract(data_json,'$.expenses') AS INTEGER)),0) FROM admin_records WHERE kind='inventory_units' AND archived=0 AND json_extract(data_json,'$.unitStatus') NOT IN ('Продан','Выдан')) AS stock_value_som`).first(),
      db.prepare(`SELECT x.tractor_slug,
        COALESCE(v.views,0) AS views,COALESCE(l.leads,0) AS leads,COALESCE(d.meetings,0) AS meetings,
        COALESCE(d.sales,0) AS sales,COALESCE(d.revenue_minor,0) AS revenue_minor,COALESCE(d.profit_minor,0) AS profit_minor
        FROM (SELECT tractor_slug FROM interest_events WHERE tractor_slug IS NOT NULL UNION SELECT tractor_slug FROM leads WHERE tractor_slug IS NOT NULL UNION SELECT tractor_slug FROM crm_deals WHERE tractor_slug IS NOT NULL) x
        LEFT JOIN (SELECT tractor_slug,COUNT(*) views FROM interest_events WHERE tractor_slug IS NOT NULL GROUP BY tractor_slug) v ON v.tractor_slug=x.tractor_slug
        LEFT JOIN (SELECT tractor_slug,COUNT(*) leads FROM leads WHERE tractor_slug IS NOT NULL GROUP BY tractor_slug) l ON l.tractor_slug=x.tractor_slug
        LEFT JOIN (SELECT tractor_slug,SUM(CASE WHEN stage IN ('meeting','negotiation','reserved','contract','awaiting_payment','won') THEN 1 ELSE 0 END) meetings,SUM(CASE WHEN stage='won' THEN 1 ELSE 0 END) sales,SUM(CASE WHEN stage='won' THEN amount_minor ELSE 0 END) revenue_minor,SUM(CASE WHEN stage='won' AND cost_minor IS NOT NULL THEN amount_minor-cost_minor ELSE 0 END) profit_minor FROM crm_deals WHERE tractor_slug IS NOT NULL GROUP BY tractor_slug) d ON d.tractor_slug=x.tractor_slug
        ORDER BY views DESC LIMIT 100`).all(),
      db.prepare(`SELECT COALESCE(NULLIF(source,''),'Не указан') source,COUNT(*) leads,
        COALESCE(SUM(CASE WHEN d.stage='won' THEN 1 ELSE 0 END),0) sales,
        COALESCE(SUM(CASE WHEN d.stage='won' THEN d.amount_minor ELSE 0 END),0) revenue_minor,
        COALESCE(SUM(CASE WHEN d.stage='won' AND d.cost_minor IS NOT NULL THEN d.amount_minor-d.cost_minor ELSE 0 END),0) profit_minor
        FROM leads l LEFT JOIN crm_deals d ON d.lead_id=l.id GROUP BY COALESCE(NULLIF(source,''),'Не указан') ORDER BY leads DESC`).all(),
      db.prepare(`SELECT s.id,s.display_name,COUNT(d.id) deals,
        COALESCE(SUM(CASE WHEN d.stage='won' THEN 1 ELSE 0 END),0) sales,
        COALESCE(SUM(CASE WHEN d.stage='won' THEN d.amount_minor ELSE 0 END),0) revenue_minor,
        COALESCE((SELECT COUNT(*) FROM crm_tasks t WHERE t.assigned_to=s.id AND t.done=0),0) open_tasks
        FROM staff s LEFT JOIN crm_deals d ON d.assigned_to=s.id WHERE s.active=1 GROUP BY s.id,s.display_name ORDER BY sales DESC,deals DESC`).all(),
      db.prepare(`SELECT
        (SELECT COUNT(*) FROM leads WHERE created_at>=datetime('now','-30 days')) AS leads_current,
        (SELECT COUNT(*) FROM leads WHERE created_at>=datetime('now','-60 days') AND created_at<datetime('now','-30 days')) AS leads_previous,
        (SELECT COUNT(*) FROM crm_deals WHERE stage='won' AND updated_at>=datetime('now','-30 days')) AS sales_current,
        (SELECT COUNT(*) FROM crm_deals WHERE stage='won' AND updated_at>=datetime('now','-60 days') AND updated_at<datetime('now','-30 days')) AS sales_previous,
        (SELECT COALESCE(SUM(amount_minor),0) FROM crm_deals WHERE stage='won' AND updated_at>=datetime('now','-30 days')) AS revenue_current_minor,
        (SELECT COALESCE(SUM(amount_minor),0) FROM crm_deals WHERE stage='won' AND updated_at>=datetime('now','-60 days') AND updated_at<datetime('now','-30 days')) AS revenue_previous_minor,
        (SELECT COALESCE(SUM(CASE WHEN cost_minor IS NOT NULL THEN amount_minor-cost_minor ELSE 0 END),0) FROM crm_deals WHERE stage='won' AND updated_at>=datetime('now','-30 days')) AS profit_current_minor,
        (SELECT COALESCE(SUM(CASE WHEN cost_minor IS NOT NULL THEN amount_minor-cost_minor ELSE 0 END),0) FROM crm_deals WHERE stage='won' AND updated_at>=datetime('now','-60 days') AND updated_at<datetime('now','-30 days')) AS profit_previous_minor,
        (SELECT COALESCE(SUM(CAST(json_extract(data_json,'$.amount') AS INTEGER)),0) FROM admin_records WHERE kind='finance_entries' AND archived=0 AND json_extract(data_json,'$.type')='Расход' AND created_at>=datetime('now','-30 days')) AS expenses_current_som,
        (SELECT COALESCE(SUM(CAST(json_extract(data_json,'$.amount') AS INTEGER)),0) FROM admin_records WHERE kind='finance_entries' AND archived=0 AND json_extract(data_json,'$.type')='Расход' AND created_at>=datetime('now','-60 days') AND created_at<datetime('now','-30 days')) AS expenses_previous_som`).first(),
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
      director: {
        deals: dealTotals,
        tasks: taskTotals,
        pipeline: pipeline.results,
        period,
        goals: parseGoals(goalRow?.value),
        operations,
        models: modelFunnel.results,
        channels: channels.results,
        managers: managers.results,
        comparison,
      },
      profile: { display_name: actor.display_name, phone: actor.phone, email: actor.email, avatar: actor.avatar, theme: actor.theme },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("admin dashboard load failed", error);
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
      if (actor.role !== "owner" && actor.role !== "director") throw Object.assign(new Error("Действие доступно только директору"), { status: 403 });
    };
    const marketingOnly = () => {
      if (!["owner", "director", "marketer"].includes(actor.role)) throw Object.assign(new Error("Действие доступно отделу маркетинга"), { status: 403 });
    };

    if (action === "save_product") {
      marketingOnly();
      let product: Tractor;
      try { product = normalizedProduct(body.product); } catch { return Response.json({ error: "Проверьте поля товара, ссылки и числовые значения" }, { status: 400 }); }
      await db.prepare(`INSERT INTO product_overrides(slug,data_json,is_deleted,updated_at) VALUES(?,?,0,CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET data_json=excluded.data_json,is_deleted=0,updated_at=CURRENT_TIMESTAMP`).bind(product.slug, JSON.stringify(product)).run();
    } else if (action === "delete_product") {
      marketingOnly();
      const slug = cleanText(body.slug, 100, true);
      await db.prepare(`INSERT INTO product_overrides(slug,data_json,is_deleted,updated_at) VALUES(?,'{}',1,CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET is_deleted=1,updated_at=CURRENT_TIMESTAMP`).bind(slug).run();
    } else if (action === "save_news") {
      marketingOnly();
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
      marketingOnly();
      const slug = cleanText(body.slug, 100, true);
      await db.prepare(`INSERT INTO news_posts(slug,data_json,is_deleted,updated_at) VALUES(?,'{}',1,CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET is_deleted=1,updated_at=CURRENT_TIMESTAMP`).bind(slug).run();
    } else if (action === "lead_status") {
      marketingOnly();
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
    } else if (action === "save_goals") {
      ownerOnly();
      const goals=body.goals as Record<string,unknown>;
      const sales=Math.max(0,Math.min(10000,Math.round(Number(goals?.sales)||0)));
      const revenueMinor=Math.max(0,Math.min(100_000_000_000_00,Math.round(Number(goals?.revenueMinor)||0)));
      const profitMinor=Math.max(0,Math.min(100_000_000_000_00,Math.round(Number(goals?.profitMinor)||0)));
      const leads=Math.max(0,Math.min(100_000,Math.round(Number(goals?.leads)||0)));
      const meetings=Math.max(0,Math.min(100_000,Math.round(Number(goals?.meetings)||0)));
      const conversion=Math.max(0,Math.min(100,Number(goals?.conversion)||0));
      await db.prepare(`INSERT INTO site_settings(key,value,version) VALUES('director_goals',?,1)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value,version=site_settings.version+1`).bind(JSON.stringify({sales,revenueMinor,profitMinor,leads,meetings,conversion})).run();
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
