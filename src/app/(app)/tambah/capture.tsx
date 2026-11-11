"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Grid2x2, ImagePlus, Plus, SwitchCamera, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveInstant } from "@/lib/live";
import { ItemFields, inputCls, type ItemValues } from "@/components/item-fields";
import { Sticker } from "@/components/sticker";
import { motion } from "motion/react";
import { AnalyzingDust } from "./analyzing-dust";
import { createClient } from "@/lib/supabase/client";
import { makeSticker, preloadCutout } from "@/lib/sticker-client";
import { CATEGORY_LABEL, rupiah, type Category, type DraftItem, type Store, type Unit } from "@/lib/types";

type Mode = "sekali" | "satu" | "struk";
type Receipt = {
  store?: string | null;
  date?: string | null;
  time?: string | null;
  items: { name: string; qty: number; unit_price: number; category: Category; match: number | null; kcal?: number | null }[];
};
type Draft = ItemValues & { key: string; sticker_path: string | null; cutting?: boolean };
type Phase = { kind: "capture" } | { kind: "analyzing"; preview: string } | { kind: "review" };

const MODE_HINT: Record<Mode, string> = {
  sekali: "Satu foto untuk semua jajanan di meja.",
  satu: "Satu foto untuk satu jajanan, hasil stiker paling rapi.",
  struk: "Foto struk belanja, nama dan harga terisi otomatis.",
};

/** Kecilkan foto di browser sebelum upload (hemat kuota & lebih cepat). */
async function shrink(source: Blob, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(source);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.88));
}

function nowTime() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).format(new Date());
}

