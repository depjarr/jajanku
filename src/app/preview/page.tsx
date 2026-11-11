import { notFound } from "next/navigation";
import AppLayout from "@/app/(app)/layout";
import { MejaView } from "@/app/(app)/meja-view";
import { StatsView } from "@/app/(app)/statistik/stats-view";
import { ChatView } from "@/app/(app)/chat/chat-view";
import { RekapView } from "@/app/(app)/rekap/rekap-view";
import { todayJakarta } from "@/lib/dates";
import { computeAchievements } from "@/lib/achievements";
import type { Entry, Item } from "@/lib/types";

// Pratinjau desain dengan data palsu — hanya ada di mode development.
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  if (process.env.NODE_ENV !== "development") notFound();
  const [y, m] = todayJakarta().split("-").map(Number);
  const d = (day: number) => `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const it = (id: string, entry: string, name: string, category: Item["category"], price: number, qty = 1): Item => ({
    id, entry_id: entry, name, category, price, qty, store_id: "s1", unit_id: null, package_size: null, sticker_path: null, calories: 250,
  });
  const entries: Entry[] = [
    { id: "e3", title: "Ngopi pagi", eaten_on: d(10), eaten_at: "08:40", location: "Blok M", photo_path: null, items: [it("i5", "e3", "Kopi susu gula aren", "minuman", 24000), it("i6", "e3", "Croissant", "makanan", 22000)] },
    { id: "e2", title: "Makan siang", eaten_on: d(6), eaten_at: "12:05", location: "Dekat kampus", photo_path: null, items: [it("i3", "e2", "Nasi ayam geprek", "makanan", 18000), it("i4", "e2", "Es teh manis", "minuman", 5000)] },
    { id: "e1", title: "Ngemil sore", eaten_on: d(3), eaten_at: "16:20", location: "Kos", photo_path: null, items: [it("i1", "e1", "Pocky Crushed Fruits", "snack", 13900), it("i2", "e1", "Air mineral", "minuman", 4000, 2), it("i7", "e1", "Permen", "snack", 2000), it("i8", "e1", "Tisu", "lainnya", 3000)] },
  ];
  if (v === "rekap") {
    return (
      <AppLayout>
        <RekapView
          data={{
            year: y, month: m, monthKey: `${y}-${String(m).padStart(2, "0")}`, name: "Demo", diary: "Jajanku",
            total: 107900, itemCount: 9, dayCount: 4,
            topItem: { name: "Kopi susu gula aren", count: 3, sticker: null },
            peakDay: { date: d(10), total: 46000 },
            topCategory: { label: "Makanan", category: "makanan", pct: 37 },
            topStore: { name: "Kopi Kenangan", total: 46000 },
            bestRated: { name: "Croissant", rating: 5, sticker: null },
            stickers: [],
          }}
        />
      </AppLayout>
    );
  }
  if (v === "chat") {
    return (
      <AppLayout>
        <ChatView displayName="Demo" />
      </AppLayout>
    );
  }
  if (v === "stats") {
    const daily = Array.from({ length: 30 }, (_, i) => (i < 11 ? [0, 0, 26900, 0, 0, 23000, 0, 0, 0, 46000, 12000][i] : 0));
    return (
      <AppLayout>
        <StatsView
          data={{
            year: y, month: m, monthKey: `${y}-${String(m).padStart(2, "0")}`, today: todayJakarta(), budget: 150000, daily, kcalTotal: 2150,
            byCat: { makanan: 40000, minuman: 37000, snack: 15900, lainnya: 3000 },
            topItems: [{ name: "Kopi susu gula aren", total: 24000, count: 1 }, { name: "Croissant", total: 22000, count: 1 }, { name: "Nasi ayam geprek", total: 18000, count: 1 }],
            topStores: [{ name: "Kopi Kenangan", total: 46000 }, { name: "Warung Bu Sri", total: 23000 }],
          }}
        />
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <MejaView year={y} month={m} today={todayJakarta()} initialFocus={null} diaryName="Jajanku" displayName="Demo" budget={150000} achievements={computeAchievements(v === "kosong" ? [] : entries, todayJakarta(), 150000)} entries={v === "kosong" ? [] : entries} storeNames={{ s1: "Indomaret" }} />
    </AppLayout>
  );
}
