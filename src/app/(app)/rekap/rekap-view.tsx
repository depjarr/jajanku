"use client";

import { EmojiBubble } from "@/components/icons";
import type { Category } from "@/lib/types";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Share2, X } from "lucide-react";
import { Sticker } from "@/components/sticker";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { haptic, softSpring } from "@/components/ui/haptic";
import { MONTHS, formatDayLong, shiftMonth } from "@/lib/dates";
import { rupiah } from "@/lib/types";

export type RekapData = {
  year: number;
  month: number;
  monthKey: string;
  name: string;
  diary: string;
  total: number;
  itemCount: number;
  dayCount: number;
  topItem: { name: string; count: number; sticker: string | null } | null;
  peakDay: { date: string; total: number } | null;
  topCategory: { label: string; category: Category; pct: number } | null;
  topStore: { name: string; total: number } | null;
  bestRated: { name: string; rating: number; sticker: string | null } | null;
  stickers: string[];
};

const SLIDE_MS = 4500;

/** Rekap bulanan berbentuk story: ketuk kanan/kiri untuk pindah, slide terakhir bisa disimpan/dibagikan. */
export function RekapView({ data }: { data: RekapData }) {
  const monthName = MONTHS[data.month - 1];
  const empty = data.itemCount === 0;
  const slides = empty ? [<EmptySlide key="e" monthName={monthName} />] : buildSlides(data, monthName);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const last = index === slides.length - 1;

  useEffect(() => {
    if (paused || last) return;
    const t = setTimeout(() => setIndex((i) => Math.min(i + 1, slides.length - 1)), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, paused, last, slides.length]);

  const go = (d: number) => {
    haptic();
    setIndex((i) => Math.max(0, Math.min(slides.length - 1, i + d)));
  };

  return (
    <main className="mx-auto -mb-36 flex min-h-[calc(100dvh-24px)] max-w-md flex-col md:-mb-12">
      <div className="mb-3 flex items-center justify-between">
        <Link href={`/rekap?m=${shiftMonth(data.year, data.month, -1)}`} aria-label="Bulan sebelumnya" className="press grid size-9 place-items-center rounded-full bg-surface shadow-sm ring-1 ring-ink/5">
          <ChevronLeft className="size-5" />
        </Link>
        <p className="font-heading text-lg font-bold">
          Rekap {monthName} {data.year}
        </p>
        <div className="flex gap-1">
          <Link href={`/rekap?m=${shiftMonth(data.year, data.month, 1)}`} aria-label="Bulan berikutnya" className="press grid size-9 place-items-center rounded-full bg-surface shadow-sm ring-1 ring-ink/5">
            <ChevronRight className="size-5" />
          </Link>
          <Link href="/statistik" aria-label="Tutup" className="press grid size-9 place-items-center rounded-full bg-surface shadow-sm ring-1 ring-ink/5">
            <X className="size-5" />
          </Link>
        </div>
      </div>

      <div
        className="relative aspect-[9/16] w-full select-none overflow-hidden rounded-[32px] bg-strong text-white shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)]"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {/* Progres */}
        <div className="absolute inset-x-3 top-3 z-20 flex gap-1" aria-hidden>
          {slides.map((_, i) => (
            <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-bg/25">
              {i < index && <span className="block h-full w-full bg-bg" />}
              {i === index && (
                <motion.span
                  key={`${index}-${paused}`}
                  className="block h-full bg-bg"
                  initial={{ width: last ? "100%" : "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: last || paused ? 0 : SLIDE_MS / 1000, ease: "linear" }}
                />
              )}
            </span>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35 }}
          >
            {slides[index]}
          </motion.div>
        </AnimatePresence>

        {/* Area ketuk kiri/kanan */}
        {!last && (
          <>
            <button type="button" aria-label="Sebelumnya" className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={() => go(-1)} />
            <button type="button" aria-label="Berikutnya" className="absolute inset-y-0 right-0 z-10 w-2/3" onClick={() => go(1)} />
          </>
        )}
        {last && index > 0 && <button type="button" aria-label="Sebelumnya" className="absolute left-0 top-10 z-10 h-1/4 w-1/4" onClick={() => go(-1)} />}
      </div>

      <p className="mt-3 text-center text-xs text-muted">{last ? "Simpan atau bagikan kartumu." : "Ketuk kanan untuk lanjut, tahan untuk berhenti."}</p>
      {last && !empty && <ShareBar data={data} />}
    </main>
  );
}

function buildSlides(d: RekapData, monthName: string) {
  return [
    <Slide key="1" bg="from-[#2A2A2A] to-[#3d4a2a]">
      <Big delay={0.1}>{monthName} kamu</Big>
      <Big delay={0.3}>penuh jajan</Big>
      <Small delay={0.6}>Yuk lihat ke mana aja uang jajanmu pergi{d.name ? `, ${d.name}` : ""}.</Small>
    </Slide>,
    <Slide key="2" bg="from-[#9CC655] to-[#5f8f2a]" ink>
      <Small delay={0.1}>Total jajanmu bulan ini</Small>
      <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...softSpring, delay: 0.25 }} className="font-heading text-5xl font-bold tracking-tight">
        <AnimatedNumber value={d.total} format={rupiah} />
      </motion.p>
      <Small delay={0.6}>
        dari <strong>{d.itemCount} item</strong> dalam <strong>{d.dayCount} hari</strong> jajan.
      </Small>
    </Slide>,
    ...(d.topItem
      ? [
          <Slide key="3" bg="from-[#F28B95] to-[#c4505c]">
            <Small delay={0.1}>Jajanan andalanmu</Small>
            <motion.div initial={{ y: -200, rotate: -30, scale: 0.4 }} animate={{ y: 0, rotate: -6, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.25 }}>
              <Sticker path={d.topItem.sticker} alt={d.topItem.name} category="snack" className="mx-auto size-40" />
            </motion.div>
            <Big delay={0.5}>{d.topItem.name}</Big>
            <Small delay={0.7}>Dibeli {d.topItem.count}× bulan ini. Setia banget!</Small>
          </Slide>,
        ]
      : []),
    <Slide key="4" bg="from-[#3b3f6b] to-[#1f2240]">
      {d.topCategory && (
        <>
          <Small delay={0.1}>Kategori favorit</Small>
          <Big delay={0.25}>
            {d.topCategory.label} · {d.topCategory.pct}%
          </Big>
        </>
      )}
      {d.peakDay && (
        <>
          <Small delay={0.5}>Hari paling boros</Small>
          <Big delay={0.65}>{formatDayLong(d.peakDay.date)}</Big>
          <Small delay={0.8}>{rupiah(d.peakDay.total)} dalam sehari.</Small>
        </>
      )}
      {d.topStore && <Small delay={1}>Toko langganan: <strong>{d.topStore.name}</strong></Small>}
    </Slide>,
    <SummaryCard key="5" d={d} monthName={monthName} />,
  ];
}

function Slide({ children, bg, ink }: { children: React.ReactNode; bg: string; ink?: boolean }) {
  return <div className={`flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br px-8 text-center ${bg} ${ink ? "text-ink" : "text-white"}`}>{children}</div>;
}
const Big = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.p initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...softSpring, delay }} className="font-heading text-3xl font-bold leading-tight">
    {children}
  </motion.p>
);
const Small = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.p initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 0.9 }} transition={{ delay }} className="text-base">
    {children}
  </motion.p>
);

