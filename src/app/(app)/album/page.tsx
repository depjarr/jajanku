import { requireUser } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { AlbumView, type AlbumItem } from "./album-view";

export const metadata = { title: "Album stiker · Jajanku" };

export default async function AlbumPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("items")
    .select("id,name,category,sticker_path,entry_id,rating,entries!inner(eaten_on)")
    .not("sticker_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(400);

  type Row = { id: string; name: string; category: Category; sticker_path: string; entry_id: string; rating: number | null; entries: { eaten_on: string } };
  const items: AlbumItem[] = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    sticker_path: r.sticker_path,
    entry_id: r.entry_id,
    rating: r.rating,
    date: r.entries.eaten_on,
  }));

  return <AlbumView items={items} />;
}
