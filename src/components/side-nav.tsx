"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { BarChart3, Camera, Gift, House, Trophy, Images, LineChart, MessageCircle, Search, UserRound, type LucideIcon } from "lucide-react";
import { spring } from "@/components/ui/haptic";

/** Yang dipakai setiap hari. */
const MAIN = [
  { href: "/", label: "Meja", icon: House },
  { href: "/statistik", label: "Statistik", icon: BarChart3 },
  { href: "/cari", label: "Cari", icon: Search },
  { href: "/kamu", label: "Kamu", icon: UserRound },
];
/** Sesekali saja: hanya di sidebar desktop, sisanya lewat halaman Kamu. */
const MORE = [
  { href: "/album", label: "Album", icon: Images },
  { href: "/harga", label: "Riwayat harga", icon: LineChart },
  { href: "/rekap", label: "Rekap", icon: Gift },
  { href: "/pencapaian", label: "Pencapaian", icon: Trophy },
  { href: "/chat", label: "Tanya Jaja", icon: MessageCircle },
];

/**
 * Navigasi samping untuk layar besar.
 * Tablet (md): rail ikon yang ramping. Desktop (lg): sidebar lengkap dengan label.
 */
export function SideNav() {
  const path = usePathname();
  if (path.startsWith("/tambah")) return null;

  return (
    <aside
      aria-label="Navigasi utama"
      className="no-scrollbar sticky top-0 hidden h-dvh shrink-0 flex-col overflow-y-auto border-r border-line bg-surface px-3 py-6 md:flex md:w-[88px] lg:w-64 lg:px-5"
    >
      <Link href="/" className="mb-8 flex items-center justify-center gap-2 lg:justify-start lg:px-2">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary font-heading text-xl font-bold text-primary-ink">j</span>
        <span className="hidden font-heading text-2xl font-bold tracking-tight lg:inline">
          jajanku<span className="text-strong">.</span>
        </span>
      </Link>

      <Link
        href="/tambah"
        className="press mb-6 flex items-center justify-center gap-2 rounded-2xl bg-strong py-3.5 font-semibold text-white shadow-[0_10px_20px_-10px_rgb(0_0_0/0.5)]"
        aria-label="Foto jajanan baru"
      >
        <Camera className="size-5" aria-hidden />
        <span className="hidden lg:inline">Foto jajanan</span>
      </Link>

      <ul className="space-y-1">
        {MAIN.map((l) => (
          <NavItem key={l.href} {...l} path={path} />
        ))}
      </ul>

      <p className="mb-1 mt-8 hidden px-3 text-xs font-semibold uppercase tracking-wider text-muted lg:block">Lainnya</p>
      <ul className="hidden space-y-0.5 lg:block">
        {MORE.map((l) => (
          <NavItem key={l.href} {...l} path={path} small />
        ))}
      </ul>

      <p className="mt-auto hidden px-2 text-xs text-muted lg:block">Jajan kecil, kenangan besar.</p>
    </aside>
  );
}

function NavItem({ href, label, icon: Icon, path, small = false }: { href: string; label: string; icon: LucideIcon; path: string; small?: boolean }) {
  const active =
    href === "/"
      ? path === "/" || path.startsWith("/momen")
      : href === "/kamu"
        ? ["/kamu", "/alat", "/tampilan"].some((p) => path.startsWith(p))
        : path.startsWith(href);
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        title={label}
        className={`relative flex flex-col items-center gap-1 rounded-2xl px-2 font-semibold lg:flex-row lg:gap-3 lg:px-3 ${small ? "py-2 text-[11px] lg:text-sm" : "py-2.5 text-[11px] lg:text-[15px]"}`}
      >
        {active && <motion.span layoutId="side-pill" transition={spring} className="absolute inset-0 rounded-2xl bg-soft" />}
        <Icon className={`relative ${small ? "size-[18px]" : "size-[22px]"} ${active ? "text-ink" : "text-muted"}`} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
        <span className={`relative ${active ? "text-ink" : "text-muted"}`}>{label}</span>
      </Link>
    </li>
  );
}
