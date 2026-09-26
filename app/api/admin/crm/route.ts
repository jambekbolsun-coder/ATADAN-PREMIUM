import { getRawDb } from "../../../../db";
import { canUseSection, permissionSections, requireActor } from "../../../lib/admin-auth";
import { auditStatement, canTransition, minor, stageLabels, stages, visibleDeal } from "../../../lib/crm";
import { cleanText, fail, HttpError, jsonBody, sameOrigin } from "../../../lib/security";
import { normalizePhone, structuredLossReason } from "../../../lib/business";

type StageOption={id:string;label:string};
type JsonRecordRow={id:string;data_json:string};
const defaultStageOptions:StageOption[]=stages.map(id=>({id,label:stageLabels[id]}));
async function loadStages(){const row=await getRawDb().prepare("SELECT value FROM site_settings WHERE key='crm_pipeline_stages'").first<{value:string}>();if(!row)return defaultStageOptions;try{const parsed=JSON.parse(row.value) as StageOption[];if(Array.isArray(parsed)&&parsed.length){if(!parsed.some(x=>x.id==="meeting_done")){const index=parsed.findIndex(x=>x.id==="meeting");parsed.splice(index>=0?index+1:3,0,{id:"meeting_done",label:"Встреча проведена"})}return parsed}return defaultStageOptions}catch{return defaultStageOptions}}
function recordData(value:string){try{return JSON.parse(value) as Record<string,unknown>}catch{return {}}}