function EmptySlide({ monthName }: { monthName: string }) {
  return (
    <Slide bg="from-[#2A2A2A] to-[#444]">
      <EmojiBubble emoji="🧺" className="size-20 text-4xl" tone="primary" />
      <Big>Belum ada jajan di {monthName}</Big>
      <Small>Foto jajananmu dulu, nanti rekapnya muncul di sini.</Small>
    </Slide>
  );
}

/** Kartu ringkasan yang bisa disimpan sebagai gambar. */
function SummaryCard({ d, monthName }: { d: RekapData; monthName: string }) {
  return (
    <div id="rekap-card" className="relative flex h-full flex-col bg-[#FFFFFF] p-6 pt-10 text-[#2A2A2A]">
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#EEF6DD]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 -left-16 size-56 rounded-full bg-[#FFD3DA]" aria-hidden />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#7C6E72]">Rekap {monthName} {d.year}</p>
        <p className="mt-1 font-heading text-2xl font-bold">{d.diary}.</p>
      </div>

      <div className="relative my-4 grid flex-1 grid-cols-4 place-content-center gap-1">
        {d.stickers.slice(0, 12).map((s, i) => (
          <motion.div
            key={s + i}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: ((i * 41) % 17) - 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 + i * 0.05 }}
          >
            <Sticker path={s} alt="" className="aspect-square w-full" />
          </motion.div>
        ))}
        {d.stickers.length === 0 && (
          <div className="col-span-4 flex justify-center gap-3">
            {(["makanan", "minuman", "snack"] as const).map((c) => (
              <Sticker key={c} path={null} alt="" category={c} className="size-20" />
            ))}
          </div>
        )}
      </div>

      <div className="relative rounded-3xl bg-[#2A2A2A] p-4 text-white">
        <p className="text-xs opacity-70">Total jajan</p>
        <p className="font-heading text-3xl font-bold">{rupiah(d.total)}</p>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <span className="opacity-70">Item</span>
          <span className="text-right font-semibold">{d.itemCount}</span>
          {d.topItem && (
            <>
              <span className="opacity-70">Andalan</span>
              <span className="truncate text-right font-semibold">{d.topItem.name}</span>
            </>
          )}
          {d.topCategory && (
            <>
              <span className="opacity-70">Favorit</span>
              <span className="text-right font-semibold">
                {d.topCategory.label}
              </span>
            </>
          )}
          {d.bestRated && (
            <>
              <span className="opacity-70">Terenak</span>
              <span className="truncate text-right font-semibold">
                {"★".repeat(d.bestRated.rating)} {d.bestRated.name}
              </span>
            </>
          )}
        </div>
      </div>
      <p className="relative mt-3 text-center text-[10px] text-[#7C6E72]">dibuat dengan jajanku</p>
    </div>
  );
}

