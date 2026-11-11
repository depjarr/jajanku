"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, Download, KeyRound } from "lucide-react";

/**
 * Menampilkan kode pemulihan sekali: salin / simpan sebagai gambar,
 * dan tombol lanjut baru aktif setelah pengguna mencentang "sudah menyimpan".
 */
export function RecoveryCodeCard({
  code,
  title = "Simpan kode pemulihanmu",
  intro = "Kode ini dipakai kalau kamu lupa password. Hanya ditampilkan sekali, jadi simpan baik-baik ya.",
  next,
  onDone,
}: {
  code: string;
  title?: string;
  intro?: string;
  next?: { href: string; label: string };
  onDone?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const card = useRef<HTMLDivElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const saveImage = async () => {
    if (!card.current) return;
    const { toPng } = await import("html-to-image");
    const url = await toPng(card.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
    const a = document.createElement("a");
    a.href = url;
    a.download = "kode-pemulihan-jajanku.png";
    a.click();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="space-y-4">
      <div ref={card} className="rounded-[24px] bg-gradient-to-br from-soft to-surface p-5 text-center ring-1 ring-strong/15">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-surface text-strong shadow-sm"><KeyRound className="size-7" aria-hidden /></span>
        <p className="mt-3 font-heading text-xl font-bold">{title}</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{intro}</p>
        <p className="mt-4 select-all rounded-2xl bg-surface px-3 py-3 font-mono text-[22px] font-bold tracking-[0.12em] text-strong shadow-sm" aria-label={`Kode pemulihan ${code.split("").join(" ")}`}>
          {code}
        </p>
        <p className="mt-2 text-[11px] text-muted">jajanku · kode pemulihan password</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="press flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface font-semibold ring-1 ring-ink/10">
          {copied ? <Check className="size-4 text-strong" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Tersalin" : "Salin"}
        </button>
        <button type="button" onClick={saveImage} className="press flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface font-semibold ring-1 ring-ink/10">
          <Download className="size-4" aria-hidden /> Simpan gambar
        </button>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-ink/[0.035] px-4 py-3 text-sm font-semibold">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="size-5 accent-[var(--c-strong)]" />
        Aku sudah menyimpan kode ini
      </label>

      {next ? (
        <Link
          href={saved ? next.href : "#"}
          aria-disabled={!saved}
          onClick={(e) => !saved && e.preventDefault()}
          className={`press block w-full rounded-2xl bg-strong py-4 text-center text-[17px] font-semibold text-white ${saved ? "" : "pointer-events-none opacity-50"}`}
        >
          {next.label}
        </Link>
      ) : (
        <button type="button" disabled={!saved} onClick={onDone} className="press w-full rounded-2xl bg-strong py-4 text-[17px] font-semibold text-white disabled:opacity-50">
          Selesai
        </button>
      )}
    </motion.div>
  );
}
