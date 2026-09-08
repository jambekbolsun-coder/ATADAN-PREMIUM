import { ensureDb,getRawDb } from "../../../../db";
import { hashPassword } from "../../../lib/admin-auth";
import { cleanText,digest,fail,HttpError,jsonBody,rateLimit,sameOrigin } from "../../../lib/security";
export async function POST(request:Request){
  try{
    sameOrigin(request);await ensureDb();const b=await jsonBody(request,5000),db=getRawDb();
    await rateLimit(`join:${request.headers.get("cf-connecting-ip")||"local"}`,10,900);
    const token=cleanText(b.token,64,true);if(!/^[a-f0-9]{64}$/.test(token))throw new HttpError(400,"Недействительное приглашение");
    const hash=await digest(token),now=Math.floor(Date.now()/1000);
    const invite=await db.prepare("SELECT email FROM staff_invites WHERE token_hash=? AND used_at IS NULL AND revoked=0 AND expires_at>?").bind(hash,now).first<{email:string}>();
    if(!invite)throw new HttpError(410,"Приглашение истекло или уже использовано. Попросите новое у управляющего.");
    if(b.action==="inspect")return Response.json({email:invite.email},{headers:{"Cache-Control":"no-store"}});
    const name=cleanText(b.name,120,true);
    if(typeof b.password!=="string")throw new HttpError(400,"Проверьте пароль");
    const password=b.password,derived=await hashPassword(password),id=crypto.randomUUID();
    if(await db.prepare("SELECT id FROM staff WHERE email=?").bind(invite.email).first())throw new HttpError(409,"Аккаунт уже существует");
    const result=await db.batch([
      db.prepare("INSERT INTO staff(id,email,display_name,password_hash,salt,role) SELECT ?,email,?,?,?,'manager' FROM staff_invites WHERE token_hash=? AND used_at IS NULL AND revoked=0 AND expires_at>?").bind(id,name,derived.hash,derived.salt,hash,now),
      db.prepare("UPDATE staff_invites SET used_at=CURRENT_TIMESTAMP WHERE token_hash=? AND EXISTS(SELECT 1 FROM staff WHERE id=?)").bind(hash,id),
      db.prepare("INSERT INTO audit_logs(id,actor_id,action,entity_id) SELECT ?,?,'manager_joined',? WHERE EXISTS(SELECT 1 FROM staff WHERE id=?)").bind(crypto.randomUUID(),id,id,id),
    ]);
    if(!result[0].meta.changes)throw new HttpError(410,"Приглашение уже использовано");
    return Response.json({ok:true,email:invite.email},{status:201});
  }catch(e){return fail(e);}
}
