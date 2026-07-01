"use client";
import { useEffect, useState } from "react";

/** True only after the first client mount — gate persisted-store reads with it
 *  to avoid hydration mismatches. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
