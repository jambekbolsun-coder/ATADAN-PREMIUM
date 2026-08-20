import { env } from "cloudflare:workers";

const COOKIE_NAME = "atadan_admin";

function runtimePassword() {
  return (env as unknown as Record<string, string | undefined>).ADMIN_PASSWORD ?? "";
}

function runtimeUsername() {
  return (env as unknown as Record<string, string | undefined>).ADMIN_USERNAME ?? "atadan";
}

async function sessionToken(username: string, password: string) {
  const bytes = new TextEncoder().encode(`atadan-admin:${username}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyCredentials(username: string, password: string, request: Request) {
  const expectedPassword = runtimePassword() || (new URL(request.url).hostname === "localhost" ? "atadan-preview" : "");
  const expectedUsername = runtimeUsername();
  if (!expectedPassword) return false;
  const [supplied, expected] = await Promise.all([
    sessionToken(username.trim().toLowerCase(), password),
    sessionToken(expectedUsername.trim().toLowerCase(), expectedPassword),
  ]);
  return supplied === expected;
}

export async function isAdmin(request: Request) {
  const password = runtimePassword() || (new URL(request.url).hostname === "localhost" ? "atadan-preview" : "");
  if (!password) return false;
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.split("=")[1];
  return token === await sessionToken(runtimeUsername().trim().toLowerCase(), password);
}

export async function adminCookie(username: string, password: string, secure = true) {
  const token = await sessionToken(username.trim().toLowerCase(), password);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure ? "; Secure" : ""}`;
}

export function clearAdminCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
