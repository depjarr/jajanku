import { EmptyState } from "@/components/empty-state";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { LargeTitle } from "@/components/ui/large-title";
import { Sticker } from "@/components/sticker";
import { itemTotal, rupiah, type Category } from "@/lib/types";
import { formatDayLong } from "@/lib/dates";
import { SearchBox } from "./search-box";

type Row = {
  id: string;
  name: string;
  category: Category;
  qty: number;
  price: number;
  sticker_path: string | null;
  entry_id: string;
  entries: { title: string; eaten_on: string };
};

export default async function CariPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 60);
  const { supabase } = await requireUser();

  let rows: Row[] = [];
  if (query) {
    // Escape karakter khusus pola LIKE.
    const pattern = `%${query.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
    const { data } = await supabase
      .from("items")
      .select("id,name,category,qty,price,sticker_path,entry_id,entries!inner(title,eaten_on)")
      .ilike("name", pattern)
      .order("created_at", { ascending: false })
      .limit(60);
    rows = ((data ?? []) as unknown as Row[]).sort((a, b) => b.entries.eaten_on.localeCompare(a.entries.eaten_on));
  }

  const total = rows.reduce((s, r) => s + itemTotal(r), 0);

  return (
    <main className="mx-auto max-w-2xl">
      <LargeTitle title="Cari" subtitle="Temukan lagi jajanan yang pernah kamu catat." />
      <SearchBox initial={query} />

      {query && (
        <p className="mb-3 mt-4 text-sm text-muted">
          {rows.length ? (
            <>
              <span className="font-semibold text-ink">{rows.length} hasil</span> untuk “{query}” · total {rupiah(total)} ·{" "}
              <Link href={`/harga?q=${encodeURIComponent(query)}`} className="font-semibold text-ink underline">
                lihat riwayat harga
              </Link>
            </>
          ) : (
            <>Nggak ada jajanan bernama “{query}”.</>
          )}
        </p>
      )}

      {!query && (
        <EmptyState className="mt-4" emoji="🔍" orbit={["☕", "🍫", "🍜"]} title="Cari jajan apa?" text="Ketik nama jajanan, misalnya “kopi” atau “pocky”." />
      )}

      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/momen/${r.entry_id}`} className="press window flex items-center gap-3 p-3">
              <Sticker path={r.sticker_path} alt={r.name} category={r.category} className="size-14 shrink-0 text-2xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.name}</span>
                <span className="block truncate text-sm text-muted">
                  {formatDayLong(r.entries.eaten_on)} · {r.entries.title}
                </span>
              </span>
              <span className="font-semibold">{rupiah(itemTotal(r))}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
