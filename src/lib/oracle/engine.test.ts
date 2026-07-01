import { describe, it, expect } from "vitest";
import { runOracle, type OracleContext } from "@/lib/oracle/engine";
import type { Match, OraclePrediction } from "@/types";

/* ------------------------------------------------------------------ *
 *  The Oracle is the heart of the app and must be deterministic and
 *  internally consistent: probabilities normalize, confidence stays in
 *  band, expected goals are positive, and the same match always yields
 *  the same verdict. We also assert the obvious sanity check — a far
 *  stronger team should be favoured.
 * ------------------------------------------------------------------ */

/**
 * Build a minimal, valid Match using real seed team ids. Team ids are the
 * lowercased FIFA code (see src/lib/data/teams.ts), so Argentina -> "arg"
 * (rating 93) and Saudi Arabia -> "ksa" (rating 69).
 */
function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: "test-arg-ksa",
    stage: "group",
    group: "A",
    matchday: 1,
    homeTeamId: "arg",
    awayTeamId: "ksa",
    homeScore: null,
    awayScore: null,
    homePenalties: null,
    awayPenalties: null,
    kickoff: "2026-06-11T16:00:00.000Z",
    venueId: "metlife",
    status: "scheduled",
    minute: null,
    events: [],
    ...overrides,
  };
}

const EPS = 1e-6;

describe("runOracle", () => {
  it("returns a prediction for a match with two known teams", () => {
    const out = runOracle(makeMatch());
    expect(out).not.toBeNull();
  });

  it("returns null when a team is unknown", () => {
    const out = runOracle(makeMatch({ homeTeamId: "not-a-real-team" }));
    expect(out).toBeNull();
  });

  it("produces 1X2 probabilities that sum to ~1", () => {
    const out = runOracle(makeMatch()) as OraclePrediction;
    const sum = out.homeWinProb + out.drawProb + out.awayWinProb;
    expect(Math.abs(sum - 1)).toBeLessThan(EPS);
    for (const p of [out.homeWinProb, out.drawProb, out.awayWinProb]) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("keeps confidence within the documented [25, 96] band", () => {
    const out = runOracle(makeMatch()) as OraclePrediction;
    expect(out.confidence).toBeGreaterThanOrEqual(25);
    expect(out.confidence).toBeLessThanOrEqual(96);
  });

  it("reports positive expected goals for both sides", () => {
    const out = runOracle(makeMatch()) as OraclePrediction;
    expect(out.expectedGoals.home).toBeGreaterThan(0);
    expect(out.expectedGoals.away).toBeGreaterThan(0);
  });

  it("is deterministic — identical match in, identical verdict out", () => {
    const a = runOracle(makeMatch()) as OraclePrediction;
    const b = runOracle(makeMatch()) as OraclePrediction;
    expect(b.homeWinProb).toBe(a.homeWinProb);
    expect(b.drawProb).toBe(a.drawProb);
    expect(b.awayWinProb).toBe(a.awayWinProb);
    expect(b.verdict).toBe(a.verdict);
    expect(b.preview).toBe(a.preview);
    expect(b.confidence).toBe(a.confidence);
    expect(b.likelyScoreline).toEqual(a.likelyScoreline);
  });

  it("favours the much stronger team (Argentina 93 over Saudi Arabia 69)", () => {
    const out = runOracle(makeMatch()) as OraclePrediction;
    expect(out.homeWinProb).toBeGreaterThan(out.awayWinProb);
    expect(out.homeWinProb).toBeGreaterThan(out.drawProb);
  });

  it("flips the favourite when the strong team plays away", () => {
    const home = runOracle(makeMatch()) as OraclePrediction;
    const swapped = runOracle(
      makeMatch({ homeTeamId: "ksa", awayTeamId: "arg" })
    ) as OraclePrediction;
    // Argentina should be favoured in both — home win when home, away win when away.
    expect(home.homeWinProb).toBeGreaterThan(swapped.homeWinProb);
    expect(swapped.awayWinProb).toBeGreaterThan(swapped.homeWinProb);
  });

  it("scoreline probabilities are sorted descending and non-empty", () => {
    const out = runOracle(makeMatch()) as OraclePrediction;
    expect(out.scorelineProbabilities.length).toBeGreaterThan(0);
    for (let i = 1; i < out.scorelineProbabilities.length; i++) {
      expect(out.scorelineProbabilities[i - 1]!.prob).toBeGreaterThanOrEqual(
        out.scorelineProbabilities[i]!.prob
      );
    }
  });

  it("honours context (host lift nudges home expected goals up)", () => {
    const base = runOracle(makeMatch()) as OraclePrediction;
    const ctx: OracleContext = { homeIsHost: true };
    const hosted = runOracle(makeMatch(), ctx) as OraclePrediction;
    expect(hosted.expectedGoals.home).toBeGreaterThan(base.expectedGoals.home);
  });
});
