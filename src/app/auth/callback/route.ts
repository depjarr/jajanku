import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Link konfirmasi email, reset password, dan login Google mendarat di sini.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  // Hanya izinkan path internal supaya tidak bisa dipakai untuk mengalihkan ke situs lain.
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/login?err=link", request.url));
  }
  return NextResponse.redirect(new URL(target, request.url));
}
