/**
 * Каталог техники для сайта (docs/admin-redesign/03-architecture.md §5.4).
 *
 * Данные: базовый файл app/data/tractors.json + правки в product_overrides (полный объект Tractor).
 * Новая модель = строка product_overrides с новым slug. Публичный сайт читает их через app/lib/catalog.ts.
 *
 * Правила:
 *  - цена на сайте в целых сомах (Tractor.price) и примерная в долларах (approximatePriceUsd);
 *    смена цены пишется в product_price_history, уже оформленные продажи не меняются;
 *  - опубликовать без фото нельзя; без цены можно (на сайте «Цена по запросу»);
 *  - «В наличии» не правится руками: считается со склада;
 *  - модель не удаляется, а уходит в архив: на неё ссылаются продажи и машины;
 *  - себестоимость модели (product_costs) видят и меняют только владелец и директор.
 */
import { getRawDb } from "../../../db";
import tractorsData from "../../data/tractors.json";
import type { Actor } from "../../lib/admin-auth";
import { canUseSection } from "../../lib/admin-auth";
import { suggestedPriceUsd } from "../../lib/catalog";
import { HttpError } from "../../lib/security";
import type { Tractor } from "../../types";
import { audit, isBoss, mediaUrl, newId, num, query, slugOf, text } from "./db-kit";

const base = tractorsData as Tractor[];
export const MODEL_STATUS: Record<string, { label: string; tone: "good" | "warn" | "mute" | "info" }> = {
  published: { label: "На сайте", tone: "good" },
  draft: { label: "Черновик", tone: "warn" },
  hidden: { label: "Скрыта", tone: "mute" },
  archived: { label: "В архиве", tone: "mute" },
};
export const CATEGORIES = ["Средний класс", "Тяжёлый класс", "Универсальные"];
export const canCatalog = (a: Actor) => canUseSection(a, "catalog");

export type AdminModel = Tractor & { status: NonNullable<Tractor["status"]>; custom: boolean; edited: boolean; stock: number; transit: number; reserved: number; sold: number; cost_minor: number | null; cost_version: number };

function statusOf(t: Partial<Tractor>): AdminModel["status"] {
  return t.status === "draft" || t.status === "hidden" || t.status === "archived" ? t.status : "published";
}

async function overrides() {
  const { results } = await getRawDb().prepare("SELECT slug, data_json, is_deleted FROM product_overrides").all<{ slug: string; data_json: string; is_deleted: number }>();
  return new Map(results.map((r) => [r.slug, r]));
}

export async function listModels(): Promise<AdminModel[]> {
  const db = getRawDb();
  const [ov, units, costs] = await Promise.all([
    overrides(),
    db.prepare(`SELECT tractor_slug AS slug,
        COUNT(*) FILTER (WHERE status='stock')::int AS stock,
        COUNT(*) FILTER (WHERE status IN ('ordered','production','transit','customs'))::int AS transit,
        COUNT(*) FILTER (WHERE status='reserved')::int AS reserved,
        COUNT(*) FILTER (WHERE status IN ('sold','delivered'))::int AS sold
      FROM inventory_units_v2 WHERE archived=0 AND COALESCE(tractor_slug,'')<>'' GROUP BY tractor_slug`).all<{ slug: string; stock: number; transit: number; reserved: number; sold: number }>(),
    db.prepare("SELECT slug, cost_minor, version FROM product_costs").all<{ slug: string; cost_minor: number; version: number }>(),
  ]);
  const u = new Map(units.results.map((r) => [r.slug, r]));
  const c = new Map(costs.results.map((r) => [r.slug, r]));
  const out: AdminModel[] = [];
  const seen = new Set<string>();
  const push = (t: Tractor, custom: boolean, edited: boolean) => {
    const s = u.get(t.slug), k = c.get(t.slug);
    out.push({ ...t, approximatePriceUsd: t.approximatePriceUsd ?? suggestedPriceUsd(t.hp), status: statusOf(t), custom, edited, stock: s?.stock ?? 0, transit: s?.transit ?? 0, reserved: s?.reserved ?? 0, sold: s?.sold ?? 0, cost_minor: k ? Number(k.cost_minor) : null, cost_version: k?.version ?? 0 });
  };
  for (const t of base) {
    seen.add(t.slug);
    const o = ov.get(t.slug);
    if (o?.is_deleted) continue;
    push(o ? { ...t, ...(JSON.parse(o.data_json) as Tractor) } : t, false, !!o);
  }
  for (const o of ov.values()) if (!seen.has(o.slug) && !o.is_deleted) push(JSON.parse(o.data_json) as Tractor, true, true);
  return out.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.hp - b.hp || a.model.localeCompare(b.model));
}

