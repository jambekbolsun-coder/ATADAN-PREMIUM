/** Манифест открыт без входа: иначе телефон не может установить приложение. Данных в нём нет. */
const manifest = {
  name: "ATADAN",
  short_name: "ATADAN",
  description: "Рабочее приложение ATADAN",
  lang: "ru",
  id: "/admin",
  start_url: "/admin",
  scope: "/admin",
  display: "standalone",
  background_color: "#071c10",
  theme_color: "#0b2e1f",
  icons: [
    { src: "/icons/atadan-app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/atadan-app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/atadan-app-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export function GET() {
  return new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
