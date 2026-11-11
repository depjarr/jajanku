"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useEffect } from "react";
import { spring } from "./haptic";

/** Bottom sheet ala iOS: muncul dari bawah, bisa ditarik turun untuk menutup. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <motion.button
            type="button"
            aria-label="Tutup"
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] bg-surface max-w-xl flex-col rounded-t-[28px] shadow-[0_-10px_40px_rgb(0_0_0/0.15)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            <div
              className="flex cursor-grab touch-none flex-col items-center px-5 pb-2 pt-2.5 active:cursor-grabbing"
              onPointerDown={(e) => drag.start(e)}
            >
              <span className="h-1.5 w-10 rounded-full bg-ink/20" aria-hidden />
              {title && <div className="mt-3 w-full">{title}</div>}
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),20px)]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
