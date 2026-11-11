import "server-only";

export type AiProvider = "gratis" | "fal";

/**
 * AI_PROVIDER=gratis → Gemini (cadangan Groq) + potong stiker di browser.
 * AI_PROVIDER=fal    → fal.ai (berbayar, stiker paling rapi).
 * Kosong → otomatis: gratis bila ada GEMINI_API_KEY/GROQ_API_KEY, selain itu fal bila ada FAL_KEY.
 */
export function aiProvider(): AiProvider | null {
  const want = process.env.AI_PROVIDER?.trim().toLowerCase();
  const hasFree = Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);
  const hasFal = Boolean(process.env.FAL_KEY);
  if (want === "fal") return hasFal ? "fal" : null;
  if (want === "gratis") return hasFree ? "gratis" : null;
  return hasFree ? "gratis" : hasFal ? "fal" : null;
}
