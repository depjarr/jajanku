"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Download, Share2 } from "lucide-react";
import { Caveat, Shrikhand, Space_Mono } from "next/font/google";
import { Sheet } from "@/components/ui/sheet";
import { Sticker } from "@/components/sticker";
import { MONTHS, formatDayLong, formatTime } from "@/lib/dates";
import { CATEGORIES, CATEGORY_LABEL, itemKcal, itemTotal, kcal, rupiah, type Entry, type Item } from "@/lib/types";

const logoFont = Shrikhand({ subsets: ["latin"], weight: "400", preload: false });
const scriptFont = Caveat({ subsets: ["latin"], weight: ["600", "700"], preload: false });
const monoFont = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], preload: false });

type DayItem = Item & { store_name?: string | null };
type DayEntry = Omit<Entry, "items"> & { items: DayItem[] };

const MAX_ROWS = 5;
const PAPER = "#FFF8EA";

/** Baris struk: label ..... nilai */
function Dotted({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <p className={`flex items-baseline gap-1.5 ${bold ? "text-[12px] font-bold" : "text-[10.5px]"}`}>
      <span className="uppercase">{label}</span>
      <span aria-hidden className="mb-[3px] flex-1 border-b border-dotted border-current opacity-50" />
      <span>{value}</span>
    </p>
  );
}

/**
 * Kartu "struk" jajan satu hari berukuran story (9:16):
 * kertas kasir krem bergerigi atas-bawah, logo retro, daftar item, total, dan mood jajan.
 */
function ReceiptStory({ date, entries }: { date: string; entries: DayEntry[] }) {
  const items = entries.flatMap((e) => e.items);
  const shown = items.slice(0, MAX_ROWS);
  const more = items.slice(MAX_ROWS);
  const total = items.reduce((s, i) => s + itemTotal(i), 0);
  const totalKcal = items.reduce((s, i) => s + itemKcal(i), 0);
  const qty = items.reduce((s, i) => s + Number(i.qty), 0);
  const cats = new Set(items.map((i) => i.category));
  const times = [...new Set(entries.map((e) => formatTime(e.eaten_at)).filter(Boolean))];
  const [y, m, d] = date.split("-").map(Number);
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
  const stickers = items.slice(0, 4);

  // Kalau itemnya banyak, kecilkan struk supaya tetap muat di kanvas story.
  const box = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  useLayoutEffect(() => {
    const b = box.current;
    const p = paper.current;
    if (!b || !p) return;
    const room = b.clientHeight * 0.86;
    const next = Math.min(1, room / p.offsetHeight);
    setFit((f) => (Math.abs(f - next) > 0.01 ? next : f));
  }, [items.length]);

  return (
    <div ref={box} className="relative aspect-[9/16] w-full overflow-hidden bg-strong">
      {/* struk kedua di belakang, sedikit miring */}
      <div aria-hidden className="receipt-both absolute -right-[18%] top-[3%] h-[62%] w-[70%] rotate-[8deg] opacity-90" style={{ background: PAPER }}>
        <p className={`${logoFont.className} mt-[14%] text-center text-[30px] leading-none text-strong`}>jajanku</p>
        <div className="mx-[12%] mt-5 space-y-2.5">
          {[0, 1, 2, 3, 4].map((k) => (
            <span key={k} className="block h-[5px] rounded-full bg-strong/15" style={{ width: `${90 - k * 12}%` }} />
          ))}
        </div>
      </div>

      {/* struk utama */}
      <div
        ref={paper}
        className="absolute left-[7%] top-[5%] w-[80%] drop-shadow-[0_14px_16px_rgb(0_0_0/0.28)]"
        style={{ transform: `rotate(-3deg) scale(${fit})`, transformOrigin: "top center" }}
      >
        <div className={`receipt-both px-[8%] pb-7 pt-7 text-[#3B4A1E] ${monoFont.className}`} style={{ background: PAPER }}>
          {/* logo */}
          <div className="flex items-center justify-center gap-1.5">
            <span className={`${logoFont.className} text-[34px] leading-none text-strong`}>jajanku</span>
            {stickers[0] && <Sticker path={stickers[0].sticker_path} alt="" category={stickers[0].category} className="size-9 shrink-0 rotate-12 drop-shadow-[0_3px_3px_rgb(0_0_0/0.18)]" />}
          </div>

          <p className="mt-2 text-center text-[7px] uppercase tracking-[0.06em] opacity-80">
            No. {String(dayOfYear).padStart(4, "0")} | Tgl {d} {MONTHS[m - 1].slice(0, 3)} {y}
            {times[0] ? ` | Jam ${times[0]}` : ""} | Kasir: Kamu
          </p>

          {/* pita stiker */}
          <div className="mt-2.5 flex items-center justify-between rounded-[4px] bg-primary/30 px-2 py-1.5">
            <span className="flex -space-x-1">
              {stickers.map((i) => (
                <span key={i.id} className="grid size-[22px] place-items-center overflow-hidden rounded-full bg-accent/40 ring-2" style={{ ["--tw-ring-color" as string]: PAPER }}>
                  <Sticker path={i.sticker_path} alt="" category={i.category} className="size-[19px]" />
                </span>
              ))}
            </span>
            <span className="text-[9px]">Jumlah: {qty}</span>
          </div>

          <p className="mt-3 border-b border-current/40 pb-1 text-[11px] font-bold">Item dibeli</p>
          <ul className="mt-2 space-y-1 text-[10.5px]">
            {shown.map((i) => (
              <li key={i.id} className="flex items-center gap-2">
                {/* stiker item menyembul di samping namanya */}
                <Sticker path={i.sticker_path} alt="" category={i.category} className="-my-1 size-[30px] shrink-0 -rotate-6 drop-shadow-[0_3px_3px_rgb(0_0_0/0.18)]" />
                <span className="line-clamp-1 flex-1">
                  {Number(i.qty)}x {i.name}
                </span>
                <span className="shrink-0">{rupiah(itemTotal(i))}</span>
              </li>
            ))}
            {more.length > 0 && (
              <li className="flex justify-between pl-[38px] opacity-70">
                <span>+{more.length} item lainnya</span>
                <span>{rupiah(more.reduce((s, i) => s + itemTotal(i), 0))}</span>
              </li>
            )}
          </ul>

          <div className="mt-3 space-y-1 border-t border-current/40 pt-2">
            <Dotted label="Subtotal" value={rupiah(total)} />
            {totalKcal > 0 && <Dotted label="Kalori" value={`≈${kcal(totalKcal)}`} />}
            <Dotted label="Momen" value={String(entries.length)} />
          </div>
          <div className="mt-2 border-t border-current/40 pt-2">
            <Dotted label="Total" value={rupiah(total)} bold />
          </div>

          {/* mood jajan */}
          <div className="mt-3 flex items-start gap-2 text-[7.5px] uppercase">
            <span className="w-[38%] leading-tight opacity-80">Mood jajan kamu hari ini</span>
            <span className="grid flex-1 grid-cols-2 gap-x-2 gap-y-0.5 normal-case">
              {CATEGORIES.map((c) => (
                <span key={c} className={`flex items-center gap-1 ${cats.has(c) ? "" : "opacity-40"}`}>
                  <span className={`size-[6px] rounded-full ${cats.has(c) ? "bg-strong" : "border border-current"}`} />
                  {CATEGORY_LABEL[c].label}
                </span>
              ))}
            </span>
          </div>

          <p className={`${scriptFont.className} mt-3 text-center text-[21px] font-bold leading-none text-strong`}>Jajan Kecil, Kenangan Besar</p>
          <p className="mx-auto mt-1 max-w-[85%] text-center text-[6.5px] leading-snug opacity-70">
            Dicatat pakai Jajanku: foto jajananmu, tiap item jadi stiker. catatjajanku.vercel.app
          </p>
        </div>
      </div>

      <p className={`${scriptFont.className} absolute bottom-[3.5%] left-0 right-0 text-center text-[20px] text-white/90`}>{formatDayLong(date)}</p>
    </div>
  );
}

