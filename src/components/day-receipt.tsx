"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Download, Share2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Sticker } from "@/components/sticker";
import { formatDayLong, formatTime } from "@/lib/dates";
import { itemKcal, itemTotal, kcal, rupiah, type Entry, type Item } from "@/lib/types";

type DayItem = Item & { store_name?: string | null };
type DayEntry = Omit<Entry, "items"> & { items: DayItem[] };

const MAX_ROWS = 7;

/**
 * Kartu "struk" jajan satu hari berukuran story (9:16),
 * siap dibagikan ke status WhatsApp / story Instagram.
 */
function ReceiptStory({ date, entries, storeNames }: { date: string; entries: DayEntry[]; storeNames: Record<string, string> }) {
  const items = entries.flatMap((e) =>
    e.items.map((i) => ({ ...i, time: e.eaten_at, store: i.store_id ? storeNames[i.store_id] : i.store_name })),
  );
  const shown = items.slice(0, MAX_ROWS);
  const more = items.slice(MAX_ROWS);
  const total = items.reduce((s, i) => s + itemTotal(i), 0);
  const totalKcal = items.reduce((s, i) => s + itemKcal(i), 0);
  const qtyCount = items.reduce((s, i) => s + Number(i.qty), 0);

  return (
    <div className="relative flex aspect-[9/16] w-full flex-col overflow-hidden bg-soft px-[6%] pb-[6%] pt-[7%] text-ink">
      {/* titik-titik halus di latar */}
      <div aria-hidden className="absolute inset-0 opacity-50 [background-image:radial-gradient(var(--c-primary)_1px,transparent_1.4px)] [background-size:14px_14px]" />

      <div className="relative mb-[5%] flex items-center justify-between">
        <span className="font-heading text-[22px] font-bold tracking-tight">
          jajanku<span className="text-strong">.</span>
        </span>
        <span className="rounded-full bg-strong px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white">{formatDayLong(date)}</span>
      </div>

      <div className="receipt relative flex flex-1 flex-col rounded-t-[18px] bg-surface px-[6%] pb-7 pt-5 shadow-sm">
        <p className="font-heading text-[19px] font-bold">Rincian Jajan</p>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {entries.length} momen · {qtyCount} item
        </p>

        <ul className="flex-1 space-y-2.5">
          {shown.map((i) => {
            const sub = [i.store, i.package_size, i.calories ? `≈${kcal(itemKcal(i))}` : null, i.note ? `“${i.note}”` : null].filter(Boolean).join(" · ");
            return (
              <li key={i.id} className="flex items-start gap-2.5">
                <Sticker path={i.sticker_path} alt="" category={i.category} className="size-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="flex gap-1.5 text-[13px] leading-tight">
                    <span className="shrink-0 text-muted">{Number(i.qty)} x</span>
                    <span className="line-clamp-2 font-semibold">{i.name}</span>
                  </p>
                  {sub && <p className="mt-0.5 line-clamp-1 pl-[1.6em] text-[10.5px] text-muted">{sub}</p>}
                </div>
                <span className="shrink-0 text-[13px] font-semibold">{rupiah(itemTotal(i))}</span>
              </li>
            );
          })}
          {more.length > 0 && (
            <li className="text-center text-[11px] font-semibold text-muted">
              + {more.length} item lainnya · {rupiah(more.reduce((s, i) => s + itemTotal(i), 0))}
            </li>
          )}
        </ul>

        <div className="mt-3 space-y-1 border-t border-dashed border-ink/20 pt-3 text-[12px]">
          {totalKcal > 0 && (
            <p className="flex justify-between text-muted">
              <span>Perkiraan kalori</span>
              <span>≈{kcal(totalKcal)}</span>
            </p>
          )}
          {entries.some((e) => e.eaten_at) && (
            <p className="flex justify-between text-muted">
              <span>Jam jajan</span>
              <span>{[...new Set(entries.map((e) => formatTime(e.eaten_at)).filter(Boolean))].slice(0, 3).join(", ")}</span>
            </p>
          )}
          <p className="flex items-baseline justify-between pt-1">
            <span className="text-[14px] font-bold">Subtotal Jajan ({items.length} menu)</span>
            <span className="font-heading text-[18px] font-bold text-strong">{rupiah(total)}</span>
          </p>
        </div>

        <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.28em] text-muted">** terima kasih sudah nyatat **</p>
        <p className="mt-1 text-center font-mono text-[9px] tracking-[0.1em] text-muted/80">catatjajanku.vercel.app</p>
      </div>
    </div>
  );
}

/** Sheet berisi pratinjau struk + tombol Bagikan / Simpan. */
export function DayShareSheet({
  open,
  onClose,
  date,
  entries,
  storeNames,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  entries: DayEntry[];
  storeNames: Record<string, string>;
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
          <ReceiptStory date={date} entries={entries} storeNames={storeNames} />
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
