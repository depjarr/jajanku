import { requireUser } from "@/lib/supabase/server";
import type { Entry } from "@/lib/types";
import { monthRange, parseMonth, todayJakarta } from "@/lib/dates";
import { HISTORY_SELECT, computeAchievements, type HistoryEntry } from "@/lib/achievements";
import { MejaView } from "./meja-view";

type SP = Promise<{ m?: string; d?: string }>;

export default async function MejaPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();

  const focus = sp.d?.match(/^\d{4}-\d{2}-\d{2}$/) ? sp.d : null;
  const { year, month } = parseMonth(sp.m ?? focus?.slice(0, 7));
  const { start, end } = monthRange(year, month);

  const [{ data: profile }, { data: rows }, { data: stores }, { data: history }] = await Promise.all([
    supabase.from("profiles").select("diary_name,display_name,monthly_budget").eq("id", user.id).single(),
    supabase
      .from("entries")
      .select("id,title,eaten_on,eaten_at,location,photo_path,items(id,entry_id,name,category,store_id,unit_id,qty,price,package_size,sticker_path,rating,note,calories)")
      .gte("eaten_on", start)
      .lte("eaten_on", end)
      .order("eaten_on", { ascending: false })
      .order("eaten_at", { ascending: false, nullsFirst: false })
      .order("created_at", { referencedTable: "items" }),
    supabase.from("stores").select("id,name"),
    supabase.from("entries").select(HISTORY_SELECT),
  ]);
  const today = todayJakarta();
  const budget = profile?.monthly_budget != null ? Number(profile.monthly_budget) : null;

  return (
    <MejaView
      key={focus ?? ""}
      year={year}
      month={month}
      today={today}
      initialFocus={focus}
      diaryName={profile?.diary_name ?? "Jajanku"}
      displayName={profile?.display_name ?? ""}
      budget={budget}
      achievements={computeAchievements((history ?? []) as HistoryEntry[], today, budget)}
      entries={((rows ?? []) as Entry[]).filter((e) => e.items.length > 0)}
      storeNames={Object.fromEntries((stores ?? []).map((s) => [s.id, s.name]))}
    />
  );
}
