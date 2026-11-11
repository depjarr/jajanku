"use client";

import { EmojiBubble } from "@/components/icons";
import { useState, useTransition } from "react";
import { Check, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteStore, deleteUnit, saveStore, saveUnit } from "../actions";
import { inputCls } from "@/components/item-fields";
import { Segmented } from "@/components/ui/segmented";
import type { Store, Unit } from "@/lib/types";

const KINDS = [
  { id: "berat", label: "Berat" },
  { id: "volume", label: "Volume" },
  { id: "hitungan", label: "Hitungan" },
] as const;

export function Manager({ units, stores }: { units: Unit[]; stores: Store[] }) {
  const [tab, setTab] = useState<"unit" | "toko">("unit");
  return (
    <>
      <Segmented
        label="Kelola"
        value={tab}
        onChange={setTab}
        className="mb-4"
        options={[
          { value: "unit", label: `Unit (${units.length})` },
          { value: "toko", label: `Toko (${stores.length})` },
        ]}
      />
      {tab === "unit" ? <Units units={units} /> : <Stores stores={stores} />}
    </>
  );
}

function Units({ units }: { units: Unit[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return (
    <div className="space-y-5">
      {editing === "new" ? (
        <UnitForm onDone={() => setEditing(null)} />
      ) : (
        <AddButton label="Tambah unit" onClick={() => setEditing("new")} />
      )}
      {KINDS.map((k) => {
        const list = units.filter((u) => u.kind === k.id);
        if (!list.length) return null;
        return (
          <section key={k.id}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{k.label}</h2>
            <ul className="window divide-y-2 divide-dashed divide-line">
              {list.map((u) =>
                editing === u.id ? (
                  <li key={u.id} className="p-3">
                    <UnitForm unit={u} onDone={() => setEditing(null)} />
                  </li>
                ) : (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-12 rounded-lg bg-soft px-2 py-0.5 text-center text-sm font-bold">{u.symbol}</span>
                    <span className="flex-1">{u.name}</span>
                    {u.user_id ? (
                      <RowActions onEdit={() => setEditing(u.id)} onDelete={() => deleteUnit(u.id)} name={u.name} />
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted" title="Unit bawaan tidak bisa diubah">
                        <Lock className="size-3.5" aria-hidden /> bawaan
                      </span>
                    )}
                  </li>
                ),
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function UnitForm({ unit, onDone }: { unit?: Unit; onDone: () => void }) {
  const [v, setV] = useState({ name: unit?.name ?? "", symbol: unit?.symbol ?? "", kind: unit?.kind ?? "hitungan" });
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <form
      className="window space-y-2 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveUnit(unit?.id ?? null, v);
          if (r.error) setError(r.error);
          else onDone();
        });
      }}
    >
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <input autoFocus value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Nama unit (mis. tusuk)" className={inputCls} aria-label="Nama unit" />
        <input value={v.symbol} onChange={(e) => setV({ ...v, symbol: e.target.value })} placeholder="Simbol" className={inputCls} aria-label="Simbol" />
      </div>
      <select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as Unit["kind"] })} className={inputCls} aria-label="Jenis">
        {KINDS.map((k) => (
          <option key={k.id} value={k.id}>{k.label}</option>
        ))}
      </select>
      {error && <p role="alert" className="text-sm text-accent-text">{error}</p>}
      <FormButtons pending={pending} onCancel={onDone} />
    </form>
  );
}

function Stores({ stores }: { stores: Store[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return (
    <div className="space-y-4">
      {editing === "new" ? (
        <StoreForm onDone={() => setEditing(null)} />
      ) : (
        <AddButton label="Tambah toko" onClick={() => setEditing("new")} />
      )}
      {stores.length === 0 ? (
        <p className="text-center text-sm text-muted">Belum ada toko. Toko juga otomatis tersimpan saat kamu mengisinya di item.</p>
      ) : (
        <ul className="window divide-y-2 divide-dashed divide-line">
          {stores.map((s) =>
            editing === s.id ? (
              <li key={s.id} className="p-3">
                <StoreForm store={s} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <EmojiBubble emoji="🏪" className="size-8 text-base" />
                <span className="flex-1">{s.name}</span>
                <RowActions onEdit={() => setEditing(s.id)} onDelete={() => deleteStore(s.id)} name={s.name} />
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function StoreForm({ store, onDone }: { store?: Store; onDone: () => void }) {
  const [name, setName] = useState(store?.name ?? "");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <form
      className="window space-y-2 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveStore(store?.id ?? null, name);
          if (r.error) setError(r.error);
          else onDone();
        });
      }}
    >
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama toko" className={inputCls} aria-label="Nama toko" />
      {error && <p role="alert" className="text-sm text-accent-text">{error}</p>}
      <FormButtons pending={pending} onCancel={onDone} />
    </form>
  );
}

function RowActions({ onEdit, onDelete, name }: { onEdit: () => void; onDelete: () => Promise<unknown>; name: string }) {
  const [pending, start] = useTransition();
  return (
    <span className="flex gap-1">
      <button type="button" onClick={onEdit} aria-label={`Ubah ${name}`} className="grid size-8 place-items-center rounded-full hover:bg-soft">
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm(`Hapus "${name}"? Item yang memakainya akan dikosongkan.`) && start(async () => void (await onDelete()))}
        aria-label={`Hapus ${name}`}
        className="grid size-8 place-items-center rounded-full text-accent-text hover:bg-accent-text/10"
      >
        <Trash2 className="size-4" />
      </button>
    </span>
  );
}

function FormButtons({ pending, onCancel }: { pending: boolean; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onCancel} className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm">
        <X className="size-4" aria-hidden /> Batal
      </button>
      <button disabled={pending} className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-ink disabled:opacity-60">
        <Check className="size-4" aria-hidden /> Simpan
      </button>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-3 font-semibold text-muted">
      <Plus className="size-5" aria-hidden /> {label}
    </button>
  );
}
