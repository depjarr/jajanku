import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/selamat-datang", "/login", "/register", "/lupa-password", "/auth", "/manifest.webmanifest", "/icons", "/sw.js", ...(process.env.NODE_ENV === "development" ? ["/preview"] : [])];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!data.user && !isPublic && !path.startsWith("/api")) {
    // Pengunjung baru lihat penjelasan dulu, yang sudah pernah langsung ke login.
    const seen = request.cookies.get("jajanku_onboarded")?.value === "1";
    return NextResponse.redirect(new URL(seen ? "/login" : "/selamat-datang", request.url));
  }
  if (data.user && (path === "/login" || path === "/register" || path === "/selamat-datang" || path === "/lupa-password")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
