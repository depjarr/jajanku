"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState } from "react";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { login, register, type AuthState } from "./actions";
import { ScanIllustration } from "@/components/ui/scan-illustration";
import { createClient } from "@/lib/supabase/client";
import { BotTrap, PasswordMeter } from "./guards";
import { softSpring, spring } from "@/components/ui/haptic";

/**
 * HP & tablet: satu kolom di tengah.
 * Desktop: layar terbelah, panel ilustrasi di kiri dan form di kanan.
 */
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";

  return (
    <main className="app-bg min-h-dvh lg:grid lg:grid-cols-2">
      {/* Panel kiri (desktop) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-soft p-12 lg:flex">
        <Link href="/selamat-datang" className="font-heading text-3xl font-bold tracking-tight">
          jajanku<span className="text-strong">.</span>
        </Link>
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={softSpring} className="mx-auto h-[min(56dvh,520px)]">
          <ScanIllustration step={isLogin ? 2 : 1} className="h-full w-auto" />
        </motion.div>
        <div>
          <p className="font-heading text-4xl font-bold leading-tight tracking-tight">
            Jajan kecil,
            <br />
            kenangan besar.
          </p>
          <p className="mt-2 max-w-sm text-muted">Foto jajananmu, AI yang mencatat. Semua tersimpan rapi di kalender.</p>
        </div>
      </aside>

      {/* Kolom form */}
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-[max(env(safe-area-inset-top),14px)] md:max-w-md md:justify-center md:py-10 lg:max-w-[440px]">
        <div className="flex h-11 items-center md:absolute md:left-8 md:top-6 lg:static lg:mb-6">
          <Link href="/selamat-datang" className="press -ml-2 flex items-center rounded-full px-2 py-1.5 text-sm font-semibold text-muted">
            <ChevronLeft className="size-5" aria-hidden /> Tentang Jajanku
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={softSpring} className="mx-auto w-40 md:w-48 lg:hidden">
          <ScanIllustration step={isLogin ? 2 : 1} className="h-auto w-full" />
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...softSpring, delay: 0.05 }} className="mt-2 text-center font-heading text-[30px] font-bold tracking-tight md:text-[34px] lg:text-left">
          {isLogin ? "Halo lagi!" : "Bikin akun dulu, yuk"}
        </motion.h1>
        <p className="mt-1 text-center text-[15px] text-muted lg:text-left">
          {isLogin ? "Masuk buat lanjut catat jajananmu." : "Gratis, dan cuma butuh beberapa detik."}
        </p>

        {/* Pilihan Masuk / Daftar */}
        <div className="relative mx-auto mt-5 flex w-full max-w-xs rounded-[14px] bg-ink/[0.07] p-[3px] lg:mx-0 lg:max-w-none" role="tablist" aria-label="Pilih">
          {(["login", "register"] as const).map((m) => (
            <Link key={m} href={`/${m}`} replace role="tab" aria-selected={mode === m} className="relative z-0 flex-1 rounded-[11px] py-2 text-center text-sm font-semibold">
              {mode === m && <motion.span layoutId="auth-seg" transition={spring} className="absolute inset-0 -z-10 rounded-[11px] bg-surface shadow-[0_3px_8px_rgb(0_0_0/0.12)]" />}
              <span className={mode === m ? "text-ink" : "text-muted"}>{m === "login" ? "Masuk" : "Daftar"}</span>
            </Link>
          ))}
        </div>

        <motion.section key={mode} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={softSpring} className="window mt-5 p-5 lg:p-0 lg:shadow-none">
          <Form mode={mode} />
        </motion.section>
      </div>
    </main>
  );
}

function Form({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const [state, action, pending] = useActionState<AuthState, FormData>(isLogin ? login : register, undefined);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = !isLogin && confirm.length > 0 && confirm !== pw;

  return (
    <form action={action} className="relative space-y-3">
      <BotTrap />

      <div className="overflow-hidden rounded-2xl bg-ink/[0.035] ring-1 ring-ink/5">
        {!isLogin && <Field label="Nama panggilan" name="name" autoComplete="nickname" />}
        <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={120} />
        <PasswordField isLogin={isLogin} value={pw} onChange={setPw} />
        {!isLogin && <PasswordField isLogin={false} name="confirm" label="Ulangi password" value={confirm} onChange={setConfirm} />}
      </div>
      {!isLogin && <PasswordMeter value={pw} />}
      {mismatch && <p className="px-1 text-xs font-semibold text-accent-text">Ulangi password belum sama.</p>}
      {isLogin && (
        <p className="px-1 text-right text-sm">
          <Link href="/lupa-password" className="font-semibold text-muted underline-offset-2 hover:underline">
            Lupa password?
          </Link>
        </p>
      )}

      <AnimatePresence>
        {(state?.error || state?.info) && (
          <motion.p
            role={state.error ? "alert" : "status"}
            initial={{ opacity: 0, height: 0, x: 0 }}
            animate={{ opacity: 1, height: "auto", x: state.error ? [0, -8, 8, -4, 4, 0] : 0 }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-2xl px-4 py-3 text-sm ${state.error ? "bg-accent-text/10 text-accent-text" : "bg-primary/20"}`}
          >
            {state.error ?? state.info}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={pending || mismatch}
        className="relative w-full overflow-hidden rounded-2xl bg-strong py-4 text-[17px] font-semibold text-white disabled:opacity-70"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={pending ? "p" : "i"} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} className="block">
            {pending ? "Sebentar…" : isLogin ? "Masuk" : "Daftar"}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <div className="flex items-center gap-3 py-1 text-xs text-muted" aria-hidden>
        <span className="h-px flex-1 bg-ink/10" /> atau <span className="h-px flex-1 bg-ink/10" />
      </div>
      <GoogleButton />
    </form>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block border-b border-ink/5 px-4 py-2.5 last:border-b-0 focus-within:bg-surface/60">
      <span className="block text-xs font-semibold text-muted">{label}</span>
      <input {...props} required className="w-full bg-transparent text-[17px] outline-none" />
    </label>
  );
}

function PasswordField({
  isLogin,
  value,
  onChange,
  name = "password",
  label = "Password",
}: {
  isLogin: boolean;
  value: string;
  onChange: (v: string) => void;
  name?: string;
  label?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="flex items-end border-b border-ink/5 px-4 py-2.5 last:border-b-0 focus-within:bg-surface/60">
      <span className="flex-1">
        <span className="block text-xs font-semibold text-muted">{label}</span>
        <input
          name={name}
          type={show ? "text" : "password"}
          autoComplete={isLogin ? "current-password" : "new-password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={200}
          required
          className="w-full bg-transparent text-[17px] outline-none"
        />
      </span>
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"} className="press p-1 text-muted">
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </label>
  );
}

function GoogleButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(undefined);
          const { error } = await createClient().auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          });
          if (error) {
            setError(error.message.includes("provider is not enabled") ? "Login Google belum diaktifkan di Supabase." : error.message);
            setPending(false);
          }
        }}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-surface py-3.5 text-[16px] font-semibold ring-1 ring-ink/10 disabled:opacity-70"
      >
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {pending ? "Membuka Google…" : "Lanjut dengan Google"}
      </motion.button>
      {error && <p role="alert" className="text-center text-sm text-accent-text">{error}</p>}
    </>
  );
}
