import { getRawDb } from "../../../../db";
import { requireActor } from "../../../lib/admin-auth";
import { auditStatement, canTransition, minor, visibleDeal } from "../../../lib/crm";
import { cleanText, fail, HttpError, jsonBody, sameOrigin } from "../../../lib/security";

export async function GET(request: Request) {
  try {
    const actor=await requireActor(request); const db=getRawDb(); const owner=actor.role==="owner"||actor.role==="director";
    const [deals,customers,tasks,staff,costs,audit,notes] = await Promise.all([
      db.prepare(`SELECT d.id,d.lead_id,d.customer_id,d.title,d.tractor_slug,d.stage,d.amount_minor,${owner?"d.cost_minor,":""}d.assigned_to,d.loss_reason,d.created_at,d.updated_at,d.version,c.name,c.phone FROM crm_deals d JOIN crm_customers c ON c.id=d.customer_id WHERE d.archived=0 ${owner?"":"AND d.assigned_to=?"} ORDER BY d.updated_at DESC LIMIT 500`).bind(...(owner?[]:[actor.id])).all(),
      db.prepare(`SELECT c.* FROM crm_customers c ${owner?"":"WHERE EXISTS(SELECT 1 FROM crm_deals d WHERE d.customer_id=c.id AND d.assigned_to=? AND d.archived=0)"} ORDER BY c.created_at DESC LIMIT 500`).bind(...(owner?[]:[actor.id])).all(),
      db.prepare(`SELECT * FROM crm_tasks ${owner?"":"WHERE assigned_to=?"} ORDER BY done,due_at LIMIT 500`).bind(...(owner?[]:[actor.id])).all(),
      db.prepare(`SELECT id,display_name,email,role,active FROM staff ${owner?"WHERE active>=0":"WHERE id=? AND active>=0"} ORDER BY created_at`).bind(...(owner?[]:[actor.id])).all(),
      owner?db.prepare("SELECT * FROM product_costs").all():Promise.resolve({results:[]}),
      owner?db.prepare("SELECT a.*,s.display_name FROM audit_logs a LEFT JOIN staff s ON s.id=a.actor_id ORDER BY a.created_at DESC LIMIT 200").all():Promise.resolve({results:[]}),
      db.prepare(`SELECT n.*,s.display_name FROM crm_notes n JOIN staff s ON s.id=n.author_id JOIN crm_deals d ON d.id=n.deal_id ${owner?"":"WHERE d.assigned_to=?"} ORDER BY n.created_at DESC LIMIT 500`).bind(...(owner?[]:[actor.id])).all(),
    ]);
    return Response.json({actor,deals:deals.results,customers:customers.results,tasks:tasks.results,staff:staff.results,costs:costs.results,audit:audit.results,notes:notes.results},{headers:{"Cache-Control":"no-store"}});
  }catch(e){return fail(e);}
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);const actor=await requireActor(request);const body=await jsonBody(request);const db=getRawDb();const action=String(body.action);
    const owner=actor.role==="owner"||actor.role==="director"; const needOwner=()=>{if(!owner)throw new HttpError(403,"Доступно директору");};
    async function assignee(value:unknown) {
      const id = owner ? String(value||actor.id) : actor.id;
      if(!await db.prepare("SELECT id FROM staff WHERE id=? AND active=1").bind(id).first())throw new HttpError(400,"Сотрудник недоступен");
      return id;
    }
    if(action==="update_customer"){
      const id=cleanText(body.id,100,true);
      const customer=await db.prepare(`SELECT c.* FROM crm_customers c ${owner?"WHERE c.id=?":"WHERE c.id=? AND EXISTS(SELECT 1 FROM crm_deals d WHERE d.customer_id=c.id AND d.assigned_to=? AND d.archived=0)"}`).bind(...(owner?[id]:[id,actor.id])).first<{version:number}>();
      if(!customer)throw new HttpError(404,"Клиент не найден");
      if(Number(body.version)!==customer.version)throw new HttpError(409,"Карточка клиента уже изменена. Обновите данные.");
      const power=body.power===""||body.power==null?null:Math.max(0,Math.min(1000,Math.round(Number(body.power))));
      const budget=minor(Number(body.budget)||0);
      const result=await db.prepare(`UPDATE crm_customers SET name=?,phone=?,email=?,notes=?,region=?,source=?,tractor_slug=?,power=?,purpose=?,farm_area=?,budget_minor=?,purchase_method=?,purchase_timing=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=?`).bind(
        cleanText(body.name,120,true),cleanText(body.phone,40,true),cleanText(body.email??"",200),cleanText(body.notes??"",3000),cleanText(body.region??"",100),cleanText(body.source??"",100),cleanText(body.tractorSlug??"",120)||null,power,cleanText(body.purpose??"",300),cleanText(body.farmArea??"",100),budget,cleanText(body.purchaseMethod??"",100),cleanText(body.purchaseTiming??"",100),id,customer.version).run();
      if(!result.meta.changes)throw new HttpError(409,"Карточка клиента уже изменена. Обновите данные.");
      await auditStatement(actor,"Обновлена карточка клиента",id).run();
      return Response.json({ok:true});
    }
    if(action==="create_deal"){
      const assigned=await assignee(body.assignedTo), id=crypto.randomUUID(), customer=crypto.randomUUID();
      const name=cleanText(body.name,120,true),phone=cleanText(body.phone,40,true);
      if(!/^\+?[\d\s()-]{8,40}$/.test(phone))throw new HttpError(400,"Проверьте номер телефона");
      const amount=minor(body.amount??0),title=cleanText(body.title,200,true),slug=cleanText(body.tractorSlug??"",120);
      const cost=owner&&slug?await db.prepare("SELECT cost_minor FROM product_costs WHERE slug=?").bind(slug).first<{cost_minor:number}>():null;
      await db.batch([
        db.prepare("INSERT INTO crm_customers(id,name,phone,assigned_to) VALUES(?,?,?,?)").bind(customer,name,phone,assigned),
        db.prepare("INSERT INTO crm_deals(id,customer_id,title,tractor_slug,amount_minor,cost_minor,assigned_to) VALUES(?,?,?,?,?,?,?)").bind(id,customer,title,slug||null,amount,cost?.cost_minor??null,assigned),
        auditStatement(actor,action,id),
      ]);
      return Response.json({id},{status:201});
    }
    if(action==="update_deal"||action==="move_deal"){
      const id=cleanText(body.id,100,true),deal=await visibleDeal(actor,id);
      const moving=action==="move_deal";
      const stage=cleanText(body.stage,30,true), reason=cleanText(body.lossReason??(deal.stage==="lost"?"Закрыто ранее":""),1000),amount=moving?deal.amount_minor:minor(body.amount);
      canTransition(deal.stage,stage,actor.role,reason,amount);
      const assigned=moving?deal.assigned_to:owner?await assignee(body.assignedTo):deal.assigned_to;
      if(Number(body.version)!==deal.version)throw new HttpError(409,"Запись изменена другим сотрудником. Обновите данные.");
      const result=await db.batch([
        db.prepare("UPDATE crm_deals SET stage=?,amount_minor=?,assigned_to=?,loss_reason=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?").bind(stage,amount,assigned,reason,id,deal.version),
        db.prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) SELECT ?,?,?,?,? WHERE changes()=1").bind(crypto.randomUUID(),actor.id,action,id,JSON.stringify({from:deal.stage,to:stage,amountMinor:amount,assignedTo:assigned})),
      ]);
      if(!result[0].meta.changes)throw new HttpError(409,"Запись уже изменилась. Обновите страницу.");
      const customer=await db.prepare("SELECT name,phone FROM crm_customers WHERE id=?").bind(deal.customer_id).first<{name:string;phone:string}>();
      if(stage==="won"){
        const soldAt=new Date().toISOString().slice(0,10);
        const saleData=JSON.stringify({dealId:id,customer:customer?.name??"Клиент",phone:customer?.phone??"",tractorModel:deal.tractor_slug??"Не указана",tractorVin:"",salePrice:amount/100,costPrice:(deal.cost_minor??0)/100,saleDate:soldAt,manager:actor.display_name,paymentMethod:"",automated:"true"});
        await db.batch([
          db.prepare("INSERT INTO admin_records(id,kind,title,subtitle,status,category,sort_order,data_json,created_by,updated_by) SELECT ?,'sales',?,?, 'active','Автоматически из CRM',0,?,?,? WHERE NOT EXISTS(SELECT 1 FROM admin_records WHERE kind='sales' AND archived=0 AND json_extract(data_json,'$.dealId')=?)").bind(crypto.randomUUID(),`Продажа · ${deal.title}`,`${customer?.name??"Клиент"} · ${deal.tractor_slug??"модель не указана"}`,saleData,actor.id,actor.id,id),
          db.prepare("UPDATE admin_records SET data_json=json_set(data_json,'$.unitStatus','Продан','$.customer',?,'$.salePrice',?,'$.saleDealId',?),updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=(SELECT id FROM admin_records WHERE kind='inventory_units' AND archived=0 AND json_extract(data_json,'$.tractorSlug')=? AND COALESCE(json_extract(data_json,'$.unitStatus'),'') NOT IN ('Продан','Выдан') ORDER BY created_at LIMIT 1)").bind(customer?.name??"Клиент",amount/100,id,actor.id,deal.tractor_slug??""),
        ]);
      }else if(deal.stage==="won"){
        await db.batch([
          db.prepare("UPDATE admin_records SET archived=1,status='archived',updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE kind='sales' AND archived=0 AND json_extract(data_json,'$.dealId')=? AND json_extract(data_json,'$.automated')='true'").bind(actor.id,id),
          db.prepare("UPDATE admin_records SET data_json=json_remove(json_set(data_json,'$.unitStatus','На складе'),'$.customer','$.saleDealId'),updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE kind='inventory_units' AND archived=0 AND json_extract(data_json,'$.saleDealId')=?").bind(actor.id,id),
        ]);
      }
      return Response.json({ok:true});
    }
    if(action==="add_note"){
      const id=cleanText(body.dealId,100,true);await visibleDeal(actor,id);
      await db.batch([db.prepare("INSERT INTO crm_notes(id,deal_id,author_id,body) VALUES(?,?,?,?)").bind(crypto.randomUUID(),id,actor.id,cleanText(body.body,3000,true)),auditStatement(actor,action,id)]);
    }else if(action==="create_task"){
      const assigned=await assignee(body.assignedTo); const dealId=cleanText(body.dealId??"",100);if(dealId)await visibleDeal(actor,dealId);
      const due=new Date(cleanText(body.dueAt,50,true));if(!Number.isFinite(due.getTime()))throw new HttpError(400,"Укажите срок задачи");
      const id=crypto.randomUUID();await db.batch([db.prepare("INSERT INTO crm_tasks(id,deal_id,title,assigned_to,due_at) VALUES(?,?,?,?,?)").bind(id,dealId||null,cleanText(body.title,300,true),assigned,due.toISOString()),auditStatement(actor,action,id)]);
    }else if(action==="toggle_task"){
      const id=cleanText(body.id,100,true);const task=await db.prepare("SELECT * FROM crm_tasks WHERE id=?").bind(id).first<{assigned_to:string;version:number}>();
      if(!task||(!owner&&task.assigned_to!==actor.id))throw new HttpError(404,"Задача не найдена");
      const result=await db.batch([db.prepare("UPDATE crm_tasks SET done=?,version=version+1 WHERE id=? AND version=?").bind(body.done?1:0,id,Number(body.version)),db.prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id) SELECT ?,?,?,? WHERE changes()=1").bind(crypto.randomUUID(),actor.id,action,id)]);
      if(!result[0].meta.changes)throw new HttpError(409,"Задача изменилась. Обновите данные.");
    }else if(action==="save_cost"){
      needOwner();const slug=cleanText(body.slug,120,true),cost=minor(body.cost);
      const expected=Number(body.version??0);
      const result=await db.batch([db.prepare("INSERT INTO product_costs(slug,cost_minor) SELECT ?,? WHERE ?=0 ON CONFLICT(slug) DO NOTHING").bind(slug,cost,expected),
        db.prepare("UPDATE product_costs SET cost_minor=?,version=version+1 WHERE slug=? AND version=? AND ?>0").bind(cost,slug,expected,expected)]);
      if(!result.some((r: {meta:{changes?:number}})=>r.meta.changes))throw new HttpError(409,"Себестоимость уже изменена. Обновите данные.");
      await auditStatement(actor,action,slug,String(cost)).run();
    }else if(action==="staff_active"){
      needOwner();const id=cleanText(body.id,100,true);
      const target=await db.prepare("SELECT role FROM staff WHERE id=?").bind(id).first<{role:string}>();
      if(!target||target.role==="owner"||target.role==="director"||id===actor.id)throw new HttpError(400,"Директора нельзя заблокировать этим действием");
      await db.batch([db.prepare("UPDATE staff SET active=? WHERE id=?").bind(body.active?1:0,id),db.prepare("DELETE FROM staff_sessions WHERE staff_id=?").bind(id),auditStatement(actor,action,id,body.active?"active":"blocked")]);
    }else if(action==="staff_delete"){
      needOwner();const id=cleanText(body.id,100,true);
      const target=await db.prepare("SELECT role FROM staff WHERE id=? AND active>=0").bind(id).first<{role:string}>();
      if(!target||target.role==="owner"||target.role==="director"||id===actor.id)throw new HttpError(400,"Директора нельзя удалить");
      await db.batch([
        db.prepare("UPDATE crm_deals SET assigned_to=? WHERE assigned_to=?").bind(actor.id,id),
        db.prepare("UPDATE crm_customers SET assigned_to=? WHERE assigned_to=?").bind(actor.id,id),
        db.prepare("UPDATE crm_tasks SET assigned_to=? WHERE assigned_to=?").bind(actor.id,id),
        db.prepare("DELETE FROM staff_sessions WHERE staff_id=?").bind(id),
        db.prepare("UPDATE staff SET active=-1,email=?,display_name='Удалённый сотрудник',password_hash=NULL,salt=NULL,phone='',avatar=NULL WHERE id=?").bind(`deleted+${id}@local.invalid`,id),
        auditStatement(actor,action,id),
      ]);
    }else if(action==="save_preferences"){
      const theme=String(body.theme);if(!["field","light","dark"].includes(theme))throw new HttpError(400,"Неизвестная тема");
      await db.prepare("UPDATE staff SET theme=?,display_name=?,phone=? WHERE id=?").bind(theme,cleanText(body.displayName,120,true),cleanText(body.phone??"",40),actor.id).run();
    }else{throw new HttpError(400,"Неизвестное действие");}
    return Response.json({ok:true});
  }catch(e){return fail(e);}
}
