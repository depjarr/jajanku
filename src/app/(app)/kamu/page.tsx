import { CategoryLabel } from "@/components/icons";
import Link from "next/link";
import { BarChart3, ChevronRight, Download, Gift, Images, Trophy, LineChart, LogOut, MessageCircle, Palette, Ruler } from "lucide-react";
import { InstallButton } from "@/components/pwa";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { logout } from "@/app/(auth)/actions";
import { CATEGORIES, CATEGORY_LABEL, itemTotal, rupiah, type Category } from "@/lib/types";
import { MONTHS, monthRange, todayJakarta } from "@/lib/dates";
import { ProfileForm } from "./profile-form";

export default async function KamuPage() {
  const { supabase, user } = await requireUser();
  const [y, m] = todayJakarta().split("-").map(Number);
  const { start, end } = monthRange(y, m);

  const [{ data: profile }, { data: items }] = await Promise.all([
    supabase.from("profiles").select("display_name,diary_name").eq("id", user.id).single(),
    supabase.from("items").select("category,qty,price,entries!inner(eaten_on)").gte("entries.eaten_on", start).lte("entries.eaten_on", end),
  ]);

  const byCat = new Map<Category, number>();
  for (const i of items ?? []) byCat.set(i.category as Category, (byCat.get(i.category as Category) ?? 0) + itemTotal(i));
  const total = [...byCat.values()].reduce((a, b) => a + b, 0);

  return (
    <main className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={`Hai, ${profile?.display_name ?? "kamu"}!`} subtitle={user.email} />

      <section className="window p-4">
        <h2 className="text-lg font-semibold">Jajan {MONTHS[m - 1]}</h2>
        <p className="font-heading text-3xl font-bold text-accent-text">{rupiah(total)}</p>
        <ul className="mt-3 space-y-2">
          {CATEGORIES.map((c) => {
            const v = byCat.get(c) ?? 0;
            const pct = total ? Math.round((v / total) * 100) : 0;
            return (
              <li key={c} className="text-sm">
                <div className="flex justify-between">
                  <CategoryLabel category={c} label={CATEGORY_LABEL[c].label} />
                  <span className="font-semibold">{rupiah(v)} <span className="text-muted">· {pct}%</span></span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-soft">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <nav aria-label="Pengaturan" className="window divide-y divide-ink/5">
        {[
          { href: "/chat", icon: MessageCircle, label: "Tanya Jaja (AI)", sub: "Bantuan cara pakai, cek pengeluaran, tips hemat" },
          { href: "/pencapaian", icon: Trophy, label: "Pencapaian", sub: "Streak nyatat, streak hemat, dan lencana" },
          { href: "/rekap", icon: Gift, label: "Rekap bulanan", sub: "Kilas balik jajanmu ala story, bisa dibagikan" },
          { href: "/album", icon: Images, label: "Album stiker", sub: "Semua stiker jajanan yang kamu kumpulkan" },
          { href: "/harga", icon: LineChart, label: "Riwayat harga", sub: "Bandingkan harga antar waktu dan toko" },
          { href: "/statistik", icon: BarChart3, label: "Statistik & budget", sub: "Grafik pengeluaran dan batas bulanan" },
          { href: "/alat", icon: Ruler, label: "Unit & Toko", sub: "Atur satuan jual dan tempat belanja" },
          { href: "/tampilan", icon: Palette, label: "Tampilan", sub: "Warna, huruf, dan pola" },
        ].map(({ href, icon: Icon, label, sub }) => (
          <Link key={href} href={href} className="press flex items-center gap-3 px-4 py-3.5">
            <span className="grid size-9 place-items-center rounded-xl bg-soft"><Icon className="size-5" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{label}</span>
              <span className="block truncate text-xs text-muted">{sub}</span>
            </span>
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </Link>
        ))}
        <a href={`/api/export?m=${y}-${String(m).padStart(2, "0")}`} download className="press flex items-center gap-3 px-4 py-3.5">
          <span className="grid size-9 place-items-center rounded-xl bg-soft"><Download className="size-5" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Ekspor ke Excel</span>
            <span className="block truncate text-xs text-muted">Unduh catatan {MONTHS[m - 1]} sebagai .xlsx</span>
          </span>
        </a>
        <InstallButton />
      </nav>

      <ProfileForm displayName={profile?.display_name ?? ""} diaryName={profile?.diary_name ?? "Jajanku"} />

      <form action={logout}>
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-line py-3 font-semibold text-muted">
          <LogOut className="size-4" aria-hidden /> Keluar
        </button>
      </form>
    </main>
  );
}
