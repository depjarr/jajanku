"use client";

import { LineChart } from "lucide-react";
import { useState, useTransition } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateEntry, updateItem } from "../../actions";
import { peekFlight, removeEntry, removeItem, useHidden } from "@/lib/live";
import { FlyTarget } from "@/components/flight";
import { PageHeader } from "@/components/page-header";
import { ItemFields, Stars, inputCls, type ItemValues } from "@/components/item-fields";
import Link from "next/link";
import { Sticker } from "@/components/sticker";
import { itemKcal, itemTotal, kcal, rupiah, type Entry, type Item, type Store, type Unit } from "@/lib/types";
import { formatDayLong, formatTime } from "@/lib/dates";

export function MomenEditor({
  entry,
  units: initialUnits,
  stores,
  photoUrl,
}: {
  entry: Entry;
  units: Unit[];
  stores: Store[];
  photoUrl: string | null;
}) {
  const router = useRouter();
  const hidden = useHidden();
  const items = entry.items.filter((i) => !hidden.has(i.id));
  // Stiker yang datang "terbang" dari kartu tidak perlu animasi muncul lagi.
  const [flownId] = useState(() => entry.items.find((i) => peekFlight(i.id))?.id);
  const [units, setUnits] = useState(initialUnits);
  const [editingMeta, setEditingMeta] = useState(false);
  const [meta, setMeta] = useState({
    title: entry.title,
    eaten_on: entry.eaten_on,
    eaten_at: entry.eaten_at?.slice(0, 5) ?? "",
    location: entry.location ?? "",
  });
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const total = items.reduce((s, i) => s + itemTotal(i), 0);
  const storeName = new Map(stores.map((s) => [s.id, s.name]));

  return (
    <main className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={entry.title} subtitle={`${formatDayLong(entry.eaten_on)}${entry.eaten_at ? ` · ${formatTime(entry.eaten_at)}` : ""}${entry.location ? ` · ${entry.location}` : ""}`} back={`/?d=${entry.eaten_on}`} />

      <section className="window p-4">
        <div className="flex flex-wrap items-end justify-center gap-1 py-2">
          {items.map((it, k) => (
            <FlyTarget key={it.id} id={it.id}>
              <Sticker path={it.sticker_path} alt={it.name} category={it.category} className={`size-28 text-4xl ${it.id === flownId ? "" : "animate-pop"}`} style={{ rotate: `${(k % 3 - 1) * 6}deg`, animationDelay: `${k * 90}ms` }} />
            </FlyTarget>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between border-t-2 border-dashed border-line pt-3">
          <span className="text-muted">{items.length} item</span>
          <span className="font-heading text-2xl font-bold text-accent-text">{rupiah(total)}</span>
        </div>
      </section>

      {editingMeta ? (
        <section className="window space-y-2 p-4">
          <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} className={inputCls} aria-label="Judul" />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={meta.eaten_on} onChange={(e) => setMeta({ ...meta, eaten_on: e.target.value })} className={inputCls} aria-label="Tanggal" />
            <input type="time" value={meta.eaten_at} onChange={(e) => setMeta({ ...meta, eaten_at: e.target.value })} className={inputCls} aria-label="Jam" />
          </div>
          <input value={meta.location} onChange={(e) => setMeta({ ...meta, location: e.target.value })} placeholder="Lokasi" className={inputCls} aria-label="Lokasi" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditingMeta(false)} className="rounded-xl px-3 py-2">Batal</button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await updateEntry(entry.id, meta);
                  if (r.error) setError(r.error);
                  else setEditingMeta(false);
                })
              }
              className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-ink"
            >
              Simpan
            </button>
          </div>
        </section>
      ) : (
        <button type="button" onClick={() => setEditingMeta(true)} className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Pencil className="size-4" aria-hidden /> Ubah judul, tanggal, lokasi
        </button>
      )}

      {error && <p role="alert" className="rounded-xl bg-accent-text/10 px-3 py-2 text-sm text-accent-text">{error}</p>}

      <ul className="space-y-4">
        {items.map((it) => (
          <li key={it.id}>
            <ItemRow item={it} units={units} stores={stores} storeName={storeName.get(it.store_id ?? "") ?? ""} onUnitCreated={(u) => setUnits((us) => [...us, u])} />
          </li>
        ))}
      </ul>

      {photoUrl && (
        <details className="window p-3">
          <summary className="cursor-pointer font-semibold">Foto asli</summary>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt={`Foto asli ${entry.title}`} className="mt-3 w-full rounded-xl" />
        </details>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          removeEntry(entry.id, entry.title);
          router.push(`/?m=${entry.eaten_on.slice(0, 7)}`);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-accent-text/40 py-3 font-semibold text-accent-text"
      >
        <Trash2 className="size-4" aria-hidden /> Hapus momen
      </button>
    </main>
  );
}

