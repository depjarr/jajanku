import "server-only";
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Kode pemulihan password: JAJAN-XXXX-XXXX (8 karakter acak, tanpa huruf yang mirip seperti 0/O, 1/I).
 * Yang disimpan hanya hash scrypt + salt, jadi kode asli tidak bisa dilihat siapa pun.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generate() {
  const pick = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `JAJAN-${pick()}-${pick()}`;
}

/** Samakan format masukan: huruf besar, tanpa spasi/strip, tanpa awalan JAJAN. */
export function normalizeCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^JAJAN/, "");
}

function hash(code: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(normalizeCode(code), salt, 32).toString("hex")}`;
}

function matches(code: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const a = scryptSync(normalizeCode(code), Buffer.from(saltHex, "hex"), 32);
  const b = Buffer.from(hashHex, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const recoveryEnabled = () => !!process.env.SUPABASE_SECRET_KEY;

/** Buat kode baru untuk user (kode lama otomatis tidak berlaku). Kembalikan kode asli, atau null bila belum dikonfigurasi. */
export async function issueRecoveryCode(userId: string, email: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const code = generate();
  const { error } = await admin
    .from("recovery_codes")
    .upsert({ user_id: userId, email: email.toLowerCase(), code_hash: hash(code), created_at: new Date().toISOString() });
  if (error) {
    console.error("[recovery] gagal menyimpan kode:", error.message);
    return null;
  }
  return code;
}

/** Kapan kode terakhir dibuat (untuk ditampilkan di halaman Kamu). */
export async function recoveryCreatedAt(userId: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("recovery_codes").select("created_at").eq("user_id", userId).maybeSingle();
  return data?.created_at ?? null;
}

/** Cocokkan email + kode → id user, atau null. */
export async function verifyRecoveryCode(email: string, code: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("recovery_codes").select("user_id,code_hash").eq("email", email.toLowerCase()).maybeSingle();
  // Tetap hitung hash walau email tidak ada, supaya waktu respons tidak membocorkan apa pun.
  const ok = matches(code, data?.code_hash ?? "00:00");
  return ok && data ? data.user_id : null;
}

/** Ganti password user lewat API admin. */
export async function setPassword(userId: string, password: string) {
  const admin = createAdminClient();
  if (!admin) return false;
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) console.error("[recovery] gagal ganti password:", error.message);
  return !error;
}
