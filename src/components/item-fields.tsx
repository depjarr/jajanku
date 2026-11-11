"use client";

import { CategoryLabel } from "@/components/icons";
import { useId, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { saveUnit } from "@/app/(app)/actions";
import { CATEGORIES, CATEGORY_LABEL, rupiah, type Category, type Store, type Unit } from "@/lib/types";

export type ItemValues = {
  name: string;
  category: Category;
  store_name: string;
  unit_id: string;
  qty: string;
  price: string; // digit saja, Rupiah
  package_size: string;
  rating: number | null;
  calories: string; // kkal per unit, perkiraan AI (boleh diubah)
  note: string;
};

const KIND_LABEL = { berat: "Berat", volume: "Volume", hitungan: "Hitungan" } as const;

export const inputCls =
  "w-full rounded-xl border-2 border-line bg-bg px-3 py-2 outline-none focus:border-primary";

export function ItemFields({
  value,
  onChange,
  units,
  stores,
  onUnitCreated,
}: {
  value: ItemValues;
  onChange: (patch: Partial<ItemValues>) => void;
  units: Unit[];
  stores: Store[];
  onUnitCreated: (u: Unit) => void;
}) {
  const id = useId();
  const [adding, setAdding] = useState(false);
  const unit = units.find((u) => u.id === value.unit_id);
  const total = Number(value.qty || 0) * Number(value.price || 0);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Nama item</span>
        <input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="mis. Pocky, Es kopi susu"
          className="w-full border-b-2 border-dashed border-line bg-transparent pb-1 font-heading text-xl font-semibold outline-none placeholder:text-muted/60 focus:border-primary"
        />
      </label>

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kategori">
        {CATEGORIES.map((c) => (
          <button
            type="button"
            key={c}
            role="radio"
            aria-checked={value.category === c}
            onClick={() => onChange({ category: c })}
            className={`rounded-full border-2 px-3 py-1 text-xs font-semibold ${
              value.category === c ? "border-ink/70 bg-primary text-primary-ink" : "border-line text-muted"
            }`}
          >
            <CategoryLabel category={c} label={CATEGORY_LABEL[c].label} />
          </button>
        ))}
      </div>

      <label className="flex items-center gap-3 rounded-xl bg-soft px-3 py-2">
        <span className="text-sm text-muted">Toko</span>
        <input
          list={`${id}-stores`}
          value={value.store_name}
          onChange={(e) => onChange({ store_name: e.target.value })}
          placeholder="Indomaret, warung, cafe…"
          className="min-w-0 flex-1 bg-transparent text-right font-semibold outline-none"
        />
        <datalist id={`${id}-stores`}>
          {stores.map((s) => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="rounded-xl bg-soft px-3 py-2">
          <span className="block text-xs text-muted">Dijual per</span>
          <select
            value={value.unit_id}
            onChange={(e) => (e.target.value === "__new" ? setAdding(true) : onChange({ unit_id: e.target.value }))}
            className="w-full bg-transparent font-semibold outline-none"
          >
            <option value="">—</option>
            {(["berat", "volume", "hitungan"] as const).map((kind) => (
              <optgroup key={kind} label={KIND_LABEL[kind]}>
                {units
                  .filter((u) => u.kind === kind)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.symbol} — {u.name}
                    </option>
                  ))}
              </optgroup>
            ))}
            <option value="__new">＋ Tambah unit baru…</option>
          </select>
        </label>
        <label className="rounded-xl bg-soft px-3 py-2">
          <span className="block text-xs text-muted">Harga / {unit?.symbol ?? "unit"}</span>
          <span className="flex items-center gap-1 font-semibold">
            Rp
            <input
              inputMode="numeric"
              value={value.price ? Number(value.price).toLocaleString("id-ID") : ""}
              onChange={(e) => onChange({ price: e.target.value.replace(/\D/g, "").slice(0, 12) })}
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </span>
        </label>
        <label className="rounded-xl bg-soft px-3 py-2">
          <span className="block text-xs text-muted">Jumlah</span>
          <input
            type="number"
            min="0.001"
            step="any"
            inputMode="decimal"
            value={value.qty}
            onChange={(e) => onChange({ qty: e.target.value })}
            className="w-full bg-transparent font-semibold outline-none"
          />
        </label>
        <label className="rounded-xl bg-soft px-3 py-2">
          <span className="block text-xs text-muted">Ukuran kemasan</span>
          <input
            value={value.package_size}
            onChange={(e) => onChange({ package_size: e.target.value })}
            placeholder="opsional, mis. 38 g"
            className="w-full bg-transparent font-semibold outline-none placeholder:font-normal placeholder:text-muted/60"
          />
        </label>
      </div>

      <label className="flex items-center gap-3 rounded-xl bg-soft px-3 py-2">
        <span className="shrink-0 text-lg leading-none" aria-hidden>🔥</span>
        <span className="flex-1">
          <span className="block text-xs text-muted">Kalori per {unit?.symbol ?? "unit"} · perkiraan AI</span>
          <span className="flex items-center gap-1 font-semibold">
            <input
              inputMode="numeric"
              value={value.calories}
              onChange={(e) => onChange({ calories: e.target.value.replace(/\D/g, "").slice(0, 5) })}
              placeholder="—"
              className="w-20 bg-transparent outline-none"
            />
            kkal
          </span>
        </span>
        {Number(value.calories) > 0 && Number(value.qty) > 0 && (
          <span className="text-right text-xs text-muted">
            total
            <span className="block font-semibold text-ink">{Math.round(Number(value.calories) * Number(value.qty)).toLocaleString("id-ID")} kkal</span>
          </span>
        )}
      </label>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-soft px-3 py-2">
        <span className="text-sm text-muted">Rating</span>
        <Stars value={value.rating} onChange={(r) => onChange({ rating: r })} />
      </div>
      <label className="block rounded-xl bg-soft px-3 py-2">
        <span className="block text-xs text-muted">Catatan</span>
        <textarea
          rows={1}
          maxLength={280}
          value={value.note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="mis. enak tapi kemanisan"
          className="w-full resize-none bg-transparent outline-none placeholder:text-muted/60 [field-sizing:content]"
        />
      </label>

      <p className="text-right text-sm">
        Subtotal <span className="font-bold text-accent-text">{rupiah(total)}</span>
      </p>

      {adding && (
        <NewUnitForm
          onCancel={() => setAdding(false)}
          onCreated={(u) => {
            onUnitCreated(u);
            onChange({ unit_id: u.id });
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

function NewUnitForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (u: Unit) => void }) {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [kind, setKind] = useState<Unit["kind"]>("hitungan");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2 rounded-xl border-2 border-dashed border-primary p-3">
      <p className="text-sm font-semibold">Unit baru</p>
      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama (mis. tusuk)" className={inputCls} />
        <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Simbol (tsk)" className={inputCls} />
      </div>
      <select value={kind} onChange={(e) => setKind(e.target.value as Unit["kind"])} className={inputCls}>
        <option value="hitungan">Hitungan</option>
        <option value="berat">Berat</option>
        <option value="volume">Volume</option>
      </select>
      {error && <p role="alert" className="text-sm text-accent-text">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl px-3 py-1.5 text-sm">
          Batal
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveUnit(null, { name, symbol, kind });
              if (r.error || !r.unit) setError(r.error);
              else onCreated(r.unit);
            })
          }
          className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-ink"
        >
          <Plus className="size-4" aria-hidden /> Simpan unit
        </button>
      </div>
    </div>
  );
}

/** Bintang 1–5. Ketuk bintang yang sama untuk menghapus rating. */
export function Stars({ value, onChange, size = "size-6" }: { value: number | null; onChange?: (v: number | null) => void; size?: string }) {
  return (
    <span className="flex gap-0.5" role={onChange ? "radiogroup" : "img"} aria-label={value ? `${value} dari 5 bintang` : "Belum ada rating"}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value !== null && n <= value;
        const star = (
          <svg viewBox="0 0 24 24" className={`${size} transition-transform ${on ? "scale-100" : "scale-90"}`} aria-hidden>
            <path
              d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4-4.7-4.4 6.4-.8z"
              fill={on ? "#F5B300" : "none"}
              stroke={on ? "#F5B300" : "currentColor"}
              strokeOpacity={on ? 1 : 0.3}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          </svg>
        );
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} bintang`} onClick={() => onChange(value === n ? null : n)} className="press p-0.5">
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </span>
  );
}
