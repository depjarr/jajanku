import { requireUser } from "@/lib/supabase/server";
import { monthKey, monthRange, parseMonth } from "@/lib/dates";
import { CATEGORY_LABEL, itemTotal, type Category } from "@/lib/types";
import { RekapView, type RekapData } from "./rekap-view";

export const metadata = { title: "Rekap bulanan · Jajanku" };

export default async function RekapPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const { supabase, user } = await requireUser();
  const { year, month } = parseMonth(m);
  const { start, end } = monthRange(year, month);

  const [{ data: profile }, { data: items }, { data: stores }] = await Promise.all([
    supabase.from("profiles").select("display_name,diary_name").eq("id", user.id).single(),
    supabase
      .from("items")
      .select("name,category,qty,price,store_id,sticker_path,rating,entries!inner(eaten_on)")
      .gte("entries.eaten_on", start)
      .lte("entries.eaten_on", end),
    supabase.from("stores").select("id,name"),
  ]);

  type Row = { name: string; category: Category; qty: number; price: number; store_id: string | null; sticker_path: string | null; rating: number | null; entries: { eaten_on: string } };
  const rows = (items ?? []) as unknown as Row[];
  const storeName = new Map((stores ?? []).map((s) => [s.id, s.name]));

  const total = rows.reduce((s, r) => s + itemTotal(r), 0);
  const days = new Map<string, number>();
  const names = new Map<string, { count: number; sticker: string | null }>();
  const cats = new Map<Category, number>();
  const storeTotals = new Map<string, number>();
  for (const r of rows) {
    const t = itemTotal(r);
    days.set(r.entries.eaten_on, (days.get(r.entries.eaten_on) ?? 0) + t);
    const n = names.get(r.name) ?? { count: 0, sticker: null };
    names.set(r.name, { count: n.count + Number(r.qty), sticker: n.sticker ?? r.sticker_path });
    cats.set(r.category, (cats.get(r.category) ?? 0) + t);
    const s = r.store_id ? storeName.get(r.store_id) : null;
    if (s) storeTotals.set(s, (storeTotals.get(s) ?? 0) + t);
  }
  const top = [...names.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const peak = [...days.entries()].sort((a, b) => b[1] - a[1])[0];
  const topCat = [...cats.entries()].sort((a, b) => b[1] - a[1])[0];
  const topStore = [...storeTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  const best = rows.filter((r) => r.rating).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];

  const data: RekapData = {
    year,
    month,
    monthKey: monthKey(year, month),
    name: profile?.display_name ?? "",
    diary: profile?.diary_name ?? "Jajanku",
    total,
    itemCount: rows.reduce((s, r) => s + Number(r.qty), 0),
    dayCount: days.size,
    topItem: top ? { name: top[0], count: top[1].count, sticker: top[1].sticker } : null,
    peakDay: peak ? { date: peak[0], total: peak[1] } : null,
    topCategory: topCat ? { label: CATEGORY_LABEL[topCat[0]].label, category: topCat[0], pct: total ? Math.round((topCat[1] / total) * 100) : 0 } : null,
    topStore: topStore ? { name: topStore[0], total: topStore[1] } : null,
    bestRated: best ? { name: best.name, rating: best.rating!, sticker: best.sticker_path } : null,
    stickers: rows.map((r) => r.sticker_path).filter((s): s is string => Boolean(s)).slice(0, 12),
  };

  return <RekapView data={data} />;
}
