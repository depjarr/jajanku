import { requireUser } from "@/lib/supabase/server";
import { LargeTitle } from "@/components/ui/large-title";
import { SearchBox } from "../cari/search-box";
import { PriceView, type PricePoint } from "./price-view";

export const metadata = { title: "Riwayat harga · Jajanku" };

export default async function HargaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 60);
  const { supabase } = await requireUser();

  let points: PricePoint[] = [];
  if (query) {
    const pattern = `%${query.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
    const [{ data }, { data: stores }, { data: units }] = await Promise.all([
      supabase
        .from("items")
        .select("id,name,price,qty,store_id,unit_id,entry_id,entries!inner(eaten_on)")
        .ilike("name", pattern)
        .limit(200),
      supabase.from("stores").select("id,name"),
      supabase.from("units").select("id,symbol"),
    ]);
    const storeName = new Map((stores ?? []).map((s) => [s.id, s.name]));
    const unitSym = new Map((units ?? []).map((u) => [u.id, u.symbol]));
    type Row = { id: string; name: string; price: number; qty: number; store_id: string | null; unit_id: string | null; entry_id: string; entries: { eaten_on: string } };
    points = ((data ?? []) as unknown as Row[])
      .map((r) => ({
        id: r.id,
        name: r.name,
        price: Number(r.price),
        qty: Number(r.qty),
        date: r.entries.eaten_on,
        store: r.store_id ? storeName.get(r.store_id) ?? null : null,
        unit: r.unit_id ? unitSym.get(r.unit_id) ?? null : null,
        entry_id: r.entry_id,
      }))
      .filter((p) => p.price > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  return (
    <main className="mx-auto max-w-3xl">
      <LargeTitle title="Riwayat harga" subtitle="Bandingkan harga jajanan dari waktu ke waktu dan antar toko." />
      <SearchBox initial={query} basePath="/harga" placeholder="Nama jajanan, mis. kopi susu" />
      <PriceView query={query} points={points} />
    </main>
  );
}
