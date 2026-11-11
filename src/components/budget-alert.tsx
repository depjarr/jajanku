"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { rupiah } from "@/lib/types";
import { softSpring } from "@/components/ui/haptic";

type Level = "warn" | "over";

const noopSubscribe = () => () => {};

function storageGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/**
 * Pengingat budget: banner di Meja saat pemakaian ≥ 80% atau lewat budget,
 * plus notifikasi browser sekali per level per bulan (bila diizinkan).
 */
export function BudgetAlert({ total, budget, monthKey }: { total: number; budget: number | null; monthKey: string }) {
  const level: Level | null = !budget ? null : total > budget ? "over" : total >= budget * 0.8 ? "warn" : null;
  const key = `jajanku:budget-alert:${monthKey}:${level}`;
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (!level || !budget) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (storageGet(key)) return;
    storageSet(key, "1");
    const body =
      level === "over"
        ? `Jajan bulan ini ${rupiah(total)}, lewat ${rupiah(total - budget)} dari budget.`
        : `Jajan bulan ini sudah ${Math.round((total / budget) * 100)}% dari budget ${rupiah(budget)}.`;
    try {
      new Notification(level === "over" ? "Budget jajan terlewati" : "Budget jajan hampir habis", { body, icon: "/icons/icon-192.png", tag: key });
    } catch {}
  }, [level, budget, total, key]);

  const closedBefore = useSyncExternalStore(noopSubscribe, () => storageGet(`${key}:closed`) === "1", () => false);
  const show = level && budget && dismissed !== key && !closedBefore;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -12, height: 0 }}
          transition={softSpring}
          className="overflow-hidden"
        >
          <div
            role="status"
            className={`mb-4 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${level === "over" ? "bg-accent/30" : "bg-[#FFF2C6]"}`}
          >
            <motion.span className="mt-0.5 text-ink" animate={{ rotate: [0, -12, 12, -8, 0] }} transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2.5 }} aria-hidden>
              <span className="text-xl leading-none" aria-hidden>⚠️</span>
            </motion.span>
            <p className="flex-1">
              {level === "over" ? (
                <>
                  <strong>Budget bulan ini terlewati</strong> {rupiah(total - budget!)}. Pelan-pelan dulu jajannya ya.
                </>
              ) : (
                <>
                  <strong>Budget sudah {Math.round((total / budget!) * 100)}%.</strong> Sisa {rupiah(budget! - total)}.
                </>
              )}{" "}
              <Link href="/statistik" className="font-semibold underline">
                Lihat
              </Link>
            </p>
            <button
              type="button"
              aria-label="Tutup pengingat"
              onClick={() => {
                storageSet(`${key}:closed`, "1");
                setDismissed(key);
              }}
              className="press -mr-1 grid size-7 place-items-center rounded-full"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Tombol untuk mengizinkan notifikasi browser. */
export function NotifyToggle() {
  const initial = useSyncExternalStore<NotificationPermission | "unsupported">(
    noopSubscribe,
    () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission),
    () => "unsupported",
  );
  const [asked, setAsked] = useState<NotificationPermission | null>(null);
  const perm = asked ?? initial;
  if (perm === "unsupported") return null;
  if (perm === "granted") return <p className="mt-2 text-xs text-muted">Notifikasi pengingat aktif di perangkat ini.</p>;
  if (perm === "denied") return <p className="mt-2 text-xs text-muted">Notifikasi diblokir. Izinkan dari pengaturan browser untuk mengaktifkan.</p>;
  return (
    <button
      type="button"
      onClick={async () => setAsked(await Notification.requestPermission())}
      className="press mt-3 w-full rounded-xl bg-soft py-2.5 text-sm font-semibold"
    >
      <span className="inline-flex items-center gap-1.5">🔔 Ingatkan aku saat budget hampir habis</span>
    </button>
  );
}
