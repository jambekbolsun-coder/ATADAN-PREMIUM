/**
 * Запчасти (docs/admin-redesign/03-architecture.md §2, §5.2): одна карточка и для сайта, и для склада.
 *
 * Правила:
 *  - артикул уникален (без учёта регистра);
 *  - остаток меняется только движением: приход, продажа, списание, возврат, инвентаризация;
 *    остаток не может стать меньше нуля;
 *  - приход пересчитывает себестоимость по средневзвешенной;
 *  - списание и инвентаризация с расхождением требуют причины;
 *  - себестоимость видят владелец, директор и бухгалтер.
 */
import { getRawDb } from "../../../db";
import type { Actor } from "../../lib/admin-auth";
import { canUseSection } from "../../lib/admin-auth";
import { HttpError } from "../../lib/security";
import { audit, isBoss, mediaUrl, newId, notify, num, query, slugOf, text, toMinor } from "./db-kit";

export const PART_CATEGORIES = ["Двигатель", "Фильтры", "Трансмиссия", "Гидравлика", "Электрика", "Ходовая", "Кабина", "Навесное", "Масла и жидкости", "Прочее"];
export const MOVE_KIND: Record<string, { label: string; sign: 1 | -1 | 0; tone: "good" | "bad" | "info" | "mute" }> = {
  in: { label: "Приход", sign: 1, tone: "good" },
  return: { label: "Возврат от клиента", sign: 1, tone: "good" },
  sale: { label: "Продажа", sign: -1, tone: "info" },
  writeoff: { label: "Списание", sign: -1, tone: "bad" },
  count: { label: "Инвентаризация", sign: 0, tone: "mute" },
};
export const canPartsStock = (a: Actor) => isBoss(a) || a.role === "manager" || a.role === "accountant" || canUseSection(a, "inventory-units");
export const canPartsCard = (a: Actor) => canPartsStock(a) || canUseSection(a, "catalog");
export const seesPartCost = (a: Actor) => isBoss(a) || a.role === "accountant";
export const canPartsPrice = (a: Actor) => isBoss(a) || canUseSection(a, "catalog");

export type Part = { id: string; sku: string; name: string; category: string; models: string[]; unit: string; price_minor: number; cost_minor: number; qty: number; min_qty: number; location: string; image: string; description: string; show_on_site: number; archived: number; updated_at: string };
type Row = Omit<Part, "models"> & { models_json: string };
const toPart = ({ models_json, ...r }: Row): Part => ({ ...r, price_minor: Number(r.price_minor), cost_minor: Number(r.cost_minor), models: (() => { try { return JSON.parse(models_json) as string[]; } catch { return []; } })() });

export async function listParts(f: { q?: string; filter?: string; model?: string } = {}) {
  const where = ["1=1"], args: unknown[] = [];
  if (f.filter === "archived") where.push("archived=1"); else where.push("archived=0");
  if (f.filter === "low") where.push("qty <= min_qty AND min_qty > 0");
  if (f.filter === "out") where.push("qty = 0");
  if (f.filter === "site") where.push("show_on_site=1");
  if (f.q) { where.push("(lower(sku) LIKE ? OR lower(name) LIKE ?)"); const like = `%${f.q.toLowerCase().replace(/[%_\\]/g, "")}%`; args.push(like, like); }
  if (f.model) { where.push("models_json LIKE ?"); args.push(`%"${f.model.replace(/[%_"\\]/g, "")}"%`); }
  const { results } = await getRawDb().prepare(`SELECT * FROM parts WHERE ${where.join(" AND ")} ORDER BY name LIMIT 500`).bind(...args).all<Row>();
  return results.map(toPart);
}

export async function partStats() {
  const r = await getRawDb().prepare(`SELECT COUNT(*) FILTER (WHERE archived=0)::int AS total, COUNT(*) FILTER (WHERE archived=0 AND min_qty>0 AND qty<=min_qty)::int AS low,
    COUNT(*) FILTER (WHERE archived=0 AND qty=0)::int AS out, COALESCE(SUM(qty*cost_minor) FILTER (WHERE archived=0),0)::bigint AS value, COUNT(*) FILTER (WHERE archived=0 AND show_on_site=1)::int AS site FROM parts`).first<{ total: number; low: number; out: number; value: number; site: number }>();
  return { total: r?.total ?? 0, low: r?.low ?? 0, out: r?.out ?? 0, value: Number(r?.value ?? 0), site: r?.site ?? 0 };
}

