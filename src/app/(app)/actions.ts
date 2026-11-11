"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { CATEGORIES, type Unit } from "@/lib/types";
import { normalizeTheme } from "@/lib/theme";

type Result = { error?: string; ok?: boolean; id?: string };

const itemInput = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Nama item wajib diisi").max(120),
  category: z.enum(CATEGORIES),
  store_name: z.string().trim().max(60).nullish(),
  unit_id: z.uuid().nullish(),
  qty: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  price: z.coerce.number().min(0, "Harga tidak boleh minus"),
  package_size: z.string().trim().max(30).nullish(),
  sticker_path: z.string().max(200).nullish(),
  rating: z.coerce.number().int().min(1).max(5).nullish().catch(null),
  calories: z.coerce.number().int().min(0).max(20000).nullish().catch(null),
  note: z.string().trim().max(280).nullish(),
});

const entryInput = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(80),
  eaten_on: z.iso.date(),
  eaten_at: z.string().regex(/^\d{2}:\d{2}$/).nullish().or(z.literal("")),
  location: z.string().trim().max(80).nullish(),
  photo_path: z.string().max(200).nullish(),
  items: z.array(itemInput).min(1, "Minimal satu item"),
});

export type EntryInput = z.input<typeof entryInput>;
export type ItemInput = z.input<typeof itemInput>;

/** Cari atau buat toko berdasarkan nama, kembalikan id-nya. */
async function resolveStores(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  names: (string | null | undefined)[],
) {
  const unique = [...new Set(names.map((n) => n?.trim()).filter(Boolean) as string[])];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data } = await supabase
    .from("stores")
    .upsert(unique.map((name) => ({ user_id: userId, name })), { onConflict: "user_id,name" })
    .select("id,name");
  data?.forEach((s) => map.set(s.name, s.id));
  return map;
}

function ownPath(userId: string, path: string | null | undefined) {
  return path && path.startsWith(`${userId}/`) ? path : null;
}

export async function saveEntry(input: EntryInput): Promise<Result> {
  const parsed = entryInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, user } = await requireUser();
  const e = parsed.data;

  const { data: entry, error } = await supabase
    .from("entries")
    .insert({
      user_id: user.id,
      title: e.title,
      eaten_on: e.eaten_on,
      eaten_at: e.eaten_at || null,
      location: e.location || null,
      photo_path: ownPath(user.id, e.photo_path),
    })
    .select("id")
    .single();
  if (error || !entry) return { error: "Gagal menyimpan momen" };

  const stores = await resolveStores(supabase, user.id, e.items.map((i) => i.store_name));
  const { error: itemErr } = await supabase.from("items").insert(
    e.items.map((i) => ({
      entry_id: entry.id,
      user_id: user.id,
      name: i.name,
      category: i.category,
      store_id: i.store_name ? stores.get(i.store_name.trim()) ?? null : null,
      unit_id: i.unit_id ?? null,
      qty: i.qty,
      price: i.price,
      package_size: i.package_size || null,
      sticker_path: ownPath(user.id, i.sticker_path),
      rating: i.rating ?? null,
      calories: i.calories ?? null,
      note: i.note || null,
    })),
  );
  if (itemErr) {
    await supabase.from("entries").delete().eq("id", entry.id);
    return { error: "Gagal menyimpan item" };
  }

  revalidatePath("/", "layout");
  return { ok: true, id: entry.id };
}

const entryMeta = entryInput.omit({ items: true, photo_path: true });