function ShareBar({ data }: { data: RekapData }) {
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [error, setError] = useState<string>();
  const fileName = `rekap-jajanku-${data.monthKey}.png`;
  const canShare = useRef(false);

  useEffect(() => {
    canShare.current = typeof navigator !== "undefined" && "canShare" in navigator;
  }, []);

  async function render(): Promise<Blob> {
    const node = document.getElementById("rekap-card");
    if (!node) throw new Error("Kartu belum siap");
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(node, { pixelRatio: 3, cacheBust: true, backgroundColor: "#FFFFFF" });
    if (!blob) throw new Error("Gagal membuat gambar");
    return blob;
  }

  async function save() {
    setError(undefined);
    setBusy("save");
    try {
      const blob = await render();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    setError(undefined);
    setBusy("share");
    try {
      const blob = await render();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Rekap jajanku", text: `Rekap jajanku ${MONTHS[data.month - 1]}` });
      } else {
        await save();
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Gagal membagikan");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={save} disabled={!!busy} className="flex items-center justify-center gap-2 rounded-2xl bg-surface py-3.5 font-semibold shadow-sm ring-1 ring-ink/5 disabled:opacity-60">
          <Download className="size-4" aria-hidden /> {busy === "save" ? "Menyimpan…" : "Simpan"}
        </motion.button>
        <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={share} disabled={!!busy} className="flex items-center justify-center gap-2 rounded-2xl bg-strong py-3.5 font-semibold text-white disabled:opacity-60">
          <Share2 className="size-4" aria-hidden /> {busy === "share" ? "Menyiapkan…" : "Bagikan"}
        </motion.button>
      </div>
      {error && <p role="alert" className="text-center text-sm text-accent-text">{error}</p>}
    </div>
  );
}
