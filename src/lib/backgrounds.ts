import { APP } from "@/lib/constants";
import { BACKDROP_POOL } from "@/lib/imagery";

/**
 * Daily-rotating cinematic backdrops for the ambient stadium-night background.
 *
 * The verified, on-theme landscape pool lives in `@/lib/imagery` (the single
 * source of truth for stills across the app). The order there alternates wide
 * stadium establishing shots with tighter pitch/action frames for day-to-day
 * visual rhythm. Day 0 (opening day, 11 Jun 2026) gets the packed floodlit bowl.
 *
 * If any URL ever 404s the layer simply renders nothing over the solid
 * `bg-background` beneath it — a dead link degrades to today's plain backdrop
 * rather than a broken image.
 */
export const WC_BACKDROPS: readonly string[] = BACKDROP_POOL;

const DAY_MS = 86_400_000;
const TOURNAMENT_START = new Date(APP.tournament.start).getTime();

/**
 * Which day of the World Cup `now` falls on — 0 is opening day (11 Jun 2026),
 * counting up by one per UTC day and never stopping after the final.
 *
 * Always returns a finite, non-negative integer. Anything that isn't strictly
 * after kickoff clamps to 0: `now === 0` (the SSR-stable value `useNow()` returns
 * on the first client render), dates before kickoff, and any non-finite input —
 * including a hypothetically malformed `TOURNAMENT_START`. So the server and the
 * first client paint always agree on day 0 (no hydration mismatch), and a bad
 * date can never poison the index. The real day swaps in after the clock ticks.
 */
export function worldCupDay(now: number): number {
  const elapsed = now - TOURNAMENT_START;
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  return Math.floor(elapsed / DAY_MS);
}

/** The backdrop image URL for the WC day that `now` falls on. Stable per day. */
export function backdropForDay(now: number): string {
  return WC_BACKDROPS[worldCupDay(now) % WC_BACKDROPS.length] ?? WC_BACKDROPS[0]!;
}
