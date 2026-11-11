import "server-only";

/**
 * Pembatas percobaan sederhana di memori server.
 * Cukup untuk satu server / development. Di Vercel tiap instance punya memori sendiri,
 * jadi untuk produksi besar sebaiknya diganti penyimpanan bersama (mis. Upstash Redis).
 * Supabase Auth juga punya pembatas bawaan sebagai lapisan kedua.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkLimit(key: string, max: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) return { allowed: true, retryAfterMs: 0, remaining: max };
  return { allowed: b.count < max, retryAfterMs: b.resetAt - now, remaining: Math.max(0, max - b.count) };
}

export function hit(key: string, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs });
  else b.count++;
  // Bersihkan entri kedaluwarsa sesekali.
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

export function reset(key: string) {
  buckets.delete(key);
}

export const minutes = (ms: number) => Math.max(1, Math.ceil(ms / 60_000));
