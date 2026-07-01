"use client";
import { useEffect, useState } from "react";
import { countdownTo, type Countdown } from "@/lib/utils";

export interface CountdownState extends Countdown {
  mounted: boolean;
}

/** Live countdown to an ISO timestamp, hydration-safe. */
export function useCountdown(iso: string, intervalMs = 1000): CountdownState {
  const [state, setState] = useState<CountdownState>(() => ({
    ...countdownTo(iso, 0),
    mounted: false,
  }));

  useEffect(() => {
    const tick = () => setState({ ...countdownTo(iso), mounted: true });
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [iso, intervalMs]);

  return state;
}
