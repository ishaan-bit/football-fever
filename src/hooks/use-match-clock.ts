"use client";
import { useEffect, useState } from "react";
import type { Match } from "@/types";
import { statusFromClock } from "@/lib/data";

export interface MatchClock {
  status: Match["status"];
  minute: number | null;
  mounted: boolean;
}

/** Live status + minute for a match, ticking every few seconds. */
export function useMatchClock(kickoff: string, fallback: Match["status"], intervalMs = 5000): MatchClock {
  const [clock, setClock] = useState<MatchClock>({ status: fallback, minute: null, mounted: false });

  useEffect(() => {
    const tick = () => {
      const { status, minute } = statusFromClock(kickoff, Date.now());
      setClock({ status, minute, mounted: true });
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [kickoff, intervalMs]);

  return clock;
}
