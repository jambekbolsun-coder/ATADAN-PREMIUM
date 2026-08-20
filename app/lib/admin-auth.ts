import { env } from "cloudflare:workers";

const COOKIE_NAME = "atadan_admin";

function runtimePassword() {
  return (env as unknown as Record<string, string | undefined>).ADMIN_PASSWORD ?? "";
}

async function sessionToken(password: string) {
  const bytes = new TextEncoder().encode(`atadan-admin:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, request: Request) {
  const expected = runtimePassword() || (new URL(request.url).hostname === "localhost" ? "atadan-preview" : "");
  if (!expected) return false;
  const [a, b] = await Promise.all([sessionToken(password), sessionToken(expected)]);
  return a === b;
}

export async function isAdmin(request: Request) {
  const password = runtimePassword() || (new URL(request.url).hostname === "localhost" ? "atadan-preview" : "");
  if (!password) return false;
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.split("=")[1];
  return token === await sessionToken(password);
}

export async function adminCookie(password: string, secure = true) {
  const token = await sessionToken(password);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure ? "; Secure" : ""}`;
}

export function clearAdminCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
