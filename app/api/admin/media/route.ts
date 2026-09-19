import { get, put } from "@vercel/blob";
import { canUseSection, requireActor } from "../../../lib/admin-auth";
import { fail, HttpError, sameOrigin } from "../../../lib/security";

const contentTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["application/pdf", "pdf"],
  ["text/csv", "csv"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
]);

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const actor = await requireActor(request);
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 21_000_000) throw new HttpError(413, "Файл должен быть меньше 20 МБ");
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Выберите изображение");
    const extension = contentTypes.get(file.type);
    if (!extension) throw new HttpError(415, "Поддерживаются изображения, PDF, CSV, XLSX и DOCX");
    if (!file.size || file.size > 20_000_000) throw new HttpError(413, "Файл должен быть меньше 20 МБ");
    const visibility = data.get("visibility") === "private" ? "private" : "public";
    if (visibility === "private" && !canUseSection(actor, "documents")) throw new HttpError(403, "Нет доступа к загрузке документов");
    if (visibility === "public" && !file.type.startsWith("image/")) throw new HttpError(400, "Документы можно загружать только в защищённом разделе документов");
    const key = `${visibility === "private" ? "admin-private" : "admin-public"}/${actor.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const blob = await put(key, file, {
      access: visibility,
      addRandomSuffix: false,
      contentType: file.type,
    });
    const url = visibility === "private" ? `/api/admin/media?key=${encodeURIComponent(blob.pathname)}` : blob.url;
    return Response.json({ url, visibility, uploadedBy: actor.id });
  } catch (error) {
    return fail(error);
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    if (!canUseSection(actor, "documents")) throw new HttpError(403, "Нет доступа к документам");
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if (!key.startsWith("admin-private/") || !/^[a-zA-Z0-9/_-]+\.[a-z0-9]+$/.test(key)) throw new HttpError(400, "Некорректная ссылка на документ");
    const blob = await get(key, { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200 || !blob.stream) throw new HttpError(404, "Документ не найден");
    return new Response(blob.stream, { headers: {
      "Content-Type": blob.blob.contentType || "application/octet-stream",
      "Content-Length": String(blob.blob.size),
      "Content-Disposition": `inline; filename="${key.split("/").pop()}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch (error) {
    return fail(error);
  }
}
