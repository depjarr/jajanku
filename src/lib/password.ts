/** Aturan password bersama untuk server (validasi) dan browser (indikator kekuatan). */

const COMMON = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop",
  "11111111", "00000000", "iloveyou", "admin123", "abcd1234", "abc12345", "sayang123", "indonesia", "bismillah",
  "jajanku123", "jajanku", "rahasia123", "katasandi",
]);

export type PasswordCheck = { label: string; ok: boolean };

export function passwordChecks(pw: string): PasswordCheck[] {
  return [
    { label: "Minimal 8 karakter", ok: pw.length >= 8 },
    { label: "Ada huruf", ok: /\p{L}/u.test(pw) },
    { label: "Ada angka", ok: /\d/.test(pw) },
    { label: "Bukan password pasaran", ok: pw.length > 0 && !COMMON.has(pw.toLowerCase()) },
  ];
}

/** 0–4: makin tinggi makin kuat. */
export function passwordScore(pw: string) {
  if (!pw) return 0;
  let score = passwordChecks(pw).filter((c) => c.ok).length - 1;
  if (pw.length >= 12) score++;
  if (/[^\p{L}\d]/u.test(pw) && /[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  return Math.max(0, Math.min(4, score));
}

/** Pesan masalah pertama, atau null bila password sudah layak. */
export function passwordProblem(pw: string, personal: string[] = []) {
  const failed = passwordChecks(pw).find((c) => !c.ok);
  if (failed) return failed.label === "Bukan password pasaran" ? "Password ini terlalu pasaran, pakai yang lain ya." : `Password belum memenuhi: ${failed.label.toLowerCase()}.`;
  const lower = pw.toLowerCase();
  for (const p of personal) {
    const part = p.toLowerCase().split("@")[0].trim();
    if (part.length >= 4 && lower.includes(part)) return "Password jangan memuat nama atau email kamu.";
  }
  if (pw.length > 200) return "Password terlalu panjang.";
  return null;
}
