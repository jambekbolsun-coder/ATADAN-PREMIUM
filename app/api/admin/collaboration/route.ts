import { getRawDb } from "../../../../db";
import { canUseSection, requireActor } from "../../../lib/admin-auth";
import { auditStatement } from "../../../lib/crm";
import { cleanText, fail, HttpError, jsonBody, sameOrigin } from "../../../lib/security";

type GenericRow={id:string;title:string;subtitle:string;status:string;data_json:string;created_by:string;created_at:string;updated_at:string};
const parse=(value:string)=>{try{return JSON.parse(value) as Record<string,unknown>}catch{return {}}};

export async function GET(request:Request){
  try{
    const actor=await requireActor(request),db=getRawDb(),owner=["owner","director"].includes(actor.role),scope=cleanText(new URL(request.url).searchParams.get("scope")??"notifications",20,true);
    if(!new Set(["notifications","chat","groups"]).has(scope)||!canUseSection(actor,scope))throw new HttpError(403,"Нет доступа к этому разделу");const chatAccess=scope==="chat",groupAccess=scope==="groups"||scope==="chat",notificationAccess=scope==="notifications";
    const [staff,messages,groups,leads,tasks,audit,personalNotifications]=await Promise.all([
      db.prepare("SELECT id,display_name,email,role,avatar,active FROM staff WHERE active=1 ORDER BY display_name").all(),
      chatAccess?db.prepare("SELECT * FROM admin_records WHERE kind='employee_message' AND archived=0 ORDER BY created_at DESC LIMIT 300").all<GenericRow>():Promise.resolve({results:[]}),
      groupAccess?db.prepare("SELECT * FROM admin_records WHERE kind='employee_group' AND archived=0 ORDER BY updated_at DESC LIMIT 100").all<GenericRow>():Promise.resolve({results:[]}),
      notificationAccess?db.prepare(`SELECT l.id,l.name,l.phone,l.tractor_slug,l.status,l.created_at FROM leads l ${owner?"":"WHERE EXISTS(SELECT 1 FROM crm_deals d WHERE d.lead_id=l.id AND d.assigned_to=?)"} ORDER BY l.created_at DESC LIMIT 40`).bind(...(owner?[]:[actor.id])).all():Promise.resolve({results:[]}),
      notificationAccess?db.prepare(`SELECT t.id,t.title,t.due_at,t.done,t.assigned_to,s.display_name FROM crm_tasks t LEFT JOIN staff s ON s.id=t.assigned_to ${owner?"":"WHERE t.assigned_to=?"} ORDER BY t.created_at DESC LIMIT 60`).bind(...(owner?[]:[actor.id])).all():Promise.resolve({results:[]}),
      notificationAccess?db.prepare(`SELECT a.id,a.action,a.detail,a.created_at,s.display_name FROM audit_logs a LEFT JOIN staff s ON s.id=a.actor_id ${owner?"":"WHERE a.actor_id=?"} ORDER BY a.created_at DESC LIMIT 60`).bind(...(owner?[]:[actor.id])).all():Promise.resolve({results:[]}),
      notificationAccess?db.prepare("SELECT * FROM notifications_v2 WHERE recipient_id=? AND archived=0 ORDER BY read_at NULLS FIRST,created_at DESC LIMIT 200").bind(actor.id).all():Promise.resolve({results:[]}),
    ]);
    const groupRows=groups.results.map(row=>({...row,data:parse(row.data_json)}));
    const allowedGroups=new Set(groupRows.filter(row=>owner||row.created_by===actor.id||Array.isArray(row.data.members)&&row.data.members.includes(actor.id)).map(row=>row.id));
    const messageRows=messages.results.map(row=>({...row,data:parse(row.data_json)})).filter(row=>owner||row.created_by===actor.id||row.data.to===actor.id||(typeof row.data.groupId==="string"&&allowedGroups.has(row.data.groupId)));
    return Response.json({actor,staff:staff.results,groups:groupRows,messages:messageRows,notifications:{personal:personalNotifications.results,leads:leads.results,tasks:tasks.results,audit:audit.results}},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return fail(error)}
}

export async function POST(request:Request){
  try{
    sameOrigin(request);const actor=await requireActor(request),body=await jsonBody(request,30_000),db=getRawDb(),action=cleanText(body.action,30,true);const permission=action.includes("group")?"groups":action.startsWith("notification")?"notifications":"chat";if(!canUseSection(actor,permission))throw new HttpError(403,"Нет права выполнять это действие");
    if(action==="send_message"){
      const text=cleanText(body.text,4000,true),to=cleanText(body.to??"",100),groupId=cleanText(body.groupId??"",100);
      if(!to&&!groupId)throw new HttpError(400,"Выберите сотрудника или группу");
      if(to&&!await db.prepare("SELECT id FROM staff WHERE id=? AND active=1").bind(to).first())throw new HttpError(400,"Сотрудник недоступен");
      if(groupId){const group=await db.prepare("SELECT created_by,data_json FROM admin_records WHERE id=? AND kind='employee_group' AND archived=0").bind(groupId).first<{created_by:string;data_json:string}>();const members=group?parse(group.data_json).members:null;if(!group||(!["owner","director"].includes(actor.role)&&group.created_by!==actor.id&&(!Array.isArray(members)||!members.includes(actor.id))))throw new HttpError(403,"Нет доступа к этой группе");}
      const id=crypto.randomUUID(),data={to:to||null,groupId:groupId||null,text,fromName:actor.display_name};
      await db.batch([db.prepare("INSERT INTO admin_records(id,kind,title,subtitle,status,category,data_json,created_by,updated_by) VALUES(?,'employee_message',?,?,'active','Чат',?,?,?)").bind(id,`Сообщение от ${actor.display_name}`,text.slice(0,180),JSON.stringify(data),actor.id,actor.id),auditStatement(actor,"Отправлено сообщение",id)]);
      return Response.json({id},{status:201});
    }
    if(action==="create_group"){
      const title=cleanText(body.title,120,true),description=cleanText(body.description??"",600),members=Array.isArray(body.members)?Array.from(new Set(body.members.map(value=>cleanText(value,100)).filter(Boolean))).slice(0,100):[];
      if(!members.includes(actor.id))members.push(actor.id);
      const valid=await db.prepare(`SELECT id FROM staff WHERE active=1 AND id IN (${members.map(()=>"?").join(",")})`).bind(...members).all<{id:string}>();
      const allowed=new Set(valid.results.map(row=>row.id));if(members.some(id=>!allowed.has(id)))throw new HttpError(400,"В группе есть недоступный сотрудник");
      const id=crypto.randomUUID(),data={members,description};
      await db.batch([db.prepare("INSERT INTO admin_records(id,kind,title,subtitle,status,category,data_json,created_by,updated_by) VALUES(?,'employee_group',?,?,'active','Проектная группа',?,?,?)").bind(id,title,description,JSON.stringify(data),actor.id,actor.id),auditStatement(actor,"Создана рабочая группа",id,title)]);
      return Response.json({id},{status:201});
    }
    if(action==="update_group"||action==="archive_group"){
      const id=cleanText(body.id,100,true),group=await db.prepare("SELECT * FROM admin_records WHERE id=? AND kind='employee_group' AND archived=0").bind(id).first<GenericRow&{version:number}>();
      if(!group)throw new HttpError(404,"Группа не найдена");if(!["owner","director"].includes(actor.role)&&group.created_by!==actor.id)throw new HttpError(403,"Изменять группу может создатель или директор");
      if(Number(body.version)!==Number(group.version))throw new HttpError(409,"Группа уже изменена. Обновите данные.");
      if(action==="archive_group"){await db.batch([db.prepare("UPDATE admin_records SET archived=1,status='archived',updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=?").bind(actor.id,id,group.version),auditStatement(actor,"Архивирована группа",id)]);return Response.json({ok:true});}
      const title=cleanText(body.title,120,true),description=cleanText(body.description??"",600),members=Array.isArray(body.members)?Array.from(new Set(body.members.map(value=>cleanText(value,100)).filter(Boolean))).slice(0,100):[];if(!members.includes(actor.id))members.push(actor.id);
      const valid=await db.prepare(`SELECT id FROM staff WHERE active=1 AND id IN (${members.map(()=>"?").join(",")})`).bind(...members).all<{id:string}>();if(valid.results.length!==members.length)throw new HttpError(400,"В группе есть недоступный сотрудник");
      await db.batch([db.prepare("UPDATE admin_records SET title=?,subtitle=?,data_json=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND version=?").bind(title,description,JSON.stringify({members,description,linkedEntityType:cleanText(body.linkedEntityType??"",40),linkedEntityId:cleanText(body.linkedEntityId??"",100)}),actor.id,id,group.version),auditStatement(actor,"Обновлена группа",id,title)]);return Response.json({ok:true});
    }
    if(action==="notification_read"){
      const id=cleanText(body.id??"",100);if(id)await db.prepare("UPDATE notifications_v2 SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=? AND recipient_id=?").bind(id,actor.id).run();else await db.prepare("UPDATE notifications_v2 SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE recipient_id=? AND archived=0").bind(actor.id).run();return Response.json({ok:true});
    }
    throw new HttpError(400,"Неизвестное действие");
  }catch(error){return fail(error)}
}