export async function getModel(slug: string) {
  const all = await listModels();
  const m = all.find((x) => x.slug === slug);
  if (!m) return null;
  const db = getRawDb();
  const [history, promos] = await Promise.all([
    db.prepare(`SELECT h.old_price, h.new_price, h.old_usd, h.new_usd, h.note, h.changed_at, s.display_name AS author FROM product_price_history h LEFT JOIN staff s ON s.id=h.changed_by WHERE h.slug=? ORDER BY h.changed_at DESC LIMIT 20`).bind(slug).all<{ old_price: number | null; new_price: number | null; old_usd: number | null; new_usd: number | null; note: string; changed_at: string; author: string | null }>(),
    db.prepare(`SELECT id, title, status, data_json FROM admin_records WHERE kind='promotions' AND archived=0 AND (',' || replace(COALESCE(data_json::json->>'tractorSlugs',''),' ','') || ',') LIKE ?`).bind(`%,${slug},%`).all<{ id: string; title: string; status: string; data_json: string }>(),
  ]);
  return { model: m, history: history.results, promotions: promos.results.map((p) => ({ id: p.id, title: p.title, status: p.status, ...(JSON.parse(p.data_json || "{}") as { startsAt?: string; endsAt?: string; discount?: string; discountType?: string }) })) };
}

export type ModelInput = {
  originalSlug?: string;
  slug: string; model: string; hp: string; category: string; farmArea: string;
  price: string; priceUsd: string; discountPercent: string; promotionLabel: string;
  recommended: boolean; popular: boolean; sortOrder: string;
  image: string; images: string[]; videoUrl: string;
  description: string; comfort: string; equipment: string; specs: { k: string; v: string }[];
  status: string; priceNote?: string;
};

export async function saveModel(actor: Actor, input: ModelInput) {
  if (!canCatalog(actor)) throw new HttpError(403, "Нет доступа к каталогу");
  const slug = slugOf(input.slug);
  const model = text(input.model, 80);
  if (!model) throw new HttpError(400, "Укажите название модели");
  const hp = num(input.hp, "Мощность, л.с.", { min: 20, max: 500, int: true })!;
  const price = num(input.price, "Цена, сом", { max: 1_000_000_000, int: true, optional: true });
  const priceUsd = num(input.priceUsd, "Цена в долларах", { min: 1000, max: 500_000, int: true, optional: true });
  const discount = num(input.discountPercent, "Скидка, %", { max: 90, optional: true });
  const sortOrder = num(input.sortOrder, "Порядок", { max: 100_000, int: true, optional: true }) ?? 0;
  const status = ["published", "draft", "hidden", "archived"].includes(input.status) ? (input.status as AdminModel["status"]) : "draft";
  const image = mediaUrl(input.image, "Главное фото");
  const images = (input.images ?? []).slice(0, 12).map((x, i) => mediaUrl(x, `Фото ${i + 2}`)).filter(Boolean);
  const videoUrl = input.videoUrl ? mediaUrl(input.videoUrl, "Видео") : "";
  if (status === "published" && !image) throw new HttpError(400, "Без главного фото модель нельзя показать на сайте. Сохраните как черновик");
  const specs: Record<string, string> = {};
  for (const s of (input.specs ?? []).slice(0, 80)) {
    const k = text(s.k, 100), v = text(s.v, 300);
    if (k && v) specs[k] = v;
  }
  const equipment = String(input.equipment ?? "").split("\n").map((x) => text(x, 200)).filter(Boolean).slice(0, 60);

  // читаем до транзакции: внутри неё работаем только через её соединение
  const original = input.originalSlug ? slugOf(input.originalSlug) : null;
  const all = await listModels();
  const before = original ? all.find((m) => m.slug === original) : null;
  if (original && !before) throw new HttpError(404, "Модель не найдена");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    await q("SELECT pg_advisory_xact_lock(hashtext('catalog-models'))");
    if (original !== slug) {
      const taken = base.some((t) => t.slug === slug) || (await q("SELECT 1 FROM product_overrides WHERE slug=? AND is_deleted=0", slug)).length > 0;
      if (taken) throw new HttpError(409, `Адрес ${slug} уже занят другой моделью`);
      if (before && !before.custom) throw new HttpError(409, "У базовой модели адрес менять нельзя: на него ссылаются склад и продажи");
      if (before) {
        const [used] = await q<{ n: number }>("SELECT COUNT(*)::int AS n FROM inventory_units_v2 WHERE tractor_slug=?", original);
        if (used?.n) throw new HttpError(409, `Адрес не меняется: по модели уже есть ${used.n} машин на складе или в продажах`);
      }
    }
    const data: Tractor = {
      ...(before ?? {}),
      id: before?.id ?? slug, slug, model, hp, category: text(input.category, 60) || CATEGORIES[0], farmArea: text(input.farmArea, 60),
      price, approximatePriceUsd: priceUsd ?? undefined, discountPercent: discount, promotionLabel: text(input.promotionLabel, 80) || null,
      inStock: false, recommended: !!input.recommended, popular: !!input.popular, status, sortOrder,
      image, images, videoUrl: videoUrl || null, description: text(input.description, 3000), comfort: text(input.comfort, 2000), equipment, specs,
    };
    // служебные поля списка не храним
    for (const k of ["custom", "edited", "stock", "transit", "reserved", "sold", "cost_minor", "cost_version", "availableUnits"]) delete (data as Record<string, unknown>)[k];
    await q(`INSERT INTO product_overrides(slug,data_json,is_deleted,updated_at) VALUES(?,?,0,CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET data_json=excluded.data_json, is_deleted=0, updated_at=CURRENT_TIMESTAMP`, slug, JSON.stringify(data));
    if (original && original !== slug) await q("UPDATE product_overrides SET is_deleted=1, updated_at=CURRENT_TIMESTAMP WHERE slug=?", original);
    const oldPrice = before ? before.price ?? null : null, oldUsd = before ? before.approximatePriceUsd ?? null : null;
    if (!before || oldPrice !== price || oldUsd !== (priceUsd ?? null)) {
      await q("INSERT INTO product_price_history(id,slug,old_price,new_price,old_usd,new_usd,note,changed_by) VALUES(?,?,?,?,?,?,?,?)", newId(), slug, oldPrice, price, oldUsd, priceUsd, text(input.priceNote, 300) || (before ? "" : "Модель добавлена"), actor.id);
    }
    await audit(q, actor, before ? "catalog.update" : "catalog.create", slug, `${model}: ${status}${price ? `, ${price} сом` : ""}${priceUsd ? `, $${priceUsd}` : ""}`);
    return slug;
  });
}

