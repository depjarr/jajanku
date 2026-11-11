"use client";

/**
 * Membuat stiker langsung di browser (mode AI gratis):
 * potong area item → hapus latar (@imgly/background-removal, gratis, tanpa API) →
 * rapikan sisi transparan → kecilkan → WebP.
 */

const MAX_SIDE = 640;

/** Kotak [ymin, xmin, ymax, xmax] skala 0–1000 dianggap valid bila masuk akal. */
export function isValidBox(box: number[] | null | undefined): box is number[] {
  if (!box || box.length !== 4 || box.some((v) => !Number.isFinite(v))) return false;
  const [y0, x0, y1, x1] = box;
  const w = x1 - x0;
  const h = y1 - y0;
  return x0 >= -20 && y0 >= -20 && x1 <= 1020 && y1 <= 1020 && w > 30 && h > 30 && w * h < 1_000_000;
}

async function cropToBlob(bmp: ImageBitmap, box: number[] | null): Promise<Blob> {
  let sx = 0;
  let sy = 0;
  let sw = bmp.width;
  let sh = bmp.height;
  if (box) {
    const pad = 0.04;
    const [y0, x0, y1, x1] = box.map((v) => Math.min(1000, Math.max(0, v)) / 1000);
    sx = Math.floor(Math.max(0, x0 - pad) * bmp.width);
    sy = Math.floor(Math.max(0, y0 - pad) * bmp.height);
    sw = Math.ceil(Math.min(1, x1 + pad) * bmp.width) - sx;
    sh = Math.ceil(Math.min(1, y1 + pad) * bmp.height) - sy;
  }
  const scale = Math.min(1, 1024 / Math.max(sw, sh));
  const canvas = new OffscreenCanvas(Math.round(sw * scale), Math.round(sh * scale));
  canvas.getContext("2d")!.drawImage(bmp, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.convertToBlob({ type: "image/png" });
}

/** Buang sisi transparan dan kecilkan ke maksimal 640px. */
async function trimAndShrink(png: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(png);
  const probe = new OffscreenCanvas(bmp.width, bmp.height);
  const pctx = probe.getContext("2d")!;
  pctx.drawImage(bmp, 0, 0);
  const { data, width, height } = pctx.getImageData(0, 0, bmp.width, bmp.height);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("Stiker kosong");

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const scale = Math.min(1, MAX_SIDE / Math.max(cw, ch));
  const out = new OffscreenCanvas(Math.round(cw * scale), Math.round(ch * scale));
  out.getContext("2d")!.drawImage(probe, minX, minY, cw, ch, 0, 0, out.width, out.height);
  return out.convertToBlob({ type: "image/webp", quality: 0.88 });
}

/** Siapkan model penghapus latar lebih awal supaya stiker pertama lebih cepat. */
export function preloadCutout() {
  import("@imgly/background-removal")
    .then((m) => m.preload({ model: "isnet_quint8" }))
    .catch(() => {});
}

export async function makeSticker(photo: Blob, box: number[] | null | undefined): Promise<Blob> {
  const bmp = await createImageBitmap(photo);
  const crop = await cropToBlob(bmp, isValidBox(box) ? box : null);
  const { removeBackground } = await import("@imgly/background-removal");
  const cut = await removeBackground(crop, { model: "isnet_quint8", output: { format: "image/png" } });
  return trimAndShrink(cut);
}
