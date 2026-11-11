import type { Category } from "@/lib/types";

/** Emoji per kategori. */
export const CATEGORY_EMOJI: Record<Category, string> = {
  makanan: "🍜",
  minuman: "🧋",
  snack: "🍪",
  lainnya: "🛍️",
};

/** Emoji kategori kecil. */
export function CategoryIcon({ category, className = "text-base" }: { category: Category; className?: string }) {
  return (
    <span className={`leading-none ${className}`} aria-hidden>
      {CATEGORY_EMOJI[category]}
    </span>
  );
}

/** Emoji di dalam lingkaran berwarna tema (keadaan kosong, sukses, dll). */
export function EmojiBubble({
  emoji,
  className = "size-12 text-2xl",
  tone = "soft",
}: {
  emoji: string;
  className?: string;
  tone?: "soft" | "primary" | "strong" | "accent";
}) {
  const tones = {
    soft: "bg-soft",
    primary: "bg-primary/30",
    strong: "bg-strong",
    accent: "bg-accent/30",
  } as const;
  return (
    <span className={`grid shrink-0 place-items-center rounded-full leading-none ${tones[tone]} ${className}`} aria-hidden>
      {emoji}
    </span>
  );
}

/** Label kategori: emoji + teks. */
export function CategoryLabel({ category, label }: { category: Category; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <CategoryIcon category={category} />
      {label}
    </span>
  );
}