/** Sheet berisi pratinjau struk + tombol Bagikan / Simpan. */
export function DayShareSheet({
  open,
  onClose,
  date,
  entries,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  entries: DayEntry[];
}) {
  const card = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [error, setError] = useState<string>();
  const fileName = `jajanku-${date}.png`;

  async function render() {
    const node = card.current;
    if (!node) throw new Error("Struk belum siap");
    const { toBlob } = await import("html-to-image");
    // Hasil 1080×1920 (ukuran status/story).
    const blob = await toBlob(node, { pixelRatio: 1080 / node.offsetWidth, cacheBust: true, backgroundColor: "#FFFFFF" });
    if (!blob) throw new Error("Gagal membuat gambar");
    return blob;
  }

  async function save(given?: Blob) {
    const blob = given ?? (await render());
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function run(kind: "save" | "share") {
    setError(undefined);
    setBusy(kind);
    try {
      const blob = await render();
      if (kind === "save") return await save(blob);
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Jajanku", text: `Jajanku · ${formatDayLong(date)}` });
      } else {
        await save(blob);
        setError("Perangkat ini belum bisa langsung membagikan gambar, jadi gambarnya disimpan. Unggah dari galeri ya.");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Gagal membagikan");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={<p className="text-center text-lg font-bold">Bagikan struk hari ini</p>}>
      <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[20px] shadow-[0_18px_40px_-20px_rgb(0_0_0/0.45)] ring-1 ring-ink/5">
        <div ref={card}>
          <ReceiptStory date={date} entries={entries} />
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Ukuran pas untuk status WhatsApp & story Instagram.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 pb-2">
        <motion.button type="button" whileTap={{ scale: 0.96 }} disabled={!!busy} onClick={() => run("save")} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-surface font-semibold ring-1 ring-ink/10 disabled:opacity-60">
          <Download className="size-4" aria-hidden /> {busy === "save" ? "Menyimpan…" : "Simpan"}
        </motion.button>
        <motion.button type="button" whileTap={{ scale: 0.96 }} disabled={!!busy} onClick={() => run("share")} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-strong font-semibold text-white disabled:opacity-60">
          <Share2 className="size-4" aria-hidden /> {busy === "share" ? "Menyiapkan…" : "Bagikan"}
        </motion.button>
      </div>
      {error && <p role="alert" className="pb-2 text-center text-sm text-accent-text">{error}</p>}
    </Sheet>
  );
}
