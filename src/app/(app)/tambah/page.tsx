import { requireUser } from "@/lib/supabase/server";
import { todayJakarta } from "@/lib/dates";
import type { Store, Unit } from "@/lib/types";
import { aiProvider } from "@/lib/ai/provider";
import { Capture } from "./capture";

export default async function TambahPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ data: units }, { data: stores }] = await Promise.all([
    supabase.from("units").select("id,user_id,name,symbol,kind").order("kind").order("name"),
    supabase.from("stores").select("id,name").order("name"),
  ]);
  const date = d?.match(/^\d{4}-\d{2}-\d{2}$/) ? d : todayJakarta();
  return <Capture units={(units ?? []) as Unit[]} stores={(stores ?? []) as Store[]} defaultDate={date} userId={user.id} cutoutInBrowser={aiProvider() !== "fal"} />;
}
