import { describe, it, expect } from "vitest";
import { scanMatches } from "./server";
import type { Match } from "@/types";

/* The scheduler scan is idempotent and time-driven: it emits a pre-match ping
 * once a game is within the hour, and a full-time result (with score) once a
 * game has finished — each exactly once. */

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: "x",
    stage: "group",
    group: "A",
    matchday: 1,
    homeTeamId: "arg",
    awayTeamId: "fra",
    homeScore: null,
    awayScore: null,
    homePenalties: null,
    awayPenalties: null,
    kickoff: new Date().toISOString(),
    venueId: "metlife",
    status: "scheduled",
    minute: null,
    events: [],
    ...overrides,
  };
}

describe("scanMatches", () => {
  const now = Date.now();

  it("creates a pre-match alert within the hour, exactly once", async () => {
    const m = makeMatch({ id: "pre-1", kickoff: new Date(now + 30 * 60_000).toISOString() });
    const first = await scanMatches([m], now);
    expect(first.some((e) => e.type === "prematch" && e.matchId === "pre-1")).toBe(true);
    // A second scan must not re-create it (deduped).
    const second = await scanMatches([m], now);
    expect(second.some((e) => e.matchId === "pre-1")).toBe(false);
  });

  it("does not alert for games beyond the one-hour window", async () => {
    const m = makeMatch({ id: "pre-far", kickoff: new Date(now + 3 * 3_600_000).toISOString() });
    const created = await scanMatches([m], now);
    expect(created.some((e) => e.matchId === "pre-far")).toBe(false);
  });

  it("creates a full-time result carrying the score", async () => {
    const m = makeMatch({
      id: "res-1",
      kickoff: new Date(now - 3 * 3_600_000).toISOString(),
      homeScore: 2,
      awayScore: 1,
    });
    const created = await scanMatches([m], now);
    const ev = created.find((e) => e.type === "result" && e.matchId === "res-1");
    expect(ev).toBeTruthy();
    expect(ev!.kind).toBe("fulltime");
    expect(ev!.title).toContain("2–1");
  });

  it("skips finished games that have no score yet", async () => {
    const m = makeMatch({
      id: "res-noscore",
      kickoff: new Date(now - 3 * 3_600_000).toISOString(),
    });
    const created = await scanMatches([m], now);
    expect(created.some((e) => e.matchId === "res-noscore")).toBe(false);
  });

  it("does not re-announce long-finished games (recency guard)", async () => {
    // Kicked off 8h ago — finished, scored, but far outside the fresh window.
    const m = makeMatch({
      id: "res-old",
      kickoff: new Date(now - 8 * 3_600_000).toISOString(),
      homeScore: 1,
      awayScore: 0,
    });
    const created = await scanMatches([m], now);
    expect(created.some((e) => e.matchId === "res-old")).toBe(false);
  });
});
