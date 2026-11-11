"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScanIllustration } from "@/components/ui/scan-illustration";
import { haptic, spring } from "@/components/ui/haptic";

const ONBOARD_COOKIE = "jajanku_onboarded";

const SLIDES = [
  {
    eyebrow: "Langkah 1 · Jepret",
    title: ["Jajan apa aja,", "tinggal jepret"],
    body: "Foto jajananmu langsung dari kamera atau galeri. Nggak perlu ketik satu-satu.",
    chips: ["Sekali jepret: semua di meja", "Satu per satu: paling rapi"],
  },
  {
    eyebrow: "Langkah 2 · AI bekerja",
    title: ["AI bikin stiker", "plus infonya"],
    body: "AI membaca nama produk dan ukuran kemasan, lalu memotong tiap item jadi stiker. Kamu tinggal isi harganya.",
    chips: ["Harga per unit", "Unit bisa diatur", "Catat tokonya"],
  },
  {
    eyebrow: "Langkah 3 · Lihat lagi",
    title: ["Semua rapi", "di kalendermu"],
    body: "Lihat stiker jajanan tiap hari, daftar per tanggal, dan total pengeluaran per bulan. Warna dan hurufnya bisa kamu ganti.",
    chips: ["Kalender bulanan", "Daftar per tanggal", "Tema sesukamu"],
  },
];

/**
 * HP: satu kolom, teks di tengah, tombol di bawah layar.
 * Tablet: satu kolom yang lebih lega, ilustrasi lebih besar.
 * Desktop: dua kolom, ilustrasi di panel kiri, teks + tombol di kanan.
 */
export function Onboarding() {
  const router = useRouter();
  const [[index, dir], setState] = useState<[number, number]>([0, 0]);
  const last = index === SLIDES.length - 1;
  const s = SLIDES[index];

  const go = (to: number) => {
    if (to < 0 || to >= SLIDES.length || to === index) return;
    haptic();
    setState([to, to > index ? 1 : -1]);
  };

  const finish = (href: string) => {
    haptic(12);
    document.cookie = `${ONBOARD_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
    router.push(href);
  };

  const actions = (
    <AnimatePresence mode="wait" initial={false}>
      {last ? (
        <motion.div key="cta" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2.5 lg:flex lg:gap-3 lg:space-y-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => finish("/register")}
            className="w-full rounded-2xl bg-strong px-8 py-4 text-[17px] font-semibold text-white shadow-[0_12px_24px_-10px_rgb(0_0_0/0.5)] lg:w-auto"
          >
            Bikin akun gratis
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => finish("/login")}
            className="w-full rounded-2xl border-2 border-ink/10 px-8 py-4 text-[17px] font-semibold lg:w-auto"
          >
            Aku sudah punya akun
          </motion.button>
        </motion.div>
      ) : (
        <motion.div key="next" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between lg:justify-start lg:gap-6">
          <span className="text-sm font-semibold text-muted lg:order-2">
            {index + 1} / {SLIDES.length}
          </span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => go(index + 1)}
            className="flex items-center gap-1.5 rounded-full bg-strong py-3.5 pl-7 pr-5 text-[16px] font-semibold text-white shadow-[0_12px_24px_-10px_rgb(0_0_0/0.5)] lg:order-1"
          >
            Lanjut <ChevronRight className="size-5" aria-hidden />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <main className="app-bg min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-[max(env(safe-area-inset-top),14px)] md:max-w-2xl md:px-10 md:pb-10 md:pt-8 lg:max-w-6xl lg:px-12">
        {/* Bar atas */}
        <div className="flex h-11 items-center justify-between">
          {index > 0 ? (
            <button type="button" onClick={() => go(index - 1)} className="press -ml-2 flex items-center rounded-full px-2 py-1.5 text-sm font-semibold text-muted">
              <ChevronLeft className="size-5" aria-hidden /> Kembali
            </button>
          ) : (
            <span className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
              jajanku<span className="text-strong">.</span>
            </span>
          )}
          {!last && (
            <button type="button" onClick={() => finish("/login")} className="press rounded-full px-3 py-1.5 text-sm font-semibold text-muted">
              Lewati
            </button>
          )}
        </div>

        {/* Progres */}
        <div className="mt-2 flex gap-1.5 lg:max-w-xs" aria-hidden>
          {SLIDES.map((_, i) => (
            <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
              <motion.span className="block h-full rounded-full bg-strong" initial={false} animate={{ width: i <= index ? "100%" : "0%" }} transition={spring} />
            </span>
          ))}
        </div>

        {/* Konten slide */}
        <div className="relative flex flex-1 flex-col overflow-hidden lg:justify-center">
          <AnimatePresence mode="popLayout" custom={dir}>
            <motion.section
              key={index}
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d * 120, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -120, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={spring}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.3}
              onDragEnd={(_, i) => {
                if (i.offset.x < -60) go(index + 1);
                else if (i.offset.x > 60) go(index - 1);
              }}
              className="flex flex-1 touch-pan-y flex-col lg:grid lg:flex-none lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-8"
              aria-roledescription="slide"
              aria-label={`${index + 1} dari ${SLIDES.length}`}
            >
              <div className="mx-auto mt-2 flex h-[36dvh] max-h-[320px] justify-center md:h-[42dvh] md:max-h-[440px] lg:m-0 lg:h-[min(62dvh,560px)] lg:max-h-none lg:w-full lg:items-center lg:rounded-[44px] lg:bg-soft/60 lg:p-8">
                <ScanIllustration step={index} className="h-full w-auto" />
              </div>

              <div className="text-center lg:text-left">
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-muted md:mt-4 md:text-sm lg:mt-0">{s.eyebrow}</p>
                <h1 className="mt-2 font-heading text-[32px] font-bold leading-[1.08] tracking-tight md:text-[44px] lg:text-[56px]">
                  {s.title[0]}
                  <br />
                  <span className="bg-[linear-gradient(transparent_55%,var(--c-primary)_55%,var(--c-primary)_92%,transparent_92%)] px-1">{s.title[1]}</span>
                </h1>
                <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted md:text-[17px] lg:mx-0">{s.body}</p>

                <ul className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
                  {s.chips.map((c, i) => (
                    <motion.li
                      key={c}
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ ...spring, delay: 0.15 + i * 0.07 }}
                      className="rounded-full bg-soft px-3 py-1.5 text-[13px] font-semibold md:text-sm"
                    >
                      {c}
                    </motion.li>
                  ))}
                </ul>

                {/* Desktop: tombol di bawah teks */}
                <div className="mt-10 hidden lg:block">{actions}</div>
              </div>
            </motion.section>
          </AnimatePresence>
        </div>

        {/* HP & tablet: tombol di bawah layar */}
        <div className="mt-6 md:mx-auto md:w-full md:max-w-md lg:hidden">{actions}</div>
      </div>
    </main>
  );
}
