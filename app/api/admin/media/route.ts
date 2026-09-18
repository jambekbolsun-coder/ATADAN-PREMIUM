import { put } from "@vercel/blob";
import { requireActor } from "../../../lib/admin-auth";
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
    const key = `admin/${actor.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    });
    return Response.json({ url: blob.url, uploadedBy: actor.id });
  } catch (error) {
    return fail(error);
  }
}
