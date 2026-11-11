/** Streak & pencapaian, dihitung dari riwayat jajan (fungsi murni, aman di server). */

export type HistoryEntry = {
  eaten_on: string;
  items: { qty: number | string; price: number | string; sticker_path: string | null; store_id: string | null; rating?: number | null; category: string }[];
};

export type Badge = {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  progress: number;
  target: number;
  unlocked: boolean;
};

export type Achievements = {
  recordStreak: number; // hari berturut-turut ada catatan (sampai hari ini / kemarin)
  hematStreak: number | null; // hari berturut-turut di bawah jatah harian (butuh budget)
  badges: Badge[];
  unlocked: number;
  totalItems: number;
};

const DAY = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const daysInMonth = (d: string) => new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)), 0)).getUTCDate();

export function computeAchievements(history: HistoryEntry[], today: string, budget: number | null): Achievements {
  const spend = new Map<string, number>();
  const months = new Map<string, number>();
  const stores = new Set<string>();
  const cats = new Set<string>();
  let items = 0;
  let stickers = 0;
  let rated = 0;

  for (const e of history) {
    for (const i of e.items) {
      const v = Number(i.qty) * Number(i.price);
      spend.set(e.eaten_on, (spend.get(e.eaten_on) ?? 0) + v);
      months.set(e.eaten_on.slice(0, 7), (months.get(e.eaten_on.slice(0, 7)) ?? 0) + v);
      items++;
      if (i.sticker_path) stickers++;
      if (i.store_id) stores.add(i.store_id);
      if (i.rating) rated++;
      cats.add(i.category);
    }
  }

  const days = [...spend.keys()].sort();
  const first = days[0];
  const t = toMs(today);

  // Streak mencatat: boleh dihitung dari kemarin kalau hari ini belum nyatat.
  let recordStreak = 0;
  for (let d = spend.has(today) ? t : t - DAY; spend.has(toDate(d)); d -= DAY) recordStreak++;

  // Streak terbaik sepanjang masa.
  let best = 0;
  let run = 0;
  let prev = 0;
  for (const d of days) {
    const ms = toMs(d);
    run = prev && ms - prev === DAY ? run + 1 : 1;
    best = Math.max(best, run);
    prev = ms;
  }

  // Streak hemat: hari (sejak catatan pertama) yang pengeluarannya ≤ budget / jumlah hari bulan itu.
  let hematStreak: number | null = null;
  let bestHemat = 0;
  if (budget && first) {
    const ok = (d: string) => (spend.get(d) ?? 0) <= budget / daysInMonth(d);
    hematStreak = 0;
    for (let d = t; d >= toMs(first) && ok(toDate(d)); d -= DAY) hematStreak++;
    let r = 0;
    for (let d = toMs(first); d <= t; d += DAY) {
      r = ok(toDate(d)) ? r + 1 : 0;
      bestHemat = Math.max(bestHemat, r);
    }
  }

  // Bulan yang sudah selesai dan totalnya tidak melewati budget.
  const thisMonth = today.slice(0, 7);
  const safeMonths = budget ? [...months.entries()].filter(([m, v]) => m < thisMonth && v <= budget).length : 0;

  const b = (id: string, emoji: string, title: string, desc: string, progress: number, target: number): Badge => ({
    id,
    emoji,
    title,
    desc,
    progress: Math.min(progress, target),
    target,
    unlocked: progress >= target,
  });

  const badges = [
    b("first", "🎉", "Jajan pertama", "Catat jajan pertamamu", items, 1),
    b("sticker10", "🧩", "Kolektor stiker", "Kumpulkan 10 stiker dari foto", stickers, 10),
    b("sticker50", "👑", "Raja stiker", "Kumpulkan 50 stiker", stickers, 50),
    b("streak3", "🔥", "Rajin nyatat", "Nyatat 3 hari berturut-turut", best, 3),
    b("streak7", "📅", "Seminggu penuh", "Nyatat 7 hari berturut-turut", best, 7),
    b("stores5", "🗺️", "Penjelajah", "Jajan di 5 toko berbeda", stores.size, 5),
    b("rated5", "⭐", "Kritikus jajan", "Beri rating ke 5 jajanan", rated, 5),
    b("allcats", "🌈", "Serba coba", "Jajan dari semua kategori", cats.size, 4),
    b("hemat7", "🌱", "Hemat seminggu", "7 hari berturut di bawah jatah harian", bestHemat, 7),
    b("safemonth", "🏆", "Bulan aman", "Tutup satu bulan tanpa lewat budget", safeMonths, 1),
  ];

  return { recordStreak, hematStreak, badges, unlocked: badges.filter((x) => x.unlocked).length, totalItems: items };
}

/** Kolom yang dibutuhkan untuk menghitung pencapaian. */
export const HISTORY_SELECT = "eaten_on,items(qty,price,sticker_path,store_id,rating,category)";
