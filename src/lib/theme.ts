export type Palette = {
  id: string;
  name: string;
  note: string;
  /** Semua palet berlatar putih; yang berbeda hanya warna utama & aksennya. */
  colors: {
    bg: string;
    surface: string;
    soft: string; // tint lembut warna utama, untuk panel
    primary: string;
    strong: string; // versi gelap warna utama, untuk blok berwarna dengan teks putih
    primaryInk: string;
    accent: string;
    accentInk: string;
    accentText: string;
    ink: string;
    muted: string;
    line: string;
  };
};

export const PALETTES: Palette[] = [
  {
    id: "meow",
    name: "Melon",
    note: "Hijau melon segar, aksen pink",
    colors: {
      bg: "#FFFFFF",
      surface: "#FFFFFF",
      ink: "#262626",
      muted: "#6B6B6B",
      line: "#EDEDED",
      primary: "#9CC655",
      strong: "#4A7419",
      soft: "#F1F8E4",
      primaryInk: "#1F2A12",
      accent: "#F28B95",
      accentInk: "#262626",
      accentText: "#C2414F"
    },
  },
  {
    id: "matcha-malam",
    name: "Matcha",
    note: "Hijau matcha kalem, aksen madu",
    colors: {
      bg: "#FFFFFF",
      surface: "#FFFFFF",
      ink: "#262626",
      muted: "#6B6B6B",
      line: "#EDEDED",
      primary: "#8DB36B",
      strong: "#4E7135",
      soft: "#EFF5E8",
      primaryInk: "#1C2A12",
      accent: "#F1C453",
      accentInk: "#262626",
      accentText: "#9A6A00"
    },
  },
  {
    id: "periwinkle",
    name: "Periwinkle",
    note: "Biru periwinkle, aksen pink permen",
    colors: {
      bg: "#FFFFFF",
      surface: "#FFFFFF",
      ink: "#262626",
      muted: "#6B6B6B",
      line: "#EDEDED",
      primary: "#88A2FF",
      strong: "#2F47A0",
      soft: "#EEF2FF",
      primaryInk: "#14204F",
      accent: "#FFB2F7",
      accentInk: "#262626",
      accentText: "#8A3FB8"
    },
  },
  {
    id: "kebun",
    name: "Jeruk",
    note: "Oranye jeruk hangat, aksen hijau",
    colors: {
      bg: "#FFFFFF",
      surface: "#FFFFFF",
      ink: "#262626",
      muted: "#6B6B6B",
      line: "#EDEDED",
      primary: "#F6A65A",
      strong: "#A34D0F",
      soft: "#FFF4E8",
      primaryInk: "#3A1F06",
      accent: "#8CC56B",
      accentInk: "#262626",
      accentText: "#3F7A22"
    },
  },
  {
    id: "meja-biru",
    name: "Laut",
    note: "Biru laut tenang, aksen koral",
    colors: {
      bg: "#FFFFFF",
      surface: "#FFFFFF",
      ink: "#262626",
      muted: "#6B6B6B",
      line: "#EDEDED",
      primary: "#5C9CE6",
      strong: "#2558A8",
      soft: "#EEF5FD",
      primaryInk: "#0E2547",
      accent: "#F2957C",
      accentInk: "#262626",
      accentText: "#B8492D"
    },
  },
  {
    id: "stroberi",
    name: "Stroberi",
    note: "Pink stroberi, aksen hijau daun",
    colors: {
      bg: "#FFFFFF",
      surface: "#FFFFFF",
      ink: "#262626",
      muted: "#6B6B6B",
      line: "#EDEDED",
      primary: "#F28BA8",
      strong: "#B33A61",
      soft: "#FDEEF3",
      primaryInk: "#4A0F22",
      accent: "#8CC56B",
      accentInk: "#262626",
      accentText: "#3F7A22"
    },
  },
];

export const HEADING_FONTS = [
  { id: "josefin", name: "Josefin Sans", cssVar: "--font-josefin" },
  { id: "fredoka", name: "Fredoka", cssVar: "--font-fredoka" },
  { id: "young-serif", name: "Young Serif", cssVar: "--font-young-serif" },
  { id: "mali", name: "Mali", cssVar: "--font-mali" },
  { id: "newsreader", name: "Newsreader", cssVar: "--font-newsreader" },
] as const;

export const BODY_FONTS = [
  { id: "nunito", name: "Nunito", cssVar: "--font-nunito" },
  { id: "mali", name: "Mali", cssVar: "--font-mali" },
  { id: "patrick-hand", name: "Patrick Hand", cssVar: "--font-patrick-hand" },
  { id: "newsreader", name: "Newsreader", cssVar: "--font-newsreader" },
] as const;

export type ThemeSettings = {
  palette: string;
  heading: string;
  body: string;
  pattern: "polkadot" | "gingham" | "polos";
};

export const DEFAULT_THEME: ThemeSettings = {
  palette: "meow",
  heading: "josefin",
  body: "nunito",
  pattern: "polkadot",
};

export function normalizeTheme(raw: unknown): ThemeSettings {
  const t = (raw && typeof raw === "object" ? raw : {}) as Partial<ThemeSettings>;
  return {
    palette: PALETTES.some((p) => p.id === t.palette) ? t.palette! : DEFAULT_THEME.palette,
    heading: HEADING_FONTS.some((f) => f.id === t.heading) ? t.heading! : DEFAULT_THEME.heading,
    body: BODY_FONTS.some((f) => f.id === t.body) ? t.body! : DEFAULT_THEME.body,
    pattern: ["polkadot", "gingham", "polos"].includes(t.pattern as string)
      ? (t.pattern as ThemeSettings["pattern"])
      : DEFAULT_THEME.pattern,
  };
}

/** CSS variables untuk dipasang di <html style>. */
export function themeStyle(theme: ThemeSettings): Record<string, string> {
  const p = PALETTES.find((x) => x.id === theme.palette) ?? PALETTES[0];
  const h = HEADING_FONTS.find((f) => f.id === theme.heading) ?? HEADING_FONTS[0];
  const b = BODY_FONTS.find((f) => f.id === theme.body) ?? BODY_FONTS[0];
  return {
    "--c-bg": p.colors.bg,
    "--c-surface": p.colors.surface,
    "--c-soft": p.colors.soft,
    "--c-primary": p.colors.primary,
    "--c-primary-ink": p.colors.primaryInk,
    "--c-strong": p.colors.strong,
    "--c-accent": p.colors.accent,
    "--c-accent-ink": p.colors.accentInk,
    "--c-accent-text": p.colors.accentText,
    "--c-ink": p.colors.ink,
    "--c-muted": p.colors.muted,
    "--c-line": p.colors.line,
    "--f-heading": `var(${h.cssVar})`,
    "--f-body": `var(${b.cssVar})`,
  };
}
