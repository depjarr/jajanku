import "server-only";

/**
 * Klien LLM gratis: Gemini (Google AI Studio) sebagai utama, Groq sebagai cadangan.
 * Tanpa SDK supaya ringan; keduanya dipanggil lewat REST.
 */

export type ChatMsg = { role: "user" | "assistant"; content: string };
export type ImageInput = { mime: string; base64: string };

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const geminiModels = () =>
  (process.env.GEMINI_MODELS || "gemini-3.6-flash,gemini-3.5-flash-lite,gemini-2.5-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

const groqVisionModel = () => process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";
const groqChatModel = () => process.env.GROQ_CHAT_MODEL || process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";

export function hasFreeAi() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);
}

class RetryableError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 429 (kena batas), 5xx (sibuk), 404/400 model tidak tersedia → coba berikutnya. */
function isRetryable(status: number) {
  return status === 429 || status === 404 || status >= 500;
}

// ---------------------------------------------------------------- Gemini
function geminiBody(system: string, messages: ChatMsg[], image?: ImageInput, json?: boolean) {
  const contents = messages.map((m, i) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [
      ...(image && i === messages.length - 1 ? [{ inline_data: { mime_type: image.mime, data: image.base64 } }] : []),
      { text: m.content },
    ],
  }));
  return JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: json ? 0 : 0.7, ...(json ? { responseMimeType: "application/json" } : {}) },
  });
}

async function geminiOnce(model: string, body: string, stream: boolean) {
  const url = `${GEMINI_URL}/${model}:${stream ? "streamGenerateContent?alt=sse" : "generateContent"}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body,
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = `Gemini ${model} ${res.status}: ${detail.slice(0, 200)}`;
    throw isRetryable(res.status) ? new RetryableError(err) : new Error(err);
  }
  return res;
}

// ---------------------------------------------------------------- Groq
function groqBody(model: string, system: string, messages: ChatMsg[], image?: ImageInput, json?: boolean, stream?: boolean) {
  return JSON.stringify({
    model,
    stream: Boolean(stream),
    temperature: json ? 0 : 0.7,
    ...(json ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: system },
      ...messages.map((m, i) =>
        image && i === messages.length - 1
          ? {
              role: m.role,
              content: [
                { type: "text", text: m.content },
                { type: "image_url", image_url: { url: `data:${image.mime};base64,${image.base64}` } },
              ],
            }
          : m,
      ),
    ],
  });
}

async function groqOnce(body: string) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body,
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = `Groq ${res.status}: ${detail.slice(0, 200)}`;
    throw isRetryable(res.status) ? new RetryableError(err) : new Error(err);
  }
  return res;
}

// ---------------------------------------------------------------- rantai cadangan
type Attempt = { name: string; run: () => Promise<Response>; kind: "gemini" | "groq" };

function attempts(system: string, messages: ChatMsg[], opts: { image?: ImageInput; json?: boolean; stream?: boolean }): Attempt[] {
  const list: Attempt[] = [];
  if (process.env.GEMINI_API_KEY) {
    const body = geminiBody(system, messages, opts.image, opts.json);
    for (const model of geminiModels()) list.push({ name: model, kind: "gemini", run: () => geminiOnce(model, body, Boolean(opts.stream)) });
  }
  if (process.env.GROQ_API_KEY) {
    const model = opts.image ? groqVisionModel() : groqChatModel();
    const body = groqBody(model, system, messages, opts.image, opts.json, opts.stream);
    list.push({ name: model, kind: "groq", run: () => groqOnce(body) });
  }
  return list;
}

/**
 * Coba tiap model berurutan. Model yang sibuk dicoba ulang sekali dengan jeda singkat
 * sebelum pindah ke model berikutnya.
 */
async function firstOk(list: Attempt[]): Promise<{ res: Response; kind: Attempt["kind"]; name: string }> {
  if (list.length === 0) throw new Error("GEMINI_API_KEY / GROQ_API_KEY belum diisi di .env.local");
  let last: unknown;
  for (const a of list) {
    for (let i = 0; i < 2; i++) {
      try {
        return { res: await a.run(), kind: a.kind, name: a.name };
      } catch (e) {
        last = e;
        console.warn(`[ai] ${a.name} gagal:`, e instanceof Error ? e.message : e);
        if (!(e instanceof RetryableError)) break;
        if (i === 0) await sleep(800 + Math.random() * 1200);
      }
    }
  }
  throw last instanceof Error ? last : new Error("Semua model AI sedang tidak tersedia");
}

/** Satu jawaban utuh (dipakai untuk membaca foto). */
export async function complete(system: string, messages: ChatMsg[], opts: { image?: ImageInput; json?: boolean } = {}) {
  const { res, kind } = await firstOk(attempts(system, messages, opts));
  const data = await res.json();
  if (kind === "gemini") {
    return ((data.candidates?.[0]?.content?.parts ?? []) as { text?: string }[]).map((p) => p.text ?? "").join("");
  }
  return (data.choices?.[0]?.message?.content as string) ?? "";
}

/** Jawaban bertahap (dipakai untuk chat). Menghasilkan potongan teks. */
export async function* stream(system: string, messages: ChatMsg[]): AsyncGenerator<string> {
  const { res, kind } = await firstOk(attempts(system, messages, { stream: true }));
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const text =
          kind === "gemini"
            ? ((json.candidates?.[0]?.content?.parts ?? []) as { text?: string }[]).map((p) => p.text ?? "").join("")
            : (json.choices?.[0]?.delta?.content ?? "");
        if (text) yield text;
      } catch {
        // potongan SSE tidak lengkap, abaikan
      }
    }
  }
}
