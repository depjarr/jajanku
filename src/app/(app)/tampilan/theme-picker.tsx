"use client";

import { CupSoda } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { saveTheme } from "../actions";
import { Segmented } from "@/components/ui/segmented";
import { BODY_FONTS, HEADING_FONTS, PALETTES, themeStyle, type ThemeSettings } from "@/lib/theme";

const TABS = [
  { id: "warna", label: "Warna" },
  { id: "huruf", label: "Huruf" },
  { id: "pola", label: "Pola" },
] as const;

const PATTERNS: { id: ThemeSettings["pattern"]; label: string }[] = [
  { id: "polkadot", label: "Polkadot" },
  { id: "gingham", label: "Kotak piknik" },
  { id: "polos", label: "Polos" },
];

export function ThemePicker({ initial, diaryName }: { initial: ThemeSettings; diaryName: string }) {
  const [theme, setTheme] = useState(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("warna");
  const [saved, setSaved] = useState(true);
  const [pending, start] = useTransition();

  // Pratinjau langsung di seluruh halaman.
  useEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(themeStyle(theme))) root.style.setProperty(k, v);
    root.dataset.pattern = theme.pattern;
    root.style.colorScheme = "light";
  }, [theme]);

  const set = (patch: Partial<ThemeSettings>) => {
    setTheme((t) => ({ ...t, ...patch }));
    setSaved(false);
  };

  return (
    <div className="space-y-5">
      {/* Kartu pratinjau palet, geser horizontal */}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2" role="radiogroup" aria-label="Palet warna">
        {PALETTES.map((p) => {
          const active = theme.palette === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => set({ palette: p.id })}
              className="w-60 shrink-0 snap-center text-left"
            >
              <div
                className={`overflow-hidden rounded-3xl border-2 transition ${active ? "scale-100 border-[color:var(--ink)]" : "scale-95 border-transparent opacity-80"}`}
                style={{ background: p.colors.bg, ["--ink" as string]: p.colors.ink }}
              >
                <div className="px-4 py-2" style={{ background: p.colors.primary, color: p.colors.primaryInk }}>
                  <span className="font-heading text-xl font-bold">{diaryName}.</span>
                </div>
                <div className="h-2" style={{ background: p.colors.accent }} />
                <div className="m-3 rounded-2xl p-3" style={{ background: p.colors.surface, color: p.colors.ink }}>
                  <p className="font-heading text-lg font-semibold">November</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-full" style={{ background: p.colors.soft, color: p.colors.strong }}><CupSoda className="size-4" aria-hidden /></span>
                    <span className="text-sm" style={{ fontFamily: "var(--f-body)" }}>Es teh manis</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {[p.colors.primary, p.colors.accent, p.colors.muted, p.colors.line].map((c) => (
                      <span key={c} className="size-3 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-2 flex items-center gap-1 font-semibold">
                {p.name} {active && <Check className="size-4 text-strong" aria-hidden />}
              </p>
              <p className="text-xs text-muted">{p.note}</p>
            </button>
          );
        })}
      </div>

      <Segmented label="Pengaturan" value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t.id, label: t.label }))} />

      {tab === "warna" && (
        <p className="text-sm text-muted">Geser kartu di atas untuk memilih palet. Warnanya langsung dicoba di seluruh halaman.</p>
      )}

      {tab === "huruf" && (
        <div className="space-y-5">
          <FontRow
            title="Judul"
            note="Nama diarimu, judul halaman, dan header."
            fonts={HEADING_FONTS}
            value={theme.heading}
            onPick={(id) => set({ heading: id })}
            sample={(v) => (
              <>
                <span className="block text-xl font-bold" style={{ fontFamily: `var(${v})` }}>{diaryName}.</span>
                <span className="block text-muted" style={{ fontFamily: `var(${v})` }}>November</span>
              </>
            )}
          />
          <FontRow
            title="Tulisan"
            note="Nama jajanan dan catatanmu."
            fonts={BODY_FONTS}
            value={theme.body}
            onPick={(id) => set({ body: id })}
            sample={(v) => <span className="block text-xl" style={{ fontFamily: `var(${v})` }}>Es kopi susu</span>}
          />
        </div>
      )}

      {tab === "pola" && (
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Pola hiasan">
          {PATTERNS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={theme.pattern === p.id} onClick={() => set({ pattern: p.id })} className={`overflow-hidden rounded-2xl border-2 bg-surface text-sm font-semibold ${theme.pattern === p.id ? "border-ink/70" : "border-line"}`}>
              <span className={`block h-12 ${p.id === "polkadot" ? "pattern-polkadot" : p.id === "gingham" ? "pattern-gingham" : "pattern-polos"}`} style={p.id === "polkadot" ? { backgroundImage: "radial-gradient(color-mix(in srgb, white 55%, transparent) 2px, transparent 2.5px)" } : undefined} />
              <span className="block py-2">{p.label}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={saved || pending}
        onClick={() =>
          start(async () => {
            const r = await saveTheme(theme);
            if (!r.error) setSaved(true);
          })
        }
        className="w-full rounded-2xl bg-primary py-3 font-heading text-lg font-semibold text-primary-ink disabled:opacity-50"
      >
        {pending ? "Menyimpan…" : saved ? "Tersimpan ✓" : "Pakai tampilan ini"}
      </button>
    </div>
  );
}

function FontRow({
  title,
  note,
  fonts,
  value,
  onPick,
  sample,
}: {
  title: string;
  note: string;
  fonts: readonly { id: string; name: string; cssVar: string }[];
  value: string;
  onPick: (id: string) => void;
  sample: (cssVar: string) => React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-2 text-sm text-muted">{note}</p>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label={title}>
        {fonts.map((f) => (
          <button key={f.id} type="button" role="radio" aria-checked={value === f.id} onClick={() => onPick(f.id)} className={`w-40 shrink-0 rounded-2xl border-2 bg-surface p-3 text-left ${value === f.id ? "border-ink/70" : "border-line"}`}>
            {sample(f.cssVar)}
            <span className="mt-2 block text-xs text-muted">{f.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
