"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Daftarkan service worker (hanya di production supaya tidak mengganggu dev server). */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

const noop = () => () => {};

/** Tombol "Pasang aplikasi". Android/desktop: prompt bawaan. iPhone: petunjuk manual. */
export function InstallButton() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [done, setDone] = useState(false);
  const standalone = useSyncExternalStore(
    noop,
    () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false,
  );
  const ios = useSyncExternalStore(noop, () => /iphone|ipad|ipod/i.test(navigator.userAgent), () => false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => setDone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || done) return <p className="px-4 py-3.5 text-sm text-muted">Jajanku sudah terpasang di perangkat ini.</p>;

  if (evt) {
    return (
      <button
        type="button"
        onClick={async () => {
          await evt.prompt();
          const { outcome } = await evt.userChoice;
          if (outcome === "accepted") setDone(true);
          setEvt(null);
        }}
        className="press flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-ink">
          <Download className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Pasang aplikasi</span>
          <span className="block truncate text-xs text-muted">Buka Jajanku langsung dari layar utama</span>
        </span>
      </button>
    );
  }

  if (ios) {
    return (
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-ink">
          <Share className="size-5" aria-hidden />
        </span>
        <p className="text-sm">
          <span className="block font-semibold">Pasang di iPhone</span>
          <span className="text-muted">
            Di Safari, ketuk <strong>Bagikan</strong> lalu <strong>Tambah ke Layar Utama</strong>.
          </span>
        </p>
      </div>
    );
  }

  return null;
}
