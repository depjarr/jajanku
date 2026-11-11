/** Getaran singkat di HP yang mendukung (Android). iOS Safari mengabaikannya. */
export function haptic(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {}
}

export const spring = { type: "spring", stiffness: 420, damping: 34 } as const;
export const softSpring = { type: "spring", stiffness: 260, damping: 26 } as const;
