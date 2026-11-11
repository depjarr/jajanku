"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { passwordChecks, passwordScore } from "@/lib/password";

/**
 * Jebakan bot tak terlihat: kolom "website" (manusia tidak akan mengisinya)
 * dan waktu halaman dibuka (bot biasanya mengirim formulir seketika).
 */
export function BotTrap() {
  const started = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (started.current) started.current.value = String(Date.now());
  }, []);
  return (
    <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
      <input ref={started} type="hidden" name="started" defaultValue="" />
    </div>
  );
}

const LEVEL = [
  { label: "Lemah banget", color: "var(--c-accent-text)" },
  { label: "Lemah", color: "var(--c-accent-text)" },
  { label: "Lumayan", color: "#D99A00" },
  { label: "Kuat", color: "var(--c-strong)" },
  { label: "Kuat banget", color: "var(--c-strong)" },
];

/** Indikator kekuatan password + daftar syarat. */
export function PasswordMeter({ value }: { value: string }) {
  const score = passwordScore(value);
  const checks = passwordChecks(value);
  if (!value) return <p className="px-1 text-xs text-muted">Minimal 8 karakter, campur huruf dan angka.</p>;
  return (
    <div className="space-y-2 px-1" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
              <motion.span
                className="block h-full rounded-full"
                style={{ background: LEVEL[score].color }}
                initial={false}
                animate={{ width: i < Math.max(1, score) ? "100%" : "0%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </span>
          ))}
        </div>
        <span className="w-20 text-right text-xs font-semibold" style={{ color: LEVEL[score].color }}>
          {LEVEL[score].label}
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {checks.map((c) => (
          <li key={c.label} className={`flex items-center gap-1 ${c.ok ? "text-strong" : "text-muted"}`}>
            {c.ok ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
