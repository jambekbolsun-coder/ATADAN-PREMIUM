import { adminCookie, clearAdminCookie, isAdmin, verifyCredentials } from "../../../lib/admin-auth";

export async function GET(request: Request) {
  return Response.json({ authenticated: await isAdmin(request) });
}

export async function POST(request: Request) {
  const { username, password } = await request.json() as { username?: string; password?: string };
  if (!username || !password || !(await verifyCredentials(username, password, request))) {
    return Response.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }
  const secure = new URL(request.url).protocol === "https:";
  return Response.json({ authenticated: true }, { headers: { "Set-Cookie": await adminCookie(username, password, secure) } });
}

export async function DELETE() {
  return Response.json({ authenticated: false }, { headers: { "Set-Cookie": clearAdminCookie() } });
}
