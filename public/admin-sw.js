const CACHE="atadan-admin-v1";
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(["/admin","/icons/atadan-app-192.png","/icons/atadan-app-512.png","/admin/manifest.webmanifest"]))));
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("fetch",event=>{const url=new URL(event.request.url);if(event.request.method!=="GET"||url.origin!==location.origin||!url.pathname.startsWith("/admin"))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(response=>response||caches.match("/admin").then(fallback=>fallback||Response.error()))))});
