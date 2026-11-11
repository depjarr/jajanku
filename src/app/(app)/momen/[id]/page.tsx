import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import type { Entry, Store, Unit } from "@/lib/types";
import { MomenEditor } from "./editor";

export default async function MomenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data: entry }, { data: units }, { data: stores }] = await Promise.all([
    supabase
      .from("entries")
      .select("id,title,eaten_on,eaten_at,location,photo_path,items(id,entry_id,name,category,store_id,unit_id,qty,price,package_size,sticker_path,rating,note,calories,created_at)")
      .eq("id", id)
      .order("created_at", { referencedTable: "items" })
      .maybeSingle(),
    supabase.from("units").select("id,user_id,name,symbol,kind").order("kind").order("name"),
    supabase.from("stores").select("id,name").order("name"),
  ]);
  if (!entry) notFound();

  let photoUrl: string | null = null;
  if (entry.photo_path) {
    const { data } = await supabase.storage.from("photos").createSignedUrl(entry.photo_path, 60 * 60);
    photoUrl = data?.signedUrl ?? null;
  }

  return (
    <MomenEditor
      entry={entry as Entry}
      units={(units ?? []) as Unit[]}
      stores={(stores ?? []) as Store[]}
      photoUrl={photoUrl}
    />
  );
}
