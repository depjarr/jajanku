// Service worker minimal Jajanku: membuat aplikasi bisa dipasang (PWA).
// Sengaja TIDAK menyimpan cache halaman supaya data jajan selalu terbaru dan privat.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
