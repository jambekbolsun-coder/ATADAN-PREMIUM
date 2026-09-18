import { getRawDb } from "../../../../db";
import { authenticateStaff, hashPassword, requireActor } from "../../../lib/admin-auth";
import { cleanText, digest, fail, HttpError, jsonBody, sameOrigin } from "../../../lib/security";

function rawStaffToken(request:Request){return request.headers.get("cookie")?.split(";").map(value=>value.trim()).find(value=>value.startsWith("atadan_staff="))?.slice("atadan_staff=".length)??"";}

export async function GET(request:Request){
  try{
    const actor=await requireActor(request),db=getRawDb(),token=rawStaffToken(request),currentHash=token?await digest(token):"";
    const [sessions,events]=await Promise.all([
      db.prepare("SELECT id,token_hash,created_at,last_seen_at,expires_at,user_agent,ip_hash FROM staff_sessions WHERE staff_id=? AND expires_at>? ORDER BY created_at DESC").bind(actor.id,Math.floor(Date.now()/1000)).all(),
      db.prepare("SELECT id,event_type,created_at,user_agent,ip_hash FROM auth_events WHERE staff_id=? ORDER BY created_at DESC LIMIT 50").bind(actor.id).all(),
    ]);
    return Response.json({sessions:sessions.results.map(row=>({id:row.id,created_at:row.created_at,last_seen_at:row.last_seen_at,expires_at:row.expires_at,user_agent:row.user_agent,ip_hint:String(row.ip_hash??"").slice(0,10),current:row.token_hash===currentHash})),events:events.results},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return fail(error)}
}

export async function POST(request:Request){
  try{
    sameOrigin(request);const actor=await requireActor(request),body=await jsonBody(request,10_000),action=cleanText(body.action,30,true),db=getRawDb(),token=rawStaffToken(request),currentHash=token?await digest(token):"";
    if(action==="change_password"){
      const current=typeof body.currentPassword==="string"?body.currentPassword:"",next=typeof body.newPassword==="string"?body.newPassword:"";
      if(!await authenticateStaff(actor.email,current,request))throw new HttpError(401,"Текущий пароль указан неверно");
      if(["owner","director"].includes(actor.role)&&next.length<12)throw new HttpError(400,"Для владельца и директора пароль должен содержать не менее 12 символов");
      const derived=await hashPassword(next);
      await db.batch([db.prepare("UPDATE staff SET password_hash=?,salt=? WHERE id=?").bind(derived.hash,derived.salt,actor.id),db.prepare("DELETE FROM staff_sessions WHERE staff_id=? AND token_hash<>?").bind(actor.id,currentHash),db.prepare("INSERT INTO auth_events(id,staff_id,identifier,event_type) VALUES(?,?,?,'password_changed')").bind(crypto.randomUUID(),actor.id,actor.email)]);
      return Response.json({ok:true});
    }
    if(action==="revoke_session"){
      const id=cleanText(body.id,100,true),session=await db.prepare("SELECT token_hash FROM staff_sessions WHERE id=? AND staff_id=?").bind(id,actor.id).first<{token_hash:string}>();if(!session)throw new HttpError(404,"Сессия не найдена");if(session.token_hash===currentHash)throw new HttpError(409,"Текущую сессию завершите кнопкой выхода");
      await db.batch([db.prepare("DELETE FROM staff_sessions WHERE id=? AND staff_id=?").bind(id,actor.id),db.prepare("INSERT INTO auth_events(id,staff_id,identifier,event_type) VALUES(?,?,?,'session_revoked')").bind(crypto.randomUUID(),actor.id,actor.email)]);return Response.json({ok:true});
    }
    if(action==="revoke_others"){
      await db.batch([db.prepare("DELETE FROM staff_sessions WHERE staff_id=? AND token_hash<>?").bind(actor.id,currentHash),db.prepare("INSERT INTO auth_events(id,staff_id,identifier,event_type) VALUES(?,?,?,'sessions_revoked')").bind(crypto.randomUUID(),actor.id,actor.email)]);return Response.json({ok:true});
    }
    if(action==="create_reset"){
      if(!["owner","director"].includes(actor.role))throw new HttpError(403,"Восстановление сотрудника доступно директору");const staffId=cleanText(body.staffId,100,true),target=await db.prepare("SELECT id,email,role FROM staff WHERE id=? AND active=1").bind(staffId).first<{id:string;email:string;role:string}>();if(!target)throw new HttpError(404,"Сотрудник не найден");if(target.role==="owner"&&actor.role!=="owner")throw new HttpError(403,"Только владелец может восстановить доступ владельца");
      const raw=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,"0")).join(""),hash=await digest(raw);await db.batch([db.prepare("DELETE FROM password_reset_tokens WHERE staff_id=? OR expires_at<?").bind(staffId,Math.floor(Date.now()/1000)),db.prepare("INSERT INTO password_reset_tokens(token_hash,staff_id,expires_at) VALUES(?,?,?)").bind(hash,staffId,Math.floor(Date.now()/1000)+1800),db.prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id,detail) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),actor.id,"Создано восстановление доступа",staffId,target.email)]);
      return Response.json({url:`${new URL(request.url).origin}/admin/reset?token=${raw}`});
    }
    throw new HttpError(400,"Неизвестное действие");
  }catch(error){return fail(error)}
}
