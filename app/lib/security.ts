import { getRawDb } from "../../db";
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Запрос с другого сайта запрещён");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new HttpError(403, "Запрос с другого сайта запрещён");
}
export async function jsonBody(request: Request, limit = 150_000): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError(415, "Ожидается JSON");
  if (Number(request.headers.get("content-length") || 0) > limit) throw new HttpError(413, "Слишком большой запрос");
  const text = await request.text();
  if (text.length > limit) throw new HttpError(413, "Слишком большой запрос");
  try { const value = JSON.parse(text); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(); return value; }
  catch { throw new HttpError(400, "Некорректный запрос"); }
}
export function cleanText(value: unknown, max = 200, required = false) {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new HttpError(400, "Проверьте обязательные поля и длину текста");
  return value.trim();
}
export function safeMedia(value: unknown, optional = false) {
  if (optional && (value === null || value === undefined || value === "")) return "";
  const url = cleanText(value, 2000, true);
  if (url.startsWith("/images/") || url.startsWith("/api/media/")) return url;
  try { if (new URL(url).protocol === "https:") return url; } catch { /* Invalid URL. */ }
  throw new HttpError(400, "Изображение или видео должно иметь HTTPS-ссылку");
}
export async function digest(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), b => b.toString(16).padStart(2, "0")).join(""); }
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const id = await digest(`${key}:${bucket}`);
  const row = await getRawDb().prepare(`INSERT INTO request_limits (id, hits, expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1 RETURNING hits`).bind(id, (bucket + 1) * windowSeconds).first<{hits:number}>();
  if ((row?.hits ?? 0) > max) throw new HttpError(429, "Слишком много попыток. Подождите несколько минут.");
}
export function fail(error: unknown) {
  return Response.json({ error: error instanceof HttpError ? error.message : "Не удалось выполнить действие. Попробуйте ещё раз." }, { status: error instanceof HttpError ? error.status : 500 });
}
