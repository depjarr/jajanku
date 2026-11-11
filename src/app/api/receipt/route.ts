import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { complete, hasFreeAi } from "@/lib/ai/llm";
import { parseJson } from "@/lib/ai/detect-shared";
import { CATEGORIES } from "@/lib/types";

export const maxDuration = 60;

const MAX_UPLOAD = 15 * 1024 * 1024;

const receiptSchema = z.object({
  store: z.string().nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().catch(null),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullish().catch(null),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        qty: z.coerce.number().positive().catch(1),
        unit_price: z.coerce.number().min(0).catch(0),
        kcal: z.coerce.number().int().min(0).max(20000).nullish().catch(null),
        category: z.enum(CATEGORIES).catch("lainnya"),
        match: z.number().int().nullish().catch(null),
      }),
    )
    .default([]),
});

export type ReceiptResult = z.infer<typeof receiptSchema>;

const SYSTEM = `Kamu membaca foto struk belanja/kasir di Indonesia untuk aplikasi pencatat jajan.
Balas HANYA JSON valid tanpa teks lain:
{"store":"nama toko"|null,"date":"YYYY-MM-DD"|null,"time":"HH:MM"|null,"items":[{"name":"...","qty":1,"unit_price":13900,"kcal":190,"category":"makanan|minuman|snack|lainnya","match":0|null}]}
Aturan:
- Hanya baris barang yang dibeli. Abaikan subtotal, total, pajak, PPN, service, diskon member, pembayaran, kembalian, poin.
- Jika ada diskon langsung untuk satu barang, kurangi ke unit_price barang itu.
- kcal = perkiraan kalori 1 satuan barang (bilangan bulat; null bila bukan makanan/minuman).
- unit_price = harga per satuan dalam Rupiah sebagai angka bulat (13.900 → 13900). qty = jumlah.
- Rapikan nama barang dari singkatan struk bila jelas (mis. "POCKY CRSH FRT 38G" → "Pocky Crushed Fruits 38 g").
- "match": indeks item dari DAFTAR ITEM FOTO yang merupakan barang yang sama, atau null bila tidak ada yang cocok. Satu indeks hanya boleh dipakai sekali.
- Jika gambar bukan struk, kembalikan items kosong.`;

/** Baca struk → daftar barang + harga, dan cocokkan dengan item hasil foto jajanan (opsional). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  if (!hasFreeAi()) {
    return NextResponse.json({ error: "Scan struk butuh GEMINI_API_KEY atau GROQ_API_KEY di .env.local." }, { status: 500 });
  }

  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD) return NextResponse.json({ error: "Ukuran foto maksimal 15 MB" }, { status: 413 });

  let names: string[] = [];
  try {
    names = z.array(z.string().max(120)).max(30).parse(JSON.parse(String(form.get("names") ?? "[]")));
  } catch {}

  // Struk butuh resolusi lebih tinggi supaya angka kecil terbaca.
  const jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  const list = names.length
    ? `DAFTAR ITEM FOTO (indeks: nama):\n${names.map((n, i) => `${i}: ${n || "(belum bernama)"}`).join("\n")}`
    : "DAFTAR ITEM FOTO: (kosong, semua match = null)";

  try {
    const raw = await complete(SYSTEM, [{ role: "user", content: `Baca struk ini.\n${list}` }], {
      image: { mime: "image/jpeg", base64: jpeg.toString("base64") },
      json: true,
    });
    const result = receiptSchema.parse(parseJson(raw));
    // Buang indeks match yang tidak valid / dobel.
    const used = new Set<number>();
    result.items = result.items.map((it) => {
      const ok = it.match != null && it.match >= 0 && it.match < names.length && !used.has(it.match);
      if (ok) used.add(it.match!);
      return { ...it, match: ok ? it.match : null };
    });
    if (result.items.length === 0) {
      return NextResponse.json({ error: "Struknya belum terbaca. Coba foto lebih dekat, lurus, dan terang ya." }, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("[receipt] gagal:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "AI lagi sibuk membaca struk. Coba lagi sebentar ya." }, { status: 502 });
  }
}
