"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

/**
 * Ilustrasi keadaan kosong: piring besar dengan emoji utama,
 * dikelilingi emoji kecil yang melayang, plus ajakan bertindak.
 */
export function EmptyState({
  emoji = "🍽️",
  orbit = ["🍩", "🧋", "🍙"],
  title,
  text,
  cta,
  className = "window",
}: {
  emoji?: string;
  orbit?: string[];
  title: string;
  text?: string;
  cta?: { href: string; label: string };
  className?: string;
}) {
  const reduce = useReducedMotion();
  const spots = [
    { x: -62, y: -30, r: -14 },
    { x: 62, y: -40, r: 12 },
    { x: 56, y: 38, r: -8 },
    { x: -58, y: 40, r: 10 },
  ];
  return (
    <div className={`px-6 py-9 text-center ${className}`}>
      <div className="relative mx-auto grid size-[150px] place-items-center" aria-hidden>
        <motion.span
          className="absolute inset-3 rounded-full bg-gradient-to-br from-soft to-primary/25"
          animate={reduce ? undefined : { scale: [1, 1.04, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="absolute inset-7 rounded-full bg-surface shadow-[inset_0_-6px_0_var(--c-line),0_10px_24px_-12px_var(--c-strong)]" />
        <motion.span
          className="relative text-[52px] leading-none"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.1 }}
        >
          {emoji}
        </motion.span>
        {orbit.slice(0, 4).map((e, i) => (
          <motion.span
            key={i}
            className="absolute text-[26px] leading-none"
            style={{ left: "50%", top: "50%", marginLeft: -13, marginTop: -13 }}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: spots[i].x,
              y: reduce ? spots[i].y : [spots[i].y, spots[i].y - 8, spots[i].y],
              rotate: spots[i].r,
            }}
            transition={{
              default: { type: "spring", stiffness: 260, damping: 14, delay: 0.25 + i * 0.08 },
              y: reduce ? undefined : { duration: 2.4 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: 0.6 + i * 0.2 },
            }}
          >
            {e}
          </motion.span>
        ))}
      </div>
      <p className="mt-4 font-heading text-xl font-bold">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {cta && (
        <Link href={cta.href} className="press mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-strong px-6 font-semibold text-white shadow-[0_12px_24px_-12px_var(--c-strong)]">
          <span aria-hidden>📸</span> {cta.label}
        </Link>
      )}
    </div>
  );
}
