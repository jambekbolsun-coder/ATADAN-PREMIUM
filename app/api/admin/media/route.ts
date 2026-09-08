import { env } from "cloudflare:workers";
import { requireActor } from "../../../lib/admin-auth";
import { fail, HttpError, sameOrigin } from "../../../lib/security";

const contentTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const actor = await requireActor(request, true);
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 9_000_000) throw new HttpError(413, "Изображение должно быть меньше 8 МБ");
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Выберите изображение");
    const extension = contentTypes.get(file.type);
    if (!extension) throw new HttpError(415, "Поддерживаются JPG, PNG, WEBP и AVIF");
    if (!file.size || file.size > 8_000_000) throw new HttpError(413, "Изображение должно быть меньше 8 МБ");
    const key = `banners/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    await env.MEDIA.put(key, file.stream(), {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { uploadedBy: actor.id },
    });
    return Response.json({ url: `/api/media/${key}` });
  } catch (error) {
    return fail(error);
  }
}