export async function setModelStatus(actor: Actor, slug: string, status: string) {
  if (!canCatalog(actor)) throw new HttpError(403, "Нет доступа к каталогу");
  if (!["published", "draft", "hidden", "archived"].includes(status)) throw new HttpError(400, "Неизвестный статус");
  const m = (await listModels()).find((x) => x.slug === slug);
  if (!m) throw new HttpError(404, "Модель не найдена");
  if (status === "published" && !m.image) throw new HttpError(400, "Добавьте главное фото, потом публикуйте");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const { custom: _c, edited: _e, stock: _s, transit: _t, reserved: _r, sold: _so, cost_minor: _cm, cost_version: _cv, ...data } = m;
    void _c; void _e; void _s; void _t; void _r; void _so; void _cm; void _cv;
    await q(`INSERT INTO product_overrides(slug,data_json,is_deleted,updated_at) VALUES(?,?,0,CURRENT_TIMESTAMP)
      ON CONFLICT(slug) DO UPDATE SET data_json=excluded.data_json, updated_at=CURRENT_TIMESTAMP`, slug, JSON.stringify({ ...data, status }));
    await audit(q, actor, "catalog.status", slug, `${m.model}: ${MODEL_STATUS[m.status].label} → ${MODEL_STATUS[status].label}`);
  });
}

/** Себестоимость модели для заказа под клиента (когда машины ещё нет на складе). */
export async function saveModelCost(actor: Actor, slug: string, value: string, version: number) {
  if (!isBoss(actor)) throw new HttpError(403, "Себестоимость меняют только владелец и директор");
  const cost = num(value, "Себестоимость, сом", { max: 1_000_000_000 })!;
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [row] = await q<{ version: number }>("SELECT version FROM product_costs WHERE slug=? FOR UPDATE", slug);
    if (row && row.version !== version) throw new HttpError(409, "Себестоимость уже изменил другой сотрудник. Обновите страницу");
    if (row) await q("UPDATE product_costs SET cost_minor=?, version=version+1 WHERE slug=?", Math.round(cost * 100), slug);
    else await q("INSERT INTO product_costs(slug,cost_minor,version) VALUES(?,?,1)", slug, Math.round(cost * 100));
    await audit(q, actor, "catalog.cost", slug, `Себестоимость ${cost} сом`);
  });
}
