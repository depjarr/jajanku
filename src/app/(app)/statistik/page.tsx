import { requireUser } from "@/lib/supabase/server";
import { monthKey, monthRange, parseMonth, todayJakarta } from "@/lib/dates";
import { itemKcal, itemTotal, type Category } from "@/lib/types";
import { StatsView, type StatsData } from "./stats-view";

export default async function StatistikPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const { supabase, user } = await requireUser();
  const { year, month } = parseMonth(m);
  const { start, end, days } = monthRange(year, month);

  const [{ data: profile }, { data: items }, { data: stores }] = await Promise.all([
    supabase.from("profiles").select("monthly_budget").eq("id", user.id).single(),
    supabase
      .from("items")
      .select("name,category,qty,price,store_id,calories,entries!inner(eaten_on)")
      .gte("entries.eaten_on", start)
      .lte("entries.eaten_on", end),
    supabase.from("stores").select("id,name"),
  ]);

  const storeName = new Map((stores ?? []).map((s) => [s.id, s.name]));
  const daily = Array.from({ length: days }, () => 0);
  const byCat: Record<Category, number> = { makanan: 0, minuman: 0, snack: 0, lainnya: 0 };
  const byItem = new Map<string, { total: number; count: number }>();
  const byStore = new Map<string, number>();
  let kcalTotal = 0;

  for (const i of items ?? []) {
    const t = itemTotal(i);
    kcalTotal += itemKcal(i);
    const entry = (Array.isArray(i.entries) ? i.entries[0] : i.entries) as { eaten_on: string };
    daily[Number(entry.eaten_on.slice(8)) - 1] += t;
    byCat[i.category as Category] += t;
    const key = i.name.trim();
    const cur = byItem.get(key) ?? { total: 0, count: 0 };
    byItem.set(key, { total: cur.total + t, count: cur.count + 1 });
    const s = i.store_id ? storeName.get(i.store_id) : null;
    if (s) byStore.set(s, (byStore.get(s) ?? 0) + t);
  }

  const data: StatsData = {
    year,
    month,
    monthKey: monthKey(year, month),
    today: todayJakarta(),
    budget: profile?.monthly_budget != null ? Number(profile.monthly_budget) : null,
    daily,
    kcalTotal,
    byCat,
    topItems: [...byItem.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5).map(([name, v]) => ({ name, ...v })),
    topStores: [...byStore.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, total]) => ({ name, total })),
  };

  return <StatsView data={data} />;
}
