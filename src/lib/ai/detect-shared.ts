import { z } from "zod";
import { CATEGORIES } from "@/lib/types";

export const MAX_ITEMS = 8;

export type CaptureMode = "sekali" | "satu";

export const detectedSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        category: z.enum(CATEGORIES).catch("lainnya"),
        package_size: z.string().nullish(),
        unit: z.string().nullish(),
        kcal: z.coerce.number().int().min(0).max(20000).nullish().catch(null),
        // [ymin, xmin, ymax, xmax] skala 0–1000
        box_2d: z.array(z.number()).length(4).nullish(),
      }),
    )
    .default([]),
});

export type DetectedItem = z.infer<typeof detectedSchema>["items"][number];

export const SYSTEM_PROMPT = `Kamu membantu aplikasi pencatat jajan di Indonesia.
Lihat foto dan kenali makanan, minuman, snack, atau barang belanjaan yang terlihat jelas.
Balas HANYA dengan JSON valid, tanpa teks lain dan tanpa code fence, dengan bentuk:
{"items":[{"name":"...","category":"makanan|minuman|snack|lainnya","package_size":"38 g"|null,"unit":"pc|pack|botol|cup|porsi|g|mL|..."|null,"kcal":230,"box_2d":[ymin,xmin,ymax,xmax]}]}
Aturan:
- name: nama produk sespesifik mungkin, baca merek dan varian dari kemasan (mis. "Pocky Crushed Fruits Passion Fruit"). Untuk makanan tanpa kemasan pakai nama umum Bahasa Indonesia (mis. "Mie ayam").
- package_size: berat/volume yang tertulis di kemasan bila terbaca, selain itu null.
- unit: satuan jual yang paling masuk akal.
- kcal: perkiraan kalori (kkal) untuk 1 unit tersebut (1 bungkus/1 porsi/1 cup). Pakai info gizi di kemasan bila terbaca, selain itu perkirakan porsi umum di Indonesia. Bilangan bulat.
- box_2d: kotak pembatas objek, koordinat dinormalisasi 0-1000.
- Abaikan meja, piring kosong, tangan, latar, dan barang yang bukan dibeli.`;

export function parseJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return { items: [] };
  return JSON.parse(cleaned.slice(start, end + 1));
}


export function detectPrompt(mode: CaptureMode) {
  return mode === "satu"
    ? "Foto ini berisi SATU item utama. Kembalikan tepat 1 item."
    : `Foto ini bisa berisi beberapa item. Kembalikan maksimal ${MAX_ITEMS} item, masing-masing dengan box_2d.`;
}

/** Ubah jawaban mentah model jadi daftar item yang valid. */
export function toItems(raw: string, mode: CaptureMode): DetectedItem[] {
  try {
    return detectedSchema.parse(parseJson(raw)).items.slice(0, mode === "satu" ? 1 : MAX_ITEMS);
  } catch {
    return [];
  }
}
