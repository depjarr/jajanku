"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { peekFlight, useFlight } from "@/lib/live";

/**
 * Transisi setiap pindah halaman: muncul cepat dan lembut.
 * Hanya opacity + y (tanpa filter) supaya elemen position:fixed di dalamnya tetap benar.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const f = useFlight();
  // Saat stiker sedang terbang ke halaman ini, jangan pudarkan halamannya.
  const [flying] = useState(() => !!f && !!peekFlight(f.id));
  return (
    <motion.div
      initial={reduce || flying ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ y: { type: "spring", stiffness: 420, damping: 34 }, opacity: { duration: 0.18 } }}
    >
      {children}
    </motion.div>
  );
}
