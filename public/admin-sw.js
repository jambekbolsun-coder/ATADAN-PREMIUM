/* Service worker админки ATADAN. Страницы с данными и файлы не сохраняются на телефоне: только экран «нет связи». */
const OFFLINE_PAGE = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Нет связи</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#071c10;color:#e9f5ee;font:16px system-ui,sans-serif;text-align:center;padding:24px">
<div><h1 style="font-size:20px;margin:0 0 8px">Нет связи</h1><p style="margin:0 0 16px;opacity:.75">Проверьте интернет и попробуйте ещё раз.</p>
<button onclick="location.reload()" style="padding:12px 20px;border:0;border-radius:12px;background:#79c94b;color:#071c10;font:inherit;font-weight:600">Повторить</button></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("atadan-admin-")).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => new Response(OFFLINE_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
