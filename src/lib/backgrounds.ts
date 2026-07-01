import { APP } from "@/lib/constants";

/**
 * Daily-rotating cinematic backdrops for the ambient stadium-night background.
 *
 * Every image is sourced from Unsplash (free-to-use license), hand-checked to be
 * football/stadium themed, and deliberately landscape so it crops cleanly as a
 * full-bleed backdrop. The order alternates wide stadium establishing shots with
 * tighter pitch/action frames for day-to-day visual rhythm. Day 0 (opening day,
 * 11 Jun 2026) gets the packed floodlit bowl.
 *
 * If any URL ever 404s the layer simply renders nothing over the solid
 * `bg-background` beneath it — a dead link degrades to today's plain backdrop
 * rather than a broken image.
 */
const unsplash = (id: string, w = 1920) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export const WC_BACKDROPS: readonly string[] = [
  unsplash("1489944440615-453fc2b6a9a9"), // floodlit, packed stadium at night
  unsplash("1459865264687-595d652de67e"), // dewy pitch sideline, close up
  unsplash("1540379708242-14a809bef941"), // stadium bowl at golden hour
  unsplash("1574629810360-7efbbe195018"), // a ball struck off the turf
  unsplash("1522778526097-ce0a22ceb253"), // empty stadium seats, blue hour
  unsplash("1551958219-acbc608c6377"),    // three match balls on the grass
  unsplash("1431324155629-1a6deb1dec8d"), // a match under the floodlights
  unsplash("1486286701208-1d58e9338013"), // a lone ball on a wet pitch
  unsplash("1606925797300-0b35e9d1794e"), // a striker about to connect
  unsplash("1518604666860-9ed391f76460"), // a pile of training balls
  unsplash("1577223625816-7546f13df25d"), // the players' tunnel
  unsplash("1529900748604-07564a03e7a6"), // boots on the touchline
  unsplash("1624880357913-a8539238245b"), // a 50/50 challenge near goal
  unsplash("1552667466-07770ae110d0"),    // a single ball, shallow focus
];

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
