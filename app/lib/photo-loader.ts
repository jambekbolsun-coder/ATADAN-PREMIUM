import type { ImageLoaderProps } from "next/image";

/** Адрес фото трактора без пустых полей (см. app/api/photo/route.ts). */
export function tractorPhotoLoader({ src, width }: ImageLoaderProps) {
  return `/api/photo?v=2&src=${encodeURIComponent(src)}&w=${width}`;
}

/** Обрезать можно только фото сайта и загрузки из админки. */
export function canTrimPhoto(src: string) {
  return src.startsWith("/images/") || /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(src) || src.startsWith("https://en.changfanz.com/");
}
