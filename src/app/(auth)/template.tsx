"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Transisi setiap pindah halaman: muncul cepat dan lembut.
 * Hanya opacity + y (tanpa filter) supaya elemen position:fixed di dalamnya tetap benar.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ y: { type: "spring", stiffness: 420, damping: 34 }, opacity: { duration: 0.18 } }}
    >
      {children}
    </motion.div>
  );
}
