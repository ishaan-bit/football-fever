import { describe, it, expect } from "vitest";
import { computeDueAlerts } from "./compute";
import type { Match } from "@/types";

/* computeDueAlerts is the pure, time-driven core of the scheduler: a pre-match
 * ping within the hour, and a full-time result (with score) for a game that
 * just finished. Callers (server cron + client scan) handle de-duplication. */

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

describe("computeDueAlerts", () => {
  const now = Date.now();

  it("emits a pre-match alert within the hour", () => {
    const due = computeDueAlerts([makeMatch({ id: "pre-1", kickoff: new Date(now + 30 * 60_000).toISOString() })], now);
    expect(due.some((a) => a.type === "prematch" && a.matchId === "pre-1")).toBe(true);
  });

  it("does not alert for games beyond the one-hour window", () => {
    const due = computeDueAlerts([makeMatch({ id: "pre-far", kickoff: new Date(now + 3 * 3_600_000).toISOString() })], now);
    expect(due.some((a) => a.matchId === "pre-far")).toBe(false);
  });

  it("emits a full-time result carrying the score", () => {
    const due = computeDueAlerts(
      [makeMatch({ id: "res-1", kickoff: new Date(now - 3 * 3_600_000).toISOString(), homeScore: 2, awayScore: 1 })],
      now
    );
    const ev = due.find((a) => a.type === "result" && a.matchId === "res-1");
    expect(ev).toBeTruthy();
    expect(ev!.kind).toBe("fulltime");
    expect(ev!.title).toContain("2–1");
  });

  it("skips finished games with no score", () => {
    const due = computeDueAlerts([makeMatch({ id: "res-noscore", kickoff: new Date(now - 3 * 3_600_000).toISOString() })], now);
    expect(due.some((a) => a.matchId === "res-noscore")).toBe(false);
  });

  it("does not re-announce long-finished games (recency guard)", () => {
    const due = computeDueAlerts(
      [makeMatch({ id: "res-old", kickoff: new Date(now - 8 * 3_600_000).toISOString(), homeScore: 1, awayScore: 0 })],
      now
    );
    expect(due.some((a) => a.matchId === "res-old")).toBe(false);
  });
});
