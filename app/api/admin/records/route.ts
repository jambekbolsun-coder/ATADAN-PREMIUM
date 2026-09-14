import { getRawDb } from "../../../../db";
import { requireActor, type Actor } from "../../../lib/admin-auth";
import { cleanText, fail, HttpError, jsonBody, sameOrigin } from "../../../lib/security";

const marketingKinds = new Set([
  "home_sections", "categories", "promotions", "parts", "attachments", "gallery",
  "reviews", "faq", "branches", "leasing_terms", "leasing_model_terms", "service_pages",
]);
const companyKinds = new Set([
  "reservations", "sales", "inventory_units", "stock_parts", "stock_attachments",
  "stock_movements", "suppliers", "purchases", "shipments", "finance_entries",
  "debts", "installments", "payroll", "documents", "service_cases", "manager_plans",
  "meetings", "payments", "leasing_applications",
]);
const allKinds = new Set([...marketingKinds, ...companyKinds]);
const statuses = new Set(["draft", "published", "hidden", "active", "closed", "archived", "new", "contacted", "documents", "review", "approved", "rejected", "contract", "issued"]);

function canAccess(actor: Actor, kind: string, mutate: boolean) {
  if (actor.role === "owner" || actor.role === "director") return true;
  if (marketingKinds.has(kind)) return actor.role === "marketer";
  if (companyKinds.has(kind)) {
    if (actor.role === "manager") return !new Set(["finance_entries", "debts", "installments", "payroll"]).has(kind);
    if (actor.role === "accountant") return new Set(["finance_entries", "debts", "installments", "payroll", "documents", "purchases"]).has(kind);
  }
  return !mutate && actor.role === "manager" && companyKinds.has(kind);
}

function parseData(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const json = JSON.stringify(value);
  if (json.length > 100_000) throw new HttpError(413, "Запись слишком большая");
  return JSON.parse(json) as Record<string, unknown>;
}

function normalizeData(kind:string,value:unknown){
  const data=parseData(value);
  if(kind==="suppliers"){
    const quantity=Math.max(0,Number(data.quantity)||0),unitPrice=Math.max(0,Number(data.unitPrice)||0);
    if(!Number(data.total))data.total=String(Math.round(quantity*unitPrice));
  }
  if(kind==="finance_entries")data.type="Расход";
  return data;
}

