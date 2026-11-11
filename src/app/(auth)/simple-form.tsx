"use client";

import { EmojiBubble } from "@/components/icons";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useActionState } from "react";
import { ChevronLeft } from "lucide-react";
import { resetWithCode, updatePassword, type AuthState } from "./actions";
import { RecoveryCodeCard } from "@/components/recovery-card";
import { softSpring } from "@/components/ui/haptic";
import { useState } from "react";
import { BotTrap, PasswordMeter } from "./guards";

const CONFIG = {
  lupa: {
    emoji: "🔑",
    title: "Lupa password?",
    sub: "Masukkan email dan kode pemulihan yang kamu simpan waktu daftar, lalu buat password baru.",
    button: "Ganti password",
    action: resetWithCode,
  },
  reset: {
    emoji: "🔒",
    title: "Buat password baru",
    sub: "Minimal 8 karakter, ya.",
    button: "Simpan password",
    action: updatePassword,
  },
} as const;

export function SimpleAuthForm({ kind }: { kind: keyof typeof CONFIG }) {
  const c = CONFIG[kind];
  const [state, action, pending] = useActionState<AuthState, FormData>(c.action, undefined);
  const [pw, setPw] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  return (
    <main className="app-bg mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-[max(env(safe-area-inset-top),14px)] md:justify-center">
      <div className="mb-6 flex h-11 items-center md:absolute md:left-8 md:top-6">
        <Link href="/login" className="press -ml-2 flex items-center rounded-full px-2 py-1.5 text-sm font-semibold text-muted">
          <ChevronLeft className="size-5" aria-hidden /> Kembali ke Masuk
        </Link>
      </div>

      <motion.div initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 12 }} className="mx-auto">
        <EmojiBubble emoji={c.emoji} className="size-20 text-4xl" tone="primary" />
      </motion.div>
      <h1 className="mt-4 text-center font-heading text-[30px] font-bold tracking-tight">{c.title}</h1>
      <p className="mt-1 text-center text-[15px] text-muted">{c.sub}</p>

      {state?.recovery ? (
        <div className="window mt-6 p-5">
          <RecoveryCodeCard
            code={state.recovery}
            title="Password diganti! 🎉"
            intro="Kode lamamu sudah hangus. Ini kode pemulihan barumu, simpan baik-baik ya."
            next={{ href: "/login", label: "Masuk dengan password baru" }}
          />
        </div>
      ) : (
      <motion.form action={action} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={softSpring} className="window relative mt-6 space-y-3 p-5">
        <BotTrap />
        <div className="overflow-hidden rounded-2xl bg-ink/[0.035] ring-1 ring-ink/5">
          {kind === "lupa" ? (
            <>
              <Field label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Field
                label="Kode pemulihan"
                name="code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="JAJAN-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono tracking-wider"
              />
              <Field label="Password baru" name="password" type="password" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />
              <Field label="Ulangi password baru" name="confirm" type="password" autoComplete="new-password" minLength={8} />
            </>
          ) : (
            <>
              <Field label="Password baru" name="password" type="password" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />
              <Field label="Ulangi password" name="confirm" type="password" autoComplete="new-password" minLength={8} />
            </>
          )}
        </div>
        <PasswordMeter value={pw} />

        <AnimatePresence>
          {(state?.error || state?.info) && (
            <motion.p
              role={state.error ? "alert" : "status"}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-2xl px-4 py-3 text-sm ${state.error ? "bg-accent-text/10 text-accent-text" : "bg-primary/20"}`}
            >
              {state.error ?? state.info}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button whileTap={{ scale: 0.97 }} disabled={pending} className="w-full rounded-2xl bg-strong py-4 text-[17px] font-semibold text-white disabled:opacity-70">
          {pending ? "Sebentar…" : c.button}
        </motion.button>
        {kind === "lupa" && (
          <p className="text-center text-xs text-muted">Kode hilang? Masuk dulu (kalau masih ingat password), lalu buat kode baru di halaman Kamu.</p>
        )}
      </motion.form>
      )}
    </main>
  );
}

function Field({ label, className = "", ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block border-b border-ink/5 px-4 py-2.5 last:border-b-0 focus-within:bg-surface/60">
      <span className="block text-xs font-semibold text-muted">{label}</span>
      <input {...props} required className={`w-full bg-transparent text-[17px] outline-none placeholder:text-muted/50 ${className}`} />
    </label>
  );
}
