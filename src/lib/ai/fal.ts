import "server-only";
import { fal } from "@fal-ai/client";
import sharp from "sharp";
import { SYSTEM_PROMPT, detectPrompt, toItems, type CaptureMode, type DetectedItem } from "./detect-shared";

export type { CaptureMode, DetectedItem };

fal.config({ credentials: process.env.FAL_KEY });

const VISION_ENDPOINT = "openrouter/router/vision";
const CUTOUT_ENDPOINT = "fal-ai/birefnet/v2";
const VISION_MODEL = process.env.FAL_VISION_MODEL || "google/gemini-2.5-flash";

async function uploadToFal(buf: Buffer, type: string): Promise<string> {
  return fal.storage.upload(new Blob([new Uint8Array(buf)], { type }));
}

/** Kenali item di foto. */
export async function detectItems(imageUrl: string, mode: CaptureMode): Promise<DetectedItem[]> {
  const prompt = detectPrompt(mode);

  const { data } = await fal.subscribe(VISION_ENDPOINT, {
    input: {
      model: VISION_MODEL,
      system_prompt: SYSTEM_PROMPT,
      prompt,
      image_urls: [imageUrl],
      temperature: 0,
    },
  });

  return toItems((data as { output: string }).output, mode);
}

/** Potong area item (dengan sedikit ruang) lalu hapus latarnya → PNG transparan. */
export async function cutoutSticker(
  image: Buffer,
  size: { width: number; height: number },
  box: number[] | null | undefined,
): Promise<Buffer> {
  let crop = image;
  if (box) {
    const [ymin, xmin, ymax, xmax] = box.map((v) => Math.min(1000, Math.max(0, v)) / 1000);
    const pad = 0.04;
    const left = Math.floor(Math.max(0, xmin - pad) * size.width);
    const top = Math.floor(Math.max(0, ymin - pad) * size.height);
    const right = Math.ceil(Math.min(1, xmax + pad) * size.width);
    const bottom = Math.ceil(Math.min(1, ymax + pad) * size.height);
    if (right - left > 16 && bottom - top > 16) {
      crop = await sharp(image)
        .extract({ left, top, width: right - left, height: bottom - top })
        .jpeg({ quality: 90 })
        .toBuffer();
    }
  }

  const cropUrl = await uploadToFal(crop, "image/jpeg");
  const { data } = await fal.subscribe(CUTOUT_ENDPOINT, {
    input: {
      image_url: cropUrl,
      model: "General Use (Light)",
      operating_resolution: "1024x1024",
      output_format: "png",
      refine_foreground: true,
    },
  });

  const res = await fetch((data as { image: { url: string } }).image.url);
  if (!res.ok) throw new Error("Gagal mengambil hasil stiker");
  const png = Buffer.from(await res.arrayBuffer());

  // Rapikan sisi transparan & kecilkan supaya ringan.
  return sharp(png)
    .trim({ threshold: 1 })
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 90 })
    .toBuffer();
}

/** Unggah JPEG ke penyimpanan sementara fal.ai. */
export function uploadImage(jpeg: Buffer) {
  return uploadToFal(jpeg, "image/jpeg");
}
