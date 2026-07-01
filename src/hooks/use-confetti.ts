"use client";
import { useCallback } from "react";
import { useReducedMotion } from "./use-reduced-motion";

/** Celebration confetti, lazily importing canvas-confetti and respecting motion prefs. */
export function useConfetti() {
  const reduced = useReducedMotion();

  const celebrate = useCallback(
    async (colors?: string[]) => {
      if (reduced || typeof window === "undefined") return;
      const confetti = (await import("canvas-confetti")).default;
      const defaults = {
        colors: colors ?? ["#22e0a1", "#19c3ff", "#9b6bff", "#ffce3a"],
        disableForReducedMotion: true,
      };
      confetti({ ...defaults, particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setTimeout(
        () => confetti({ ...defaults, particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } }),
        120
      );
      setTimeout(
        () => confetti({ ...defaults, particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } }),
        240
      );
    },
    [reduced]
  );

  const burst = useCallback(
    async (x: number, y: number, colors?: string[]) => {
      if (reduced || typeof window === "undefined") return;
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 40,
        spread: 60,
        startVelocity: 35,
        origin: { x, y },
        colors: colors ?? ["#22e0a1", "#19c3ff", "#9b6bff"],
        disableForReducedMotion: true,
      });
    },
    [reduced]
  );

  return { celebrate, burst };
}
