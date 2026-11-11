"use client";

import { useSyncExternalStore } from "react";

/** true bila media query cocok (mis. "(min-width: 768px)"). Saat SSR selalu false. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
