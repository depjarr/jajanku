/**
 * Tampilkan notifikasi. Di Android (termasuk aplikasi yang dipasang dari Chrome)
 * `new Notification()` tidak didukung, jadi pakai service worker bila ada.
 */
export async function showNotice(title: string, options: NotificationOptions & { url?: string } = {}) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const { url = "/", ...rest } = options;
  const opts: NotificationOptions = { icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", ...rest, data: { url } };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, opts);
      return true;
    }
    new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}
