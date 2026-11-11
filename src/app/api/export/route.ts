import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABEL, type Category } from "@/lib/types";
import { MONTHS, monthRange, parseMonth } from "@/lib/dates";

type Row = {
  name: string;
  category: Category;
  qty: number;
  price: number;
  package_size: string | null;
  store_id: string | null;
  unit_id: string | null;
  entries: { title: string; eaten_on: string; eaten_at: string | null; location: string | null };
};

const RUPIAH = '"Rp" #,##0';
const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF6DD" } } as const;

/** GET /api/export?m=2026-11 → file Excel catatan jajan satu bulan. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { year, month } = parseMonth(request.nextUrl.searchParams.get("m") ?? undefined);
  const { start, end } = monthRange(year, month);

  const [{ data: items, error }, { data: stores }, { data: units }] = await Promise.all([
    supabase
      .from("items")
      .select("name,category,qty,price,package_size,store_id,unit_id,entries!inner(title,eaten_on,eaten_at,location)")
      .gte("entries.eaten_on", start)
      .lte("entries.eaten_on", end),
    supabase.from("stores").select("id,name"),
    supabase.from("units").select("id,symbol"),
  ]);
  if (error) return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });

  const storeName = new Map((stores ?? []).map((s) => [s.id, s.name]));
  const unitSym = new Map((units ?? []).map((u) => [u.id, u.symbol]));
  const rows = ((items ?? []) as unknown as Row[]).sort(
    (a, b) => a.entries.eaten_on.localeCompare(b.entries.eaten_on) || (a.entries.eaten_at ?? "").localeCompare(b.entries.eaten_at ?? ""),
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = "Jajanku";
  wb.created = new Date();

  // ---- Sheet 1: semua item ----
  const ws = wb.addWorksheet("Jajan", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Tanggal", key: "date", width: 12 },
    { header: "Jam", key: "time", width: 8 },
    { header: "Momen", key: "title", width: 22 },
    { header: "Item", key: "name", width: 32 },
    { header: "Kategori", key: "cat", width: 12 },
    { header: "Toko", key: "store", width: 18 },
    { header: "Jumlah", key: "qty", width: 9 },
    { header: "Unit", key: "unit", width: 9 },
    { header: "Harga/unit", key: "price", width: 14, style: { numFmt: RUPIAH } },
    { header: "Subtotal", key: "subtotal", width: 14, style: { numFmt: RUPIAH } },
    { header: "Kemasan", key: "pkg", width: 11 },
    { header: "Lokasi", key: "loc", width: 18 },
  ];
  for (const r of rows) {
    const [y, m, d] = r.entries.eaten_on.split("-").map(Number);
    ws.addRow({
      date: new Date(Date.UTC(y, m - 1, d)),
      time: r.entries.eaten_at?.slice(0, 5) ?? "",
      title: r.entries.title,
      name: r.name,
      cat: CATEGORY_LABEL[r.category]?.label ?? r.category,
      store: r.store_id ? storeName.get(r.store_id) ?? "" : "",
      qty: Number(r.qty),
      unit: r.unit_id ? unitSym.get(r.unit_id) ?? "" : "",
      price: Number(r.price),
      subtotal: Number(r.qty) * Number(r.price),
      pkg: r.package_size ?? "",
      loc: r.entries.location ?? "",
    });
  }
  ws.getColumn("date").numFmt = "dd/mm/yyyy";
  styleHeader(ws);
  if (rows.length) {
    ws.autoFilter = { from: "A1", to: { row: 1, column: ws.columnCount } };
    const totalRow = ws.addRow({ name: "TOTAL", subtotal: { formula: `SUM(J2:J${rows.length + 1})` } });
    totalRow.font = { bold: true };
  }

  // ---- Sheet 2: ringkasan ----
  const sum = wb.addWorksheet("Ringkasan");
  sum.columns = [
    { header: "Kategori", key: "k", width: 16 },
    { header: "Total", key: "v", width: 16, style: { numFmt: RUPIAH } },
  ];
  const byCat = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const t = Number(r.qty) * Number(r.price);
    const label = CATEGORY_LABEL[r.category]?.label ?? r.category;
    byCat.set(label, (byCat.get(label) ?? 0) + t);
    byDay.set(r.entries.eaten_on, (byDay.get(r.entries.eaten_on) ?? 0) + t);
  }
  for (const [k, v] of byCat) sum.addRow({ k, v });
  sum.addRow({ k: "TOTAL", v: [...byCat.values()].reduce((a, b) => a + b, 0) }).font = { bold: true };
  styleHeader(sum);

  sum.addRow([]);
  const dayHeader = sum.addRow(["Tanggal", "Total"]);
  dayHeader.font = { bold: true };
  dayHeader.eachCell((c) => (c.fill = HEADER_FILL));
  for (const [day, v] of [...byDay.entries()].sort()) {
    const row = sum.addRow([day.split("-").reverse().join("/"), v]);
    row.getCell(2).numFmt = RUPIAH;
  }

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `jajanku-${MONTHS[month - 1].toLowerCase()}-${year}.xlsx`;
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function styleHeader(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.border = { bottom: { style: "thin", color: { argb: "FF9CC655" } } };
  });
}
