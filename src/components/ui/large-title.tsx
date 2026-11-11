"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { ChevronLeft } from "lucide-react";

/**
 * Judul besar ala iOS. Saat di-scroll, judul kecil muncul di nav bar kaca di atas.
 */
export function LargeTitle({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: React.ReactNode;
  back?: string;
  right?: React.ReactNode;
}) {
  const { scrollY } = useScroll();
  const barOpacity = useTransform(scrollY, [30, 70], [0, 1]);
  const titleScale = useTransform(scrollY, [-80, 0], [1.12, 1]);

  return (
    <>
      <motion.div
        aria-hidden
        style={{ opacity: barOpacity }}
        className="glass fixed inset-x-0 top-0 z-40 border-b border-ink/5 pt-[env(safe-area-inset-top)] md:hidden"
      >
        <p className="mx-auto max-w-xl truncate px-16 py-3 text-center text-[15px] font-semibold">{title}</p>
      </motion.div>

      <header className="mb-5">
        <div className="mb-2 flex min-h-10 items-center justify-between">
          {back ? (
            <Link href={back} className="press z-50 -ml-2 flex items-center gap-0.5 rounded-full px-2 py-1.5 font-semibold text-accent-text">
              <ChevronLeft className="size-6" aria-hidden /> Kembali
            </Link>
          ) : (
            <span />
          )}
          <div className="z-50">{right}</div>
        </div>
        <motion.h1 style={{ scale: titleScale, transformOrigin: "left center" }} className="text-[34px] font-bold leading-tight tracking-tight">
          {title}
        </motion.h1>
        {subtitle && <div className="mt-1 text-[15px] text-muted">{subtitle}</div>}
      </header>
    </>
  );
}
