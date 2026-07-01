"use client";
import { useEffect, useState } from "react";
import { subscribeLive } from "@/lib/data/live-store";

/** A ticking clock. Returns 0 until mounted (SSR-stable), then live `Date.now()`.
 *  Also re-renders immediately when the live match feed lands, so seed→live
 *  swaps happen atomically across the app instead of on each page's own tick. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    // Bump past any same-millisecond collision so dependent memos recompute.
    const unsub = subscribeLive(() => setNow((n) => (n === Date.now() ? n + 1 : Date.now())));
    return () => {
      clearInterval(id);
      unsub();
    };
  }, [intervalMs]);
  return now;
}
