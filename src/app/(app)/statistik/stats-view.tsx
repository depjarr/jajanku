"use client";

import { CategoryLabel } from "@/components/icons";
import Link from "next/link";
import { motion } from "motion/react";
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Download, Pencil } from "lucide-react";
import { saveBudget } from "../actions";
import { LargeTitle } from "@/components/ui/large-title";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { softSpring } from "@/components/ui/haptic";
import { useMedia } from "@/components/ui/use-media";
import { NotifyToggle } from "@/components/budget-alert";
import { CATEGORIES, CATEGORY_LABEL, kcal, rupiah, type Category } from "@/lib/types";
import { MONTHS, shiftMonth } from "@/lib/dates";

export type StatsData = {
  year: number;
  month: number;
  monthKey: string;
  today: string;
  budget: number | null;
  daily: number[];
  kcalTotal: number;
  byCat: Record<Category, number>;
  topItems: { name: string; total: number; count: number }[];
  topStores: { name: string; total: number }[];
};

const short = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt` : n >= 1000 ? `${Math.round(n / 1000)}rb` : String(n);

export function StatsView({ data }: { data: StatsData }) {
  const total = data.daily.reduce((a, b) => a + b, 0);
  const activeDays = data.daily.filter((v) => v > 0).length;
  const isCurrent = data.today.startsWith(data.monthKey);
  const elapsed = isCurrent ? Number(data.today.slice(8)) : data.daily.length;

  return (
    <main className="mx-auto max-w-4xl">
      <LargeTitle
        title="Statistik"
        subtitle="Ke mana aja uang jajanmu pergi."
        right={
          <span className="flex gap-2">
            <Link href={`/rekap?m=${data.monthKey}`} className="press flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-primary-ink">
              🎁 Rekap
            </Link>
            <a href={`/api/export?m=${data.monthKey}`} className="press flex items-center gap-1.5 rounded-full bg-strong px-3.5 py-2 text-sm font-semibold text-white" download>
              <Download className="size-4" aria-hidden /> Excel
            </a>
          </span>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[22px] font-bold">
          {MONTHS[data.month - 1]} <span className="text-muted">{data.year}</span>
        </h2>
        <div className="flex gap-1">
          <Link href={`/statistik?m=${shiftMonth(data.year, data.month, -1)}`} aria-label="Bulan sebelumnya" className="press grid size-9 place-items-center rounded-full bg-surface shadow-sm ring-1 ring-ink/5">
            <ChevronLeft className="size-5" />
          </Link>
          <Link href={`/statistik?m=${shiftMonth(data.year, data.month, 1)}`} aria-label="Bulan berikutnya" className="press grid size-9 place-items-center rounded-full bg-surface shadow-sm ring-1 ring-ink/5">
            <ChevronRight className="size-5" />
          </Link>
        </div>
      </div>

      {/* Angka utama */}
      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5 [&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1">
        <Tile label="Total" value={total} fmt={rupiah} big />
        <Tile label="Rata-rata / hari" value={elapsed ? Math.round(total / elapsed) : 0} fmt={rupiah} />
        <Tile label="Hari jajan" value={activeDays} fmt={(n) => `${n} hari`} />
        <Tile label="Hari terboros" value={Math.max(0, ...data.daily)} fmt={rupiah} />
        <Tile label={`Kalori · ≈${activeDays ? Math.round(data.kcalTotal / activeDays).toLocaleString("id-ID") : 0}/hari jajan`} value={data.kcalTotal} fmt={(n) => `≈${kcal(n)}`} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <DailyChart data={data} />
          <CategoryBars byCat={data.byCat} total={total} />
        </div>
        <div className="space-y-5">
          <BudgetCard budget={data.budget} total={total} />
          <TopList title="Paling sering dibeli" rows={data.topItems.map((i) => ({ label: i.name, sub: `${i.count}× beli`, value: i.total }))} empty="Belum ada item bulan ini." />
          <TopList title="Toko favorit" rows={data.topStores.map((s) => ({ label: s.name, value: s.total }))} empty="Isi nama toko saat mencatat jajan." />
        </div>
      </div>
    </main>
  );
}

function Tile({ label, value, fmt, big }: { label: string; value: number; fmt: (n: number) => string; big?: boolean }) {
  return (
    <div className={`window p-4 ${big ? "col-span-2 bg-strong text-white md:col-span-1" : ""}`}>
      <p className={`text-xs ${big ? "opacity-70" : "text-muted"}`}>{label}</p>
      <p className="mt-1 truncate font-heading text-xl font-bold md:text-2xl">
        <AnimatedNumber value={value} format={fmt} />
      </p>
    </div>
  );
}

/** Grafik batang pengeluaran per hari. Satu seri, jadi tanpa legenda. */
function DailyChart({ data }: { data: StatsData }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.daily);
  const wide = useMedia("(min-width: 640px)");
  // viewBox mengikuti lebar layar supaya teks sumbu tetap terbaca di HP.
  const W = wide ? 640 : 340;
  const H = wide ? 200 : 180;
  const padL = 36;
  const padB = 22;
  const n = data.daily.length;
  const slot = (W - padL) / n;
  const barW = Math.max(4, Math.min(14, slot - 2));
  const ticks = [0, max / 2, max];
  const avgActive = data.daily.filter((v) => v > 0);
  const avg = avgActive.length ? avgActive.reduce((a, b) => a + b, 0) / avgActive.length : 0;
  const y = (v: number) => H - padB - (v / max) * (H - padB - 8);
  const todayIdx = data.today.startsWith(data.monthKey) ? Number(data.today.slice(8)) - 1 : -1;

  return (
    <section className="window p-4" aria-label="Pengeluaran per hari">
      <div className="mb-2">
        <h3 className="text-[17px] font-bold">Pengeluaran per hari</h3>
        <p className="min-h-5 text-sm text-muted">
          {hover !== null ? (
            <>
              <span className="font-semibold text-ink">{hover + 1} {MONTHS[data.month - 1]}</span> · {rupiah(data.daily[hover])}
            </>
          ) : (
            <>Rata-rata hari jajan {rupiah(Math.round(avg))}</>
          )}
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Grafik batang pengeluaran harian" onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="var(--c-ink)" strokeOpacity={i === 0 ? 0.15 : 0.06} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="var(--c-muted)">
              {short(Math.round(t))}
            </text>
          </g>
        ))}
        {avg > 0 && (
          <g>
            <line x1={padL} x2={W} y1={y(avg)} y2={y(avg)} stroke="var(--c-ink)" strokeOpacity={0.45} strokeDasharray="4 4" />
            <text x={W - 2} y={y(avg) - 4} textAnchor="end" fontSize={10} fill="var(--c-muted)">
              rata-rata
            </text>
          </g>
        )}
        {data.daily.map((v, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          const h = Math.max(v > 0 ? 3 : 0, H - padB - y(v));
          const active = hover === i;
          return (
            <g key={i}>
              {/* area sentuh lebih lebar dari batangnya */}
              <rect
                x={padL + i * slot}
                y={0}
                width={slot}
                height={H - padB}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onClick={() => setHover(hover === i ? null : i)}
              >
                <title>{`${i + 1} ${MONTHS[data.month - 1]}: ${rupiah(v)}`}</title>
              </rect>
              {v > 0 && (
                <motion.path
                  d={`M${x},${H - padB} v${-(h - 4)} q0,-4 4,-4 h${barW - 8} q4,0 4,4 v${h - 4} z`}
                  fill={i === todayIdx ? "var(--c-ink)" : "var(--c-primary)"}
                  opacity={hover === null || active ? 1 : 0.45}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ ...softSpring, delay: 0.02 * i }}
                  style={{ transformOrigin: `${x}px ${H - padB}px`, pointerEvents: "none" }}
                />
              )}
              {(i === 0 || (i + 1) % (wide ? 5 : 7) === 0) && (
                <text x={padL + i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--c-muted)">
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {todayIdx >= 0 && <p className="mt-1 text-xs text-muted">Batang gelap = hari ini.</p>}
    </section>
  );
}

function CategoryBars({ byCat, total }: { byCat: Record<Category, number>; total: number }) {
  const rows = CATEGORIES.map((c) => ({ c, v: byCat[c] })).sort((a, b) => b.v - a.v);
  return (
    <section className="window p-4" aria-label="Per kategori">
      <h3 className="mb-3 text-[17px] font-bold">Per kategori</h3>
      <ul className="space-y-3">
        {rows.map(({ c, v }, i) => {
          const pct = total ? (v / total) * 100 : 0;
          return (
            <li key={c}>
              <div className="mb-1 flex justify-between text-sm">
                <span>
                  <CategoryLabel category={c} label={CATEGORY_LABEL[c].label} />
                </span>
                <span className="font-semibold">
                  {rupiah(v)} <span className="font-normal text-muted">· {Math.round(pct)}%</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink/[0.06]">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ ...softSpring, delay: 0.1 + i * 0.06 }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BudgetCard({ budget, total }: { budget: number | null; total: number }) {
  const [editing, setEditing] = useState(budget === null);
  const [value, setValue] = useState(budget ? String(Math.round(budget)) : "");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const pct = budget ? Math.min(100, (total / budget) * 100) : 0;
  const over = budget !== null && total > budget;

  return (
    <section className="window p-4" aria-label="Budget bulanan">
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-bold">Budget bulanan</h3>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="press flex items-center gap-1 text-sm font-semibold text-muted">
            <Pencil className="size-3.5" aria-hidden /> Ubah
          </button>
        )}
      </div>

      {editing ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await saveBudget(value ? Number(value) : null);
              if (r.error) setError(r.error);
              else setEditing(false);
            });
          }}
        >
          <label className="flex items-center gap-2 rounded-xl bg-ink/[0.04] px-3 py-2.5 ring-1 ring-ink/5 focus-within:ring-primary">
            <span className="font-semibold text-muted">Rp</span>
            <input
              inputMode="numeric"
              autoFocus
              value={value ? Number(value).toLocaleString("id-ID") : ""}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder="mis. 500.000"
              className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none"
              aria-label="Budget per bulan"
            />
          </label>
          <p className="text-xs text-muted">Kosongkan untuk mematikan budget.</p>
          {error && <p role="alert" className="text-sm text-accent-text">{error}</p>}
          <div className="flex justify-end gap-2">
            {budget !== null && (
              <button type="button" onClick={() => setEditing(false)} className="rounded-xl px-3 py-2 text-sm">
                Batal
              </button>
            )}
            <button disabled={pending} className="rounded-xl bg-strong px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </form>
      ) : (
        budget !== null && (
          <div className="mt-3">
            <p className="font-heading text-2xl font-bold">
              {rupiah(total)} <span className="text-base font-normal text-muted">/ {rupiah(budget)}</span>
            </p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink/[0.06]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: over || pct > 85 ? "var(--c-accent)" : "var(--c-primary)" }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={softSpring}
              />
            </div>
            <p className={`mt-2 text-sm font-semibold ${over ? "text-accent-text" : ""}`}>
              {over ? `Lewat ${rupiah(total - budget)} dari budget` : `Sisa ${rupiah(budget - total)} (${Math.round(100 - pct)}%)`}
            </p>
            <NotifyToggle />
          </div>
        )
      )}
    </section>
  );
}

function TopList({ title, rows, empty }: { title: string; rows: { label: string; sub?: string; value: number }[]; empty: string }) {
  return (
    <section className="window p-4">
      <h3 className="mb-2 text-[17px] font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-3 text-sm text-muted">{empty}</p>
      ) : (
        <ol className="divide-y divide-ink/5">
          {rows.map((r, i) => (
            <li key={r.label} className="flex items-center gap-3 py-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-soft text-xs font-bold">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.label}</span>
                {r.sub && <span className="text-xs text-muted">{r.sub}</span>}
              </span>
              <span className="font-semibold">{rupiah(r.value)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
