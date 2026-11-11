"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { regenerateRecoveryCode } from "@/app/(auth)/actions";
import { RecoveryCodeCard } from "@/components/recovery-card";

/** Halaman Kamu: buat kode pemulihan baru (untuk akun lama, atau bila kodenya hilang). */
export function RecoveryPanel({ enabled, createdAt }: { enabled: boolean; createdAt: string | null }) {
  const [code, setCode] = useState<string>();
  const [error, setError] = useState<string>();
  const [since, setSince] = useState(createdAt);
  const has = !!since;
  const [pending, start] = useTransition();

  if (!enabled) return null;

  const make = () => {
    if (has && !confirm("Buat kode baru? Kode lama langsung tidak berlaku.")) return;
    setError(undefined);
    start(async () => {
      const r = await regenerateRecoveryCode();
      if (r?.recovery) {
        setCode(r.recovery);
        setSince(new Date().toISOString());
      } else setError(r?.error ?? "Gagal membuat kode.");
    });
  };

  return (
    <section className="window p-4">
      <AnimatePresence mode="wait" initial={false}>
        {code ? (
          <motion.div key="code" exit={{ opacity: 0, y: -8 }}>
            <RecoveryCodeCard code={code} onDone={() => setCode(undefined)} />
          </motion.div>
        ) : (
          <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-soft text-2xl leading-none" aria-hidden>
              🔑
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Kode pemulihan</span>
              <span className="block text-xs text-muted">
                {has
                  ? `Aktif sejak ${new Date(since!).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}. Dipakai kalau lupa password.`
                  : "Belum ada. Buat sekarang supaya bisa ganti password kalau lupa."}
              </span>
            </span>
            <button type="button" disabled={pending} onClick={make} className="press min-h-10 shrink-0 rounded-full bg-strong px-4 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? "…" : has ? "Buat baru" : "Buat kode"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p role="alert" className="mt-2 text-sm text-accent-text">{error}</p>}
    </section>
  );
}