export async function getPart(id: string) {
  const db = getRawDb();
  const row = await db.prepare("SELECT * FROM parts WHERE id=?").bind(id).first<Row>();
  if (!row) return null;
  const { results } = await db.prepare(`SELECT m.id, m.kind, m.qty_delta, m.qty_after, m.unit_cost_minor, m.sale_id, m.note, m.created_at, s.display_name AS author, o.number AS sale_number
    FROM part_movements m LEFT JOIN staff s ON s.id=m.created_by LEFT JOIN sale_orders o ON o.id=m.sale_id WHERE m.part_id=? ORDER BY m.created_at DESC LIMIT 100`).bind(id).all<{ id: string; kind: string; qty_delta: number; qty_after: number; unit_cost_minor: number; sale_id: string | null; note: string; created_at: string; author: string | null; sale_number: string | null }>();
  return { part: toPart(row), movements: results.map((m) => ({ ...m, unit_cost_minor: Number(m.unit_cost_minor) })) };
}

export type PartInput = { id?: string; sku: string; name: string; category: string; models: string[]; unit: string; price: string; cost?: string; minQty: string; location: string; image: string; description: string; showOnSite: boolean; openingQty?: string };

export async function savePart(actor: Actor, input: PartInput) {
  if (!canPartsCard(actor)) throw new HttpError(403, "Нет доступа к запчастям");
  const sku = text(input.sku, 60).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9.\-/_ ]{1,59}$/.test(sku)) throw new HttpError(400, "Артикул: латинские буквы, цифры, точка, дефис, слэш");
  const name = text(input.name, 160);
  if (!name) throw new HttpError(400, "Укажите название запчасти");
  const price = toMinor(input.price, "Цена продажи", true) ?? 0;
  const minQty = num(input.minQty, "Минимальный остаток", { max: 100_000, int: true, optional: true }) ?? 0;
  const models = (input.models ?? []).slice(0, 60).map((m) => slugOf(m, "Модель"));
  const image = mediaUrl(input.image, "Фото");
  const showOnSite = !!input.showOnSite;
  if (showOnSite && !price) throw new HttpError(400, "Чтобы показать на сайте, укажите цену продажи");
  const canCost = seesPartCost(actor);
  const canPrice = canPartsPrice(actor);

  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [dup] = await q<{ id: string }>("SELECT id FROM parts WHERE lower(sku)=lower(?) AND id<>?", sku, input.id ?? "");
    if (dup) throw new HttpError(409, `Артикул ${sku} уже есть`);
    const common = [sku, name, PART_CATEGORIES.includes(input.category) ? input.category : "Прочее", JSON.stringify(models), text(input.unit, 12) || "шт", price, minQty, text(input.location, 80), image, text(input.description, 3000), showOnSite ? 1 : 0];
    if (input.id) {
      const [row] = await q<{ id: string }>("SELECT id FROM parts WHERE id=? FOR UPDATE", input.id);
      if (!row) throw new HttpError(404, "Запчасть не найдена");
      if (!canPrice) { const [old] = await q<{ price_minor: number; show_on_site: number }>("SELECT price_minor, show_on_site FROM parts WHERE id=?", input.id); common[5] = Number(old.price_minor); common[10] = old.show_on_site; }
      await q("UPDATE parts SET sku=?, name=?, category=?, models_json=?, unit=?, price_minor=?, min_qty=?, location=?, image=?, description=?, show_on_site=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", ...common, actor.id, input.id);
      if (canCost && input.cost !== undefined && input.cost !== "") await q("UPDATE parts SET cost_minor=? WHERE id=?", toMinor(input.cost, "Себестоимость", true) ?? 0, input.id);
      await audit(q, actor, "part.update", input.id, `${sku} ${name}`);
      return input.id;
    }
    const pid = newId();
    const cost = canCost ? toMinor(input.cost, "Себестоимость", true) ?? 0 : 0;
    await q("INSERT INTO parts(id,sku,name,category,models_json,unit,price_minor,min_qty,location,image,description,show_on_site,cost_minor,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", pid, ...common, cost, actor.id, actor.id);
    const opening = num(input.openingQty, "Начальный остаток", { max: 1_000_000, int: true, optional: true }) ?? 0;
    if (opening > 0) {
      if (!canPartsStock(actor)) throw new HttpError(403, "Остаток вносит склад");
      await q("UPDATE parts SET qty=? WHERE id=?", opening, pid);
      await q("INSERT INTO part_movements(id,part_id,kind,qty_delta,qty_after,unit_cost_minor,note,created_by) VALUES(?,?,'count',?,?,?,'Начальный остаток',?)", newId(), pid, opening, opening, cost, actor.id);
    }
    await audit(q, actor, "part.create", pid, `${sku} ${name}`);
    return pid;
  });
}

