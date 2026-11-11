import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Klien dengan secret key: melewati RLS. Hanya untuk server, jangan pernah dikirim ke browser. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
