import { list } from "@vercel/blob";

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await context.params;
  const key = segments.join("/");
  if (!/^banners\/[a-z0-9-]+\.(?:jpg|png|webp|avif)$/.test(key)) return new Response("Not found", { status: 404 });
  const result = await list({ prefix: key, limit: 10 });
  const object = result.blobs.find((blob) => blob.pathname === key);
  if (!object) return new Response("Not found", { status: 404 });
  return Response.redirect(object.url, 307);
}
