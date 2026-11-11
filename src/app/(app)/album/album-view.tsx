"use client";

import { CategoryLabel } from "@/components/icons";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { LargeTitle } from "@/components/ui/large-title";
import { Sticker } from "@/components/sticker";
import { haptic, spring } from "@/components/ui/haptic";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/types";
import { MONTHS } from "@/lib/dates";

export type AlbumItem = {
  id: string;
  name: string;
  category: Category;
  sticker_path: string;
  entry_id: string;
  rating: number | null;
  date: string;
};

/** Album semua stiker jajanan, dikelompokkan per bulan. */
export function AlbumView({ items }: { items: AlbumItem[] }) {
  const [cat, setCat] = useState<Category | null>(null);
  const [onlyFav, setOnlyFav] = useState(false);

  const groups = useMemo(() => {
    const list = items.filter((i) => (!cat || i.category === cat) && (!onlyFav || (i.rating ?? 0) >= 4));
    const map = new Map<string, AlbumItem[]>();
    for (const i of list) {
      const k = i.date.slice(0, 7);
      map.set(k, [...(map.get(k) ?? []), i]);
    }
    return [...map.entries()];
  }, [items, cat, onlyFav]);

  const shown = groups.reduce((s, [, l]) => s + l.length, 0);

  return (
    <main className="mx-auto max-w-5xl">
      <LargeTitle title="Album stiker" subtitle={`${items.length} stiker terkumpul`} />

      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 py-1" role="radiogroup" aria-label="Filter">
        {[null, ...CATEGORIES].map((c) => {
          const active = cat === c;
          return (
            <button
              key={c ?? "all"}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                haptic();
                setCat(c);
              }}
              className="press relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold"
            >
              {active ? <motion.span layoutId="album-pill" transition={spring} className="absolute inset-0 rounded-full bg-strong" /> : <span className="absolute inset-0 rounded-full bg-surface shadow-sm ring-1 ring-ink/5" />}
              <span className={`relative ${active ? "text-white" : "text-ink"}`}>{c ? <CategoryLabel category={c} label={CATEGORY_LABEL[c].label} /> : "Semua"}</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={onlyFav}
          onClick={() => setOnlyFav((v) => !v)}
          className={`press shrink-0 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${onlyFav ? "bg-[#F5B300] text-ink ring-transparent" : "bg-surface ring-ink/5"}`}
        >
          <span className="inline-flex items-center gap-1.5">⭐ Favorit</span>
        </button>
      </div>

      {shown === 0 && (
        items.length ? (
          <EmptyState emoji="🔎" orbit={["🍪", "🧃"]} title="Nggak ada stiker untuk filter ini" text="Coba pilih filter lain." />
        ) : (
          <EmptyState emoji="📒" orbit={["🍩", "🧋", "🍙", "🍟"]} title="Albummu masih kosong" text="Foto jajananmu, stikernya akan terkumpul di sini." cta={{ href: "/tambah", label: "Scan jajan pertamamu" }} />
        )
      )}

      <div className="space-y-8">
        {groups.map(([month, list]) => {
          const [y, m] = month.split("-").map(Number);
          return (
            <section key={month}>
              <h2 className="mb-3 text-lg font-bold">
                {MONTHS[m - 1]} {y} <span className="text-sm font-normal text-muted">· {list.length} stiker</span>
              </h2>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {list.map((it, i) => (
                  <motion.li
                    key={it.id}
                    initial={{ opacity: 0, scale: 0.4, rotate: -12 }}
                    animate={{ opacity: 1, scale: 1, rotate: ((i * 37) % 9) - 4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 16, delay: Math.min(i, 18) * 0.03 }}
                    whileHover={{ scale: 1.08, rotate: 0 }}
                    whileTap={{ scale: 0.92 }}
                  >
                    <Link href={`/momen/${it.entry_id}`} className="group block rounded-3xl bg-soft/50 p-2 text-center" title={it.name}>
                      <Sticker path={it.sticker_path} alt={it.name} className="mx-auto aspect-square w-full" />
                      <span className="mt-1 block truncate text-xs font-semibold">{it.name}</span>
                      {it.rating ? <span className="block text-[10px] text-[#B98600]">{"★".repeat(it.rating)}</span> : null}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
