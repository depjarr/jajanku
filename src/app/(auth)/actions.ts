"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkLimit, hit, minutes, reset } from "@/lib/rate-limit";
import { passwordProblem } from "@/lib/password";
import { issueRecoveryCode, recoveryEnabled, setPassword, verifyRecoveryCode } from "@/lib/recovery";

export type AuthState = { error?: string; info?: string; recovery?: string } | undefined;

const MIN = 60_000;

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

/**
 * Jebakan bot: kolom tersembunyi "jj_hp" harus kosong, dan formulir
 * tidak mungkin diisi manusia dalam < 1,5 detik sejak halaman dibuka.
 */
function looksLikeBot(formData: FormData) {
  if (String(formData.get("jj_hp") ?? "").length > 0) return true;
  const started = Number(formData.get("started") ?? 0);
  // Waktu kosong (mis. JS belum jalan) tidak langsung dianggap bot; kolom jebakan tetap berlaku.
  return started > 0 && Date.now() - started < 1500;
}

const loginSchema = z.object({
  email: z.email("Email belum valid").transform((e) => e.toLowerCase()),
  password: z.string().min(1, "Password wajib diisi").max(200),
});

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nama wajib diisi")
      .max(40, "Nama maksimal 40 karakter")
      .regex(/^[\p{L}\p{N} .'_-]+$/u, "Nama hanya boleh huruf, angka, dan spasi"),
    email: z.email("Email belum valid").transform((e) => e.toLowerCase()),
    password: z.string().max(200),
    confirm: z.string(),
  })
  .superRefine((v, ctx) => {
    const problem = passwordProblem(v.password, [v.email, v.name]);
    if (problem) ctx.addIssue({ code: "custom", message: problem, path: ["password"] });
    if (v.password !== v.confirm) ctx.addIssue({ code: "custom", message: "Ulangi password belum sama", path: ["confirm"] });
  });

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  if (looksLikeBot(formData)) return { error: "Email atau password salah." };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ip = await clientIp();
  const keyUser = `login:${parsed.data.email}`;
  const keyIp = `login-ip:${ip}`;
  const byUser = checkLimit(keyUser, 5);
  const byIp = checkLimit(keyIp, 20);
  if (!byUser.allowed || !byIp.allowed) {
    const wait = Math.max(byUser.retryAfterMs, byIp.retryAfterMs);
    return { error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${minutes(wait)} menit.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    hit(keyUser, 15 * MIN);
    hit(keyIp, 15 * MIN);
    if (error.message === "Email not confirmed") return { error: "Akun ini belum aktif. Hubungi admin Jajanku ya." };
    const left = checkLimit(keyUser, 5).remaining;
    return { error: left <= 2 ? `Email atau password salah. Sisa ${left} percobaan sebelum dikunci 15 menit.` : "Email atau password salah." };
  }
  reset(keyUser);
  redirect("/");
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  if (looksLikeBot(formData)) redirect("/login?daftar=ok");
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const key = `register:${await clientIp()}`;
  const limit = checkLimit(key, 5);
  if (!limit.allowed) return { error: `Terlalu banyak pendaftaran dari perangkat ini. Coba lagi dalam ${minutes(limit.retryAfterMs)} menit.` };
  hit(key, 60 * MIN);

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) return { error: "Email ini sudah terdaftar. Coba masuk atau pakai Lupa password." };
    if (/weak|pwned|leaked/i.test(error.message)) return { error: "Password ini terlalu umum atau pernah bocor. Pakai password lain ya." };
    return { error: "Gagal membuat akun. Coba lagi sebentar lagi." };
  }

  // Buat kode pemulihan (ditampilkan sekali), lalu keluar dulu bila Supabase langsung memberi sesi.
  const code = data.user ? await issueRecoveryCode(data.user.id, parsed.data.email) : null;
  if (data.session) await supabase.auth.signOut();
  if (code) return { recovery: code };
  redirect("/login?daftar=ok");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const resetSchema = z.object({
  email: z.email("Email belum valid").transform((e) => e.toLowerCase()),
  code: z.string().trim().min(8, "Kode pemulihan belum lengkap").max(40),
  password: z.string().max(200),
  confirm: z.string(),
});

/** Lupa password tanpa email: email + kode pemulihan → password baru, lalu dapat kode baru. */
export async function resetWithCode(_: AuthState, formData: FormData): Promise<AuthState> {
  const wrong: AuthState = { error: "Email atau kode pemulihan salah." };
  if (looksLikeBot(formData)) return wrong;
  if (!recoveryEnabled()) return { error: "Fitur kode pemulihan belum diaktifkan (SUPABASE_SECRET_KEY belum diisi)." };
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, code, password, confirm } = parsed.data;

  const keyUser = `recover:${email}`;
  const keyIp = `recover-ip:${await clientIp()}`;
  const byUser = checkLimit(keyUser, 5);
  const byIp = checkLimit(keyIp, 15);
  if (!byUser.allowed || !byIp.allowed) {
    return { error: `Terlalu banyak percobaan. Coba lagi dalam ${minutes(Math.max(byUser.retryAfterMs, byIp.retryAfterMs))} menit.` };
  }

  const problem = passwordProblem(password, [email]);
  if (problem) return { error: problem };
  if (password !== confirm) return { error: "Ulangi password belum sama" };

  const userId = await verifyRecoveryCode(email, code);
  if (!userId) {
    hit(keyUser, 15 * MIN);
    hit(keyIp, 15 * MIN);
    return wrong;
  }
  if (!(await setPassword(userId, password))) return { error: "Gagal menyimpan password baru. Coba lagi sebentar." };
  reset(keyUser);
  // Kode lama hangus, ganti dengan yang baru.
  const next = await issueRecoveryCode(userId, email);
  return next ? { recovery: next } : { info: "Password diganti! Silakan masuk." };
}

/** Buat ulang kode pemulihan untuk user yang sedang login. */
export async function regenerateRecoveryCode(): Promise<AuthState> {
  if (!recoveryEnabled()) return { error: "Fitur kode pemulihan belum diaktifkan." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return { error: "Sesi habis, silakan masuk lagi." };
  const key = `recover-new:${data.user.id}`;
  const limit = checkLimit(key, 5);
  if (!limit.allowed) return { error: `Tunggu ${minutes(limit.retryAfterMs)} menit dulu ya.` };
  hit(key, 60 * MIN);
  const code = await issueRecoveryCode(data.user.id, data.user.email);
  return code ? { recovery: code } : { error: "Gagal membuat kode. Coba lagi sebentar." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Link sudah kedaluwarsa. Minta link baru dari halaman Lupa password." };
  const problem = passwordProblem(password, [data.user.email ?? ""]);
  if (problem) return { error: problem };
  if (password !== formData.get("confirm")) return { error: "Ulangi password belum sama" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: /same/i.test(error.message) ? "Password baru tidak boleh sama dengan yang lama." : "Gagal menyimpan password baru." };
  redirect("/?pw=ok");
}
