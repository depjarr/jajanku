"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

/** Partikel "debu" berkilau yang naik dari foto saat AI bekerja. */
export function AnalyzingDust({ count = 28 }: { count?: number }) {
  const reduce = useReducedMotion();
  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 37) % 100,
        top: 40 + ((i * 53) % 60),
        size: 3 + (i % 4) * 2,
        delay: (i % 10) * 0.25,
        dur: 2.2 + (i % 5) * 0.4,
        color: i % 3 === 0 ? "var(--c-accent)" : i % 3 === 1 ? "var(--c-primary)" : "white",
      })),
    [count],
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size, background: d.color, boxShadow: `0 0 10px ${d.color}` }}
          animate={{ y: [0, -220], x: [0, (i % 2 ? 1 : -1) * 30], opacity: [0, 1, 0], scale: [0.4, 1.2, 0.2] }}
          transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
      <motion.div
        className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-white/25 to-transparent"
        animate={{ top: ["-20%", "110%"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
