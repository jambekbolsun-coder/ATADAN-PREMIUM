import { getRawDb } from "../../../../db";
import { get, put } from "@vercel/blob";
import { canUseSection, requireActor } from "../../../lib/admin-auth";
import { fail, HttpError, sameOrigin } from "../../../lib/security";

const contentTypes = new Map([
  ["audio/webm", "webm"], ["audio/ogg", "ogg"], ["audio/mp4", "m4a"], ["audio/mpeg", "mp3"], ["audio/wav", "wav"],
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
    if (length > 4_100_000) throw new HttpError(413, "Файл должен быть не больше 4 МБ");
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Выберите изображение");
    const extension = contentTypes.get(file.type.split(";")[0]);
    if (!extension) throw new HttpError(415, "Поддерживаются изображения, PDF, CSV, XLSX и DOCX");
    if (!file.size || file.size > 4_000_000) throw new HttpError(413, "Файл должен быть не больше 4 МБ");
    const visibility = data.get("visibility") === "private" ? "private" : "public";
    const scope=String(data.get("scope")||"documents");
    if(!["documents","shipments","expenses","chat"].includes(scope))throw new HttpError(400,"Неизвестный раздел загрузки");
    if (visibility === "private" && !canUseSection(actor, scope)) throw new HttpError(403, "Нет доступа к загрузке файлов");
    if (visibility === "public" && !file.type.startsWith("image/")) throw new HttpError(400, "Документы можно загружать только в защищённом разделе документов");
    const key = `${visibility === "private" ? "admin-private" : "admin-public"}/${actor.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const blob = await put(key, file, {
      access: visibility,
      token: visibility === "private" ? process.env.ATADAN_PRIVATE_READ_WRITE_TOKEN : process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      contentType: file.type,
    });
    if(visibility==="private")await getRawDb().prepare("INSERT INTO uploads_v3(key,uploaded_by,scope,content_type,size) VALUES(?,?,?,?,?)").bind(blob.pathname,actor.id,scope,file.type.split(";")[0],file.size).run();
    const url = visibility === "private" ? `/api/admin/media?key=${encodeURIComponent(blob.pathname)}` : blob.url;
    return Response.json({ url, visibility, uploadedBy: actor.id });
  } catch (error) {
    if(!(error instanceof HttpError))console.error("Media failure",error);
    return fail(error);
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireActor(request);
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if (!key.startsWith("admin-private/") || !/^[a-zA-Z0-9/_-]+\.[a-z0-9]+$/.test(key)) throw new HttpError(400, "Некорректная ссылка на документ");
    const upload=await getRawDb().prepare("SELECT uploaded_by,scope FROM uploads_v3 WHERE key=?").bind(key).first<{uploaded_by:string;scope:string}>();
    if(upload?.scope==="chat"){
      if(!canUseSection(actor,"chat"))throw new HttpError(403,"Нет доступа к чату");
      if(upload.uploaded_by!==actor.id){const url=`/api/admin/media?key=${encodeURIComponent(key)}`;const allowed=await getRawDb().prepare("SELECT m.id FROM messages_v2 m JOIN conversations_v2 c ON c.id=m.conversation_id AND c.archived=0 JOIN conversation_members_v2 cm ON cm.conversation_id=c.id AND cm.staff_id=? AND cm.archived_at IS NULL WHERE m.archived=0 AND EXISTS(SELECT 1 FROM jsonb_array_elements(m.attachments_json::jsonb) attachment WHERE attachment->>'url'=?) LIMIT 1").bind(actor.id,url).first();if(!allowed)throw new HttpError(403,"Нет доступа к вложению");}
    }else if(!canUseSection(actor,upload?.scope||"documents"))throw new HttpError(403,"Нет доступа к документу");
    const blob = await get(key, { access: "private", useCache: false, token: process.env.ATADAN_PRIVATE_READ_WRITE_TOKEN });
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
    if(!(error instanceof HttpError))console.error("Media failure",error);
    return fail(error);
  }
}
