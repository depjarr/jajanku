"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { haptic, spring } from "./haptic";

export type SegmentOption<T extends string> = { value: T; label: React.ReactNode };

/** Segmented control ala iOS dengan "thumb" yang meluncur. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div role="tablist" aria-label={label} className={`relative flex rounded-[14px] bg-ink/[0.07] p-[3px] ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) haptic();
              onChange(o.value);
            }}
            className="relative z-0 flex flex-1 items-center justify-center gap-1.5 rounded-[11px] py-2 text-sm font-semibold"
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring}
                className="absolute inset-0 -z-10 rounded-[11px] bg-surface shadow-[0_3px_8px_rgb(0_0_0/0.12),0_1px_1px_rgb(0_0_0/0.06)]"
              />
            )}
            <span className={active ? "text-ink" : "text-muted"}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
