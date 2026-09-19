import { getRawDb } from "../../../../db";
import { canUseSection, requireActor, type Actor } from "../../../lib/admin-auth";
import { cleanText, fail, HttpError, jsonBody, sameOrigin } from "../../../lib/security";
import { normalizedRecordStatements, recordLookups } from "../../../lib/admin-record-sync";

const marketingKinds = new Set([
  "home_sections", "categories", "promotions", "parts", "attachments", "gallery",
  "reviews", "faq", "branches", "leasing_terms", "leasing_model_terms", "service_pages",
]);
const companyKinds = new Set([
  "reservations", "sales", "inventory_units", "stock_parts", "stock_attachments",
  "stock_movements", "suppliers", "purchases", "shipments", "finance_entries",
  "debts", "installments", "payroll", "documents", "service_cases", "manager_plans",
  "meetings", "payments", "leasing_applications", "financial_accounts",
]);
const allKinds = new Set([...marketingKinds, ...companyKinds]);
const statuses = new Set(["draft", "published", "hidden", "active", "closed", "archived", "new", "contacted", "documents", "review", "approved", "rejected", "contract", "issued"]);

function canAccess(actor: Actor, kind: string, mutate: boolean) {
  const section=({parts:"parts",service_pages:"public-service",faq:"faq",leasing_terms:"leasing",leasing_model_terms:"leasing-models",promotions:"promotions",leasing_applications:"leasing-applications",sales:"sales",inventory_units:"inventory-units",suppliers:"suppliers",purchases:"purchases",shipments:"shipments",finance_entries:"expenses",financial_accounts:"financial-accounts",payroll:"payroll",payments:"payments",debts:"debts",documents:"documents",meetings:"meetings",service_cases:"service-cases"} as Record<string,string>)[kind];
  if(section)return canUseSection(actor,section);
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
function storedData(value:string){try{return JSON.parse(value) as Record<string,unknown>}catch{return {}}}

function moduleName(kind: string) {
  return ({
    home_sections:"блок сайта",categories:"категорию",promotions:"акцию",parts:"запчасть",attachments:"навесное оборудование",
    gallery:"фотографию",reviews:"отзыв",faq:"вопрос FAQ",branches:"филиал",leasing_terms:"условия финансирования",leasing_model_terms:"условия модели",leasing_applications:"заявку на лизинг",
    service_pages:"сервисный материал",reservations:"бронь",sales:"продажу",inventory_units:"единицу техники",
    stock_parts:"остаток запчастей",stock_attachments:"остаток оборудования",stock_movements:"движение склада",suppliers:"поставщика",
    purchases:"закупку",shipments:"поставку",finance_entries:"финансовую операцию",debts:"задолженность",
    installments:"рассрочку",payroll:"начисление",documents:"документ",service_cases:"сервисный случай",
    manager_plans:"план менеджера",meetings:"встречу",payments:"платёж",financial_accounts:"счёт",
  } as Record<string,string>)[kind] ?? "запись";
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    const url = new URL(request.url);
    const kind = cleanText(url.searchParams.get("kind"), 60, true);
    if (!allKinds.has(kind) || !canAccess(actor, kind, false)) throw new HttpError(403, "Нет доступа к этому разделу");
    const historyFor=cleanText(url.searchParams.get("historyFor")??"",100);
    if(historyFor){const history=await getRawDb().prepare("SELECT a.id,a.action,a.detail,a.created_at,s.display_name FROM audit_logs a LEFT JOIN staff s ON s.id=a.actor_id WHERE a.entity_id=? ORDER BY a.created_at DESC LIMIT 100").bind(historyFor).all();return Response.json({actor,history:history.results},{headers:{"Cache-Control":"no-store"}});}
    const q = cleanText(url.searchParams.get("q") ?? "", 120).toLowerCase();
    const status = cleanText(url.searchParams.get("status") ?? "all", 20);
    const page = Math.max(1, Math.min(10_000, Number(url.searchParams.get("page")) || 1));
    const pageSize = Math.max(6, Math.min(50, Number(url.searchParams.get("pageSize")) || 12));
    const sort = url.searchParams.get("sort") === "oldest" ? "created_at ASC" : url.searchParams.get("sort") === "title" ? "title COLLATE NOCASE ASC" : "sort_order ASC,updated_at DESC";
    if(kind==="sales"||kind==="debts"){
      const db=getRawDb(),search=`%${q}%`,offset=(page-1)*pageSize;
      if(kind==="sales"){
        if(status==="archived")return Response.json({actor,records:[],total:0,page,pageSize,lookups:await recordLookups()},{headers:{"Cache-Control":"no-store"}});
        const filter=q?"AND (lower(c.name) LIKE ? OR lower(i.vin) LIKE ? OR lower(i.model) LIKE ? OR lower(d.title) LIKE ? OR lower(s.id) LIKE ? )":"";
        const values=q?[search,search,search,search,search]:[];
        const [rows,count]=await Promise.all([db.prepare(`SELECT s.id,'sales' kind,'Продажа · '||i.model title,c.name||' · '||i.vin subtitle,'active' status,'Из CRM' category,0 sort_order,jsonb_build_object('dealId',s.deal_id,'customerId',s.customer_id,'inventoryUnitId',s.inventory_unit_id,'tractorModel',i.model,'tractorVin',i.vin,'salePrice',s.sale_amount_minor/100.0,'costPrice',s.cost_minor/100.0,'paid',COALESCE(p.paid,0)/100.0,'balance',GREATEST(s.sale_amount_minor-COALESCE(p.paid,0),0)/100.0,'saleDate',s.sold_at,'paymentHistory',COALESCE(p.history,'[]'::jsonb)::text)::text data_json,s.archived,s.version,s.created_by,s.created_by updated_by,s.created_at,s.updated_at FROM sales_v2 s JOIN crm_customers c ON c.id=s.customer_id JOIN crm_deals d ON d.id=s.deal_id JOIN inventory_units_v2 i ON i.id=s.inventory_unit_id LEFT JOIN LATERAL(SELECT SUM(amount_minor) paid,jsonb_agg(jsonb_build_object('id',id,'amount',amount_minor/100.0,'date',paid_at,'method',method) ORDER BY paid_at DESC) history FROM payments_v2 WHERE deal_id=s.deal_id AND status='posted' AND archived=0)p ON TRUE WHERE s.archived=0 ${filter} ORDER BY s.sold_at DESC LIMIT ? OFFSET ?`).bind(...values,pageSize,offset).all(),db.prepare(`SELECT COUNT(*) total FROM sales_v2 s JOIN crm_customers c ON c.id=s.customer_id JOIN crm_deals d ON d.id=s.deal_id JOIN inventory_units_v2 i ON i.id=s.inventory_unit_id WHERE s.archived=0 ${filter}`).bind(...values).first<{total:number}>()]);
        return Response.json({actor,records:rows.results,total:Number(count?.total??0),page,pageSize,lookups:await recordLookups()},{headers:{"Cache-Control":"no-store"}});
      }
      if(status==="archived")return Response.json({actor,records:[],total:0,page,pageSize,lookups:await recordLookups()},{headers:{"Cache-Control":"no-store"}});
      const filter=q?"AND (lower(c.name) LIKE ? OR lower(d.title) LIKE ? OR lower(r.id) LIKE ? )":"",values=q?[search,search,search]:[];
      const [rows,count]=await Promise.all([db.prepare(`SELECT r.id,'debts' kind,'Задолженность · '||d.title title,c.name subtitle,CASE WHEN r.due_at<CURRENT_TIMESTAMP THEN 'overdue' ELSE 'active' END status,'Автоматический расчёт' category,0 sort_order,jsonb_build_object('dealId',r.deal_id,'customerId',r.customer_id,'principal',r.principal_minor/100.0,'paid',COALESCE(p.paid,0)/100.0,'amount',GREATEST(r.principal_minor-COALESCE(p.paid,0),0)/100.0,'dueAt',r.due_at)::text data_json,r.archived,r.version,NULL created_by,NULL updated_by,r.created_at,r.updated_at FROM receivables_v2 r JOIN crm_customers c ON c.id=r.customer_id JOIN crm_deals d ON d.id=r.deal_id LEFT JOIN(SELECT deal_id,SUM(amount_minor) paid FROM payments_v2 WHERE status='posted' AND archived=0 GROUP BY deal_id)p ON p.deal_id=r.deal_id WHERE r.archived=0 AND GREATEST(r.principal_minor-COALESCE(p.paid,0),0)>0 ${filter} ORDER BY (r.due_at<CURRENT_TIMESTAMP) DESC,r.due_at LIMIT ? OFFSET ?`).bind(...values,pageSize,offset).all(),db.prepare(`SELECT COUNT(*) total FROM receivables_v2 r JOIN crm_customers c ON c.id=r.customer_id JOIN crm_deals d ON d.id=r.deal_id LEFT JOIN(SELECT deal_id,SUM(amount_minor) paid FROM payments_v2 WHERE status='posted' AND archived=0 GROUP BY deal_id)p ON p.deal_id=r.deal_id WHERE r.archived=0 AND GREATEST(r.principal_minor-COALESCE(p.paid,0),0)>0 ${filter}`).bind(...values).first<{total:number}>()]);
      return Response.json({actor,records:rows.results,total:Number(count?.total??0),page,pageSize,lookups:await recordLookups()},{headers:{"Cache-Control":"no-store"}});
    }
    const where = ["kind=?", status==="archived"?"archived=1":"archived=0"];
    const bindings: unknown[] = [kind];
    if (q) { where.push("(lower(title) LIKE ? OR lower(subtitle) LIKE ? OR lower(category) LIKE ? OR lower(data_json) LIKE ?)"); bindings.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
    if (status !== "all") { if (!statuses.has(status)) throw new HttpError(400, "Неизвестный статус"); where.push("status=?"); bindings.push(status); }
    const db = getRawDb();
    const clause = where.join(" AND ");
    const [rows, count] = await Promise.all([
      db.prepare(`SELECT * FROM admin_records WHERE ${clause} ORDER BY ${sort} LIMIT ? OFFSET ?`).bind(...bindings, pageSize, (page - 1) * pageSize).all(),
      db.prepare(`SELECT COUNT(*) AS total FROM admin_records WHERE ${clause}`).bind(...bindings).first<{total:number}>(),
    ]);
    let records=rows.results as Array<Record<string,unknown>&{id:string;data_json:string}>;
    if(kind==="leasing_applications"&&records.length){
      const ids=records.map(row=>row.id),cases=await db.prepare(`SELECT lc.*,jsonb_array_length(lc.required_documents_json::jsonb) required_count,(SELECT COUNT(DISTINCT d.checklist_key) FROM documents_v2 d WHERE d.leasing_application_id=lc.id AND d.archived=0 AND d.status='verified') verified_count FROM leasing_cases_v2 lc WHERE lc.id IN (${ids.map(()=>"?").join(",")})`).bind(...ids).all<Record<string,unknown>&{id:string}>(),byId=new Map(cases.results.map(row=>[row.id,row]));
      records=records.map(record=>{const row=byId.get(record.id);if(!row)return record;const data=storedData(record.data_json),required=JSON.parse(String(row.required_documents_json||"[]")) as string[];return {...record,data_json:JSON.stringify({...data,customerId:row.customer_id??data.customerId,dealId:row.deal_id??data.dealId,partnerName:row.partner_name,partnerDecision:row.partner_decision,documentStatus:row.document_status,requiredDocuments:required.join(", "),contractNumber:row.contract_number,documentsVerified:Number(row.verified_count||0),documentsRequired:Number(row.required_count||0)})}});
    }
    return Response.json({ actor, records, total: Number(count?.total ?? 0), page, pageSize, lookups: await recordLookups() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { if(!(error instanceof HttpError))console.error("admin records GET failed",error);return fail(error); }
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
      const normalized = await normalizedRecordStatements({action:"create",id,kind,title,status,data,actor});
      const statements = [
        db.prepare("INSERT INTO admin_records(id,kind,title,subtitle,status,category,sort_order,data_json,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(id,kind,title,subtitle,status,category,sortOrder,JSON.stringify(data),actor.id,actor.id),
        ...normalized,
        db.prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),actor.id,"Создано",id,`Создано ${moduleName(kind)} «${title}»`),
      ];
      await db.batch(statements);
      return Response.json({ id }, { status: 201 });
    }

    const id = cleanText(body.id, 100, true);
    const current = await db.prepare(`SELECT * FROM admin_records WHERE id=? AND kind=? ${action==="restore"?"AND archived=1":"AND archived=0"}`).bind(id,kind).first<{title:string;version:number;status:string;data_json:string}>();
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
      const related=await normalizedRecordStatements({action:"update",id,kind,title,status,data:normalized,actor});
      await db.transaction(async client=>{const result=await db.prepare("UPDATE admin_records SET title=?,subtitle=?,status=?,category=?,sort_order=?,data_json=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=?").bind(title,subtitle,status,category,Math.max(0,Math.round(Number(body.sortOrder)||0)),JSON.stringify(normalized),actor.id,id,expected).execute(client);if(!result.meta.changes)throw new HttpError(409,"Запись уже изменена. Обновите список.");for(const statement of related)await statement.execute(client);await db.prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),actor.id,"Изменено",id,`Обновлено ${moduleName(kind)} «${title}»`).execute(client);});
    } else if (action === "status") {
      const status = cleanText(body.status, 20, true);
      if (!statuses.has(status)) throw new HttpError(400, "Неизвестный статус");
      const statusData=storedData(current.data_json),related=await normalizedRecordStatements({action:"update",id,kind,title:current.title,status,data:statusData,actor});
      await db.transaction(async client=>{const result=await db.prepare("UPDATE admin_records SET status=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=?").bind(status,actor.id,id,expected).execute(client);if(!result.meta.changes)throw new HttpError(409,"Запись уже изменена. Обновите список.");for(const statement of related)await statement.execute(client);await db.prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),actor.id,"Изменён статус",id,`${current.title}: ${current.status} → ${status}`).execute(client);});
    } else if (action === "restore") {
      const restoreData=storedData(current.data_json),restoreStatus=cleanText(body.status??"draft",20);if(!statuses.has(restoreStatus)||restoreStatus==="archived")throw new HttpError(400,"Выберите рабочий статус");const related=await normalizedRecordStatements({action:"restore",id,kind,title:current.title,status:restoreStatus,data:restoreData,actor});await db.transaction(async client=>{const result=await db.prepare("UPDATE admin_records SET archived=0,status=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=? AND archived=1").bind(restoreStatus,actor.id,id,expected).execute(client);if(!result.meta.changes)throw new HttpError(409,"Архивная запись уже изменилась");for(const statement of related)await statement.execute(client);await db.prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),actor.id,"Восстановлено из архива",id,current.title).execute(client);});
    } else if (action === "delete") {
      const archiveData=storedData(current.data_json);const related=await normalizedRecordStatements({action:"archive",id,kind,title:current.title,status:"archived",data:archiveData,actor});
      await db.transaction(async client=>{const result=await db.prepare("UPDATE admin_records SET archived=1,status='archived',updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=?").bind(actor.id,id,expected).execute(client);if(!result.meta.changes)throw new HttpError(409,"Запись уже изменена. Обновите список.");for(const statement of related)await statement.execute(client);await db.prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),actor.id,"Перенесено в архив",id,`Архивировано ${moduleName(kind)} «${current.title}»`).execute(client);});
    } else throw new HttpError(400, "Неизвестное действие");
    return Response.json({ ok: true });
  } catch (error) { if(!(error instanceof HttpError))console.error("admin records POST failed",error);return fail(error); }
}