export function Capture({
  units: initialUnits,
  stores,
  defaultDate,
  userId,
  cutoutInBrowser,
}: {
  units: Unit[];
  stores: Store[];
  defaultDate: string;
  userId: string;
  cutoutInBrowser: boolean;
}) {
  const router = useRouter();
  const [units, setUnits] = useState(initialUnits);
  const [mode, setMode] = useState<Mode>("sekali");
  const [keepOriginal, setKeepOriginal] = useState(false);
  const [grid, setGrid] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "capture" });
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [receiptBusy, setReceiptBusy] = useState(false);
  const receiptRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(nowTime);
  const [location, setLocation] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saving, startSave] = useTransition();

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Mode gratis: unduh model penghapus latar sejak awal supaya stiker lebih cepat jadi.
  useEffect(() => {
    if (cutoutInBrowser) preloadCutout();
  }, [cutoutInBrowser]);

  // Kamera langsung
  useEffect(() => {
    if (phase.kind !== "capture") return;
    let stream: MediaStream | undefined;
    let cancelled = false;
    const media = navigator.mediaDevices
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 } }, audio: false })
      : Promise.reject(new Error("no camera"));
    media
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        setCameraError(false);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setCameraError(true));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [phase.kind, facing]);

  const unitBySymbol = useCallback(
    (symbol: string | null) => {
      const s = symbol?.toLowerCase();
      return (
        units.find((u) => u.symbol.toLowerCase() === s || u.name.toLowerCase() === s) ??
        units.find((u) => u.symbol === "pc")
      )?.id ?? "";
    },
    [units],
  );

  async function readReceipt(blob: Blob, names: string[]): Promise<Receipt> {
    const fd = new FormData();
    fd.append("photo", await shrink(blob, 2000), "struk.jpg");
    fd.append("names", JSON.stringify(names));
    const res = await fetch("/api/receipt", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Gagal membaca struk");
    return json as Receipt;
  }

  function receiptDraft(it: Receipt["items"][number], store?: string | null): Draft {
    return {
      key: crypto.randomUUID(),
      sticker_path: null,
      name: it.name,
      category: it.category,
      store_name: store ?? "",
      unit_id: unitBySymbol("pc"),
      qty: String(it.qty || 1),
      price: String(Math.round(it.unit_price || 0)),
      package_size: "",
      calories: it.kcal ? String(it.kcal) : "",
      rating: null,
      note: "",
    };
  }

  /** Di halaman cek: baca struk lalu isi harga item yang cocok, sisanya jadi item baru. */
  async function fillFromReceipt(blob: Blob) {
    setError(undefined);
    setReceiptBusy(true);
    try {
      const r = await readReceipt(blob, drafts.map((d) => d.name));
      const matched = r.items.filter((it) => it.match != null).length;
      const extra = r.items.filter((it) => it.match == null);
      setDrafts((ds) => [
        ...ds.map((d, i) => {
          const m = r.items.find((it) => it.match === i);
          const store_name = d.store_name || r.store || "";
          return m
            ? { ...d, store_name, qty: String(m.qty || 1), price: String(Math.round(m.unit_price)), calories: d.calories || (m.kcal ? String(m.kcal) : "") }
            : { ...d, store_name };
        }),
        ...extra.map((it) => receiptDraft(it, r.store)),
      ]);
      if (r.date) setDate(r.date);
      if (r.time) setTime(r.time);
      setNotice(`Struk terbaca: ${matched} harga terisi${extra.length ? `, ${extra.length} item baru ditambahkan` : ""}. Cek lagi sebelum simpan ya.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membaca struk");
    } finally {
      setReceiptBusy(false);
    }
  }

  async function analyze(blob: Blob) {
    setError(undefined);

    if (mode === "struk") {
      setPhase({ kind: "analyzing", preview: URL.createObjectURL(blob) });
      try {
        const r = await readReceipt(blob, []);
        setDrafts(r.items.map((it) => receiptDraft(it, r.store)));
        setTitle((t) => t || (r.store ? `Belanja di ${r.store}` : "Belanja"));
        if (r.date) setDate(r.date);
        if (r.time) setTime(r.time);
        setNotice(`${r.items.length} item terbaca dari struk. Item dari struk belum punya stiker, jadi tampil sebagai ikon kategori.`);
        setPhase({ kind: "review" });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal membaca struk");
        setPhase({ kind: "capture" });
      }
      return;
    }

    const small = await shrink(blob);
    setPhase({ kind: "analyzing", preview: URL.createObjectURL(small) });

    const fd = new FormData();
    fd.append("photo", small, "foto.jpg");
    fd.append("mode", mode);
    fd.append("keepOriginal", keepOriginal ? "1" : "0");

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const json = (await res.json()) as {
        items?: DraftItem[];
        photoPath?: string | null;
        error?: string;
        cutout?: "client" | "server";
        notice?: string;
      };
      if (!res.ok || !json.items) throw new Error(json.error ?? "Gagal menganalisis foto");

      const clientCut = json.cutout === "client";
      setNotice(json.notice);
      setPhotoPath(json.photoPath ?? null);
      setDrafts(
        json.items.map((it) => ({
          key: it.key,
          sticker_path: it.sticker_path,
          cutting: clientCut,
          name: it.name,
          category: it.category,
          store_name: "",
          unit_id: unitBySymbol(it.unit_symbol),
          qty: "1",
          price: "",
          package_size: it.package_size ?? "",
          calories: it.calories ? String(it.calories) : "",
          rating: null,
          note: "",
        })),
      );
      setTitle((t) => t || json.items![0]?.name || "Jajan");
      setPhase({ kind: "review" });
      if (clientCut) void cutStickers(small, json.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menganalisis foto");
      setPhase({ kind: "capture" });
    }
  }

  /** Potong tiap item jadi stiker di browser, satu per satu, lalu unggah ke Supabase. */
  async function cutStickers(photo: Blob, items: DraftItem[]) {
    const supabase = createClient();
    for (const it of items) {
      let path: string | null = null;
      try {
        const webp = await makeSticker(photo, it.box_2d);
        const target = `${userId}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage.from("stickers").upload(target, webp, { contentType: "image/webp" });
        if (!error) path = target;
      } catch (e) {
        console.error("Gagal membuat stiker", e);
      }
      setDrafts((ds) => ds.map((d) => (d.key === it.key ? { ...d, sticker_path: path, cutting: false } : d)));
    }
  }

  function shoot() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return fileRef.current?.click();
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    canvas.toBlob((b) => b && analyze(b), "image/jpeg", 0.92);
  }

  function update(key: string, patch: Partial<ItemValues>) {
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function addManual() {
    setDrafts((ds) => [
      ...ds,
      {
        key: crypto.randomUUID(),
        sticker_path: null,
        name: "",
        category: "makanan",
        store_name: ds.at(-1)?.store_name ?? "",
        unit_id: unitBySymbol("pc"),
        qty: "1",
        price: "",
        package_size: "",
        calories: "",
        rating: null,
        note: "",
      },
    ]);
  }

  function save() {
    setError(undefined);
    // Cek ringan di browser dulu, supaya jarang gagal setelah pindah halaman.
    if (!title.trim()) return setError("Judul momen wajib diisi");
    const bad = drafts.find((d) => !d.name.trim());
    if (bad) return setError("Setiap item perlu nama");
    if (drafts.some((d) => !(Number(d.qty) > 0))) return setError("Jumlah harus lebih dari 0");
    if (drafts.some((d) => Number(d.price || 0) < 0)) return setError("Harga tidak boleh minus");

    const input = {
      title,
      eaten_on: date,
      eaten_at: time,
      location,
      photo_path: photoPath,
      items: drafts.map((d) => ({
        name: d.name,
        category: d.category,
        store_name: d.store_name,
        unit_id: d.unit_id || null,
        qty: d.qty,
        price: d.price || "0",
        package_size: d.package_size,
        rating: d.rating,
        calories: d.calories || null,
        note: d.note,
        sticker_path: d.sticker_path,
      })),
    };
    const tempId = `tmp-${crypto.randomUUID()}`;
    saveInstant({
      id: tempId,
      title: title.trim(),
      eaten_on: date,
      eaten_at: time || null,
      location: location.trim() || null,
      photo_path: photoPath,
      input,
      items: drafts.map((d, i) => ({
        id: `${tempId}-${i}`,
        entry_id: tempId,
        name: d.name.trim(),
        category: d.category,
        store_id: null,
        store_name: d.store_name.trim() || null,
        unit_id: d.unit_id || null,
        qty: Number(d.qty),
        price: Number(d.price || 0),
        package_size: d.package_size || null,
        sticker_path: d.sticker_path,
        rating: d.rating,
        calories: d.calories ? Number(d.calories) : null,
        note: d.note || null,
      })),
    });
    startSave(() => router.push(`/?m=${date.slice(0, 7)}`));
  }

  const total = drafts.reduce((s, d) => s + Number(d.qty || 0) * Number(d.price || 0), 0);

  // ---------------- Review ----------------
  if (phase.kind === "review") {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Cek dulu, ya</h1>
          <Link href="/" aria-label="Batal" className="grid size-10 place-items-center rounded-full bg-surface">
            <X className="size-5" />
          </Link>
        </div>
        <p className="-mt-2 text-muted">{mode === "struk" ? `Ada ${drafts.length} item dari struk.` : `AI menemukan ${drafts.length} item.`} Lengkapi harga dan unitnya.</p>
        {notice && <p role="status" className="rounded-2xl bg-soft px-4 py-3 text-sm">{notice}</p>}

        <section className="window space-y-3 p-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul momen, mis. Makan di Blok M" className={`${inputCls} font-heading text-lg font-semibold`} aria-label="Judul momen" />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} aria-label="Tanggal" />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} aria-label="Jam" />
          </div>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lokasi (opsional)" className={inputCls} aria-label="Lokasi" />
        </section>

        <ul className="space-y-4">
          {drafts.map((d, i) => (
            <motion.li key={d.key} layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 300, damping: 30, delay: i * 0.08 }} className="ticket relative px-4 drop-shadow-[0_6px_14px_rgb(0_0_0/0.08)]">
              <div className="mb-3 flex items-start justify-between gap-3 border-b-2 border-line pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">Item {i + 1}</p>
                  <p className="text-sm text-muted">{CATEGORY_LABEL[d.category].label}</p>
                </div>
                <motion.span
                  initial={{ y: -260, scale: 0.3, rotate: -40, opacity: 0 }}
                  animate={{ y: 0, scale: 1, rotate: -4, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.15 + i * 0.12 }}
                  whileHover={{ rotate: 4, scale: 1.05 }}
                  className="block"
                >
                  {d.cutting ? (
                    <span className="analyzing relative grid size-24 place-items-center overflow-hidden rounded-3xl bg-soft text-center text-[11px] font-semibold text-muted" role="status">
                      <span className="mx-auto block text-xl leading-none" aria-hidden>✂️</span>
                      memotong…
                    </span>
                  ) : (
                    <Sticker path={d.sticker_path} alt={d.name || "Item"} category={d.category} className="size-24 text-3xl" />
                  )}
                </motion.span>
                <button type="button" onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))} aria-label={`Hapus item ${i + 1}`} className="absolute right-3 top-5 grid size-8 place-items-center rounded-full bg-soft text-muted">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <ItemFields value={d} onChange={(p) => update(d.key, p)} units={units} stores={stores} onUnitCreated={(u) => setUnits((us) => [...us, u])} />
            </motion.li>
          ))}
        </ul>

        <button type="button" onClick={addManual} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-3 font-semibold text-muted">
          <Plus className="size-5" aria-hidden /> Tambah item manual
        </button>

        {mode !== "struk" && (
          <button
            type="button"
            disabled={receiptBusy}
            onClick={() => receiptRef.current?.click()}
            className={`relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-soft py-3 font-semibold disabled:opacity-80 ${receiptBusy ? "analyzing" : ""}`}
          >
            <span aria-hidden>🧾</span> {receiptBusy ? "Membaca struk…" : "Isi harga dari struk"}
          </button>
        )}
        <input
          ref={receiptRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void fillFromReceipt(f);
          }}
        />

        {error && <p role="alert" className="rounded-xl bg-accent-text/10 px-3 py-2 text-sm text-accent-text">{error}</p>}

        <div className="sticky bottom-3 flex items-center gap-3 rounded-2xl border-2 border-ink/70 bg-surface p-3 shadow-[0_6px_0_0_var(--c-line)]">
          <div className="flex-1">
            <p className="text-xs text-muted">Total</p>
            <p className="font-heading text-xl font-bold">{rupiah(total)}</p>
          </div>
          <button type="button" onClick={() => setPhase({ kind: "capture" })} className="rounded-xl px-4 py-2.5 font-semibold">
            Ulang
          </button>
          <button type="button" disabled={saving || drafts.length === 0 || drafts.some((d) => d.cutting)} onClick={save} className="rounded-xl bg-strong px-5 py-2.5 font-semibold text-white disabled:opacity-50">
            {saving ? "Menyimpan…" : drafts.some((d) => d.cutting) ? "Tunggu stiker…" : "Simpan"}
          </button>
        </div>
      </div>
    );
  }

  // ---------------- Kamera / Analisis ----------------
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-xl flex-col md:min-h-[calc(100dvh-4rem)] md:max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ada apa aja di meja?</h1>
        <Link href="/" aria-label="Tutup" className="grid size-10 place-items-center rounded-full bg-surface">
          <X className="size-5" />
        </Link>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-[32px] bg-strong shadow-[0_20px_40px_-16px_rgb(0_0_0/0.5)]">
        {phase.kind === "analyzing" ? (
          <div className="analyzing absolute inset-0">
            { }
            <motion.img
              src={phase.preview}
              alt="Foto yang sedang dianalisis"
              className="size-full object-cover"
              initial={{ filter: "blur(0px) saturate(1)", scale: 1 }}
              animate={{ filter: "blur(6px) saturate(0.6)", scale: 1.06 }}
              transition={{ duration: 4, ease: "easeOut" }}
            />
            <AnalyzingDust />
            <div className="glass absolute inset-x-0 bottom-6 mx-auto w-fit rounded-full px-4 py-2 text-sm font-semibold" role="status">
              <span className="inline-flex items-center gap-1.5">✨ AI lagi memotong jajananmu jadi stiker…</span>
            </div>
          </div>
        ) : cameraError ? (
          <button type="button" onClick={() => fileRef.current?.click()} className="absolute inset-0 grid place-items-center p-6 text-center text-white">
            <span>
              <ImagePlus className="mx-auto mb-2 size-10" aria-hidden />
              Kamera tidak tersedia.
              <br />
              <span className="underline">Pilih foto dari galeri</span>
            </span>
          </button>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 size-full object-cover" />
        )}

        {grid && phase.kind === "capture" && (
          <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="border border-white/30" />
            ))}
          </div>
        )}

        {phase.kind === "capture" && (
          <>
            <div className="absolute inset-x-3 top-3 flex justify-between">
              <button type="button" onClick={() => setGrid((g) => !g)} aria-pressed={grid} className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-sm text-white backdrop-blur">
                <Grid2x2 className="size-4" aria-hidden /> Kisi
              </button>
              <button type="button" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} aria-label="Ganti kamera" className="grid size-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur">
                <SwitchCamera className="size-4" />
              </button>
            </div>
            <div className="absolute inset-x-0 bottom-4 mx-auto flex w-fit rounded-full bg-black/45 p-1 backdrop-blur" role="radiogroup" aria-label="Mode foto">
              {(["sekali", "satu", "struk"] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold ${mode === m ? "bg-surface text-ink" : "text-white"}`}
                >
                  {m === "sekali" ? "Sekali jepret" : m === "satu" ? "Satu per satu" : "Struk"}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="mt-3 text-center text-sm text-muted">{MODE_HINT[mode]}</p>
      {error && <p role="alert" className="mt-2 rounded-xl bg-accent-text/10 px-3 py-2 text-center text-sm text-accent-text">{error}</p>}

      <div className="mt-4 grid grid-cols-3 items-center pb-[max(env(safe-area-inset-bottom),8px)]">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={phase.kind !== "capture"} className="flex flex-col items-center gap-1 text-xs text-muted">
          <span className="grid size-12 place-items-center rounded-2xl bg-surface">
            <ImagePlus className="size-5" aria-hidden />
          </span>
          Impor foto
        </button>
        <button
          type="button"
          onClick={shoot}
          disabled={phase.kind !== "capture"}
          aria-label="Jepret"
          className="mx-auto grid size-20 place-items-center rounded-full border-4 border-ink/70 bg-surface disabled:opacity-50"
        >
          <span className="size-14 rounded-full bg-accent" />
        </button>
        <label className="flex flex-col items-center gap-1 text-xs text-muted">
          <input type="checkbox" checked={keepOriginal} onChange={(e) => setKeepOriginal(e.target.checked)} className="peer sr-only" />
          <span className="relative h-7 w-12 rounded-full bg-line transition peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-surface after:transition peer-checked:after:translate-x-5" />
          Simpan foto asli
        </label>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) analyze(f);
        }}
      />
    </div>
  );
}
