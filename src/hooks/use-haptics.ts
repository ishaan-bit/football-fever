"use client";
import { useCallback } from "react";
import { useReducedMotion } from "./use-reduced-motion";

/** Named vibration patterns (ms, or on/off arrays) for game feedback. */
const PATTERNS = {
  tap: 8,
  select: 12,
  impact: 18,
  success: [14, 40, 26],
  win: [18, 50, 18, 50, 40],
  fail: 32,
  heavy: [26, 30, 26],
  tick: 6,
} as const;

export type Haptic = keyof typeof PATTERNS;

/**
 * Lightweight haptic feedback via the Vibration API. No-op where unsupported
 * (desktop, iOS Safari) and skipped under the reduced-motion preference, so it
 * only ever adds a subtle buzz on capable devices.
 */
export function useHaptics() {
  const reduced = useReducedMotion();

  const buzz = useCallback(
    (pattern: Haptic = "tap") => {
      if (reduced) return;
      if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
      try {
        navigator.vibrate(PATTERNS[pattern] as number | number[]);
      } catch {
        /* ignore */
      }
    },
    [reduced]
  );

  return { buzz };
}
