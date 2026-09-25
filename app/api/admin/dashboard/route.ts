import { canUseSection, requireActor } from "../../../lib/admin-auth";
import { getCatalog, suggestedPriceUsd } from "../../../lib/catalog";
import { getNewsPosts } from "../../../lib/news";
import { cleanText, fail, HttpError, jsonBody, safeMedia, sameOrigin } from "../../../lib/security";
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
  const approximatePriceUsd = raw.approximatePriceUsd === null || raw.approximatePriceUsd === "" || raw.approximatePriceUsd === undefined ? suggestedPriceUsd(hp) : Number(raw.approximatePriceUsd);
  if (!Number.isInteger(approximatePriceUsd) || approximatePriceUsd < 10_000 || approximatePriceUsd > 200_000) throw new Error("approximatePriceUsd");
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
    approximatePriceUsd,
    discountPercent,
    promotionLabel: raw.promotionLabel ? cleanText(raw.promotionLabel, 120) : null,
    // Stock is derived from active VIN records after catalogue overrides merge.
    inStock: false,
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
    const canNews = canUseSection(actor,"news");
    const canLeads = canUseSection(actor,"site-leads");
    const canAnalytics = canUseSection(actor,"site-analytics");
    const canDeals = canUseSection(actor,"deals");
    const canTasks = canUseSection(actor,"employee-tasks");
    const canInventory = canUseSection(actor,"inventory-units");
    const canFinance = canUseSection(actor,"finance");
    const isDirector = actor.role === "owner" || actor.role === "director";
    const [catalog, posts, leads, popular, popularPosts, totals, daily, dealTotals, taskTotals, pipeline, period, goalRow, operations, modelFunnel, channels, managers, comparison] = await Promise.all([
      getCatalog(true),
      canNews ? getNewsPosts(true) : Promise.resolve([]),
      canLeads ? db.prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT 200").all() : Promise.resolve({ results: [] }),
      canAnalytics ? db.prepare(`SELECT tractor_slug, COUNT(*) AS views FROM interest_events WHERE tractor_slug IS NOT NULL GROUP BY tractor_slug ORDER BY views DESC LIMIT 8`).all() : Promise.resolve({ results: [] }),
      canNews ? db.prepare(`SELECT path, COUNT(*) AS views FROM interest_events WHERE path LIKE '/news/%' GROUP BY path ORDER BY views DESC LIMIT 20`).all() : Promise.resolve({ results: [] }),
      canAnalytics ? db.prepare("SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors FROM interest_events").first() : Promise.resolve(null),
      canAnalytics ? db.prepare(`SELECT substr(created_at,1,10) AS day,COUNT(*) AS views FROM interest_events WHERE created_at>=datetime('now','-6 days') GROUP BY day ORDER BY day`).all() : Promise.resolve({ results: [] }),
      (canDeals || canFinance) ? db.prepare(`SELECT COUNT(*) AS total,
        (SELECT COUNT(*) FROM crm_deals WHERE archived=0 AND stage NOT IN ('won','lost')) AS active,
        (SELECT COUNT(*) FROM sales_v2 WHERE archived=0) AS won,
        (SELECT COALESCE(SUM(sale_amount_minor),0) FROM sales_v2 WHERE archived=0) AS revenue_minor,
        (SELECT COALESCE(SUM(sale_amount_minor-cost_minor),0) FROM sales_v2 WHERE archived=0) AS profit_minor,
        (SELECT COALESCE(SUM(amount_minor),0) FROM payments_v2 WHERE archived=0 AND status='posted') AS paid_minor
        FROM crm_deals WHERE archived=0`).first() : Promise.resolve(null),
      canTasks ? db.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN done=0 THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN done=0 AND due_at < datetime('now') THEN 1 ELSE 0 END) AS overdue
        FROM crm_tasks WHERE archived=0`).first() : Promise.resolve(null),
      canDeals ? db.prepare(`SELECT stage,COUNT(*) AS count,COALESCE(SUM(amount_minor),0) AS amount_minor FROM crm_deals WHERE archived=0 GROUP BY stage ORDER BY count DESC`).all() : Promise.resolve({ results: [] }),
      (canAnalytics || canLeads) ? db.prepare(`SELECT
        (SELECT COUNT(*) FROM interest_events WHERE created_at>=datetime('now','-30 days')) AS views_30,
        (SELECT COUNT(DISTINCT visitor_id) FROM interest_events WHERE created_at>=datetime('now','-30 days')) AS visitors_30,
        (SELECT COUNT(*) FROM leads WHERE created_at>=datetime('now','-30 days')) AS leads_30`).first() : Promise.resolve(null),
      isDirector ? db.prepare("SELECT value FROM site_settings WHERE key='director_goals'").first<{value:string}>() : Promise.resolve(null),
      (isDirector || canInventory || canFinance) ? db.prepare(`SELECT
        (SELECT COUNT(*) FROM inventory_units_v2 WHERE archived=0 AND status='stock') AS stock_units,
        (SELECT COUNT(*) FROM shipments_v2 WHERE archived=0 AND status NOT IN ('closed','arrived')) AS active_shipments,
        (SELECT COUNT(*) FROM meetings_v2 WHERE archived=0 AND starts_at>=datetime('now','-30 days')) AS meetings_30,
        (SELECT COALESCE(SUM(amount_minor),0)/100 FROM account_transactions WHERE direction='in' AND reversed_by IS NULL) AS income_som,
        (SELECT COALESCE(SUM(amount_minor),0)/100 FROM account_transactions WHERE direction='out' AND payment_id IS NULL AND reversed_by IS NULL) AS expenses_som,
        (SELECT COALESCE(SUM(GREATEST(r.principal_minor-COALESCE(p.paid,0),0)),0)/100 FROM receivables_v2 r LEFT JOIN (SELECT deal_id,SUM(amount_minor) paid FROM payments_v2 WHERE status='posted' AND archived=0 GROUP BY deal_id) p ON p.deal_id=r.deal_id WHERE r.archived=0 AND r.status IN ('open','overdue')) AS debts_som,
        (SELECT COALESCE(SUM(purchase_cost_minor+landed_cost_minor),0)/100 FROM inventory_units_v2 WHERE archived=0 AND status NOT IN ('sold','delivered')) AS stock_value_som,
        (SELECT COALESCE(SUM(CASE WHEN direction='in' THEN amount_minor ELSE -amount_minor END),0)/100 FROM account_transactions WHERE reversed_by IS NULL)+(SELECT COALESCE(SUM(opening_balance_minor),0)/100 FROM financial_accounts WHERE active=1) AS cash_balance_som,
        (SELECT COUNT(*) FROM crm_deals WHERE archived=0 AND stage NOT IN ('won','lost') AND next_step_at IS NULL) AS deals_without_next_step,
        (SELECT COUNT(*) FROM shipments_v2 WHERE archived=0 AND eta<CURRENT_DATE AND status NOT IN ('arrived','closed')) AS delayed_shipments`).first() : Promise.resolve(null),
      isDirector ? db.prepare(`SELECT x.tractor_slug,
        COALESCE(v.views,0) AS views,COALESCE(l.leads,0) AS leads,COALESCE(q.qualified,0) AS qualified,COALESCE(m.meetings,0) AS meetings,COALESCE(p.proposals,0) AS proposals,
        COALESCE(s.sales,0) AS sales,COALESCE(s.revenue_minor,0) AS revenue_minor,COALESCE(s.profit_minor,0) AS profit_minor
        FROM (SELECT tractor_slug FROM interest_events WHERE tractor_slug IS NOT NULL UNION SELECT tractor_slug FROM leads WHERE tractor_slug IS NOT NULL UNION SELECT tractor_slug FROM crm_deals WHERE tractor_slug IS NOT NULL) x
        LEFT JOIN (SELECT tractor_slug,COUNT(*) views FROM interest_events WHERE tractor_slug IS NOT NULL GROUP BY tractor_slug) v ON v.tractor_slug=x.tractor_slug
        LEFT JOIN (SELECT tractor_slug,COUNT(*) leads FROM leads WHERE tractor_slug IS NOT NULL AND archived=0 GROUP BY tractor_slug) l ON l.tractor_slug=x.tractor_slug
        LEFT JOIN (SELECT tractor_slug,COUNT(*) qualified FROM crm_deals WHERE archived=0 AND tractor_slug IS NOT NULL AND stage IN ('qualified','meeting','negotiation','reserved','contract','awaiting_payment','won') GROUP BY tractor_slug) q ON q.tractor_slug=x.tractor_slug
        LEFT JOIN (SELECT d.tractor_slug,COUNT(*) meetings FROM meetings_v2 m JOIN crm_deals d ON d.id=m.deal_id AND d.archived=0 WHERE m.archived=0 AND d.tractor_slug IS NOT NULL GROUP BY d.tractor_slug) m ON m.tractor_slug=x.tractor_slug
        LEFT JOIN (SELECT d.tractor_slug,COUNT(*) proposals FROM proposals_v2 p JOIN crm_deals d ON d.id=p.deal_id AND d.archived=0 WHERE p.archived=0 AND d.tractor_slug IS NOT NULL GROUP BY d.tractor_slug) p ON p.tractor_slug=x.tractor_slug
        LEFT JOIN (SELECT d.tractor_slug,COUNT(*) sales,COALESCE(SUM(s.sale_amount_minor),0) revenue_minor,COALESCE(SUM(s.sale_amount_minor-s.cost_minor),0) profit_minor FROM sales_v2 s JOIN crm_deals d ON d.id=s.deal_id AND d.archived=0 WHERE s.archived=0 AND d.tractor_slug IS NOT NULL GROUP BY d.tractor_slug) s ON s.tractor_slug=x.tractor_slug
        ORDER BY views DESC LIMIT 100`).all() : Promise.resolve({ results: [] }),
      isDirector ? db.prepare(`SELECT COALESCE(NULLIF(source,''),'Не указан') source,COUNT(*) leads,
        COUNT(DISTINCT s.id) sales,
        COALESCE(SUM(s.sale_amount_minor),0) revenue_minor,
        COALESCE(SUM(s.sale_amount_minor-s.cost_minor),0) profit_minor
        FROM leads l LEFT JOIN crm_deals d ON d.lead_id=l.id LEFT JOIN sales_v2 s ON s.deal_id=d.id AND s.archived=0 GROUP BY COALESCE(NULLIF(source,''),'Не указан') ORDER BY leads DESC`).all() : Promise.resolve({ results: [] }),
      isDirector ? db.prepare(`SELECT s.id,s.display_name,COUNT(d.id) deals,
        COUNT(DISTINCT sale.id) sales,
        COALESCE(SUM(sale.sale_amount_minor),0) revenue_minor,
        COALESCE((SELECT COUNT(*) FROM crm_tasks t WHERE t.assigned_to=s.id AND t.done=0),0) open_tasks
        FROM staff s LEFT JOIN crm_deals d ON d.assigned_to=s.id LEFT JOIN sales_v2 sale ON sale.deal_id=d.id AND sale.archived=0 WHERE s.active=1 GROUP BY s.id,s.display_name ORDER BY sales DESC,deals DESC`).all() : Promise.resolve({ results: [] }),
      isDirector ? db.prepare(`SELECT
        (SELECT COUNT(*) FROM leads WHERE created_at>=datetime('now','-30 days')) AS leads_current,
        (SELECT COUNT(*) FROM leads WHERE created_at>=datetime('now','-60 days') AND created_at<datetime('now','-30 days')) AS leads_previous,
        (SELECT COUNT(*) FROM sales_v2 WHERE archived=0 AND sold_at>=datetime('now','-30 days')) AS sales_current,
        (SELECT COUNT(*) FROM sales_v2 WHERE archived=0 AND sold_at>=datetime('now','-60 days') AND sold_at<datetime('now','-30 days')) AS sales_previous,
        (SELECT COALESCE(SUM(sale_amount_minor),0) FROM sales_v2 WHERE archived=0 AND sold_at>=datetime('now','-30 days')) AS revenue_current_minor,
        (SELECT COALESCE(SUM(sale_amount_minor),0) FROM sales_v2 WHERE archived=0 AND sold_at>=datetime('now','-60 days') AND sold_at<datetime('now','-30 days')) AS revenue_previous_minor,
        (SELECT COALESCE(SUM(sale_amount_minor-cost_minor),0) FROM sales_v2 WHERE archived=0 AND sold_at>=datetime('now','-30 days')) AS profit_current_minor,
        (SELECT COALESCE(SUM(sale_amount_minor-cost_minor),0) FROM sales_v2 WHERE archived=0 AND sold_at>=datetime('now','-60 days') AND sold_at<datetime('now','-30 days')) AS profit_previous_minor,
        (SELECT COALESCE(SUM(amount_minor),0)/100 FROM account_transactions WHERE direction='out' AND payment_id IS NULL AND reversed_by IS NULL AND occurred_at>=datetime('now','-30 days')) AS expenses_current_som,
        (SELECT COALESCE(SUM(amount_minor),0)/100 FROM account_transactions WHERE direction='out' AND payment_id IS NULL AND reversed_by IS NULL AND occurred_at>=datetime('now','-60 days') AND occurred_at<datetime('now','-30 days')) AS expenses_previous_som`).first() : Promise.resolve(null),
    ]);
    const forecast=isDirector?await db.prepare(`SELECT COUNT(*) active_deals,COALESCE(SUM(amount_minor*COALESCE(probability,CASE stage WHEN 'new' THEN 10 WHEN 'ai' THEN 15 WHEN 'qualified' THEN 30 WHEN 'meeting' THEN 45 WHEN 'negotiation' THEN 60 WHEN 'reserved' THEN 75 WHEN 'contract' THEN 85 WHEN 'awaiting_payment' THEN 95 ELSE 0 END)/100),0) weighted_minor,(SELECT COUNT(*) FROM crm_deals WHERE stage IN ('won','lost') AND updated_at>=datetime('now','-180 days')) closed_sample,(SELECT COUNT(*) FROM sales_v2 WHERE archived=0 AND sold_at>=datetime('now','-180 days')) won_sample FROM crm_deals WHERE archived=0 AND stage NOT IN ('won','lost')`).first():null;
    const regions=isDirector?await db.prepare(`SELECT COALESCE(NULLIF(c.region,''),'Не указан') region,COUNT(*) customers,COALESCE(SUM(l.leads),0) leads,COALESCE(SUM(s.sales),0) sales,COALESCE(AVG(NULLIF(c.budget_minor,0)),0) average_budget_minor,COALESCE(SUM(s.revenue_minor),0) revenue_minor,string_agg(DISTINCT c.tractor_slug,', ') FILTER(WHERE c.tractor_slug IS NOT NULL) models
      FROM crm_customers c
      LEFT JOIN (SELECT customer_id,COUNT(*) leads FROM leads WHERE archived=0 GROUP BY customer_id) l ON l.customer_id=c.id
      LEFT JOIN (SELECT d.customer_id,COUNT(*) sales,SUM(s.sale_amount_minor) revenue_minor FROM sales_v2 s JOIN crm_deals d ON d.id=s.deal_id AND d.archived=0 WHERE s.archived=0 GROUP BY d.customer_id) s ON s.customer_id=c.id
      WHERE c.archived=0 GROUP BY COALESCE(NULLIF(c.region,''),'Не указан') ORDER BY customers DESC`).all():{results:[]};
    const modelRegions=isDirector?await db.prepare("SELECT tractor_slug,COALESCE(NULLIF(region,''),'Регион не указан') region,COUNT(*) views FROM interest_events WHERE tractor_slug IS NOT NULL AND event_type='page_view' GROUP BY tractor_slug,region ORDER BY views DESC LIMIT 1000").all():{results:[]};
    const rawOperations = operations as Record<string, number> | null;
    const safeOperations = isDirector ? operations : rawOperations ? {
      stock_units: canInventory ? Number(rawOperations.stock_units ?? 0) : 0,
      active_shipments: 0,
      meetings_30: 0,
      income_som: canFinance ? Number(rawOperations.income_som ?? 0) : 0,
      expenses_som: canFinance ? Number(rawOperations.expenses_som ?? 0) : 0,
      debts_som: canFinance ? Number(rawOperations.debts_som ?? 0) : 0,
      stock_value_som: canFinance ? Number(rawOperations.stock_value_som ?? 0) : 0,
      cash_balance_som: canFinance ? Number(rawOperations.cash_balance_som ?? 0) : 0,
      deals_without_next_step: canDeals ? Number(rawOperations.deals_without_next_step ?? 0) : 0,
      delayed_shipments: canInventory ? Number(rawOperations.delayed_shipments ?? 0) : 0,
    } : null;
    const safeDeals = !dealTotals || isDirector || canFinance ? dealTotals : { ...dealTotals, profit_minor: 0 };
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
        deals: safeDeals,
        tasks: taskTotals,
        pipeline: pipeline.results,
        period,
        goals: isDirector ? parseGoals(goalRow?.value) : parseGoals(),
        operations: safeOperations,
        models: modelFunnel.results,
        modelRegions:modelRegions.results,
        channels: channels.results,
        managers: managers.results,
        comparison,
        forecast:{...forecast,insufficientData:!forecast||Number((forecast as {active_deals?:number}).active_deals??0)===0||Number((forecast as {closed_sample?:number}).closed_sample??0)<5},
        regions:regions.results,
      },
      profile: { display_name: actor.display_name, phone: actor.phone, email: actor.email, avatar: actor.avatar, theme: actor.theme,position:actor.position,department:actor.department,skills:actor.skills,bio:actor.bio,role:actor.role },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof HttpError) || error.status >= 500) console.error("admin dashboard load failed", error);
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
    if (action === "save_product") {
      if(!canUseSection(actor,"catalog"))return Response.json({error:"Нет доступа к каталогу"},{status:403});
      let product: Tractor;
      try { product = normalizedProduct(body.product); } catch { return Response.json({ error: "Проверьте поля товара, ссылки и числовые значения" }, { status: 400 }); }
      await db.prepare(`INSERT INTO product_overrides(slug,data_json,is_deleted,updated_at) VALUES(?,?,0,CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET data_json=excluded.data_json,is_deleted=0,updated_at=CURRENT_TIMESTAMP`).bind(product.slug, JSON.stringify(product)).run();
    } else if (action === "delete_product") {
      if(!canUseSection(actor,"catalog"))return Response.json({error:"Нет доступа к каталогу"},{status:403});
      const slug = cleanText(body.slug, 100, true);
      await db.prepare(`INSERT INTO product_overrides(slug,data_json,is_deleted,updated_at) VALUES(?,'{}',1,CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET is_deleted=1,updated_at=CURRENT_TIMESTAMP`).bind(slug).run();
    } else if (action === "save_news") {
      if(!canUseSection(actor,"news"))return Response.json({error:"Нет доступа к новостям"},{status:403});
      const post = body.post as Record<string, unknown> | undefined;
      const title = post?.title as Record<string, unknown> | undefined;
      const slug = cleanText(post?.slug, 100, true);
      const excerpt=post?.excerpt as Record<string,unknown>|undefined,content=post?.content as Record<string,unknown>|undefined;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !String(title?.ru??"").trim() || !String(excerpt?.ru??"").trim() || !String(content?.ru??"").trim() || !newsStatuses.has(String(post?.status)) || !newsCategories.has(String(post?.category))) {
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
      if(!canUseSection(actor,"news"))return Response.json({error:"Нет доступа к новостям"},{status:403});
      const slug = cleanText(body.slug, 100, true);
      await db.prepare(`INSERT INTO news_posts(slug,data_json,is_deleted,updated_at) VALUES(?,'{}',1,CURRENT_TIMESTAMP)
        ON CONFLICT(slug) DO UPDATE SET is_deleted=1,updated_at=CURRENT_TIMESTAMP`).bind(slug).run();
    } else if (action === "lead_status") {
      if(!canUseSection(actor,"site-leads"))return Response.json({error:"Нет доступа к заявкам"},{status:403});
      const id = cleanText(body.id, 100, true);
      const status = cleanText(body.status, 20, true);
      if (!new Set(["new", "contacted", "closed"]).has(status)) return Response.json({ error: "Некорректный статус" }, { status: 400 });
      await db.prepare("UPDATE leads SET status=? WHERE id=?").bind(status, id).run();
    } else if (action === "save_profile") {
      const profile = body.profile as Record<string, unknown>;
      const theme = String(profile?.theme ?? "blue");
      if (!["field","light","dark","blue","violet","forest","red"].includes(theme)) return Response.json({ error:"Неизвестная тема" },{status:400});
      await db.prepare("UPDATE staff SET display_name=?,phone=?,avatar=?,theme=?,position=?,department=?,skills=?,bio=? WHERE id=?")
        .bind(cleanText(profile?.displayName, 120, true), cleanText(profile?.phone ?? "", 40), safeMedia(profile?.avatar ?? "", true) || null, theme,cleanText(profile?.position??"",120),cleanText(profile?.department??"",120),cleanText(profile?.skills??"",500),cleanText(profile?.bio??"",2000), actor.id).run();
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
