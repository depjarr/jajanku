"use client";

import { CategoryLabel } from "@/components/icons";
import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { AchievementWatcher } from "@/components/achievements";
import type { Achievements } from "@/lib/achievements";
import { forgetPending, launchFlight, markLanded, retrySave, stableKey, useHidden, usePending, type PendingEntry, type PendingItem } from "@/lib/live";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronRight as Chevron, List, Plus } from "lucide-react";
import { Sticker } from "@/components/sticker";
import { LargeTitle } from "@/components/ui/large-title";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { haptic, spring, softSpring } from "@/components/ui/haptic";
import { useMedia } from "@/components/ui/use-media";
import { BudgetAlert } from "@/components/budget-alert";
import { CATEGORIES, CATEGORY_LABEL, itemKcal, itemTotal, kcal, rupiah, stickerUrl, type Category, type Entry } from "@/lib/types";

/** Entry dari server, atau jajan baru yang masih disimpan di belakang layar. */
type LiveEntry = Entry | PendingEntry;
const isPending = (e: LiveEntry): e is PendingEntry => "status" in e;
import { DAYS_SHORT, MONTHS, calendarCells, formatDayLong, formatTime, shiftMonth } from "@/lib/dates";

const CAT_COLOR: Record<Category, string> = {
  makanan: "var(--c-primary)",
  minuman: "var(--c-accent)",
  snack: "var(--c-ink)",
  lainnya: "var(--c-muted)",
};

