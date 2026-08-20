import { adminCookie, clearAdminCookie, isAdmin, verifyPassword } from "../../../lib/admin-auth";

export async function GET(request: Request) {
  return Response.json({ authenticated: await isAdmin(request) });
}

export async function POST(request: Request) {
  const { password } = await request.json() as { password?: string };
  if (!password || !(await verifyPassword(password, request))) {
    return Response.json({ error: "Неверный пароль" }, { status: 401 });
  }
  const secure = new URL(request.url).protocol === "https:";
  return Response.json({ authenticated: true }, { headers: { "Set-Cookie": await adminCookie(password, secure) } });
}

export async function DELETE() {
  return Response.json({ authenticated: false }, { headers: { "Set-Cookie": clearAdminCookie() } });
}