export async function updateEntry(id: string, input: z.input<typeof entryMeta>): Promise<Result> {
  const parsed = entryMeta.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("entries")
    .update({ ...parsed.data, eaten_at: parsed.data.eaten_at || null, location: parsed.data.location || null })
    .eq("id", id);
  if (error) return { error: "Gagal memperbarui momen" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateItem(input: ItemInput & { id: string }): Promise<Result> {
  const parsed = itemInput.safeParse(input);
  if (!parsed.success || !parsed.data.id) return { error: parsed.error?.issues[0].message ?? "Item tidak valid" };
  const { supabase, user } = await requireUser();
  const i = parsed.data;
  const stores = await resolveStores(supabase, user.id, [i.store_name]);
  const { error } = await supabase
    .from("items")
    .update({
      name: i.name,
      category: i.category,
      store_id: i.store_name ? stores.get(i.store_name.trim()) ?? null : null,
      unit_id: i.unit_id ?? null,
      qty: i.qty,
      price: i.price,
      package_size: i.package_size || null,
      rating: i.rating ?? null,
      calories: i.calories ?? null,
      note: i.note || null,
    })
    .eq("id", i.id!);
  if (error) return { error: "Gagal memperbarui item" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteItem(id: string): Promise<Result> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("items").delete().eq("id", id).select("sticker_path").single();
  if (data?.sticker_path) await supabase.storage.from("stickers").remove([data.sticker_path]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteEntry(id: string): Promise<Result> {
  const { supabase } = await requireUser();
  const { data: items } = await supabase.from("items").select("sticker_path").eq("entry_id", id);
  const { data: entry } = await supabase.from("entries").delete().eq("id", id).select("photo_path").single();
  const stickers = (items ?? []).map((i) => i.sticker_path).filter(Boolean) as string[];
  if (stickers.length) await supabase.storage.from("stickers").remove(stickers);
  if (entry?.photo_path) await supabase.storage.from("photos").remove([entry.photo_path]);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Unit ----------
const unitInput = z.object({
  name: z.string().trim().min(1, "Nama unit wajib diisi").max(30),
  symbol: z.string().trim().min(1, "Simbol wajib diisi").max(10),
  kind: z.enum(["berat", "volume", "hitungan"]),
});

export async function saveUnit(
  id: string | null,
  input: z.input<typeof unitInput>,
): Promise<Result & { unit?: Unit }> {
  const parsed = unitInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, user } = await requireUser();
  const query = id
    ? supabase.from("units").update(parsed.data).eq("id", id).eq("user_id", user.id)
    : supabase.from("units").insert({ ...parsed.data, user_id: user.id });
  const { data, error } = await query.select("id,user_id,name,symbol,kind").single();
  if (error) return { error: "Gagal menyimpan unit" };
  revalidatePath("/alat");
  return { ok: true, unit: data as Unit };
}

export async function deleteUnit(id: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  await supabase.from("units").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/alat");
  return { ok: true };
}

// ---------- Toko ----------
export async function saveStore(id: string | null, name: string): Promise<Result> {
  const clean = name.trim();
  if (!clean) return { error: "Nama toko wajib diisi" };
  const { supabase, user } = await requireUser();
  const { error } = id
    ? await supabase.from("stores").update({ name: clean }).eq("id", id)
    : await supabase.from("stores").insert({ name: clean, user_id: user.id });
  if (error) return { error: error.code === "23505" ? "Toko itu sudah ada" : "Gagal menyimpan toko" };
  revalidatePath("/alat");
  return { ok: true };
}

export async function deleteStore(id: string): Promise<Result> {
  const { supabase } = await requireUser();
  await supabase.from("stores").delete().eq("id", id);
  revalidatePath("/alat");
  return { ok: true };
}

// ---------- Profil & tampilan ----------
export async function saveTheme(theme: unknown): Promise<Result> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ theme: normalizeTheme(theme) }).eq("id", user.id);
  if (error) return { error: "Gagal menyimpan tampilan" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveProfile(input: { display_name: string; diary_name: string }): Promise<Result> {
  const schema = z.object({
    display_name: z.string().trim().min(1, "Nama wajib diisi").max(40),
    diary_name: z.string().trim().min(1, "Nama diary wajib diisi").max(30),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: "Gagal menyimpan profil" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveBudget(amount: number | null): Promise<Result> {
  if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 1e12)) return { error: "Budget tidak valid" };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ monthly_budget: amount }).eq("id", user.id);
  if (error) return { error: "Gagal menyimpan budget" };
  revalidatePath("/", "layout");
  return { ok: true };
}
