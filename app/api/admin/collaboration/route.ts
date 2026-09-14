import { getRawDb } from "../../../../db";
import { requireActor } from "../../../lib/admin-auth";
import { auditStatement } from "../../../lib/crm";
import { cleanText, fail, HttpError, jsonBody, sameOrigin } from "../../../lib/security";

type GenericRow={id:string;title:string;subtitle:string;status:string;data_json:string;created_by:string;created_at:string;updated_at:string};
const parse=(value:string)=>{try{return JSON.parse(value) as Record<string,unknown>}catch{return {}}};

export async function GET(request:Request){
  try{
    const actor=await requireActor(request),db=getRawDb(),owner=["owner","director"].includes(actor.role);
    const [staff,messages,groups,leads,tasks,audit]=await Promise.all([
      db.prepare("SELECT id,display_name,email,role,avatar,active FROM staff WHERE active=1 ORDER BY display_name").all(),
      db.prepare("SELECT * FROM admin_records WHERE kind='employee_message' AND archived=0 ORDER BY created_at DESC LIMIT 300").all<GenericRow>(),
      db.prepare("SELECT * FROM admin_records WHERE kind='employee_group' AND archived=0 ORDER BY updated_at DESC LIMIT 100").all<GenericRow>(),
      db.prepare("SELECT id,name,phone,tractor_slug,status,created_at FROM leads ORDER BY created_at DESC LIMIT 40").all(),
      db.prepare(`SELECT t.id,t.title,t.due_at,t.done,t.assigned_to,s.display_name FROM crm_tasks t LEFT JOIN staff s ON s.id=t.assigned_to ${owner?"":"WHERE t.assigned_to=?"} ORDER BY t.created_at DESC LIMIT 60`).bind(...(owner?[]:[actor.id])).all(),
      db.prepare(`SELECT a.id,a.action,a.detail,a.created_at,s.display_name FROM audit_logs a LEFT JOIN staff s ON s.id=a.actor_id ${owner?"":"WHERE a.actor_id=?"} ORDER BY a.created_at DESC LIMIT 60`).bind(...(owner?[]:[actor.id])).all(),
    ]);
    const groupRows=groups.results.map(row=>({...row,data:parse(row.data_json)}));
    const allowedGroups=new Set(groupRows.filter(row=>owner||row.created_by===actor.id||Array.isArray(row.data.members)&&row.data.members.includes(actor.id)).map(row=>row.id));
    const messageRows=messages.results.map(row=>({...row,data:parse(row.data_json)})).filter(row=>owner||row.created_by===actor.id||row.data.to===actor.id||(typeof row.data.groupId==="string"&&allowedGroups.has(row.data.groupId)));
    return Response.json({actor,staff:staff.results,groups:groupRows,messages:messageRows,notifications:{leads:leads.results,tasks:tasks.results,audit:audit.results}},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return fail(error)}
}

export async function POST(request:Request){
  try{
    sameOrigin(request);const actor=await requireActor(request),body=await jsonBody(request,30_000),db=getRawDb(),action=cleanText(body.action,30,true);
    if(action==="send_message"){
      const text=cleanText(body.text,4000,true),to=cleanText(body.to??"",100),groupId=cleanText(body.groupId??"",100);
      if(!to&&!groupId)throw new HttpError(400,"Выберите сотрудника или группу");
      if(to&&!await db.prepare("SELECT id FROM staff WHERE id=? AND active=1").bind(to).first())throw new HttpError(400,"Сотрудник недоступен");
      if(groupId&&!await db.prepare("SELECT id FROM admin_records WHERE id=? AND kind='employee_group' AND archived=0").bind(groupId).first())throw new HttpError(400,"Группа не найдена");
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
    throw new HttpError(400,"Неизвестное действие");
  }catch(error){return fail(error)}
}