export async function addMovement(actor: Actor, partId: string, input: { kind: string; qty: string; unitCost?: string; note?: string; saleId?: string }) {
  if (!canPartsStock(actor)) throw new HttpError(403, "Движения по складу делает склад, менеджер или бухгалтер");
  const kind = MOVE_KIND[input.kind] ? input.kind : "";
  if (!kind) throw new HttpError(400, "Выберите тип движения");
  const qty = num(input.qty, kind === "count" ? "Фактический остаток" : "Количество", { min: kind === "count" ? 0 : 1, max: 1_000_000, int: true })!;
  const note = text(input.note, 300);
  if (actor.role === "manager" && (kind === "writeoff" || kind === "count")) throw new HttpError(403, "Списание и инвентаризацию делает бухгалтер или руководство");
  if ((kind === "writeoff" || kind === "count") && note.length < 3) throw new HttpError(400, kind === "writeoff" ? "Укажите причину списания" : "Укажите, кто и когда пересчитал");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [p] = await q<{ qty: number; cost_minor: number; sku: string; name: string; archived: number; min_qty: number }>("SELECT qty, cost_minor, sku, name, archived, min_qty FROM parts WHERE id=? FOR UPDATE", partId);
    if (!p) throw new HttpError(404, "Запчасть не найдена");
    if (p.archived) throw new HttpError(409, "Запчасть в архиве: сначала верните её");
    const delta = kind === "count" ? qty - p.qty : MOVE_KIND[kind].sign * qty;
    if (kind === "count" && delta === 0) throw new HttpError(400, "Остаток совпадает, менять нечего");
    const after = p.qty + delta;
    if (after < 0) throw new HttpError(409, `На складе только ${p.qty}: нельзя ${MOVE_KIND[kind].label.toLowerCase()} ${qty}`);
    let unitCost = Number(p.cost_minor);
    if (kind === "in") {
      const c = input.unitCost && seesPartCost(actor) ? toMinor(input.unitCost, "Цена закупки за штуку", true) ?? 0 : Number(p.cost_minor);
      unitCost = c;
      const avg = after > 0 ? Math.round((p.qty * Number(p.cost_minor) + qty * c) / after) : c;
      await q("UPDATE parts SET cost_minor=? WHERE id=?", avg, partId);
    }
    await q("UPDATE parts SET qty=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", after, partId);
    await q("INSERT INTO part_movements(id,part_id,kind,qty_delta,qty_after,unit_cost_minor,sale_id,note,created_by) VALUES(?,?,?,?,?,?,?,?,?)", newId(), partId, kind, delta, after, unitCost, input.saleId ?? null, note, actor.id);
    if (p.min_qty > 0 && after <= p.min_qty && p.qty > p.min_qty) await notify(q, { topic: "parts", title: `Пора заказать: ${p.name}`, body: `${p.sku}: осталось ${after}, минимум ${p.min_qty}`, url: `/admin/work/parts/${partId}`, roles: ["owner", "director", "accountant"], perms: ["inventory-units"], entity: { type: "part", id: partId } });
    await audit(q, actor, `part.${kind}`, partId, `${p.sku}: ${delta > 0 ? "+" : ""}${delta}, остаток ${after}${note ? ` (${note})` : ""}`);
  });
}

export async function archivePart(actor: Actor, partId: string, archived: boolean) {
  if (!canPartsCard(actor)) throw new HttpError(403, "Нет доступа к запчастям");
  return getRawDb().transaction(async (client) => {
    const q = query(client);
    const [p] = await q<{ qty: number; sku: string }>("SELECT qty, sku FROM parts WHERE id=? FOR UPDATE", partId);
    if (!p) throw new HttpError(404, "Запчасть не найдена");
    if (archived && p.qty > 0) throw new HttpError(409, `На складе ещё ${p.qty}: сначала спишите или продайте остаток`);
    await q("UPDATE parts SET archived=?, show_on_site=CASE WHEN ? = 1 THEN 0 ELSE show_on_site END, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", archived ? 1 : 0, archived ? 1 : 0, actor.id, partId);
    await audit(q, actor, archived ? "part.archive" : "part.restore", partId, p.sku);
  });
}
