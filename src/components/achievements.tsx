"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { confetti } from "@/lib/confetti";
import { toast } from "@/lib/live";
import type { Badge } from "@/lib/achievements";

const KEY = "jajanku_badges";

/**
 * Bandingkan pencapaian sekarang dengan yang terakhir dilihat di perangkat ini.
 * Yang baru terbuka → confetti + toast. Kunjungan pertama hanya mencatat, tanpa pesta.
 */
export function AchievementWatcher({ badges }: { badges: Badge[] }) {
  const ids = badges.filter((b) => b.unlocked).map((b) => b.id).join(",");
  useEffect(() => {
    let seen: string[] | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      seen = raw === null ? null : raw.split(",").filter(Boolean);
    } catch {
      return;
    }
    const save = () => {
      try {
        localStorage.setItem(KEY, ids);
      } catch {}
    };
    const fresh = seen === null ? [] : badges.filter((b) => b.unlocked && !seen!.includes(b.id));
    if (fresh.length === 0) return save();
    // Simpan baru saat pesta benar-benar jalan (aman bila efek dijalankan dua kali).
    const t = setTimeout(() => {
      save();
      confetti();
      fresh.forEach((b, i) =>
        setTimeout(() => toast({ emoji: b.emoji, text: `Pencapaian baru: ${b.title}!`, duration: 4500 }), i * 600),
      );
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return null;
}

/** Kartu pencapaian (halaman /pencapaian). */
export function BadgeCard({ badge, index }: { badge: Badge; index: number }) {
  const pct = (badge.progress / badge.target) * 100;
  return (
    <motion.li
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: index * 0.045 }}
      className={`relative overflow-hidden rounded-[24px] p-4 ${badge.unlocked ? "bg-gradient-to-br from-soft to-surface ring-1 ring-strong/15" : "bg-surface ring-1 ring-line"}`}
    >
      <motion.span
        className={`grid size-14 place-items-center rounded-2xl text-3xl leading-none ${badge.unlocked ? "bg-surface shadow-sm" : "bg-line/60 grayscale"}`}
        whileHover={badge.unlocked ? { rotate: [0, -12, 12, 0], scale: 1.08 } : undefined}
        aria-hidden
      >
        {badge.unlocked ? badge.emoji : "🔒"}
      </motion.span>
      <p className="mt-3 font-heading text-[17px] font-bold leading-tight">{badge.title}</p>
      <p className="mt-0.5 text-sm text-muted">{badge.desc}</p>
      {badge.unlocked ? (
        <p className="mt-3 inline-flex rounded-full bg-strong px-2.5 py-1 text-xs font-bold text-white">Terbuka ✓</p>
      ) : (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <motion.div
              className="h-full rounded-full bg-strong"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.2 + index * 0.04 }}
            />
          </div>
          <p className="mt-1 text-xs font-semibold text-muted">
            {badge.progress}/{badge.target}
          </p>
        </div>
      )}
    </motion.li>
  );
}