function moduleName(kind: string) {
  return ({
    home_sections:"блок сайта",categories:"категорию",promotions:"акцию",parts:"запчасть",attachments:"навесное оборудование",
    gallery:"фотографию",reviews:"отзыв",faq:"вопрос FAQ",branches:"филиал",leasing_terms:"условия финансирования",leasing_model_terms:"условия модели",leasing_applications:"заявку на лизинг",
    service_pages:"сервисный материал",reservations:"бронь",sales:"продажу",inventory_units:"единицу техники",
    stock_parts:"остаток запчастей",stock_attachments:"остаток оборудования",stock_movements:"движение склада",suppliers:"поставщика",
    purchases:"закупку",shipments:"поставку",finance_entries:"финансовую операцию",debts:"задолженность",
    installments:"рассрочку",payroll:"начисление",documents:"документ",service_cases:"сервисный случай",
    manager_plans:"план менеджера",meetings:"встречу",payments:"платёж",
  } as Record<string,string>)[kind] ?? "запись";
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    const url = new URL(request.url);
    const kind = cleanText(url.searchParams.get("kind"), 60, true);
    if (!allKinds.has(kind) || !canAccess(actor, kind, false)) throw new HttpError(403, "Нет доступа к этому разделу");
    const q = cleanText(url.searchParams.get("q") ?? "", 120).toLowerCase();
    const status = cleanText(url.searchParams.get("status") ?? "all", 20);
    const page = Math.max(1, Math.min(10_000, Number(url.searchParams.get("page")) || 1));
    const pageSize = Math.max(6, Math.min(50, Number(url.searchParams.get("pageSize")) || 12));
    const sort = url.searchParams.get("sort") === "oldest" ? "created_at ASC" : url.searchParams.get("sort") === "title" ? "title COLLATE NOCASE ASC" : "sort_order ASC,updated_at DESC";
    const where = ["kind=?", "archived=0"];
    const bindings: unknown[] = [kind];
    if (q) { where.push("(lower(title) LIKE ? OR lower(subtitle) LIKE ? OR lower(category) LIKE ? OR lower(data_json) LIKE ?)"); bindings.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
    if (status !== "all") { if (!statuses.has(status)) throw new HttpError(400, "Неизвестный статус"); where.push("status=?"); bindings.push(status); }
    const db = getRawDb();
    const clause = where.join(" AND ");
    const [rows, count] = await Promise.all([
      db.prepare(`SELECT * FROM admin_records WHERE ${clause} ORDER BY ${sort} LIMIT ? OFFSET ?`).bind(...bindings, pageSize, (page - 1) * pageSize).all(),
      db.prepare(`SELECT COUNT(*) AS total FROM admin_records WHERE ${clause}`).bind(...bindings).first<{total:number}>(),
    ]);
    return Response.json({ actor, records: rows.results, total: Number(count?.total ?? 0), page, pageSize }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const actor = await requireActor(request);
    const body = await jsonBody(request, 140_000);
    const action = cleanText(body.action, 20, true);
    const kind = cleanText(body.kind, 60, true);
    if (!allKinds.has(kind) || !canAccess(actor, kind, true)) throw new HttpError(403, "Нет права изменять этот раздел");
    const db = getRawDb();

    if (action === "create") {
      const id = crypto.randomUUID();
      const title = cleanText(body.title, 180, true);
      const subtitle = cleanText(body.subtitle ?? "", 600);
      const category = cleanText(body.category ?? "", 100);
      const status = cleanText(body.status ?? "draft", 20);
      if (!statuses.has(status)) throw new HttpError(400, "Неизвестный статус");
      const sortOrder = Math.max(0, Math.min(100_000, Math.round(Number(body.sortOrder) || 0)));
      const data = normalizeData(kind,body.data);
      const statements = [
        db.prepare("INSERT INTO admin_records(id,kind,title,subtitle,status,category,sort_order,data_json,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(id,kind,title,subtitle,status,category,sortOrder,JSON.stringify(data),actor.id,actor.id),
        db.prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),actor.id,"Создано",id,`Создано ${moduleName(kind)} «${title}»`),
      ];
      if (kind === "suppliers" && Number(data.total) > 0) {
        const expenseId = crypto.randomUUID();
        const expenseData = {type:"Расход",expenseCategory:"Поставщики и закупки",amount:String(data.total),date:String(data.deliveryDate || new Date().toISOString().slice(0,10)),supplierRecordId:id,supplier:title,automated:"true"};
        statements.push(db.prepare("INSERT INTO admin_records(id,kind,title,subtitle,status,category,sort_order,data_json,created_by,updated_by) VALUES(?,'finance_entries',?,?,'active','Поставщики и закупки',0,?,?,?)").bind(expenseId,`Закупка · ${title}`,subtitle,JSON.stringify(expenseData),actor.id,actor.id));
      }
      await db.batch(statements);
      return Response.json({ id }, { status: 201 });
    }

    const id = cleanText(body.id, 100, true);
    const current = await db.prepare("SELECT * FROM admin_records WHERE id=? AND kind=? AND archived=0").bind(id,kind).first<{title:string;version:number;status:string;data_json:string}>();
    if (!current) throw new HttpError(404, "Запись не найдена");
    const expected = Number(body.version);
    if (!Number.isInteger(expected) || expected !== Number(current.version)) throw new HttpError(409, "Запись уже изменена. Обновите список.");

    if (action === "update") {
      const title = cleanText(body.title, 180, true);
      const subtitle = cleanText(body.subtitle ?? "", 600);
      const category = cleanText(body.category ?? "", 100);
      const status = cleanText(body.status ?? current.status, 20);
      if (!statuses.has(status)) throw new HttpError(400, "Неизвестный статус");
      const normalized=normalizeData(kind,body.data);
      const result = await db.prepare("UPDATE admin_records SET title=?,subtitle=?,status=?,category=?,sort_order=?,data_json=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=?").bind(title,subtitle,status,category,Math.max(0,Math.round(Number(body.sortOrder)||0)),JSON.stringify(normalized),actor.id,id,expected).run();
      if (!result.meta.changes) throw new HttpError(409, "Запись уже изменена. Обновите список.");
      const related=[db.prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),actor.id,"Изменено",id,`Обновлено ${moduleName(kind)} «${title}»`)];
      if(kind==="suppliers"){
        const expenseData={type:"Расход",expenseCategory:"Поставщики и закупки",amount:String(normalized.total||0),date:String(normalized.deliveryDate||new Date().toISOString().slice(0,10)),supplierRecordId:id,supplier:title,automated:"true"};
        related.push(db.prepare("UPDATE admin_records SET title=?,subtitle=?,data_json=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE kind='finance_entries' AND archived=0 AND json_extract(data_json,'$.supplierRecordId')=?").bind(`Закупка · ${title}`,subtitle,JSON.stringify(expenseData),actor.id,id));
      }
      await db.batch(related);
    } else if (action === "status") {
      const status = cleanText(body.status, 20, true);
      if (!statuses.has(status)) throw new HttpError(400, "Неизвестный статус");
      const result = await db.prepare("UPDATE admin_records SET status=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=?").bind(status,actor.id,id,expected).run();
      if (!result.meta.changes) throw new HttpError(409, "Запись уже изменена. Обновите список.");
      await db.prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),actor.id,"Изменён статус",id,`${current.title}: ${current.status} → ${status}`).run();
    } else if (action === "delete") {
      const result = await db.prepare("UPDATE admin_records SET archived=1,status='archived',updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=?").bind(actor.id,id,expected).run();
      if (!result.meta.changes) throw new HttpError(409, "Запись уже изменена. Обновите список.");
      await db.prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),actor.id,"Перенесено в архив",id,`Архивировано ${moduleName(kind)} «${current.title}»`).run();
      if(kind==="suppliers")await db.prepare("UPDATE admin_records SET archived=1,status='archived',updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE kind='finance_entries' AND archived=0 AND json_extract(data_json,'$.supplierRecordId')=?").bind(actor.id,id).run();
    } else throw new HttpError(400, "Неизвестное действие");
    return Response.json({ ok: true });
  } catch (error) { return fail(error); }
}
