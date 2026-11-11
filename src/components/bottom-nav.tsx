"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { BarChart3, Camera, House, Search, UserRound } from "lucide-react";
import { haptic, spring } from "@/components/ui/haptic";

const LINKS = [
  { href: "/", label: "Meja", icon: House },
  { href: "/statistik", label: "Statistik", icon: BarChart3 },
  { href: "/cari", label: "Cari", icon: Search },
  { href: "/kamu", label: "Kamu", icon: UserRound },
];

export function BottomNav() {
  const path = usePathname();
  if (["/tambah", "/chat", "/rekap"].some((p) => path.startsWith(p))) return null;

  return (
    <motion.nav
      aria-label="Navigasi utama"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ ...spring, delay: 0.1 }}
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-xl items-center gap-3 px-4 pb-[max(env(safe-area-inset-bottom),14px)]"
    >
      <ul className="glass flex flex-1 rounded-[28px] p-1.5 shadow-[0_10px_30px_-10px_rgb(0_0_0/0.25)] ring-1 ring-ink/5">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? path === "/" || path.startsWith("/momen")
              : href === "/kamu"
                ? ["/kamu", "/alat", "/tampilan", "/album", "/harga", "/pencapaian"].some((p) => path.startsWith(p))
                : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                onClick={() => !active && haptic()}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-col items-center gap-0.5 rounded-[22px] py-2 text-[10px] font-semibold"
              >
                {active && (
                  <motion.span layoutId="tab-pill" transition={spring} className="absolute inset-0 rounded-[22px] bg-ink/[0.08]" />
                )}
                <motion.span animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }} transition={spring} className="relative">
                  <Icon className={`size-[22px] ${active ? "text-ink" : "text-muted"}`} aria-hidden strokeWidth={active ? 2.4 : 1.8} />
                </motion.span>
                <span className={`relative ${active ? "text-ink" : "text-muted"}`}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <Link href="/tambah" aria-label="Foto jajanan baru" onClick={() => haptic(14)} className="relative">
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary"
          animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.span
          whileTap={{ scale: 0.88 }}
          whileHover={{ rotate: -8 }}
          className="relative grid size-[62px] place-items-center rounded-full bg-strong text-white shadow-[0_10px_24px_-6px_rgb(0_0_0/0.45)]"
        >
          <Camera className="size-7" aria-hidden />
        </motion.span>
      </Link>
    </motion.nav>
  );
}