export function MejaView({
  year,
  month,
  today,
  initialFocus,
  diaryName,
  displayName,
  budget = null,
  achievements,
  entries,
  storeNames,
}: {
  year: number;
  month: number;
  today: string;
  initialFocus: string | null;
  diaryName: string;
  displayName: string;
  budget?: number | null;
  achievements: Achievements;
  entries: Entry[];
  storeNames: Record<string, string>;
}) {
  const router = useRouter();
  const [loading, startNav] = useTransition();
  const [view, setView] = useState<"bulan" | "daftar">("bulan");
  const [cat, setCat] = useState<Category | null>(null);
  const [focus, setFocus] = useState<string | null>(initialFocus);
  const [dir, setDir] = useState(0);

  // Gabungkan data server + jajan yang baru disimpan, minus yang sedang dihapus.
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const pendingAll = usePending();
  const hidden = useHidden();
  const live = useMemo(() => {
    const ids = new Set(entries.map((e) => e.id));
    const pend = pendingAll.filter((p) => p.eaten_on.startsWith(monthKey) && !(p.realId && ids.has(p.realId)));
    return ([...pend, ...entries] as LiveEntry[])
      .filter((e) => !hidden.has(e.id))
      .map((e) => ({ ...e, items: e.items.filter((i) => !hidden.has(i.id)) }) as LiveEntry)
      .filter((e) => e.items.length > 0)
      .sort((a, b) => b.eaten_on.localeCompare(a.eaten_on) || (b.eaten_at ?? "").localeCompare(a.eaten_at ?? ""));
  }, [entries, pendingAll, hidden, monthKey]);

  // Jajan sementara yang sudah ada versi servernya → lupakan.
  useEffect(() => {
    const ids = new Set(entries.map((e) => e.id));
    forgetPending(pendingAll.filter((p) => p.realId && ids.has(p.realId)).map((p) => p.id));
  }, [entries, pendingAll]);

  // Stiker dari jajan yang baru disimpan "mendarat" di kalender.
  const fresh = pendingAll.filter((p) => !p.landed);
  const landing = new Set(fresh.flatMap((p) => p.items.map((i) => i.sticker_path ?? i.id)));
  const landingKey = fresh.map((p) => p.id).join(",");
  useEffect(() => {
    if (!landingKey) return;
    const t = setTimeout(() => markLanded(landingKey.split(",")), 2200);
    return () => clearTimeout(t);
  }, [landingKey]);

  const filtered = useMemo(
    () =>
      live
        .map((e) => ({ ...e, items: cat ? e.items.filter((i) => i.category === cat) : e.items }))
        .filter((e) => e.items.length > 0),
    [live, cat],
  );

  const byDay = useMemo(() => {
    const m = new Map<string, LiveEntry[]>();
    for (const e of filtered) m.set(e.eaten_on, [...(m.get(e.eaten_on) ?? []), e]);
    return m;
  }, [filtered]);

  const allItems = filtered.flatMap((e) => e.items);
  const total = allItems.reduce((s, i) => s + itemTotal(i), 0);
  const perCat = CATEGORIES.map((c) => ({
    c,
    v: live.flatMap((e) => e.items).filter((i) => i.category === c).reduce((s, i) => s + itemTotal(i), 0),
  }));
  const catTotal = perCat.reduce((s, x) => s + x.v, 0);

  const goMonth = (delta: number) => {
    haptic();
    setDir(delta);
    setFocus(null);
    startNav(() => router.push(`/?m=${shiftMonth(year, month, delta)}`, { scroll: false }));
  };

  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false }).format(new Date()));
  const greet = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";
  const isWide = useMedia("(min-width: 768px)"); // tablet ke atas: tanpa bottom sheet
  const isDesktop = useMedia("(min-width: 1024px)"); // desktop: panel di kolom kanan
  const todayInMonth = today.startsWith(`${year}-${String(month).padStart(2, "0")}`);
  // Di tablet/desktop detail hari tampil di panel kanan, default hari ini.
  const panelDay = focus ?? (todayInMonth ? today : null);

  return (
    <main>
      <LargeTitle
        title={diaryName}
        subtitle={`${greet}${displayName ? `, ${displayName}` : ""}`}
        right={
          <span className="flex items-center gap-2">
          <Link href="/chat" aria-label="Tanya Jaja, asisten AI" className="press grid size-10 place-items-center rounded-full bg-surface text-muted shadow-sm">
            <MessageCircle className="size-5" aria-hidden />
          </Link>
          <Link href="/kamu" aria-label="Profil" className="press grid size-10 place-items-center rounded-full bg-surface font-heading text-lg font-bold shadow-sm">
            {(displayName || diaryName).charAt(0).toUpperCase()}
          </Link>
          </span>
        }
      />

      {todayInMonth && (
        <BudgetAlert
          budget={budget}
          monthKey={`${year}-${String(month).padStart(2, "0")}`}
          total={live.flatMap((e) => e.items).reduce((s, i) => s + itemTotal(i), 0)}
        />
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="lg:sticky lg:top-8 lg:order-2 lg:space-y-5">
      {/* Kartu ringkasan */}
      <motion.section
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={softSpring}
        className="mb-4 drop-shadow-[0_16px_18px_rgb(0_0_0/0.16)]"
        aria-label="Ringkasan bulan ini"
      >
        {/* Kartu ringkasan bergaya struk kasir: garis tipis, tulisan mono, tepi bawah bergerigi */}
        <div className="receipt receipt-lines relative rounded-t-[22px] bg-strong px-5 pb-9 pt-4 text-white">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] opacity-80">
            <span>Struk jajan</span>
            <span>{MONTHS[month - 1].slice(0, 3)} {year}</span>
          </div>
          <div className="my-3 border-t border-dashed border-white/35" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-70">Total</p>
          <p className="mt-1 font-heading text-[40px] font-bold leading-none tracking-tight">
            <AnimatedNumber value={total} format={rupiah} />
          </p>
          {budget ? <BudgetBar total={total} budget={budget} /> : (
            <Link href="/statistik" className="mt-2 inline-block text-xs font-semibold underline opacity-70">+ Atur budget bulanan</Link>
          )}
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-bg/15">
            {perCat.map(({ c, v }, i) => (
              <motion.span
                key={c}
                style={{ background: c === "snack" ? "var(--c-bg)" : CAT_COLOR[c] }}
                initial={{ width: 0 }}
                animate={{ width: catTotal ? `${(v / catTotal) * 100}%` : 0 }}
                transition={{ ...softSpring, delay: 0.2 + i * 0.08 }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80">
            {perCat.filter((x) => x.v > 0).map(({ c }) => (
              <span key={c} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: c === "snack" ? "var(--c-bg)" : CAT_COLOR[c] }} />
                {CATEGORY_LABEL[c].label}
              </span>
            ))}
            {catTotal === 0 && <span>Belum ada jajan bulan ini</span>}
          </div>
          <div className="my-4 border-t border-dashed border-white/35" />
          <dl className="space-y-1 font-mono text-[13px]">
            <ReceiptRow label="Item" value={allItems.length} />
            <ReceiptRow label="Hari jajan" value={byDay.size} />
            {achievements.recordStreak > 0 && <ReceiptRow label="Streak nyatat" value={achievements.recordStreak} suffix=" hr" />}
          </dl>
          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.3em] opacity-60">** terima kasih sudah nyatat **</p>
        </div>
      </motion.section>
      <AchievementWatcher badges={achievements.badges} />
      {isDesktop && (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={softSpring} className="window p-4" aria-label="Detail hari">
          {panelDay ? (
            <DayDetail date={panelDay} entries={byDay.get(panelDay) ?? []} storeNames={storeNames} />
          ) : (
            <p className="py-8 text-center text-sm text-muted">Pilih tanggal di kalender untuk lihat jajananmu.</p>
          )}
        </motion.section>
      )}
      </div>
      <div className="min-w-0 lg:order-1">
      <Segmented
        label="Tampilan"
        value={view}
        onChange={setView}
        className="mb-3"
        options={[
          { value: "bulan", label: <><CalendarDays className="size-4" aria-hidden /> Bulan</> },
          { value: "daftar", label: <><List className="size-4" aria-hidden /> Daftar</> },
        ]}
      />

      {/* Filter kategori */}
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 py-1" role="radiogroup" aria-label="Kategori">
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
              {active && <motion.span layoutId="cat-pill" transition={spring} className="absolute inset-0 rounded-full bg-strong" />}
              {!active && <span className="absolute inset-0 rounded-full bg-surface shadow-sm" />}
              <span className={`relative ${active ? "text-white" : "text-ink"}`}>
                {c ? <CategoryLabel category={c} label={CATEGORY_LABEL[c].label} /> : "Semua"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Navigasi bulan */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[22px] font-bold">
          {MONTHS[month - 1]} <span className="text-muted">{year}</span>
        </h2>
        <div className="flex gap-1">
          <IconBtn label="Bulan sebelumnya" onClick={() => goMonth(-1)}><ChevronLeft className="size-5" /></IconBtn>
          <IconBtn label="Bulan berikutnya" onClick={() => goMonth(1)}><ChevronRight className="size-5" /></IconBtn>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "bulan" ? (
          <motion.section
            key="cal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: loading ? 0.5 : 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="window overflow-hidden p-3"
            aria-label="Kalender"
          >
            <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-bold uppercase text-muted">
              {DAYS_SHORT.map((d, i) => (
                <span key={i} className={i === 6 ? "text-accent-text" : ""}>{d}</span>
              ))}
            </div>
            <motion.div
              key={`${year}-${month}`}
              custom={dir}
              initial={{ x: dir * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={spring}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, i) => {
                if (i.offset.x < -70) goMonth(1);
                else if (i.offset.x > 70) goMonth(-1);
              }}
              className="grid touch-pan-y grid-cols-7 gap-1"
            >
              {calendarCells(year, month).map((date, idx) => {
                if (!date) return <span key={idx} />;
                const dayItems = (byDay.get(date) ?? []).flatMap((e) => e.items);
                const isToday = date === today;
                return (
                  <motion.button
                    key={date}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      haptic();
                      setFocus(date);
                    }}
                    aria-label={`${formatDayLong(date)}, ${dayItems.length} item`}
                    aria-current={isToday ? "date" : undefined}
                    className={`relative flex aspect-[4/5] flex-col items-center rounded-2xl pt-1 transition-shadow md:aspect-square lg:aspect-[6/5] ${dayItems.length ? "bg-soft/60" : ""} ${isWide && date === panelDay ? "ring-2 ring-ink" : ""}`}
                  >
                    <span
                      className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
                        isToday ? "bg-accent text-accent-ink" : dayItems.length ? "text-ink" : "text-muted/70"
                      }`}
                    >
                      {Number(date.slice(8))}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="relative w-full flex-1">
                        {dayItems.some((it) => landing.has(it.sticker_path ?? it.id)) && (
                          <motion.span
                            aria-hidden
                            className="absolute left-1/2 top-1/2 -ml-6 -mt-6 size-12 rounded-full border-2 border-strong"
                            initial={{ scale: 0.3, opacity: 0 }}
                            animate={{ scale: [0.3, 1.8], opacity: [0, 0.9, 0] }}
                            transition={{ duration: 0.7, delay: 0.85, ease: "easeOut" }}
                          />
                        )}
                        {dayItems.slice(0, 3).map((it, k) => {
                          const lands = landing.has(it.sticker_path ?? it.id);
                          return (
                          <motion.span
                            key={it.sticker_path ?? it.id}
                            className={`absolute ${lands ? "z-20" : ""}`}
                            style={{ left: `${10 + k * 14}%`, top: `${k % 2 ? 22 : 2}%`, width: "62%", height: "70%" }}
                            initial={lands ? { scale: 3, y: -240, rotate: -40, opacity: 0 } : { scale: 0, rotate: -25 }}
                            animate={{ scale: 1, y: 0, opacity: 1, rotate: (k - 1) * 10 }}
                            transition={
                              lands
                                ? { type: "spring", stiffness: 240, damping: 13, delay: 0.35 + k * 0.15, opacity: { duration: 0.2, delay: 0.35 + k * 0.15 } }
                                : { type: "spring", stiffness: 380, damping: 14, delay: 0.15 + (idx % 7) * 0.025 + k * 0.05 }
                            }
                          >
                            <Sticker path={it.sticker_path} alt="" category={it.category} className="size-full text-[11px]" />
                          </motion.span>
                          );
                        })}
                        {dayItems.length > 3 && (
                          <span className="absolute bottom-0 right-0.5 rounded-full bg-strong px-1 text-[9px] font-bold text-white">+{dayItems.length - 3}</span>
                        )}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
            <p className="mt-2 text-center text-xs text-muted">Geser kiri/kanan untuk ganti bulan · ketuk tanggal untuk detail</p>
            {live.length === 0 && <MonthEmpty first={achievements.totalItems === 0} />}
          </motion.section>
        ) : (
          <motion.section key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {byDay.size === 0 && <MonthEmpty first={achievements.totalItems === 0} boxed />}
            {[...byDay.entries()].map(([date, list], gi) => (
              <div key={date}>
                <div className="sticky top-12 z-10 -mx-1 mb-2 flex items-baseline justify-between px-1 py-1">
                  <h3 className="text-[17px] font-bold">{formatDayLong(date)}</h3>
                  <span className="text-sm font-semibold text-muted">{rupiah(list.flatMap((e) => e.items).reduce((s, i) => s + itemTotal(i), 0))}</span>
                </div>
                <ul className="space-y-2">
                  {list.map((e, i) => (
                    <motion.li key={stableKey(e.id)} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...softSpring, delay: gi * 0.06 + i * 0.05 }}>
                      <EntryCard entry={e} storeNames={storeNames} />
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.section>
        )}
      </AnimatePresence>
      {isWide && !isDesktop && (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={softSpring} className="window mt-5 p-4" aria-label="Detail hari">
          {panelDay ? (
            <DayDetail date={panelDay} entries={byDay.get(panelDay) ?? []} storeNames={storeNames} />
          ) : (
            <p className="py-8 text-center text-sm text-muted">Pilih tanggal di kalender untuk lihat jajananmu.</p>
          )}
        </motion.section>
      )}
      </div>
      </div>

      {/* Detail hari (HP) */}
      <Sheet open={!!focus && !isWide} onClose={() => setFocus(null)}>
        {focus && <DayDetail date={focus} entries={byDay.get(focus) ?? []} storeNames={storeNames} />}
      </Sheet>
    </main>
  );
}

function DayDetail({ date, entries, storeNames }: { date: string; entries: LiveEntry[]; storeNames: Record<string, string> }) {
  const total = entries.flatMap((e) => e.items).reduce((s, i) => s + itemTotal(i), 0);
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xl font-bold">{formatDayLong(date)}</p>
          <p className="text-sm text-muted">
            {entries.length} momen · {rupiah(total)}
          </p>
        </div>
        <Link href={`/tambah?d=${date}`} className="press flex shrink-0 items-center gap-1 rounded-full bg-strong px-3.5 py-2 text-sm font-semibold text-white">
          <Plus className="size-4" aria-hidden /> Tambah
        </Link>
      </div>
      {entries.length === 0 ? (
        <EmptyState className="" emoji="🍽️" orbit={["🍢", "🥤", "🍫"]} title="Piringnya masih kosong" text="Belum ada jajan di hari ini. Ketuk Tambah untuk mencatat." />
      ) : (
        <ul className="space-y-2 pb-2">
          {entries.map((e, i) => (
            <motion.li key={stableKey(e.id)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...softSpring, delay: 0.05 + i * 0.06 }}>
              <EntryCard entry={e} storeNames={storeNames} />
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryCard({ entry, storeNames }: { entry: LiveEntry; storeNames: Record<string, string> }) {
  const total = entry.items.reduce((s, i) => s + itemTotal(i), 0);
  const store = entry.items.map((i) => (i.store_id ? storeNames[i.store_id] : (i as PendingItem).store_name)).find(Boolean);
  const [hero, ...rest] = entry.items;
  const totalKcal = entry.items.reduce((s, i) => s + itemKcal(i), 0);
  const heroRef = useRef<HTMLSpanElement>(null);
  const temp = isPending(entry) ? entry : null;
  const cardCls = "relative block min-h-[148px] rounded-[28px] bg-gradient-to-br from-soft via-soft/70 to-surface p-4 pr-[42%] shadow-[0_14px_30px_-18px_var(--c-strong)] ring-1 ring-ink/5";

  // Ketuk kartu → stiker utama terbang ke halaman detail.
  const fly = () => {
    const el = heroRef.current;
    if (!hero || !el) return;
    const r = el.getBoundingClientRect();
    launchFlight({ id: hero.id, src: stickerUrl(hero.sticker_path), category: hero.category, rotate: 10, rect: { left: r.left, top: r.top, width: r.width, height: r.height } });
  };

  const body = (
    <>
        <p className="line-clamp-2 font-heading text-[20px] font-bold leading-tight">{entry.title}</p>
        <p className="mt-1 line-clamp-1 text-sm text-muted">{entry.items.map((i) => i.name).join(", ")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted">
          {entry.eaten_at && <Chip>{formatTime(entry.eaten_at)}</Chip>}
          {store && <Chip>{store}</Chip>}
          {totalKcal > 0 && <Chip>≈{kcal(totalKcal)}</Chip>}
          {entry.location && <Chip>{entry.location}</Chip>}
        </div>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface py-1 pl-3.5 pr-1 shadow-sm">
          <span className="font-heading text-[15px] font-bold">{rupiah(total)}</span>
          {temp ? (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${temp.status === "failed" ? "bg-accent-text text-white" : "bg-soft text-strong"}`}>
              {temp.status === "failed" ? "Gagal" : <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>Menyimpan…</motion.span>}
            </span>
          ) : (
            <span className="grid size-7 place-items-center rounded-full bg-strong text-white">
              <Chevron className="size-4" aria-hidden />
            </span>
          )}
        </span>
    </>
  );

  return (
    <motion.div whileTap={{ scale: 0.97 }} whileHover="hover" initial="rest" animate="rest" transition={softSpring} className="relative pt-7">
      {temp ? (
        <div className={cardCls} aria-busy={temp.status === "saving"}>
          {body}
          {temp.status === "failed" && (
            <button type="button" onClick={() => retrySave(temp.id)} className="press mt-2 block min-h-10 rounded-full bg-strong px-4 text-sm font-semibold text-white">
              Coba simpan lagi
            </button>
          )}
        </div>
      ) : (
        <Link href={`/momen/${entry.id}`} onClick={fly} className={cardCls}>
          {body}
        </Link>
      )}

      {/* Stiker yang menyembul keluar dari kartu */}
      <div className="pointer-events-none absolute right-2 top-0 h-[150px] w-[44%]">
        {rest.slice(0, 2).map((it, k) => (
          <motion.span
            key={it.id}
            className="absolute"
            style={{ right: k === 0 ? "54%" : "62%", top: k === 0 ? 62 : 18, width: 64, height: 64 }}
            variants={{ rest: { rotate: k ? -14 : -6, y: 0 }, hover: { rotate: k ? -20 : -12, y: -4 } }}
            transition={softSpring}
          >
            <Sticker path={it.sticker_path} alt="" category={it.category} className="size-full drop-shadow-[0_8px_10px_rgb(0_0_0/0.18)]" />
          </motion.span>
        ))}
        {hero && (
          <motion.span
            ref={heroRef}
            className="absolute right-0 top-0 block size-[132px]"
            variants={{ rest: { rotate: 10, y: 0, scale: 1 }, hover: { rotate: 4, y: -8, scale: 1.06 } }}
            transition={{ type: "spring", stiffness: 300, damping: 14 }}
          >
            <Sticker path={hero.sticker_path} alt={hero.name} category={hero.category} className="size-full drop-shadow-[0_14px_16px_rgb(0_0_0/0.22)]" />
          </motion.span>
        )}
        {entry.items.length > 3 && (
          <span className="absolute bottom-3 right-1 rounded-full bg-strong px-2 py-0.5 text-[11px] font-bold text-white">+{entry.items.length - 3}</span>
        )}
      </div>
    </motion.div>
  );
}

function BudgetBar({ total, budget }: { total: number; budget: number }) {
  const pct = Math.min(100, (total / budget) * 100);
  const over = total > budget;
  const left = budget - total;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs">
        <span className="opacity-70">Budget {rupiah(budget)}</span>
        <span className={over ? "font-bold text-accent" : "opacity-90"}>{over ? `Lewat ${rupiah(-left)}` : `Sisa ${rupiah(left)}`}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg/15">
        <motion.div
          className="h-full rounded-full"
          style={{ background: over || pct > 85 ? "var(--c-accent)" : "var(--c-primary)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.3 }}
        />
      </div>
    </div>
  );
}

/** Baris struk: label .......... angka */
function ReceiptRow({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="uppercase tracking-wider opacity-80">{label}</dt>
      <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-white/35" />
      <dd className="font-bold">
        <AnimatedNumber value={value} format={(n) => `${n}${suffix}`} />
      </dd>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.85 }} onClick={onClick} aria-label={label} className="grid size-9 place-items-center rounded-full bg-surface shadow-sm">
      {children}
    </motion.button>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface/80 px-2 py-0.5">
      {children}
    </span>
  );
}

function MonthEmpty({ first, boxed = false }: { first: boolean; boxed?: boolean }) {
  const cls = boxed ? "window" : "mt-3 rounded-[24px] bg-soft/60";
  return first ? (
    <EmptyState
      className={cls}
      emoji="📸"
      orbit={["🍩", "🧋", "🍙", "🍟"]}
      title="Scan jajan pertamamu"
      text="Foto jajananmu, AI baca nama & kalorinya, lalu tiap item jadi stiker di kalender ini."
      cta={{ href: "/tambah", label: "Scan jajan pertamamu" }}
    />
  ) : (
    <EmptyState
      className={cls}
      emoji="🧺"
      orbit={["🍪", "🥤", "🍜"]}
      title="Bulan ini masih kosong"
      text="Belum ada jajan tercatat di bulan ini. Hemat, atau lupa nyatat?"
      cta={{ href: "/tambah", label: "Foto jajanan" }}
    />
  );
}
