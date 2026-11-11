export const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
export const DAYS_SHORT = ["S", "S", "R", "K", "J", "S", "M"]; // Senin..Minggu
const DAY_NAMES = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

/** Tanggal hari ini (YYYY-MM-DD) di zona Asia/Jakarta. */
export function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

export function parseMonth(m: string | undefined) {
  const match = m?.match(/^(\d{4})-(\d{2})$/);
  const [y, mo] = match ? [Number(match[1]), Number(match[2])] : todayJakarta().split("-").map(Number);
  return { year: y, month: Math.min(12, Math.max(1, mo)) };
}

export const pad = (n: number) => String(n).padStart(2, "0");
export const monthKey = (y: number, m: number) => `${y}-${pad(m)}`;

export function shiftMonth(y: number, m: number, delta: number) {
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return monthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

export function monthRange(y: number, m: number) {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(last)}`, days: last };
}

/** Sel kalender, minggu mulai Senin. null = sel kosong. */
export function calendarCells(y: number, m: number): (string | null)[] {
  const { days } = monthRange(y, m);
  const firstDow = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${y}-${pad(m)}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function formatDayLong(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAY_NAMES[dow]}, ${d} ${MONTHS[m - 1]}`;
}

export const formatTime = (t: string | null) => (t ? t.slice(0, 5).replace(":", ".") : null);
