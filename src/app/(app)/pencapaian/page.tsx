import { requireUser } from "@/lib/supabase/server";
import { todayJakarta } from "@/lib/dates";
import { HISTORY_SELECT, computeAchievements, type HistoryEntry } from "@/lib/achievements";
import { PageHeader } from "@/components/page-header";
import { AchievementWatcher, BadgeCard } from "@/components/achievements";

export default async function PencapaianPage() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("monthly_budget").eq("id", user.id).single(),
    supabase.from("entries").select(HISTORY_SELECT),
  ]);
  const budget = profile?.monthly_budget != null ? Number(profile.monthly_budget) : null;
  const ach = computeAchievements((rows ?? []) as HistoryEntry[], todayJakarta(), budget);

  return (
    <main className="mx-auto max-w-3xl">
      <PageHeader title="Pencapaian" subtitle={`${ach.unlocked} dari ${ach.badges.length} terbuka`} back="/kamu" />
      <AchievementWatcher badges={ach.badges} />

      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-[24px] bg-gradient-to-br from-deep to-strong p-4 text-white">
          <p className="text-3xl leading-none" aria-hidden>🔥</p>
          <p className="mt-2 font-heading text-3xl font-bold">{ach.recordStreak}</p>
          <p className="text-sm opacity-90">hari berturut nyatat</p>
        </div>
        <div className="rounded-[24px] bg-soft p-4">
          <p className="text-3xl leading-none" aria-hidden>🌱</p>
          <p className="mt-2 font-heading text-3xl font-bold text-strong">{ach.hematStreak ?? "–"}</p>
          <p className="text-sm text-muted">{ach.hematStreak == null ? "atur budget untuk streak hemat" : "hari hemat berturut"}</p>
        </div>
      </section>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ach.badges.map((b, i) => (
          <BadgeCard key={b.id} badge={b} index={i} />
        ))}
      </ul>
      <p className="mt-5 text-center text-xs text-muted">Hari hemat = pengeluaran hari itu ≤ budget bulanan ÷ jumlah hari di bulan itu.</p>
    </main>
  );
}
