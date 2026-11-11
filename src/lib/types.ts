export const CATEGORIES = ["makanan", "minuman", "snack", "lainnya"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, { label: string }> = {
  makanan: { label: "Makanan" },
  minuman: { label: "Minuman" },
  snack: { label: "Snack" },
  lainnya: { label: "Lainnya" },
};

export type Unit = { id: string; user_id: string | null; name: string; symbol: string; kind: "berat" | "volume" | "hitungan" };
export type Store = { id: string; name: string };

export type Item = {
  id: string;
  entry_id: string;
  name: string;
  category: Category;
  store_id: string | null;
  unit_id: string | null;
  qty: number;
  price: number;
  package_size: string | null;
  sticker_path: string | null;
  rating?: number | null;
  calories?: number | null;
  note?: string | null;
};

export type Entry = {
  id: string;
  title: string;
  eaten_on: string; // YYYY-MM-DD
  eaten_at: string | null;
  location: string | null;
  photo_path: string | null;
  items: Item[];
};

/** Hasil analisis AI yang dikirim ke form review. */
export type DraftItem = {
  key: string;
  name: string;
  category: Category;
  package_size: string | null;
  unit_symbol: string | null;
  sticker_path: string | null;
  /** Posisi item [ymin, xmin, ymax, xmax] skala 0–1000, untuk dipotong di browser. */
  box_2d?: number[] | null;
  calories?: number | null;
};

export function stickerUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/stickers/${path}`;
}

export const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

/** Total kalori item (perkiraan) = kkal per unit × jumlah. */
export const itemKcal = (i: { qty: number | string; calories?: number | null }) => (i.calories ? Number(i.qty) * i.calories : 0);

export const kcal = (n: number) => `${Math.round(n).toLocaleString("id-ID")} kkal`;

export const itemTotal = (i: Pick<Item, "qty" | "price">) => Number(i.qty) * Number(i.price);
