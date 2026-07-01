"use client";
import { useEffect, useState } from "react";
import { useUiStore } from "@/stores/ui";

/** Effective reduced-motion: OS preference unless the user overrides it in-app. */
export function useReducedMotion() {
  const override = useUiStore((s) => s.reducedMotionOverride);
  const [system, setSystem] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystem(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystem(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return override ?? system;
}