export async function GET(request: Request) {
  try {
    const actor=await requireActor(request); const db=getRawDb(); const owner=actor.role==="owner"||actor.role==="director";const stageOptions=await loadStages();
    const url=new URL(request.url),mode=url.searchParams.get("mode")||"deals";const section=mode==="customers"?"client-base":mode==="tasks"?"employee-tasks":mode==="team"?"team":mode==="costs"?"finance":mode==="audit"?"audit":mode==="timeline"?"client-base":"deals";
    if(!canUseSection(actor,section))throw new HttpError(403,"Нет доступа к этому разделу");
    if(mode==="timeline"){
      const entityType=cleanText(url.searchParams.get("entityType")??"",20,true),entityId=cleanText(url.searchParams.get("entityId")??"",100,true);
      if(!new Set(["customer","deal"]).has(entityType))throw new HttpError(400,"Неизвестный тип истории");
      let customerId=entityType==="customer"?entityId:"";const dealId=entityType==="deal"?entityId:"";
      if(entityType==="deal"){
        const deal=await visibleDeal(actor,entityId);customerId=deal.customer_id;
      }else{
        const customer=await db.prepare(`SELECT c.id FROM crm_customers c WHERE c.id=? AND c.archived=0 ${owner?"":"AND EXISTS(SELECT 1 FROM crm_deals d WHERE d.customer_id=c.id AND d.assigned_to=? AND d.archived=0)"}`).bind(...(owner?[entityId]:[entityId,actor.id])).first();
        if(!customer)throw new HttpError(404,"Клиент не найден");
      }
      const dealFilter=dealId?"= ?":"IN (SELECT id FROM crm_deals WHERE customer_id=? AND archived=0)",binding=dealId||customerId;
      const [leads,stagesRows,notes,tasks,meetings,proposals,contracts,documents,payments,sales,services,audit]=await Promise.all([
        db.prepare("SELECT id,source,tractor_model AS detail,created_at FROM leads WHERE customer_id=? ORDER BY created_at DESC LIMIT 100").bind(customerId).all(),
        db.prepare(`SELECT e.id,e.from_stage,e.to_stage,e.reason_code,e.reason_detail,e.created_at,s.display_name FROM deal_stage_events e LEFT JOIN staff s ON s.id=e.actor_id WHERE e.deal_id ${dealFilter} ORDER BY e.created_at DESC LIMIT 200`).bind(binding).all(),
        db.prepare(`SELECT n.id,n.body AS detail,n.created_at,s.display_name FROM crm_notes n LEFT JOIN staff s ON s.id=n.author_id WHERE n.deal_id ${dealFilter} ORDER BY n.created_at DESC LIMIT 200`).bind(binding).all(),
        db.prepare(`SELECT id,title,description AS detail,status,done,due_at AS created_at FROM crm_tasks WHERE archived=0 AND deal_id ${dealFilter} ORDER BY due_at DESC LIMIT 200`).bind(binding).all(),
        db.prepare(`SELECT id,status,location AS detail,starts_at AS created_at FROM meetings_v2 WHERE archived=0 AND deal_id ${dealFilter} ORDER BY starts_at DESC LIMIT 100`).bind(binding).all(),
        db.prepare(`SELECT id,status,final_price_minor,created_at FROM proposals_v2 WHERE archived=0 AND deal_id ${dealFilter} ORDER BY created_at DESC LIMIT 100`).bind(binding).all(),
        db.prepare(`SELECT id,contract_number,status,amount_minor,created_at FROM contracts_v2 WHERE archived=0 AND deal_id ${dealFilter} ORDER BY created_at DESC LIMIT 100`).bind(binding).all(),
        db.prepare(`SELECT id,title,document_type,status,created_at FROM documents_v2 WHERE archived=0 AND deal_id ${dealFilter} ORDER BY created_at DESC LIMIT 200`).bind(binding).all(),
        db.prepare(`SELECT id,amount_minor,method,status,paid_at AS created_at FROM payments_v2 WHERE archived=0 AND deal_id ${dealFilter} ORDER BY paid_at DESC LIMIT 200`).bind(binding).all(),
        db.prepare(`SELECT id,sale_amount_minor,cost_minor,sold_at AS created_at FROM sales_v2 WHERE archived=0 AND deal_id ${dealFilter} ORDER BY sold_at DESC LIMIT 20`).bind(binding).all(),
        db.prepare("SELECT id,status,issue AS detail,opened_at AS created_at FROM service_cases_v2 WHERE archived=0 AND customer_id=? ORDER BY opened_at DESC LIMIT 100").bind(customerId).all(),
        db.prepare("SELECT id,action,detail,created_at FROM audit_logs WHERE entity_id=? ORDER BY created_at DESC LIMIT 200").bind(entityId).all(),
      ]);
      const event=(type:string,title:string,row:Record<string,unknown>,detail="")=>({id:String(row.id),type,title,detail,created_at:String(row.created_at)});
      const events=[
        ...leads.results.map(row=>event("lead","Новое обращение",row as Record<string,unknown>,[row.source,row.detail].filter(Boolean).join(" · "))),
        ...stagesRows.results.map(row=>event("stage",`Этап: ${String(row.from_stage||"начало")} → ${String(row.to_stage)}`,row as Record<string,unknown>,[row.reason_code,row.reason_detail,row.display_name].filter(Boolean).join(" · "))),
        ...notes.results.map(row=>event("note","Комментарий",row as Record<string,unknown>,[row.display_name,row.detail].filter(Boolean).join(": "))),
        ...tasks.results.map(row=>event("task",`Задача: ${String(row.title)}`,row as Record<string,unknown>,`${String(row.status||((row.done as number)?"done":"open"))} · ${String(row.detail||"")}`)),
        ...meetings.results.map(row=>event("meeting","Встреча",row as Record<string,unknown>,`${String(row.status)} · ${String(row.detail||"")}`)),
        ...proposals.results.map(row=>event("proposal","Коммерческое предложение",row as Record<string,unknown>,`${Math.round(Number(row.final_price_minor)/100)} сом · ${String(row.status)}`)),
        ...contracts.results.map(row=>event("contract",`Договор ${String(row.contract_number)}`,row as Record<string,unknown>,`${Math.round(Number(row.amount_minor)/100)} сом · ${String(row.status)}`)),
        ...documents.results.map(row=>event("document",String(row.title),row as Record<string,unknown>,`${String(row.document_type)} · ${String(row.status)}`)),
        ...payments.results.map(row=>event("payment","Платёж",row as Record<string,unknown>,`${Math.round(Number(row.amount_minor)/100)} сом · ${String(row.method)} · ${String(row.status)}`)),
        ...sales.results.map(row=>event("sale","Продажа",row as Record<string,unknown>,`${Math.round(Number(row.sale_amount_minor)/100)} сом`)),
        ...services.results.map(row=>event("service","Сервис",row as Record<string,unknown>,`${String(row.status)} · ${String(row.detail||"")}`)),
        ...audit.results.map(row=>event("audit",String(row.action),row as Record<string,unknown>,String(row.detail||""))),
      ].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,500);
      return Response.json({events},{headers:{"Cache-Control":"no-store"}});
    }
    const dealsQuery=mode==="deals"
      ?db.prepare(`SELECT d.id,d.lead_id,d.customer_id,d.title,d.tractor_slug,d.stage,d.amount_minor,${owner?"d.cost_minor,":""}d.assigned_to,d.loss_reason,d.loss_reason_code,d.inventory_unit_id,d.probability,d.next_step_at,d.created_at,d.updated_at,d.version,c.name,c.phone FROM crm_deals d JOIN crm_customers c ON c.id=d.customer_id WHERE d.archived=0 ${owner?"":"AND d.assigned_to=?"} ORDER BY d.updated_at DESC LIMIT 500`).bind(...(owner?[]:[actor.id]))
      :mode==="tasks"?db.prepare(`SELECT id,title FROM crm_deals WHERE archived=0 ${owner?"":"AND assigned_to=?"} ORDER BY updated_at DESC LIMIT 500`).bind(...(owner?[]:[actor.id])):null;
    const customersQuery=mode==="customers"
      ?db.prepare(`SELECT c.* FROM crm_customers c ${owner?"":"WHERE EXISTS(SELECT 1 FROM crm_deals d WHERE d.customer_id=c.id AND d.assigned_to=? AND d.archived=0)"} ORDER BY c.created_at DESC LIMIT 500`).bind(...(owner?[]:[actor.id]))
      :mode==="tasks"?db.prepare(`SELECT c.id,c.name,c.phone FROM crm_customers c ${owner?"":"WHERE EXISTS(SELECT 1 FROM crm_deals d WHERE d.customer_id=c.id AND d.assigned_to=? AND d.archived=0)"} ORDER BY c.name LIMIT 500`).bind(...(owner?[]:[actor.id])):null;
    const staffQuery=mode==="team"
      ?db.prepare(`SELECT id,display_name,email,role,active,avatar,phone,position,department,skills,bio,permissions_json FROM staff ${owner?"WHERE active>=0":"WHERE id=? AND active>=0"} ORDER BY created_at`).bind(...(owner?[]:[actor.id]))
      :(mode==="deals"||mode==="tasks")?db.prepare(`SELECT id,display_name,active FROM staff ${owner?"WHERE active=1":"WHERE id=? AND active=1"} ORDER BY display_name`).bind(...(owner?[]:[actor.id])):null;
    const [deals,customers,tasks,staff,costs,audit,notes,inventory] = await Promise.all([
      dealsQuery?dealsQuery.all():Promise.resolve({results:[]}),
      customersQuery?customersQuery.all():Promise.resolve({results:[]}),
      mode==="tasks"?db.prepare(`SELECT t.*,s.display_name assigned_name,d.title deal_title,c.name customer_name FROM crm_tasks t JOIN staff s ON s.id=t.assigned_to LEFT JOIN crm_deals d ON d.id=t.deal_id LEFT JOIN crm_customers c ON c.id=t.customer_id WHERE t.archived=0 ${owner?"":"AND t.assigned_to=?"} ORDER BY t.done,t.due_at LIMIT 500`).bind(...(owner?[]:[actor.id])).all():Promise.resolve({results:[]}),
      staffQuery?staffQuery.all():Promise.resolve({results:[]}),
      owner&&mode==="costs"?db.prepare("SELECT * FROM product_costs").all():Promise.resolve({results:[]}),
      owner&&mode==="audit"?db.prepare("SELECT a.*,s.display_name FROM audit_logs a LEFT JOIN staff s ON s.id=a.actor_id ORDER BY a.created_at DESC LIMIT 200").all():Promise.resolve({results:[]}),
      mode==="deals"?db.prepare(`SELECT n.*,s.display_name FROM crm_notes n JOIN staff s ON s.id=n.author_id JOIN crm_deals d ON d.id=n.deal_id ${owner?"":"WHERE d.assigned_to=?"} ORDER BY n.created_at DESC LIMIT 500`).bind(...(owner?[]:[actor.id])).all():Promise.resolve({results:[]}),
      mode==="deals"?db.prepare("SELECT id,vin,model,status,reserved_deal_id,list_price_minor FROM inventory_units_v2 WHERE archived=0 ORDER BY status,vin LIMIT 500").all():Promise.resolve({results:[]}),
    ]);
    return Response.json({actor,deals:deals.results,customers:customers.results,tasks:tasks.results,staff:staff.results,costs:costs.results,audit:audit.results,notes:notes.results,inventory:inventory.results,stages:stageOptions.map(item=>[item.id,item.label])},{headers:{"Cache-Control":"no-store"}});
  }catch(e){if(!(e instanceof HttpError))console.error("CRM operation failed",e);return fail(e);}
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);const actor=await requireActor(request);const body=await jsonBody(request);const db=getRawDb();const action=String(body.action);
    const owner=actor.role==="owner"||actor.role==="director"; const needOwner=()=>{if(!owner)throw new HttpError(403,"Доступно директору");};
    const needed=action.includes("task")?"employee-tasks":action.startsWith("staff_")?"team":action==="save_cost"?"finance":action==="update_customer"?"client-base":"deals";if(!canUseSection(actor,needed))throw new HttpError(403,"Нет доступа к этому разделу");
    async function assignee(value:unknown) {
      const id = owner ? String(value||actor.id) : actor.id;
      if(!await db.prepare("SELECT id FROM staff WHERE id=? AND active=1").bind(id).first())throw new HttpError(400,"Сотрудник недоступен");
      return id;
    }
    if(action==="save_stages"){
      needOwner();if(!Array.isArray(body.stages)||body.stages.length<3||body.stages.length>12)throw new HttpError(400,"Воронка должна содержать от 3 до 12 этапов");
      const configured=body.stages.map(value=>{if(!value||typeof value!=="object"||Array.isArray(value))throw new HttpError(400,"Проверьте этапы");const entry=value as Record<string,unknown>,id=cleanText(entry.id,40,true),label=cleanText(entry.label,60,true);if(!/^[a-z][a-z0-9_]{1,39}$/.test(id))throw new HttpError(400,"Некорректный код этапа");return {id,label}}),ids=new Set(configured.map(item=>item.id));
      if(ids.size!==configured.length||!["new","won","lost"].every(id=>ids.has(id)))throw new HttpError(400,"Сохраните уникальные этапы «Новая», «Продано» и «Закрыто»");
      const used=await db.prepare("SELECT DISTINCT stage FROM crm_deals WHERE archived=0").all<{stage:string}>(),missing=used.results.find(row=>!ids.has(row.stage));if(missing)throw new HttpError(409,"Сначала перенесите сделки с удаляемого этапа");
      await db.batch([db.prepare("INSERT INTO site_settings(key,value,version) VALUES('crm_pipeline_stages',?,1) ON CONFLICT(key) DO UPDATE SET value=excluded.value,version=site_settings.version+1").bind(JSON.stringify(configured)),auditStatement(actor,"Настроена воронка","crm_pipeline_stages",configured.map(item=>item.label).join(" → "))]);
      return Response.json({ok:true});
    }
    if(action==="update_customer"){
      const id=cleanText(body.id,100,true);
      const customer=await db.prepare(`SELECT c.* FROM crm_customers c ${owner?"WHERE c.id=?":"WHERE c.id=? AND EXISTS(SELECT 1 FROM crm_deals d WHERE d.customer_id=c.id AND d.assigned_to=? AND d.archived=0)"}`).bind(...(owner?[id]:[id,actor.id])).first<{version:number}>();
      if(!customer)throw new HttpError(404,"Клиент не найден");
      if(Number(body.version)!==customer.version)throw new HttpError(409,"Карточка клиента уже изменена. Обновите данные.");
      const power=body.power===""||body.power==null?null:Math.max(0,Math.min(1000,Math.round(Number(body.power))));
      const budget=minor(Number(body.budget)||0);
      const phone=cleanText(body.phone,40,true),normalizedPhone=normalizePhone(phone);
      const result=await db.prepare(`UPDATE crm_customers SET name=?,phone=?,normalized_phone=?,email=?,notes=?,region=?,source=?,tractor_slug=?,power=?,purpose=?,farm_area=?,budget_minor=?,purchase_method=?,purchase_timing=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=?`).bind(
        cleanText(body.name,120,true),phone,normalizedPhone,cleanText(body.email??"",200),cleanText(body.notes??"",3000),cleanText(body.region??"",100),cleanText(body.source??"",100),cleanText(body.tractorSlug??"",120)||null,power,cleanText(body.purpose??"",300),cleanText(body.farmArea??"",100),budget,cleanText(body.purchaseMethod??"",100),cleanText(body.purchaseTiming??"",100),id,customer.version).run();
      if(!result.meta.changes)throw new HttpError(409,"Карточка клиента уже изменена. Обновите данные.");
      await auditStatement(actor,"Обновлена карточка клиента",id).run();
      return Response.json({ok:true});
    }
    if(action==="create_deal"){
      const assigned=await assignee(body.assignedTo), id=crypto.randomUUID(), proposedCustomer=crypto.randomUUID();
      const name=cleanText(body.name,120,true),phone=cleanText(body.phone,40,true);
      if(!/^\+?[\d\s()-]{8,40}$/.test(phone))throw new HttpError(400,"Проверьте номер телефона");const normalizedPhone=normalizePhone(phone);
      const amount=minor(body.amount??0),title=cleanText(body.title,200,true),slug=cleanText(body.tractorSlug??"",120);
      const cost=owner&&slug?await db.prepare("SELECT cost_minor FROM product_costs WHERE slug=?").bind(slug).first<{cost_minor:number}>():null;
      const customerRow=await db.prepare(`INSERT INTO crm_customers(id,name,phone,normalized_phone,assigned_to) VALUES(?,?,?,?,?) ON CONFLICT(normalized_phone) WHERE normalized_phone IS NOT NULL AND normalized_phone<>'' AND archived=0 DO UPDATE SET phone=excluded.phone,updated_at=CURRENT_TIMESTAMP,version=crm_customers.version+1 RETURNING id`).bind(proposedCustomer,name,phone,normalizedPhone,assigned).first<{id:string}>();
      if(!customerRow)throw new HttpError(500,"Не удалось связать клиента");const customer=customerRow.id;
      await db.batch([
        db.prepare("INSERT INTO crm_deals(id,customer_id,title,tractor_slug,amount_minor,cost_minor,assigned_to) VALUES(?,?,?,?,?,?,?)").bind(id,customer,title,slug||null,amount,cost?.cost_minor??null,assigned),
        db.prepare("INSERT INTO crm_tasks(id,deal_id,customer_id,title,description,priority,assigned_to,due_at,automation_key) VALUES(?,?,?,'Квалифицировать новую сделку','Уточнить потребность, бюджет и срок покупки','high',?,?,?) ON CONFLICT(automation_key) WHERE automation_key IS NOT NULL AND archived=0 DO NOTHING").bind(crypto.randomUUID(),id,customer,assigned,new Date(Date.now()+60*60_000).toISOString(),`deal:${id}:new`),
        auditStatement(actor,action,id),
      ]);
      return Response.json({id},{status:201});
    }
    if(action==="update_deal"||action==="move_deal"){
      const id=cleanText(body.id,100,true),deal=await visibleDeal(actor,id);
      const moving=action==="move_deal";
      const stage=cleanText(body.stage,30,true),amount=moving?deal.amount_minor:minor(body.amount);
      const probability=moving?deal.probability:Math.max(0,Math.min(100,Math.round(Number(body.probability)||0)));
      const nextStepValue=moving?"":cleanText(body.nextStepAt??"",50),nextStepDate=nextStepValue?new Date(nextStepValue):null;
      if(nextStepDate&&!Number.isFinite(nextStepDate.getTime()))throw new HttpError(400,"Проверьте дату следующего шага");
      const nextStepAt=moving?deal.next_step_at:nextStepDate?.toISOString()??null;
      let reason="",reasonCode="";if(stage==="lost"){const structured=structuredLossReason(body.lossReasonCode,body.lossReason);reason=structured.reasonDetail;reasonCode=structured.reasonCode;}
      if(!(await loadStages()).some(item=>item.id===stage))throw new HttpError(400,"Этап больше не доступен");
      canTransition(deal.stage,stage,actor.role,reason,amount);
      const assigned=moving?deal.assigned_to:owner?await assignee(body.assignedTo):deal.assigned_to;
      const inventoryUnitId=cleanText(body.inventoryUnitId??deal.inventory_unit_id??"",100)||null;
      if(["reserved","contract","awaiting_payment","won"].includes(stage)){
        if(!inventoryUnitId)throw new HttpError(400,"Выберите конкретный VIN перед резервированием");
        const unit=await db.prepare("SELECT id,status,reserved_deal_id FROM inventory_units_v2 WHERE id=? AND archived=0").bind(inventoryUnitId).first<{id:string;status:string;reserved_deal_id:string|null}>();
        if(!unit||(["sold","delivered"].includes(unit.status)&&unit.reserved_deal_id!==id)||(unit.reserved_deal_id&&unit.reserved_deal_id!==id))throw new HttpError(409,"Этот VIN уже занят другой сделкой");
      }
      if(stage==="won"){
        const contract=await db.prepare("SELECT id,inventory_unit_id,amount_minor FROM contracts_v2 WHERE deal_id=? AND archived=0 AND status='signed'").bind(id).first<{id:string;inventory_unit_id:string;amount_minor:number}>();
        if(!contract||contract.inventory_unit_id!==inventoryUnitId)throw new HttpError(409,"Перед продажей нужен подписанный договор на выбранный VIN");
        const paid=await db.prepare("SELECT COALESCE(SUM(amount_minor),0) paid FROM payments_v2 WHERE deal_id=? AND status='posted' AND archived=0").bind(id).first<{paid:number}>();
        if(Number(paid?.paid??0)<Number(contract.amount_minor))throw new HttpError(409,"Продажа возможна только после полной фактической оплаты");
      }
      if(Number(body.version)!==deal.version)throw new HttpError(409,"Запись изменена другим сотрудником. Обновите данные.");
      await db.transaction(async client=>{
      const result=await db.prepare("UPDATE crm_deals SET stage=?,amount_minor=?,assigned_to=?,loss_reason=?,loss_reason_code=?,inventory_unit_id=?,probability=?,next_step_at=?,won_at=CASE WHEN ?='won' THEN CURRENT_TIMESTAMP ELSE won_at END,lost_at=CASE WHEN ?='lost' THEN CURRENT_TIMESTAMP ELSE lost_at END,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?").bind(stage,amount,assigned,reason,reasonCode,inventoryUnitId,probability,nextStepAt,stage,stage,id,deal.version).execute(client);
      if(!result.meta.changes)throw new HttpError(409,"Запись уже изменилась. Обновите страницу.");
      await auditStatement(actor,action,id,JSON.stringify({from:deal.stage,to:stage,amountMinor:amount,assignedTo:assigned,inventoryUnitId,reasonCode})).execute(client);
      await db.prepare("INSERT INTO deal_stage_events(id,deal_id,from_stage,to_stage,reason_code,reason_detail,actor_id) VALUES(?,?,?,?,?,?,?)").bind(crypto.randomUUID(),id,deal.stage,stage,reasonCode,reason,actor.id).execute(client);
      if(stage==="meeting"||stage==="meeting_done"){
        const previous=await db.prepare("SELECT id,starts_at,outcome FROM meetings_v2 WHERE deal_id=? AND archived=0 ORDER BY starts_at DESC LIMIT 1").bind(id).execute<{id:string;starts_at:string;outcome:string}>(client);
        const meetingId=previous.results[0]?.id??`pipeline-meeting-${id}`,completed=stage==="meeting_done",date=nextStepAt||new Date().toISOString(),status=completed?"closed":"active";
        const meetingData={customerId:deal.customer_id,dealId:id,responsibleId:assigned||actor.id,date:completed&&previous.results[0]?.starts_at?new Date(previous.results[0].starts_at).toISOString():date,location:"",result:previous.results[0]?.outcome||(completed?"Встреча проведена · отмечено в воронке":""),automated:true};
        await db.prepare("INSERT INTO meetings_v2(id,customer_id,deal_id,responsible_id,starts_at,status,outcome) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,responsible_id=excluded.responsible_id,starts_at=CASE WHEN excluded.status='closed' THEN meetings_v2.starts_at ELSE excluded.starts_at END,outcome=CASE WHEN excluded.status='closed' AND meetings_v2.outcome='' THEN excluded.outcome ELSE meetings_v2.outcome END,version=meetings_v2.version+1,updated_at=CURRENT_TIMESTAMP").bind(meetingId,deal.customer_id,id,assigned||actor.id,date,status,meetingData.result).execute(client);
        await db.prepare("INSERT INTO admin_records(id,kind,title,status,category,data_json,created_by,updated_by) VALUES(?,'meetings',?,?,'Из воронки',?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,data_json=(admin_records.data_json::jsonb||?::jsonb)::text,updated_at=CURRENT_TIMESTAMP,version=admin_records.version+1").bind(meetingId,`Встреча · ${deal.title}`,status,JSON.stringify(meetingData),actor.id,actor.id,JSON.stringify({responsibleId:assigned||actor.id,date:meetingData.date,result:meetingData.result})).execute(client);
      }
      });
      if(inventoryUnitId&&["reserved","contract","awaiting_payment"].includes(stage))await db.batch([db.prepare("UPDATE inventory_units_v2 SET status='reserved',reserved_deal_id=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?").bind(id,actor.id,inventoryUnitId),db.prepare("INSERT INTO inventory_lifecycle_events(id,inventory_unit_id,from_status,to_status,actor_id,note) VALUES(?,?,NULL,'reserved',?,'Резерв из CRM')").bind(crypto.randomUUID(),inventoryUnitId,actor.id)]);
      const automation:{title:string;description:string;hours:number;priority:string}|undefined=stage==="qualified"?{title:"Назначить встречу",description:"Согласовать дату и формат встречи с квалифицированным клиентом",hours:24,priority:"high"}:stage==="meeting_done"?{title:"Подготовить коммерческое предложение",description:"Зафиксировать условия и отправить актуальное КП",hours:24,priority:"high"}:stage==="negotiation"?{title:"Follow-up после предложения",description:"Связаться с клиентом и зафиксировать следующий шаг",hours:48,priority:"normal"}:undefined;
      if(automation&&assigned)await db.prepare("INSERT INTO crm_tasks(id,deal_id,customer_id,title,description,priority,assigned_to,due_at,automation_key) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(automation_key) WHERE automation_key IS NOT NULL AND archived=0 DO NOTHING").bind(crypto.randomUUID(),id,deal.customer_id,automation.title,automation.description,automation.priority,assigned,new Date(Date.now()+automation.hours*60*60_000).toISOString(),`deal:${id}:${stage}`).run();
      const customer=await db.prepare("SELECT name,phone FROM crm_customers WHERE id=?").bind(deal.customer_id).first<{name:string;phone:string}>();
      if(stage==="won"){
        const soldAt=new Date().toISOString().slice(0,10);
        const saleData=JSON.stringify({dealId:id,customer:customer?.name??"Клиент",phone:customer?.phone??"",tractorModel:deal.tractor_slug??"Не указана",tractorVin:"",salePrice:amount/100,costPrice:(deal.cost_minor??0)/100,saleDate:soldAt,manager:actor.display_name,paymentMethod:"",automated:"true"});
        const unit=inventoryUnitId?await db.prepare("SELECT i.id,i.vin,i.model,i.purchase_cost_minor,i.landed_cost_minor,r.data_json FROM inventory_units_v2 i LEFT JOIN admin_records r ON r.id=i.id WHERE i.id=?").bind(inventoryUnitId).first<{id:string;vin:string;model:string;purchase_cost_minor:number;landed_cost_minor:number;data_json:string|null}>():null;
        const contract=await db.prepare("SELECT id FROM contracts_v2 WHERE deal_id=? AND archived=0 AND status='signed'").bind(id).first<{id:string}>();
        const statements=[db.prepare("INSERT INTO admin_records(id,kind,title,subtitle,status,category,sort_order,data_json,created_by,updated_by) SELECT ?,'sales',?,?, 'active','Автоматически из CRM',0,?,?,? WHERE NOT EXISTS(SELECT 1 FROM admin_records WHERE kind='sales' AND archived=0 AND json_extract(data_json,'$.dealId')=?)").bind(crypto.randomUUID(),`Продажа · ${deal.title}`,`${customer?.name??"Клиент"} · ${deal.tractor_slug??"модель не указана"}`,saleData,actor.id,actor.id,id)];
        if(unit&&contract){statements.push(db.prepare("INSERT INTO sales_v2(id,deal_id,customer_id,inventory_unit_id,contract_id,sale_amount_minor,cost_minor,sold_at,created_by) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?) ON CONFLICT(deal_id) WHERE archived=0 DO NOTHING").bind(crypto.randomUUID(),id,deal.customer_id,unit.id,contract.id,amount,Number(unit.purchase_cost_minor)+Number(unit.landed_cost_minor),actor.id));statements.push(db.prepare("UPDATE inventory_units_v2 SET status='sold',reserved_deal_id=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND status NOT IN ('sold','delivered')").bind(id,actor.id,unit.id));if(unit.data_json){const legacy={...recordData(unit.data_json),unitStatus:"Продан",customer:customer?.name??"Клиент",salePrice:amount/100,saleDealId:id};statements.push(db.prepare("UPDATE admin_records SET data_json=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?").bind(JSON.stringify(legacy),actor.id,unit.id));}statements.push(db.prepare("UPDATE receivables_v2 SET status='paid',updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE deal_id=? AND archived=0").bind(id));}
        await db.batch(statements);
      }else if(deal.stage==="won"){
        const units=await db.prepare("SELECT id,data_json FROM admin_records WHERE kind='inventory_units' AND archived=0 AND json_extract(data_json,'$.saleDealId')=?").bind(id).all<JsonRecordRow>();
        const statements=[db.prepare("UPDATE admin_records SET archived=1,status='archived',updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE kind='sales' AND archived=0 AND json_extract(data_json,'$.dealId')=? AND json_extract(data_json,'$.automated')='true'").bind(actor.id,id)];
        for(const unit of units.results){const data:Record<string,unknown>={...recordData(unit.data_json),unitStatus:"На складе"};delete data.customer;delete data.saleDealId;statements.push(db.prepare("UPDATE admin_records SET data_json=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?").bind(JSON.stringify(data),actor.id,unit.id));}
        await db.batch(statements);
      }
      return Response.json({ok:true});
    }
    if(action==="add_note"){
      const id=cleanText(body.dealId,100,true);await visibleDeal(actor,id);
      await db.batch([db.prepare("INSERT INTO crm_notes(id,deal_id,author_id,body) VALUES(?,?,?,?)").bind(crypto.randomUUID(),id,actor.id,cleanText(body.body,3000,true)),auditStatement(actor,action,id)]);
    }else if(action==="create_task"){
      const assigned=await assignee(body.assignedTo); const dealId=cleanText(body.dealId??"",100);if(dealId)await visibleDeal(actor,dealId);
      const customerId=cleanText(body.customerId??"",100);if(customerId&&!await db.prepare(`SELECT c.id FROM crm_customers c WHERE c.id=? ${owner?"":"AND EXISTS(SELECT 1 FROM crm_deals d WHERE d.customer_id=c.id AND d.assigned_to=? AND d.archived=0)"}`).bind(...(owner?[customerId]:[customerId,actor.id])).first())throw new HttpError(400,"Клиент не найден");
      const due=new Date(cleanText(body.dueAt,50,true));if(!Number.isFinite(due.getTime()))throw new HttpError(400,"Укажите срок задачи");
      const reminderValue=cleanText(body.reminderAt??"",50),reminder=reminderValue?new Date(reminderValue):null;if(reminder&&!Number.isFinite(reminder.getTime()))throw new HttpError(400,"Проверьте дату напоминания");if(reminder&&reminder>due)throw new HttpError(400,"Напоминание должно быть раньше срока");
      const priority=cleanText(body.priority??"normal",20);if(!new Set(["low","normal","high","urgent"]).has(priority))throw new HttpError(400,"Неизвестный приоритет");
      if(dealId&&customerId){const linked=await db.prepare("SELECT id FROM crm_deals WHERE id=? AND customer_id=? AND archived=0").bind(dealId,customerId).first();if(!linked)throw new HttpError(400,"Сделка не принадлежит выбранному клиенту");}
      const id=crypto.randomUUID();await db.batch([db.prepare("INSERT INTO crm_tasks(id,deal_id,title,description,priority,customer_id,assigned_to,due_at,reminder_at,status) VALUES(?,?,?,?,?,?,?,?,?,'open')").bind(id,dealId||null,cleanText(body.title,300,true),cleanText(body.description??"",3000),priority,customerId||null,assigned,due.toISOString(),reminder?.toISOString()??null),auditStatement(actor,action,id,`Приоритет: ${priority}`)]);
    }else if(action==="toggle_task"){
      const id=cleanText(body.id,100,true);const task=await db.prepare("SELECT * FROM crm_tasks WHERE id=?").bind(id).first<{assigned_to:string;version:number}>();
      if(!task||(!owner&&task.assigned_to!==actor.id))throw new HttpError(404,"Задача не найдена");
      const result=await db.prepare("UPDATE crm_tasks SET done=?,status=?,completed_at=CASE WHEN ?=1 THEN CURRENT_TIMESTAMP ELSE NULL END,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=?").bind(body.done?1:0,body.done?"done":"open",body.done?1:0,id,Number(body.version)).run();
      if(!result.meta.changes)throw new HttpError(409,"Задача изменилась. Обновите данные.");
      await auditStatement(actor,action,id).run();
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
      const reassignTo=body.active?null:cleanText(body.reassignTo??"",100,true);if(reassignTo)await assignee(reassignTo);
      await db.batch([db.prepare("UPDATE crm_deals SET assigned_to=? WHERE assigned_to=? AND archived=0 AND stage NOT IN ('won','lost')").bind(reassignTo??actor.id,id),db.prepare("UPDATE crm_customers SET assigned_to=? WHERE assigned_to=? AND archived=0").bind(reassignTo??actor.id,id),db.prepare("UPDATE crm_tasks SET assigned_to=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE assigned_to=? AND done=0 AND archived=0").bind(reassignTo??actor.id,id),db.prepare("UPDATE staff SET active=? WHERE id=?").bind(body.active?1:0,id),db.prepare("DELETE FROM staff_sessions WHERE staff_id=?").bind(id),auditStatement(actor,action,id,body.active?"active":`blocked; reassigned=${reassignTo}`)]);
    }else if(action==="staff_delete"){
      needOwner();const id=cleanText(body.id,100,true);
      const target=await db.prepare("SELECT role FROM staff WHERE id=? AND active>=0").bind(id).first<{role:string}>();
      if(!target||target.role==="owner"||target.role==="director"||id===actor.id)throw new HttpError(400,"Директора нельзя удалить");
      const reassignTo=cleanText(body.reassignTo??"",100,true);await assignee(reassignTo);
      await db.batch([
        db.prepare("UPDATE crm_deals SET assigned_to=? WHERE assigned_to=?").bind(reassignTo,id),
        db.prepare("UPDATE crm_customers SET assigned_to=? WHERE assigned_to=?").bind(reassignTo,id),
        db.prepare("UPDATE crm_tasks SET assigned_to=? WHERE assigned_to=?").bind(reassignTo,id),
        db.prepare("DELETE FROM staff_sessions WHERE staff_id=?").bind(id),
        db.prepare("UPDATE staff SET active=-1,email=?,display_name='Удалённый сотрудник',password_hash=NULL,salt=NULL,phone='',avatar=NULL WHERE id=?").bind(`deleted+${id}@local.invalid`,id),
        auditStatement(actor,action,id),
      ]);
    }else if(action==="staff_permissions"){
      needOwner();const id=cleanText(body.id,100,true);if(id===actor.id)throw new HttpError(400,"Собственные права директора не ограничиваются");
      const permissions=Array.isArray(body.permissions)?body.permissions.filter((value):value is string=>typeof value==="string"&&(permissionSections as readonly string[]).includes(value)).slice(0,permissionSections.length):[];
      const target=await db.prepare("SELECT role FROM staff WHERE id=? AND active>=0").bind(id).first<{role:string}>();if(!target||target.role==="owner"||target.role==="director")throw new HttpError(400,"Права директора не изменяются здесь");
      await db.batch([db.prepare("UPDATE staff SET permissions_json=? WHERE id=?").bind(JSON.stringify(permissions),id),db.prepare("DELETE FROM staff_sessions WHERE staff_id=?").bind(id),auditStatement(actor,action,id,`Разделов: ${permissions.length}`)]);
    }else if(action==="save_preferences"){
      const theme=String(body.theme);if(!["field","light","dark","blue","violet","forest","red"].includes(theme))throw new HttpError(400,"Неизвестная тема");
      await db.prepare("UPDATE staff SET theme=?,display_name=?,phone=? WHERE id=?").bind(theme,cleanText(body.displayName,120,true),cleanText(body.phone??"",40),actor.id).run();
    }else{throw new HttpError(400,"Неизвестное действие");}
    return Response.json({ok:true});
  }catch(e){if(!(e instanceof HttpError))console.error("CRM operation failed",e);return fail(e);}
}
