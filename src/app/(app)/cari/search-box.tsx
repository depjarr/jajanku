"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

export function SearchBox({
  initial,
  basePath = "/cari",
  placeholder = "Cari jajanan…",
}: {
  initial: string;
  basePath?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const first = useRef(true);

  // Cari otomatis 300 ms setelah berhenti mengetik.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const q = value.trim();
      start(() => router.replace(q ? `${basePath}?q=${encodeURIComponent(q)}` : basePath, { scroll: false }));
    }, 300);
    return () => clearTimeout(t);
  }, [value, router, basePath]);

  return (
    <label className="flex items-center gap-2 rounded-2xl bg-ink/[0.05] px-4 py-3 ring-1 ring-ink/5 focus-within:ring-2 focus-within:ring-primary">
      <Search className={`size-5 ${pending ? "animate-pulse text-strong" : "text-muted"}`} aria-hidden />
      <input
        type="search"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Cari jajanan"
        className="min-w-0 flex-1 bg-transparent text-[17px] outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => setValue("")} aria-label="Hapus pencarian" className="press grid size-6 place-items-center rounded-full bg-ink/15 text-white">
          <X className="size-3.5" />
        </button>
      )}
    </label>
  );
}
