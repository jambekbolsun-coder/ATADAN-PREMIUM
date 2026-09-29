import { authenticateStaff, createStaffSession, getActor, revokeStaffSession } from "../../../lib/admin-auth";
import { ensureDb, getRawDb } from "../../../../db";
import { cleanText, digest, fail, HttpError, jsonBody, rateLimit, sameOrigin } from "../../../lib/security";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  try { const actor = await getActor(request); return Response.json({authenticated:!!actor, actor}, {headers:{"Cache-Control":"no-store"}}); } catch(e) { return fail(e); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request); const body = await jsonBody(request, 5000); await ensureDb();
    const username = cleanText(body.username, 200, true).toLowerCase();
    if (typeof body.password !== "string" || body.password.length < 1 || body.password.length > 128) throw new HttpError(400, "Проверьте пароль");
    const password = body.password;
    const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    await rateLimit(`login-ip:${ip}`, 30, 900);
    await rateLimit(`login:${ip}:${username}`, 8, 900);
    const actor = await authenticateStaff(username, password, request);
    if (!actor) {
      await getRawDb().prepare("INSERT INTO auth_events(id,identifier,event_type,ip_hash,user_agent) VALUES(?,?,'login_failed',?,?)").bind(crypto.randomUUID(),username,await digest(ip),request.headers.get("user-agent")?.slice(0,500)??"").run();
      throw new HttpError(401, "Неверный логин или пароль");
    }
    return Response.json({ authenticated:true }, {headers:{"Set-Cookie":await createStaffSession(actor, request),"Cache-Control":"no-store"}});
  } catch(e) {
    if (!(e instanceof HttpError) || e.status >= 500) {
      const error=e as Error & {code?:string};
      console.error("[admin/session] login failed", {name:error?.name,message:error?.message,code:error?.code});
    }
    return fail(e);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request); await ensureDb(); await revokeStaffSession(request);
    const response=NextResponse.json({authenticated:false},{headers:{"Cache-Control":"no-store"}}),secure=new URL(request.url).protocol==="https:";
    response.cookies.set("atadan_staff","",{path:"/",httpOnly:true,sameSite:"strict",secure,maxAge:0,expires:new Date(0)});
    response.cookies.set("atadan_admin","",{path:"/",httpOnly:true,sameSite:"strict",secure,maxAge:0,expires:new Date(0)});
    return response;
  } catch(e) {return fail(e);}
}
