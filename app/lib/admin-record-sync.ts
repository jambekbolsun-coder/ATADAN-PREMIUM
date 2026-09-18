import { getRawDb, type PreparedStatement } from "../../db";
import type { Actor } from "./admin-auth";
import { inventoryStatusMap, isoDate, normalizeVin, somToMinor } from "./business";
import { HttpError } from "./security";

type Data = Record<string, unknown>;

async function exists(sql: string, value: string, message: string) {
  if (!value || !await getRawDb().prepare(sql).bind(value).first()) throw new HttpError(400, message);
}

function text(data: Data, key: string, required = false) {
  const value = typeof data[key] === "string" ? data[key].trim() : "";
  if (required && !value) throw new HttpError(400, `Заполните поле «${key}»`);
  return value;
}

function lifecycleAllowed(from: string, to: string) {
  if (from === to) return true;
  const normal: Record<string, string[]> = {
    ordered: ["production", "transit"], production: ["transit"], transit: ["customs", "stock"], customs: ["stock"],
    stock: ["reserved"], reserved: ["stock", "sold"], sold: ["delivered"], delivered: [],
  };
  return normal[from]?.includes(to) ?? false;
}

export async function normalizedRecordStatements(args: {
  action: "create" | "update" | "archive" | "restore";
  id: string;
  kind: string;
  title: string;
  status: string;
  data: Data;
  actor: Actor;
}) {
  const { action, id, kind, title, status, data, actor } = args;
  const db = getRawDb();
  const statements: PreparedStatement[] = [];
  const archived = action === "archive";

  if(kind==="financial_accounts"){const name=text(data,"name",true),accountType=text(data,"accountType",true);if(!new Set(["cash","bank","clearing"]).has(accountType))throw new HttpError(400,"Выберите тип счёта");if(action==="create")statements.push(db.prepare("INSERT INTO financial_accounts(id,name,account_type,currency,opening_balance_minor,active) VALUES(?,?,?,?,?,1)").bind(id,name,accountType,text(data,"currency")||"KGS",somToMinor(data.openingBalance,"Начальный остаток")));else statements.push(db.prepare("UPDATE financial_accounts SET name=?,account_type=?,currency=?,active=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?").bind(name,accountType,text(data,"currency")||"KGS",archived?0:1,id));}

  if (kind === "sales" || kind === "debts") {
    throw new HttpError(409, kind === "sales" ? "Продажа создаётся только из полностью оплаченной сделки и не редактируется вручную" : "Долг рассчитывается автоматически из договора и платежей");
  }

  if (kind === "suppliers") {
    const name = text(data, "company", true) || title;
    if (action === "create") statements.push(db.prepare("INSERT INTO suppliers_v2(id,name,contact_name,phone,email,country,terms,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?)").bind(id,name,text(data,"contact"),text(data,"phone"),text(data,"email"),text(data,"country"),text(data,"terms"),actor.id,actor.id));
    else statements.push(db.prepare("UPDATE suppliers_v2 SET name=?,contact_name=?,phone=?,email=?,country=?,terms=?,archived=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?").bind(name,text(data,"contact"),text(data,"phone"),text(data,"email"),text(data,"country"),text(data,"terms"),archived?1:0,actor.id,id));
  }

  if (kind === "purchases") {
    const supplierId=text(data,"supplierId",true);await exists("SELECT id FROM suppliers_v2 WHERE id=? AND archived=0",supplierId,"Выберите действующего поставщика");
    const orderNumber=text(data,"orderNumber",true),total=somToMinor(data.amount,"Сумма закупки");
    if(action==="create")statements.push(db.prepare("INSERT INTO purchase_orders_v2(id,supplier_id,order_number,status,total_minor,ordered_at,expected_at,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?)").bind(id,supplierId,orderNumber,status,total,text(data,"orderDate")||null,text(data,"expectedAt")||null,actor.id,actor.id));
    else statements.push(db.prepare("UPDATE purchase_orders_v2 SET supplier_id=?,order_number=?,status=?,total_minor=?,ordered_at=?,expected_at=?,archived=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?").bind(supplierId,orderNumber,status,total,text(data,"orderDate")||null,text(data,"expectedAt")||null,archived?1:0,actor.id,id));
  }

  if(kind==="shipments"){
    const purchaseOrderId=text(data,"purchaseOrderId",true);await exists("SELECT id FROM purchase_orders_v2 WHERE id=? AND archived=0",purchaseOrderId,"Выберите действующий заказ поставщику");
    if(action==="create")statements.push(db.prepare("INSERT INTO shipments_v2(id,purchase_order_id,tracking_number,status,route,transport,eta,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?)").bind(id,purchaseOrderId,text(data,"tracking")||null,status,text(data,"route"),text(data,"transport"),text(data,"eta")||null,actor.id,actor.id));
    else statements.push(db.prepare("UPDATE shipments_v2 SET purchase_order_id=?,tracking_number=?,status=?,route=?,transport=?,eta=?,archived=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?").bind(purchaseOrderId,text(data,"tracking")||null,status,text(data,"route"),text(data,"transport"),text(data,"eta")||null,archived?1:0,actor.id,id));
  }

  if(kind==="inventory_units"){
    const vin=normalizeVin(data.vin),model=text(data,"model",true),slug=text(data,"tractorSlug",true),unitStatus=inventoryStatusMap[text(data,"unitStatus")]??text(data,"unitStatus");
    if(!Object.values(inventoryStatusMap).includes(unitStatus))throw new HttpError(400,"Выберите корректный этап жизненного цикла VIN");
    const purchaseOrderId=text(data,"purchaseOrderId"),shipmentId=text(data,"shipmentId"),responsibleId=text(data,"responsibleId");
    if(purchaseOrderId)await exists("SELECT id FROM purchase_orders_v2 WHERE id=? AND archived=0",purchaseOrderId,"Заказ поставщику не найден");
    if(shipmentId)await exists("SELECT id FROM shipments_v2 WHERE id=? AND archived=0",shipmentId,"Поставка не найдена");
    if(responsibleId)await exists("SELECT id FROM staff WHERE id=? AND active=1",responsibleId,"Ответственный сотрудник недоступен");
    const purchase=somToMinor(data.purchaseCost,"Закупочная цена"),landed=somToMinor(data.expenses,"Дополнительные расходы"),list=somToMinor(data.salePrice,"Цена продажи");
    if(action==="create"){
      statements.push(db.prepare("INSERT INTO inventory_units_v2(id,vin,tractor_slug,model,status,purchase_order_id,shipment_id,purchase_cost_minor,landed_cost_minor,list_price_minor,location,responsible_id,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,vin,slug,model,unitStatus,purchaseOrderId||null,shipmentId||null,purchase,landed,list,text(data,"location"),responsibleId||null,actor.id,actor.id));
      statements.push(db.prepare("INSERT INTO inventory_lifecycle_events(id,inventory_unit_id,from_status,to_status,actor_id,responsible_id,note) VALUES(?,?,NULL,?,?,?,'Создана карточка VIN')").bind(crypto.randomUUID(),id,unitStatus,actor.id,responsibleId||null));
    }else{
      const current=await db.prepare("SELECT status FROM inventory_units_v2 WHERE id=?").bind(id).first<{status:string}>();
      if(current&&!archived&&!lifecycleAllowed(current.status,unitStatus)&&!["owner","director"].includes(actor.role))throw new HttpError(409,"Недопустимый обратный переход жизненного цикла VIN");
      statements.push(db.prepare("UPDATE inventory_units_v2 SET vin=?,tractor_slug=?,model=?,status=?,purchase_order_id=?,shipment_id=?,purchase_cost_minor=?,landed_cost_minor=?,list_price_minor=?,location=?,responsible_id=?,archived=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?").bind(vin,slug,model,unitStatus,purchaseOrderId||null,shipmentId||null,purchase,landed,list,text(data,"location"),responsibleId||null,archived?1:0,actor.id,id));
      if(current&&!archived&&current.status!==unitStatus)statements.push(db.prepare("INSERT INTO inventory_lifecycle_events(id,inventory_unit_id,from_status,to_status,actor_id,responsible_id,note) VALUES(?,?,?,?,?,?,'Статус изменён в модуле склада')").bind(crypto.randomUUID(),id,current.status,unitStatus,actor.id,responsibleId||null));
    }
  }

  if(kind==="finance_entries"){
    if(action!=="create")throw new HttpError(409,"Проведённый расход нельзя менять. Создайте корректирующую операцию");
    const accountId=text(data,"accountId",true);await exists("SELECT id FROM financial_accounts WHERE id=? AND active=1",accountId,"Выберите активный счёт или кассу");
    statements.push(db.prepare("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,expense_record_id,occurred_at,description,created_by) VALUES(?,?,'out',?,?,?,?,?,?)").bind(crypto.randomUUID(),accountId,somToMinor(data.amount),text(data,"expenseCategory",true),id,isoDate(data.date),text(data,"notes")||title,actor.id));
  }

  if(kind==="payments"){
    if(action!=="create")throw new HttpError(409,"Проведённый платёж нельзя менять. Используйте сторнирование");
    const customerId=text(data,"customerId",true),dealId=text(data,"dealId",true),accountId=text(data,"accountId",true);
    const deal=await db.prepare("SELECT d.customer_id,c.id contract_id,c.amount_minor FROM crm_deals d JOIN contracts_v2 c ON c.deal_id=d.id AND c.archived=0 AND c.status='signed' WHERE d.id=? AND d.archived=0").bind(dealId).first<{customer_id:string;contract_id:string;amount_minor:number}>();
    if(!deal||deal.customer_id!==customerId)throw new HttpError(400,"Для оплаты нужна подписанная сделка выбранного клиента");
    await exists("SELECT id FROM financial_accounts WHERE id=? AND active=1",accountId,"Выберите активный счёт или кассу");
    const amount=somToMinor(data.amount),paidAt=isoDate(data.date),transactionId=crypto.randomUUID();
    if(amount<=0)throw new HttpError(400,"Сумма платежа должна быть больше нуля");
    const paid=await db.prepare("SELECT COALESCE(SUM(amount_minor),0) paid FROM payments_v2 WHERE deal_id=? AND status='posted' AND archived=0").bind(dealId).first<{paid:number}>();
    if(Number(paid?.paid??0)+amount>Number(deal.amount_minor))throw new HttpError(409,"Платёж превышает остаток по сделке");
    statements.push(db.prepare("INSERT INTO payments_v2(id,customer_id,deal_id,contract_id,account_id,amount_minor,method,status,paid_at,reference,created_by) VALUES(?,?,?,?,?,?,?,'posted',?,?,?)").bind(id,customerId,dealId,deal.contract_id,accountId,amount,text(data,"method",true),paidAt,text(data,"reference"),actor.id));
    statements.push(db.prepare("INSERT INTO account_transactions(id,account_id,direction,amount_minor,category,payment_id,occurred_at,description,created_by) VALUES(?,?,'in',?,'Оплата клиента',?,?,?,?)").bind(transactionId,accountId,amount,id,paidAt,title,actor.id));
    statements.push(db.prepare("INSERT INTO receivables_v2(id,customer_id,deal_id,principal_minor,due_at,status) VALUES(?,?,?,?,?,'open') ON CONFLICT(deal_id) WHERE archived=0 AND status<>'written_off' DO UPDATE SET principal_minor=excluded.principal_minor,due_at=COALESCE(excluded.due_at,receivables_v2.due_at),status=CASE WHEN (SELECT COALESCE(SUM(amount_minor),0) FROM payments_v2 WHERE deal_id=excluded.deal_id AND status='posted' AND archived=0) >= excluded.principal_minor THEN 'paid' WHEN COALESCE(excluded.due_at,receivables_v2.due_at)<CURRENT_TIMESTAMP THEN 'overdue' ELSE 'open' END,updated_at=CURRENT_TIMESTAMP,version=receivables_v2.version+1").bind(crypto.randomUUID(),customerId,dealId,deal.amount_minor,text(data,"dueAt")||null));
  }

  if(kind==="documents"){
    const customerId=text(data,"customerId"),dealId=text(data,"dealId"),inventoryUnitId=text(data,"inventoryUnitId"),fileUrl=text(data,"fileUrl",true),documentType=text(data,"documentType",true);
    if(customerId)await exists("SELECT id FROM crm_customers WHERE id=? AND archived=0",customerId,"Клиент не найден");if(dealId)await exists("SELECT id FROM crm_deals WHERE id=? AND archived=0",dealId,"Сделка не найдена");
    if(action==="create")statements.push(db.prepare("INSERT INTO documents_v2(id,customer_id,deal_id,document_type,title,file_url,status,checklist_key,uploaded_by) VALUES(?,?,?,?,?,?,?,?,?)").bind(id,customerId||null,dealId||null,documentType,title,fileUrl,status,text(data,"checklistKey"),actor.id));
    else statements.push(db.prepare("UPDATE documents_v2 SET customer_id=?,deal_id=?,document_type=?,title=?,file_url=?,status=?,checklist_key=?,archived=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?").bind(customerId||null,dealId||null,documentType,title,fileUrl,status,text(data,"checklistKey"),archived?1:0,id));
    if(documentType==="Договор"&&!archived){
      if(!customerId||!dealId||!inventoryUnitId)throw new HttpError(400,"Для договора выберите клиента, сделку и VIN");
      await exists("SELECT id FROM inventory_units_v2 WHERE id=? AND archived=0",inventoryUnitId,"VIN не найден");const amount=somToMinor(data.amount,"Сумма договора"),number=text(data,"number",true);
      const contractStatus=text(data,"contractStatus")==="signed"?"signed":"draft";
      statements.push(db.prepare("INSERT INTO contracts_v2(id,contract_number,customer_id,deal_id,inventory_unit_id,amount_minor,status,signed_at,created_by) VALUES(?,?,?,?,?,?,?,CASE WHEN ?='signed' THEN CURRENT_TIMESTAMP ELSE NULL END,?) ON CONFLICT(deal_id) WHERE archived=0 DO UPDATE SET contract_number=excluded.contract_number,customer_id=excluded.customer_id,inventory_unit_id=excluded.inventory_unit_id,amount_minor=excluded.amount_minor,status=excluded.status,signed_at=CASE WHEN excluded.status='signed' THEN COALESCE(contracts_v2.signed_at,CURRENT_TIMESTAMP) ELSE contracts_v2.signed_at END,updated_at=CURRENT_TIMESTAMP,version=contracts_v2.version+1").bind(id,number,customerId,dealId,inventoryUnitId,amount,contractStatus,contractStatus,actor.id));
    }
    if(documentType==="Коммерческое предложение"&&!archived){if(!customerId||!dealId)throw new HttpError(400,"Для КП выберите клиента и сделку");const deal=await db.prepare("SELECT customer_id,tractor_slug FROM crm_deals WHERE id=? AND archived=0").bind(dealId).first<{customer_id:string;tractor_slug:string|null}>();if(!deal||deal.customer_id!==customerId)throw new HttpError(400,"Сделка не принадлежит выбранному клиенту");if(!deal.tractor_slug)throw new HttpError(400,"В сделке не выбрана модель");const base=somToMinor(data.basePrice,"Базовая цена"),discount=somToMinor(data.discount,"Скидка"),options=somToMinor(data.optionsPrice,"Опции"),final=base-discount+options;if(final<=0||discount>base)throw new HttpError(400,"Проверьте цену и скидку КП");statements.push(db.prepare("INSERT INTO proposals_v2(id,customer_id,deal_id,tractor_slug,inventory_unit_id,base_price_minor,discount_minor,options_minor,final_price_minor,terms_json,status,valid_until,created_by) VALUES(?,?,?,?,?,?,?,?,?,?::text,?,?,?) ON CONFLICT(id) DO UPDATE SET customer_id=excluded.customer_id,deal_id=excluded.deal_id,tractor_slug=excluded.tractor_slug,inventory_unit_id=excluded.inventory_unit_id,base_price_minor=excluded.base_price_minor,discount_minor=excluded.discount_minor,options_minor=excluded.options_minor,final_price_minor=excluded.final_price_minor,terms_json=excluded.terms_json,status=excluded.status,valid_until=excluded.valid_until,updated_at=CURRENT_TIMESTAMP,version=proposals_v2.version+1").bind(id,customerId,dealId,deal.tractor_slug,inventoryUnitId||null,base,discount,options,final,JSON.stringify({source:"admin",documentUrl:fileUrl}),status,text(data,"validUntil")||null,actor.id));}
  }

  if(kind==="meetings"&&!archived){
    const customerId=text(data,"customerId",true),dealId=text(data,"dealId",true),responsibleId=text(data,"responsibleId",true);await exists("SELECT id FROM crm_customers WHERE id=? AND archived=0",customerId,"Клиент не найден");await exists("SELECT id FROM crm_deals WHERE id=? AND archived=0",dealId,"Сделка не найдена");await exists("SELECT id FROM staff WHERE id=? AND active=1",responsibleId,"Ответственный недоступен");
    if(action==="create")statements.push(db.prepare("INSERT INTO meetings_v2(id,customer_id,deal_id,responsible_id,starts_at,status,location,outcome) VALUES(?,?,?,?,?,?,?,?)").bind(id,customerId,dealId,responsibleId,isoDate(data.date),status,text(data,"location"),text(data,"result")));
    else statements.push(db.prepare("UPDATE meetings_v2 SET customer_id=?,deal_id=?,responsible_id=?,starts_at=?,status=?,location=?,outcome=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?").bind(customerId,dealId,responsibleId,isoDate(data.date),status,text(data,"location"),text(data,"result"),id));
  }

  if(kind==="service_cases"&&!archived){const customerId=text(data,"customerId",true),saleId=text(data,"saleId",true),inventoryUnitId=text(data,"inventoryUnitId",true),responsibleId=text(data,"responsibleId");const sale=await db.prepare("SELECT customer_id,inventory_unit_id FROM sales_v2 WHERE id=? AND archived=0").bind(saleId).first<{customer_id:string;inventory_unit_id:string}>();if(!sale||sale.customer_id!==customerId||sale.inventory_unit_id!==inventoryUnitId)throw new HttpError(400,"Сервис должен быть связан с покупкой клиента и тем же VIN");if(responsibleId)await exists("SELECT id FROM staff WHERE id=? AND active=1",responsibleId,"Ответственный недоступен");if(action==="create")statements.push(db.prepare("INSERT INTO service_cases_v2(id,customer_id,sale_id,inventory_unit_id,responsible_id,status,issue,resolution,opened_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(id,customerId,saleId,inventoryUnitId,responsibleId||null,status,text(data,"issue",true),text(data,"resolution"),text(data,"date")?isoDate(data.date):new Date().toISOString()));else statements.push(db.prepare("UPDATE service_cases_v2 SET responsible_id=?,status=?,issue=?,resolution=?,closed_at=CASE WHEN ?='closed' THEN CURRENT_TIMESTAMP ELSE NULL END,version=version+1 WHERE id=?").bind(responsibleId||null,status,text(data,"issue",true),text(data,"resolution"),status,id));}

  return statements;
}

export async function recordLookups() {
  const db=getRawDb();const [customers,deals,inventory,accounts,suppliers,purchases,shipments,staff,sales]=await Promise.all([
    db.prepare("SELECT id,name AS label FROM crm_customers WHERE archived=0 ORDER BY name LIMIT 1000").all(),
    db.prepare("SELECT id,title AS label,customer_id FROM crm_deals WHERE archived=0 ORDER BY updated_at DESC LIMIT 1000").all(),
    db.prepare("SELECT id,vin||' · '||model AS label,status FROM inventory_units_v2 WHERE archived=0 ORDER BY vin LIMIT 1000").all(),
    db.prepare("SELECT id,name AS label FROM financial_accounts WHERE active=1 ORDER BY name").all(),
    db.prepare("SELECT id,name AS label FROM suppliers_v2 WHERE archived=0 ORDER BY name").all(),
    db.prepare("SELECT id,order_number AS label,supplier_id FROM purchase_orders_v2 WHERE archived=0 ORDER BY created_at DESC LIMIT 1000").all(),
    db.prepare("SELECT id,COALESCE(tracking_number,id) AS label,purchase_order_id FROM shipments_v2 WHERE archived=0 ORDER BY created_at DESC LIMIT 1000").all(),
    db.prepare("SELECT id,display_name AS label FROM staff WHERE active=1 ORDER BY display_name").all(),
    db.prepare("SELECT id,'Продажа · '||id AS label,customer_id,inventory_unit_id FROM sales_v2 WHERE archived=0 ORDER BY sold_at DESC LIMIT 1000").all(),
  ]);return {customers:customers.results,deals:deals.results,inventory:inventory.results,accounts:accounts.results,suppliers:suppliers.results,purchases:purchases.results,shipments:shipments.results,staff:staff.results,sales:sales.results};
}
