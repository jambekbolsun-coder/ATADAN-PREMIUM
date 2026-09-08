import { authenticateStaff, clearAdminCookie, createStaffSession, getActor, revokeStaffSession } from "../../../lib/admin-auth";
import { ensureDb } from "../../../../db";
import { cleanText, fail, HttpError, jsonBody, rateLimit, sameOrigin } from "../../../lib/security";
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
    if (!actor) throw new HttpError(401, "Неверный логин или пароль");
    return Response.json({ authenticated:true }, {headers:{"Set-Cookie":await createStaffSession(actor, request),"Cache-Control":"no-store"}});
  } catch(e) { return fail(e); }
}
export async function DELETE(request: Request) {
  try { sameOrigin(request); await ensureDb(); const headers = new Headers({"Cache-Control":"no-store"}); headers.append("Set-Cookie",await revokeStaffSession(request)); headers.append("Set-Cookie",clearAdminCookie()); return Response.json({authenticated:false},{headers}); } catch(e) {return fail(e);}
}
