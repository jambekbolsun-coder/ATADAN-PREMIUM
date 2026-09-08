import { getRawDb } from "../../../../db";
import { requireActor } from "../../../lib/admin-auth";
import { auditStatement } from "../../../lib/crm";
import { cleanText, digest, fail, HttpError, jsonBody, sameOrigin } from "../../../lib/security";
export async function POST(request:Request){
  try{
    sameOrigin(request);const actor=await requireActor(request,true),body=await jsonBody(request,5000),db=getRawDb();
    const email=cleanText(body.email,200,true).toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,"Укажите email менеджера");
    if(await db.prepare("SELECT id FROM staff WHERE email=?").bind(email).first())throw new HttpError(409,"Сотрудник с таким email уже существует");
    const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
    const hash=await digest(token), expires=Math.floor(Date.now()/1000)+86400;
    await db.batch([db.prepare("UPDATE staff_invites SET revoked=1 WHERE email=? AND used_at IS NULL").bind(email),db.prepare("INSERT INTO staff_invites(token_hash,email,created_by,expires_at) VALUES(?,?,?,?)").bind(hash,email,actor.id,expires),auditStatement(actor,"invite_manager",email)]);
    // The token stays in a URL fragment, not request logs or referrer headers.
    return Response.json({url:`${new URL(request.url).origin}/admin/join#${token}`,expiresAt:new Date(expires*1000).toISOString()},{status:201,headers:{"Cache-Control":"no-store"}});
  }catch(e){return fail(e);}
}
