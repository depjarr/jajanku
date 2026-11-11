import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import type { CaptureMode, DetectedItem } from "@/lib/ai/detect-shared";
import { aiProvider } from "@/lib/ai/provider";
import type { DraftItem } from "@/lib/types";

export const maxDuration = 120;

const MAX_UPLOAD = 15 * 1024 * 1024;

/**
 * Terima foto, kenali item, dan (mode fal) buat stikernya di server.
 * Mode "gratis": Gemini/Groq membaca foto, stiker dipotong di browser (kolom `box_2d` dikirim balik).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const provider = aiProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "Isi GEMINI_API_KEY (gratis) atau FAL_KEY di .env.local, lalu jalankan ulang server." },
      { status: 500 },
    );
  }

  const form = await request.formData();
  const file = form.get("photo");
  const mode: CaptureMode = form.get("mode") === "satu" ? "satu" : "sekali";
  const keepOriginal = form.get("keepOriginal") === "1";

  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD) {
    return NextResponse.json({ error: "Ukuran foto maksimal 15 MB" }, { status: 413 });
  }

  const userId = auth.user.id;
  const input = Buffer.from(await file.arrayBuffer());

  // Putar sesuai EXIF, kecilkan, jadikan JPEG.
  const { data: jpeg, info } = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer({ resolveWithObject: true });

  let photoPath: string | null = null;
  if (keepOriginal) {
    photoPath = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from("photos").upload(photoPath, jpeg, { contentType: "image/jpeg" });
    if (error) photoPath = null;
  }

  const blank: DetectedItem = { name: "", category: "lainnya", package_size: null, unit: null, box_2d: null, kcal: null };

  // ---------- Mode gratis ----------
  if (provider === "gratis") {
    const { detectItemsFree } = await import("@/lib/ai/free");
    let detected: DetectedItem[] = [];
    let aiFailed = false;
    try {
      detected = await detectItemsFree(jpeg, mode);
    } catch (e) {
      // AI sibuk / kena batas: foto tetap jadi stiker, nama diisi manual.
      console.error("[analyze] AI gratis gagal:", e instanceof Error ? e.message : e);
      aiFailed = true;
    }
    if (detected.length === 0) detected = [blank];

    const items: DraftItem[] = detected.map((d) => ({
      key: crypto.randomUUID(),
      name: d.name,
      category: d.category,
      package_size: d.package_size ?? null,
      unit_symbol: d.unit ?? null,
      calories: d.kcal ?? null,
      sticker_path: null,
      box_2d: mode === "sekali" && detected.length > 1 ? (d.box_2d ?? null) : null,
    }));

    return NextResponse.json({
      items,
      photoPath,
      cutout: "client",
      notice: aiFailed ? "AI lagi sibuk, jadi nama item belum terisi. Isi manual ya, stikernya tetap dibuat." : undefined,
    });
  }

  // ---------- Mode fal.ai ----------
  try {
    const { cutoutSticker, detectItems, uploadImage } = await import("@/lib/ai/fal");
    const falUrl = await uploadImage(jpeg);
    let detected = await detectItems(falUrl, mode);
    if (detected.length === 0) detected = [blank];

    const items = await Promise.all(
      detected.map(async (d): Promise<DraftItem> => {
        let stickerPath: string | null = null;
        try {
          const box = mode === "sekali" && detected.length > 1 ? d.box_2d : null;
          const webp = await cutoutSticker(jpeg, info, box);
          const path = `${userId}/${crypto.randomUUID()}.webp`;
          const { error } = await supabase.storage.from("stickers").upload(path, webp, { contentType: "image/webp" });
          if (!error) stickerPath = path;
        } catch (e) {
          console.error("cutout gagal", e);
        }
        return {
          key: crypto.randomUUID(),
          name: d.name,
          category: d.category,
          package_size: d.package_size ?? null,
          unit_symbol: d.unit ?? null,
          calories: d.kcal ?? null,
          sticker_path: stickerPath,
        };
      }),
    );

    return NextResponse.json({ items, photoPath, cutout: "server" });
  } catch (e) {
    console.error("analyze gagal", e);
    return NextResponse.json({ error: "AI lagi kesulitan membaca foto. Coba lagi ya." }, { status: 502 });
  }
}
