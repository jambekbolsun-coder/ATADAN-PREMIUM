import sharp from "sharp";
import type { NextRequest } from "next/server";

/**
 * Фото трактора для карточек: обрезает пустые поля вокруг машины и уменьшает до нужной ширины.
 * Принимает только фото сайта (/images/...) и загрузки из админки (Vercel Blob), чтобы через
 * этот адрес нельзя было скачивать чужие картинки.
 */
const WIDTHS = [256, 384, 480, 640, 828, 1080, 1280];
const MAX_BYTES = 15 * 1024 * 1024;
const REMOTE_HOSTS = [/\.public\.blob\.vercel-storage\.com$/, /^en\.changfanz\.com$/];

function sourceUrl(src: string, origin: string): URL | null {
  if (src.startsWith("/images/") && !src.includes("..") && !src.includes("\\")) return new URL(src, origin);
  try {
    const url = new URL(src);
    if (url.protocol !== "https:" || !REMOTE_HOSTS.some((host) => host.test(url.hostname))) return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src") ?? "";
  const asked = Number(request.nextUrl.searchParams.get("w")) || 640;
  const width = WIDTHS.find((value) => value >= asked) ?? WIDTHS[WIDTHS.length - 1];
  const url = sourceUrl(src, request.nextUrl.origin);
  if (!url) return new Response("Bad source", { status: 400 });

  const upstream = await fetch(url, { cache: "force-cache" }).catch(() => null);
  if (!upstream?.ok) return Response.redirect(url, 302);
  const length = Number(upstream.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return Response.redirect(url, 302);
  const input = Buffer.from(await upstream.arrayBuffer());
  if (input.byteLength > MAX_BYTES) return Response.redirect(url, 302);

  try {
    const meta = await sharp(input).metadata();
    // Прозрачный фон обрезаем по прозрачности, белый фон по цвету углов.
    const trimmed = await sharp(input).trim({ threshold: meta.hasAlpha ? 8 : 22 }).toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = trimmed.info;
    // Небольшой воздух вокруг машины, чтобы тень и колёса не упирались в край.
    const pad = Math.round(Math.max(w, h) * 0.03);
    // sharp всегда делает extend после resize, поэтому поля добавляем отдельным шагом.
    const framed = await sharp(trimmed.data)
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background: meta.hasAlpha ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();
    const output = await sharp(framed)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return new Response(new Uint8Array(output), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch {
    return Response.redirect(url, 302);
  }
}
