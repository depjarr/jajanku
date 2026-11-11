import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import type { Store, Unit } from "@/lib/types";
import { Manager } from "./manager";

export default async function AlatPage() {
  const { supabase } = await requireUser();
  const [{ data: units }, { data: stores }] = await Promise.all([
    supabase.from("units").select("id,user_id,name,symbol,kind").order("name"),
    supabase.from("stores").select("id,name").order("name"),
  ]);
  return (
    <main className="mx-auto max-w-2xl">
      <PageHeader back="/kamu" title="Unit & Toko" subtitle="Atur satuan jual dan tempat belanjamu." />
      <Manager units={(units ?? []) as Unit[]} stores={(stores ?? []) as Store[]} />
    </main>
  );
}
