import { requireUser } from "@/lib/supabase/server";
import { ChatView } from "./chat-view";

export const metadata = { title: "Tanya Jaja · Jajanku" };

export default async function ChatPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
  return <ChatView displayName={data?.display_name ?? ""} />;
}
