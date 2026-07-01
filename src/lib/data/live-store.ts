import type { Match } from "@/types";

/**
 * Client-side override for live match data.
 *
 * The whole UI reads matches synchronously via `getMatches()` (so pages render
 * instantly and tick with the clock). The live World Cup feed is async and
 * server-fetched, so `LiveData` (providers.tsx) fetches `/api/matches` on the
 * client and drops the result here. `getMatches()`/`getMatch()` then prefer
 * this override, falling back to the deterministic seed when it's absent (SSR,
 * first paint, or the upstream API being unreachable).
 *
 * It is a subscribable external store: `subscribeLive` lets `useNow` re-render
 * every match-consuming component the instant new data lands (rather than on
 * the next clock tick), so all surfaces switch from seed to live atomically.
 *
 * Only ever mutated on the client — on the server `LIVE` stays null, so SSR is
 * always seed-based and there is no cross-request leakage.
 */
let LIVE: Match[] | null = null;
let version = 0;
const listeners = new Set<() => void>();

export function setLiveMatches(matches: Match[] | null): void {
  LIVE = matches && matches.length ? matches : null;
  version++;
  listeners.forEach((l) => l());
}

export function getLiveOverride(): Match[] | null {
  return LIVE;
}

export function liveVersion(): number {
  return version;
}

/** Subscribe to live-data changes; returns an unsubscribe fn. */
export function subscribeLive(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
