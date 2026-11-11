import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { normalizeTheme } from "@/lib/theme";
import { ThemePicker } from "./theme-picker";

export default async function TampilanPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("theme,diary_name").eq("id", user.id).single();
  return (
    <main className="mx-auto max-w-3xl">
      <PageHeader back="/kamu" title="Tampilan" subtitle="Coba-coba warna, huruf, dan pola. Simpan kalau sudah cocok." />
      <ThemePicker initial={normalizeTheme(data?.theme)} diaryName={data?.diary_name ?? "Jajanku"} />
    </main>
  );
}
