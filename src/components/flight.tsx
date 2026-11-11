"use client";

import { useLayoutEffect, useRef } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { CATEGORY_EMOJI } from "@/components/icons";
import { landFlight, peekFlight, useFlight } from "@/lib/live";

/**
 * Stiker "terbang": saat kartu diketuk, salinan stikernya melayang di posisi
 * semula sampai halaman detail siap, lalu mendarat di tempat barunya.
 */
export function FlightLayer() {
  const f = useFlight();
  if (!f) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-[70]"
      style={{ left: f.rect.left, top: f.rect.top, width: f.rect.width, height: f.rect.height }}
      initial={{ scale: 1, rotate: f.rotate, y: 0 }}
      animate={{ scale: 1.12, rotate: f.rotate - 6, y: -10 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
    >
      {f.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={f.src} alt="" className="sticker size-full object-contain drop-shadow-[0_20px_22px_rgb(0_0_0/0.25)]" />
      ) : (
        <span className="sticker grid size-full place-items-center text-[80px] leading-none">{CATEGORY_EMOJI[f.category]}</span>
      )}
    </motion.div>
  );
}

/** Bungkus stiker tujuan; bila ada penerbangan untuk item ini, animasikan dari posisi kartu. */
export function FlyTarget({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const f = peekFlight(id);
    const el = ref.current;
    if (!f || !el) return;
    landFlight();
    if (reduce) return;
    const to = el.getBoundingClientRect();
    const dx = f.rect.left + f.rect.width / 2 - (to.left + to.width / 2);
    const dy = f.rect.top + f.rect.height / 2 - 10 - (to.top + to.height / 2);
    const s = (f.rect.width * 1.12) / Math.max(1, to.width);
    animate(el, { x: [dx, 0], y: [dy, 0], scale: [s, 1], rotate: [f.rotate - 6, 0] }, { type: "spring", stiffness: 220, damping: 22 });
  }, [id, reduce]);

  return (
    <span ref={ref} className={`relative z-10 inline-block ${className}`}>
      {children}
    </span>
  );
}
