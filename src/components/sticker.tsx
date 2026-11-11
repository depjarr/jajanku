import { stickerUrl, type Category } from "@/lib/types";
import { CATEGORY_EMOJI } from "@/components/icons";

/**
 * Gambar stiker dengan outline putih (potongan dari foto yang diupload).
 * Bila item tidak punya foto (mis. dari struk / manual), tampil emoji kategori.
 */
export function Sticker({
  path,
  alt,
  category = "makanan",
  className = "",
  style,
}: {
  path: string | null;
  alt: string;
  category?: Category;
  className?: string;
  style?: React.CSSProperties;
}) {
  const url = stickerUrl(path);
  if (!url) {
    return (
      <span className={`sticker grid place-items-center ${className}`} style={style} role="img" aria-label={alt || category}>
        <svg viewBox="0 0 100 100" className="size-full overflow-visible" aria-hidden>
          <text x="50" y="54" textAnchor="middle" dominantBaseline="middle" fontSize="78">
            {CATEGORY_EMOJI[category]}
          </text>
        </svg>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} loading="lazy" crossOrigin="anonymous" className={`sticker object-contain ${className}`} style={style} />
  );
}
