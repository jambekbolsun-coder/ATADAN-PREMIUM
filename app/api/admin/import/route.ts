/**
 * Импорт запчастей из CSV/XLSX (Настройки → Экспорт и импорт).
 * POST multipart: file, action=validate|commit, mode=skip|update.
 * Ответ как у импорта клиентов и машин (/api/admin/data): { total, valid, errors, preview, canCommit } или { ok, imported }.
 *  - дубликат артикула в файле - ошибка строки;
 *  - артикул уже есть: «пропустить» или «обновить» (название, цена, группа, минимум, место);
 *  - остаток из файла ставится только новым позициям (движение «Начальный остаток»);
 *  - строки с ошибками не загружаются, загрузка целиком или никак.
 */
import { getRawDb } from "../../../../db";
import { canUseSection, requireActor } from "../../../lib/admin-auth";
import { fail, HttpError, sameOrigin } from "../../../lib/security";
import { readTable, rowsOf } from "../../../admin/_lib/sheet";
import { PART_CATEGORIES } from "../../../admin/_lib/parts";

const ALIASES: Record<string, string> = {
  "артикул": "sku", sku: "sku", "код": "sku", "название": "name", name: "name", "наименование": "name",
  "группа": "category", "категория": "category", category: "category", "ед": "unit", "ед.": "unit", "единица": "unit", unit: "unit",
  "цена": "price", "цена продажи": "price", price: "price", "себестоимость": "cost", "закупка": "cost", cost: "cost",
  "остаток": "qty", "количество": "qty", qty: "qty", "минимум": "min", "минимальный остаток": "min", min: "min",
  "место": "location", "место на складе": "location", location: "location", "на сайте": "site",
};
const money = (v: string, label: string) => {
  if (!v) return 0;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 1e9) throw new Error(`${label}: не число`);
  return Math.round(n * 100);
};
const int = (v: string, label: string) => {
  if (!v) return 0;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  if (!Number.isInteger(n) || n < 0 || n > 1e6) throw new Error(`${label}: целое число от 0`);
  return n;
};

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const actor = await requireActor(request);
    const boss = actor.role === "owner" || actor.role === "director";
    if (!(boss || actor.role === "accountant" || (actor.role !== "manager" && canUseSection(actor, "catalog")))) throw new HttpError(403, "Нет доступа к импорту запчастей");
    const form = await request.formData();
    const action = String(form.get("action") ?? "");
    const mode = form.get("mode") === "update" ? "update" : "skip";
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Выберите файл");
    const { keys, rows } = rowsOf(await readTable(file), ALIASES);
    for (const need of ["sku", "name"]) if (!keys.includes(need)) throw new HttpError(400, `В файле нет колонки «${need === "sku" ? "Артикул" : "Название"}»`);
    if (!rows.length) throw new HttpError(400, "В файле нет строк");
    const canCost = boss || actor.role === "accountant";

    const errors: { row: number; error: string }[] = [];
    const valid: { row: number; sku: string; name: string; category: string; unit: string; price: number; cost: number; qty: number; min: number; location: string; site: boolean }[] = [];
    const seen = new Set<string>();
    for (const { row, data } of rows) {
      try {
        const sku = data.sku.toUpperCase();
        if (!/^[A-Z0-9][A-Z0-9.\-/_ ]{1,59}$/.test(sku)) throw new Error("артикул: латиница, цифры, точка, дефис");
        if (seen.has(sku)) throw new Error(`артикул ${sku} повторяется в файле`);
        seen.add(sku);
        if (!data.name) throw new Error("нет названия");
        valid.push({
          row, sku, name: data.name.slice(0, 160), category: PART_CATEGORIES.find((c) => c.toLowerCase() === (data.category ?? "").toLowerCase()) ?? "Прочее",
          unit: (data.unit || "шт").slice(0, 12), price: money(data.price ?? "", "цена"), cost: canCost ? money(data.cost ?? "", "себестоимость") : 0,
          qty: int(data.qty ?? "", "остаток"), min: int(data.min ?? "", "минимум"), location: (data.location ?? "").slice(0, 80), site: /^(да|yes|1|true)$/i.test(data.site ?? ""),
        });
      } catch (e) { errors.push({ row, error: (e as Error).message }); }
    }
    const db = getRawDb();
    const existing = new Set(valid.length ? (await db.prepare(`SELECT upper(sku) AS sku FROM parts WHERE upper(sku) IN (${valid.map(() => "?").join(",")})`).bind(...valid.map((v) => v.sku)).all<{ sku: string }>()).results.map((r) => r.sku) : []);
    const create = valid.filter((v) => !existing.has(v.sku));
    const update = mode === "update" ? valid.filter((v) => existing.has(v.sku)) : [];
    const skipped = valid.length - create.length - update.length;
    const preview = valid.slice(0, 20).map((v) => ({ row: v.row, действие: existing.has(v.sku) ? (mode === "update" ? "обновить" : "пропустить") : "создать", артикул: v.sku, название: v.name, цена: v.price / 100, остаток: existing.has(v.sku) ? "не меняется" : v.qty }));
    if (action !== "commit" || errors.length) return Response.json({ filename: file.name, total: rows.length, valid: create.length + update.length, create: create.length, update: update.length, skipped, errors, preview, canCommit: !errors.length && create.length + update.length > 0 });

    await db.transaction(async (client) => {
      const q = async (s: string, ...a: unknown[]) => (await db.prepare(s).bind(...a).execute(client)).results;
      for (const v of create) {
        const id = crypto.randomUUID();
        await q("INSERT INTO parts(id,sku,name,category,unit,price_minor,cost_minor,qty,min_qty,location,show_on_site,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)", id, v.sku, v.name, v.category, v.unit, v.price, v.cost, v.qty, v.min, v.location, v.site && v.price ? 1 : 0, actor.id, actor.id);
        if (v.qty > 0) await q("INSERT INTO part_movements(id,part_id,kind,qty_delta,qty_after,unit_cost_minor,note,created_by) VALUES(?,?,'count',?,?,?,?,?)", crypto.randomUUID(), id, v.qty, v.qty, v.cost, `Начальный остаток (импорт ${file.name})`, actor.id);
      }
      for (const v of update) {
        // обновляем только те колонки, которые есть в файле: файл «артикул + цена» не должен стирать остальное
        const set: string[] = ["name=?"], args: unknown[] = [v.name];
        if (keys.includes("category")) { set.push("category=?"); args.push(v.category); }
        if (keys.includes("unit")) { set.push("unit=?"); args.push(v.unit); }
        if (keys.includes("price") && v.price > 0) { set.push("price_minor=?"); args.push(v.price); }
        if (keys.includes("min")) { set.push("min_qty=?"); args.push(v.min); }
        if (keys.includes("location") && v.location) { set.push("location=?"); args.push(v.location); }
        await q(`UPDATE parts SET ${set.join(", ")}, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE upper(sku)=?`, ...args, actor.id, v.sku);
      }
      await q("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)", crypto.randomUUID(), actor.id, "Импорт запчастей", file.name.slice(0, 200), `создано ${create.length}, обновлено ${update.length}, пропущено ${skipped}`);
    });
    return Response.json({ ok: true, imported: create.length + update.length, create: create.length, update: update.length, skipped });
  } catch (error) {
    return fail(error);
  }
}
