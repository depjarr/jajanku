"use client";

import { EmptyState } from "@/components/empty-state";
import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import { softSpring } from "@/components/ui/haptic";
import { useMedia } from "@/components/ui/use-media";
import { formatDayLong } from "@/lib/dates";
import { rupiah } from "@/lib/types";

export type PricePoint = {
  id: string;
  name: string;
  price: number;
  qty: number;
  date: string;
  store: string | null;
  unit: string | null;
  entry_id: string;
};

const short = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}rb` : String(n));

export function PriceView({ query, points }: { query: string; points: PricePoint[] }) {
  if (!query) {
    return (
      <EmptyState className="mt-4" emoji="📈" orbit={["💸", "🧋", "🍪"]} title="Pantau harga jajan" text="Ketik nama jajanan untuk melihat naik-turun harganya." />
    );
  }
  if (points.length === 0) {
    return <p className="mt-6 text-center text-muted">Belum ada catatan harga untuk “{query}”.</p>;
  }

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const last = points[points.length - 1];
  const cheapest = points.find((p) => p.price === min)!;

  const byStore = new Map<string, number[]>();
  for (const p of points) {
    const k = p.store ?? "Tanpa toko";
    byStore.set(k, [...(byStore.get(k) ?? []), p.price]);
  }
  const stores = [...byStore.entries()]
    .map(([name, list]) => ({ name, avg: Math.round(list.reduce((a, b) => a + b, 0) / list.length), min: Math.min(...list), count: list.length }))
    .sort((a, b) => a.avg - b.avg);

  return (
    <div className="mt-5 space-y-5">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Terakhir" value={rupiah(last.price)} sub={formatDayLong(last.date)} dark />
        <Tile label="Termurah" value={rupiah(min)} sub={cheapest.store ?? "—"} />
        <Tile label="Termahal" value={rupiah(max)} />
        <Tile label="Rata-rata" value={rupiah(avg)} sub={`${points.length}× dibeli`} />
      </section>

      {points.length > 1 && <Chart points={points} min={min} max={max} />}

      <section className="window p-4">
        <h3 className="mb-2 text-[17px] font-bold">Per toko</h3>
        <ol className="divide-y divide-ink/5">
          {stores.map((s, i) => (
            <li key={s.name} className="flex items-center gap-3 py-2.5">
              <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${i === 0 && stores.length > 1 ? "bg-primary text-primary-ink" : "bg-soft"}`}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{s.name}</span>
                <span className="text-xs text-muted">{s.count}× · termurah {rupiah(s.min)}</span>
              </span>
              <span className="text-right">
                <span className="block font-semibold">{rupiah(s.avg)}</span>
                <span className="text-xs text-muted">rata-rata</span>
              </span>
            </li>
          ))}
        </ol>
        {stores.length > 1 && <p className="mt-2 flex items-center gap-1.5 text-sm">💡 Paling hemat di <strong>{stores[0].name}</strong>.</p>}
      </section>

      <section className="window p-4">
        <h3 className="mb-2 text-[17px] font-bold">Semua pembelian</h3>
        <ul className="divide-y divide-ink/5">
          {[...points].reverse().map((p) => (
            <li key={p.id}>
              <Link href={`/momen/${p.entry_id}`} className="press flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="text-xs text-muted">
                    {formatDayLong(p.date)}
                    {p.store && ` · ${p.store}`}
                  </span>
                </span>
                <span className="font-semibold">
                  {rupiah(p.price)}
                  {p.unit && <span className="text-xs font-normal text-muted"> /{p.unit}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value, sub, dark }: { label: string; value: string; sub?: string; dark?: boolean }) {
  return (
    <div className={`rounded-[24px] p-4 ${dark ? "bg-strong text-white" : "window"}`}>
      <p className={`text-xs ${dark ? "opacity-70" : "text-muted"}`}>{label}</p>
      <p className="mt-1 truncate font-heading text-xl font-bold">{value}</p>
      {sub && <p className={`truncate text-xs ${dark ? "opacity-70" : "text-muted"}`}>{sub}</p>}
    </div>
  );
}

/** Garis harga per pembelian. Satu seri, tanpa legenda; ketuk titik untuk detail. */
function Chart({ points, min, max }: { points: PricePoint[]; min: number; max: number }) {
  const wide = useMedia("(min-width: 640px)");
  const [hover, setHover] = useState<number | null>(null);
  const W = wide ? 640 : 340;
  const H = 180;
  const padL = 40;
  const padR = 12;
  const padT = 14;
  const padB = 24;
  const lo = Math.max(0, min - (max - min) * 0.2 - 1);
  const hi = max + (max - min) * 0.2 + 1;
  const x = (i: number) => padL + (i / Math.max(1, points.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ");
  const h = hover !== null ? points[hover] : null;

  return (
    <section className="window p-4" aria-label="Grafik harga">
      <div className="mb-1">
        <h3 className="text-[17px] font-bold">Perubahan harga</h3>
        <p className="min-h-5 text-sm text-muted">
          {h ? (
            <>
              <span className="font-semibold text-ink">{rupiah(h.price)}</span> · {formatDayLong(h.date)}
              {h.store && ` · ${h.store}`}
            </>
          ) : (
            "Ketuk titik untuk melihat detail."
          )}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Grafik garis harga per pembelian" onMouseLeave={() => setHover(null)}>
        {[lo, (lo + hi) / 2, hi].map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--c-ink)" strokeOpacity={0.07} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="var(--c-muted)">
              {short(Math.round(t))}
            </text>
          </g>
        ))}
        <motion.path d={d} fill="none" stroke="var(--c-primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: "easeOut" }} />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="var(--c-ink)" strokeOpacity={0.25} strokeDasharray="3 3" />}
        {points.map((p, i) => (
          <g key={p.id} onMouseEnter={() => setHover(i)} onClick={() => setHover(hover === i ? null : i)}>
            <circle cx={x(i)} cy={y(p.price)} r={14} fill="transparent" />
            <motion.circle
              cx={x(i)}
              cy={y(p.price)}
              r={hover === i ? 6 : 4.5}
              fill={p.price === min ? "var(--c-primary)" : "var(--c-surface)"}
              stroke="var(--c-ink)"
              strokeWidth={2}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...softSpring, delay: 0.3 + i * 0.04 }}
              style={{ transformOrigin: `${x(i)}px ${y(p.price)}px` }}
            />
          </g>
        ))}
      </svg>
      <p className="text-xs text-muted">Titik hijau = harga termurah.</p>
    </section>
  );
}
