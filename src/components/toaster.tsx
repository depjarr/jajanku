"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { dismissToast, setRefresher, useToasts } from "@/lib/live";

/** Toast ala iOS di bawah layar (di atas tab bar pada HP). */
export function Toaster() {
  const router = useRouter();
  const list = useToasts();

  useEffect(() => {
    setRefresher(() => router.refresh());
  }, [router]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      <AnimatePresence initial={false}>
        {list.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94, transition: { duration: 0.16 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, i) => {
              if (i.offset.y > 30) dismissToast(t.id);
            }}
            className="pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-full bg-ink py-2 pl-4 pr-2 text-sm text-white shadow-[0_16px_34px_-14px_rgb(0_0_0/0.55)]"
            role="status"
          >
            {t.emoji && <span className="text-xl leading-none" aria-hidden>{t.emoji}</span>}
            <span className="min-w-0 flex-1 truncate py-1.5 font-semibold">{t.text}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action!.run();
                  dismissToast(t.id);
                }}
                className="press min-h-9 shrink-0 rounded-full bg-white px-4 text-[13px] font-bold text-ink"
              >
                {t.action.label}
              </button>
            )}
            {/* sisa waktu */}
            <motion.span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-white/40"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: t.duration / 1000, ease: "linear" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
