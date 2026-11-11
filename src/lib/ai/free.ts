import "server-only";
import { complete } from "./llm";
import { SYSTEM_PROMPT, detectPrompt, toItems, type CaptureMode, type DetectedItem } from "./detect-shared";

/** Baca foto dengan Gemini (cadangan: Groq). Pemotongan stiker dilakukan di browser. */
export async function detectItemsFree(jpeg: Buffer, mode: CaptureMode): Promise<DetectedItem[]> {
  const raw = await complete(SYSTEM_PROMPT, [{ role: "user", content: detectPrompt(mode) }], {
    image: { mime: "image/jpeg", base64: jpeg.toString("base64") },
    json: true,
  });
  return toItems(raw, mode);
}
