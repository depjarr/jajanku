"use client";

import Link from "next/link";
import { useEffect } from "react";
import { motion } from "motion/react";
import { confetti } from "@/lib/confetti";
import { toast } from "@/lib/live";
import type { Achievements, Badge } from "@/lib/achievements";

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

/** Baris kecil streak di Meja. */
export function StreakRow({ ach }: { ach: Achievements }) {
  const chips = [
    ach.recordStreak > 0 && { emoji: "🔥", text: `${ach.recordStreak} hari nyatat` },
    ach.hematStreak != null && ach.hematStreak > 0 && { emoji: "🌱", text: `${ach.hematStreak} hari hemat` },
    { emoji: "🏅", text: `${ach.unlocked}/${ach.badges.length} pencapaian` },
  ].filter(Boolean) as { emoji: string; text: string }[];

  return (
    <Link href="/pencapaian" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:px-0" aria-label="Lihat streak dan pencapaian">
      {chips.map((c, i) => (
        <motion.span
          key={c.text}
          initial={{ opacity: 0, scale: 0.8, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 20, delay: 0.25 + i * 0.07 }}
          className="press flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-soft px-3.5 text-sm font-semibold text-strong"
        >
          <motion.span
            className="text-base leading-none"
            animate={c.emoji === "🔥" ? { scale: [1, 1.18, 1], rotate: [0, -6, 0] } : undefined}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.2 }}
            aria-hidden
          >
            {c.emoji}
          </motion.span>
          {c.text}
        </motion.span>
      ))}
    </Link>
  );
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
