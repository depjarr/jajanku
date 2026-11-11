"use client";

/**
 * Status "hidup" di browser yang bertahan selama pindah halaman:
 * - toast (pesan kecil + tombol Batalkan / Coba lagi)
 * - jajan yang sedang disimpan (tampil duluan, simpan di belakang layar)
 * - id yang disembunyikan karena sedang dihapus (bisa dibatalkan 5 detik)
 * - "penerbangan" stiker dari kartu ke halaman detail
 */
import { useSyncExternalStore } from "react";
import { deleteEntry, deleteItem, saveEntry, type EntryInput } from "@/app/(app)/actions";
import type { Category, Entry, Item } from "@/lib/types";

function store<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set(next: T) {
      value = next;
      subs.forEach((f) => f());
    },
    subscribe(f: () => void) {
      subs.add(f);
      return () => subs.delete(f);
    },
  };
}

function useStore<T>(s: ReturnType<typeof store<T>>, server: T) {
  return useSyncExternalStore(s.subscribe, s.get, () => server);
}

/* ---------------- penyegar data server ---------------- */

let refresher: () => void = () => {};
/** Dipasang oleh <Toaster /> supaya modul ini bisa memanggil router.refresh(). */
export function setRefresher(fn: () => void) {
  refresher = fn;
}

/* ---------------- toast ---------------- */

export type Toast = {
  id: number;
  emoji: string;
  text: string;
  action?: { label: string; run: () => void };
  duration: number;
};

const toasts = store<Toast[]>([]);
let toastSeq = 0;

export function toast(t: Omit<Toast, "id" | "duration"> & { duration?: number }) {
  const id = ++toastSeq;
  const item: Toast = { duration: 3500, ...t, id };
  // Maksimal 3 sekaligus, yang terbaru di bawah.
  toasts.set([...toasts.get().slice(-2), item]);
  setTimeout(() => dismissToast(id), item.duration);
  return id;
}

export function dismissToast(id: number) {
  toasts.set(toasts.get().filter((t) => t.id !== id));
}

const NO_TOASTS: Toast[] = [];
export const useToasts = () => useStore(toasts, NO_TOASTS);

/* ---------------- hapus dengan Batalkan ---------------- */

const hidden = store<ReadonlySet<string>>(new Set());
const pendingDeletes = new Map<string, () => void>();

const NO_IDS: ReadonlySet<string> = new Set();
export const useHidden = () => useStore(hidden, NO_IDS);

function setHidden(ids: string[], on: boolean) {
  const next = new Set(hidden.get());
  ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
  hidden.set(next);
}

/**
 * Sembunyikan dulu, hapus sungguhan setelah 5 detik.
 * Selama itu ada toast dengan tombol "Batalkan".
 */
function deleteWithUndo(id: string, text: string, run: () => Promise<{ error?: string } | void>) {
  setHidden([id], true);
  let done = false;
  const commit = async () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    pendingDeletes.delete(id);
    const r = await run().catch(() => ({ error: "Gagal menghapus" }));
    if (r && r.error) {
      setHidden([id], false);
      toast({ emoji: "😵", text: `${r.error}. Coba lagi ya.` });
    } else refresher();
  };
  const timer = setTimeout(commit, 5000);
  pendingDeletes.set(id, commit);
  const tid = toast({
    emoji: "🗑️",
    text,
    duration: 5000,
    action: {
      label: "Batalkan",
      run: () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        pendingDeletes.delete(id);
        setHidden([id], false);
        dismissToast(tid);
        toast({ emoji: "↩️", text: "Nggak jadi dihapus", duration: 2000 });
      },
    },
  });
}

export const removeEntry = (id: string, title: string) => deleteWithUndo(id, `“${title}” dihapus`, () => deleteEntry(id));
export const removeItem = (id: string, name: string) => deleteWithUndo(id, `“${name}” dihapus`, () => deleteItem(id));

// Kalau tab ditutup sebelum 5 detik, langsung jalankan penghapusannya.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => [...pendingDeletes.values()].forEach((f) => f()));
}

/* ---------------- simpan instan ---------------- */

export type PendingItem = Item & { store_name?: string | null };
export type PendingEntry = Omit<Entry, "items"> & {
  items: PendingItem[];
  status: "saving" | "failed";
  realId?: string;
  landed?: boolean;
  input: EntryInput;
};

const pending = store<PendingEntry[]>([]);
/** id asli → id sementara, supaya kartu tidak "berkedip" saat data server datang. */
const alias = new Map<string, string>();

const NO_PENDING: PendingEntry[] = [];
export const usePending = () => useStore(pending, NO_PENDING);
export const stableKey = (id: string) => alias.get(id) ?? id;

function patch(id: string, p: Partial<PendingEntry>) {
  pending.set(pending.get().map((e) => (e.id === id ? { ...e, ...p } : e)));
}

export function forgetPending(ids: string[]) {
  if (ids.length) pending.set(pending.get().filter((e) => !ids.includes(e.id)));
}

export function markLanded(ids: string[]) {
  if (ids.length) pending.set(pending.get().map((e) => (ids.includes(e.id) ? { ...e, landed: true } : e)));
}

async function runSave(id: string) {
  const p = pending.get().find((e) => e.id === id);
  if (!p) return;
  patch(id, { status: "saving" });
  const r = await saveEntry(p.input).catch(() => ({ error: "Koneksi terputus", id: undefined }));
  if (r.error || !r.id) {
    patch(id, { status: "failed" });
    toast({
      emoji: "😵",
      text: `${r.error ?? "Gagal menyimpan"}. Jajanmu belum tersimpan.`,
      duration: 8000,
      action: { label: "Coba lagi", run: () => void runSave(id) },
    });
    return;
  }
  alias.set(r.id, id);
  patch(id, { realId: r.id });
  refresher();
  const stickers = p.items.filter((i) => i.sticker_path).length;
  toast({ emoji: "🎉", text: stickers ? `Tersimpan! ${stickers} stiker ditempel` : "Jajan tersimpan!" });
}

/** Tampilkan jajan baru seketika, lalu simpan ke server di belakang layar. */
export function saveInstant(entry: Omit<PendingEntry, "status">) {
  pending.set([{ ...entry, status: "saving" }, ...pending.get()]);
  void runSave(entry.id);
}

export const retrySave = (id: string) => void runSave(id);

/* ---------------- stiker terbang ---------------- */

export type Flight = {
  id: string; // id item
  src: string | null;
  category: Category;
  rect: { left: number; top: number; width: number; height: number };
  rotate: number;
};

const flight = store<Flight | null>(null);
let flightTimer: ReturnType<typeof setTimeout> | undefined;

export const useFlight = () => useStore(flight, null);
export const peekFlight = (id: string | undefined) => {
  const f = flight.get();
  return f && f.id === id ? f : null;
};

export function launchFlight(f: Flight) {
  flight.set(f);
  clearTimeout(flightTimer);
  flightTimer = setTimeout(() => flight.set(null), 4000); // jaga-jaga bila halaman tujuan gagal
}

export function landFlight() {
  clearTimeout(flightTimer);
  flight.set(null);
}
