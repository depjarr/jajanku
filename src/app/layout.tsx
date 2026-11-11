import type { Metadata, Viewport } from "next";
import { Josefin_Sans, Fredoka, Young_Serif, Mali, Newsreader, Nunito, Patrick_Hand } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { normalizeTheme, themeStyle, type ThemeSettings } from "@/lib/theme";
import { RegisterSW } from "@/components/pwa";
import "./globals.css";

const josefin = Josefin_Sans({ subsets: ["latin"], variable: "--font-josefin" });
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", preload: false });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });
const youngSerif = Young_Serif({ subsets: ["latin"], weight: "400", variable: "--font-young-serif", preload: false });
const mali = Mali({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-mali", preload: false });
const newsreader = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-newsreader", preload: false });
const patrickHand = Patrick_Hand({ subsets: ["latin"], weight: "400", variable: "--font-patrick-hand", preload: false });

export const metadata: Metadata = {
  title: "Jajanku",
  description: "Catat jajan dari foto. Tiap item jadi stiker di kalendermu.",
  applicationName: "Jajanku",
  appleWebApp: { capable: true, title: "Jajanku", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/favicon-64.png", sizes: "64x64", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

async function loadTheme(): Promise<ThemeSettings> {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return normalizeTheme(null);
    const { data } = await supabase.from("profiles").select("theme").eq("id", auth.user.id).single();
    return normalizeTheme(data?.theme);
  } catch {
    return normalizeTheme(null);
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await loadTheme();
  const fontVars = [josefin, fredoka, nunito, youngSerif, mali, newsreader, patrickHand].map((f) => f.variable).join(" ");

  return (
    <html
      lang="id"
      className={fontVars}
      data-pattern={theme.pattern}
      style={{ ...(themeStyle(theme) as React.CSSProperties), colorScheme: "light" }}
    >
      <body className="min-h-dvh antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