function ItemRow({
  item,
  units,
  stores,
  storeName,
  onUnitCreated,
}: {
  item: Item;
  units: Unit[];
  stores: Store[];
  storeName: string;
  onUnitCreated: (u: Unit) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<ItemValues>({
    name: item.name,
    category: item.category,
    store_name: storeName,
    unit_id: item.unit_id ?? "",
    qty: String(Number(item.qty)),
    price: String(Math.round(Number(item.price))),
    package_size: item.package_size ?? "",
    rating: item.rating ?? null,
    calories: item.calories ? String(item.calories) : "",
    note: item.note ?? "",
  });
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const unit = units.find((u) => u.id === item.unit_id);

  return (
    <div className="ticket relative px-4 drop-shadow-[0_3px_0_var(--c-line)]">
      <div className="flex items-center gap-3">
        <Sticker path={item.sticker_path} alt={item.name} category={item.category} className="size-16 shrink-0 text-2xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-lg font-semibold">{item.name}</p>
          <p className="text-sm text-muted">
            {Number(item.qty)} {unit?.symbol ?? ""} × {rupiah(Number(item.price))}
            {storeName && ` · ${storeName}`}
            {item.package_size && ` · ${item.package_size}`}
            {item.calories ? ` · ≈${kcal(itemKcal(item))}` : ""}
          </p>
        </div>
        <p className="font-bold">{rupiah(itemTotal(item))}</p>
      </div>
      {(item.rating || item.note) && !editing && (
        <div className="mt-2 rounded-xl bg-soft/70 px-3 py-2 text-sm">
          {item.rating ? <Stars value={item.rating} size="size-4" /> : null}
          {item.note && <p className="mt-0.5 text-muted">“{item.note}”</p>}
        </div>
      )}

      {editing ? (
        <div className="mt-3 border-t-2 border-dashed border-line pt-3">
          <ItemFields value={values} onChange={(p) => setValues((v) => ({ ...v, ...p }))} units={units} stores={stores} onUnitCreated={onUnitCreated} />
          {error && <p role="alert" className="mt-2 text-sm text-accent-text">{error}</p>}
          <div className="mt-3 flex justify-between gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                removeItem(item.id, item.name);
              }}
              className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-accent-text"
            >
              <Trash2 className="size-4" aria-hidden /> Hapus
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} className="rounded-xl px-3 py-2 text-sm">Batal</button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await updateItem({ ...values, id: item.id, unit_id: values.unit_id || null, price: values.price || "0", calories: values.calories || null });
                    if (r.error) setError(r.error);
                    else setEditing(false);
                  })
                }
                className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-ink"
              >
                <Check className="size-4" aria-hidden /> Simpan
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-4">
          <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 text-sm font-semibold text-muted">
            <Pencil className="size-3.5" aria-hidden /> Ubah
          </button>
          <Link href={`/harga?q=${encodeURIComponent(item.name)}`} className="text-sm font-semibold text-muted">
            <span className="inline-flex items-center gap-1"><LineChart className="size-3.5" aria-hidden /> Riwayat harga</span>
          </Link>
        </div>
      )}
    </div>
  );
}
