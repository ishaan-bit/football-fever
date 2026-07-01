import { describe, it, expect } from "vitest";
import { makeOdds, decimalToFractional, combinedOdds } from "@/lib/betting/odds";
import { runOracle } from "@/lib/oracle/engine";
import type { Match, MatchOdds, OraclePrediction } from "@/types";

/* ------------------------------------------------------------------ *
 *  The odds engine prices the Oracle's "true" probabilities with a
 *  margin (overround) and surfaces value edges. We assert the invariants
 *  any priced market must hold: decimal odds > 1, implied probabilities
 *  in (0, 1), and that an accumulator multiplies its legs.
 * ------------------------------------------------------------------ */

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

function oddsFor(match: Match): MatchOdds {
  const prediction = runOracle(match) as OraclePrediction;
  const odds = makeOdds(match, prediction);
  expect(odds).not.toBeNull();
  return odds as MatchOdds;
}

describe("makeOdds", () => {
  it("returns null when a team is unknown", () => {
    const prediction = runOracle(makeMatch()) as OraclePrediction;
    const odds = makeOdds(makeMatch({ homeTeamId: "nope" }), {
      ...prediction,
      matchId: "nope",
    });
    expect(odds).toBeNull();
  });

  it("produces markets with decimal odds > 1 and implied probability in (0, 1)", () => {
    const odds = oddsFor(makeMatch());
    expect(odds.markets.length).toBeGreaterThan(0);
    for (const market of odds.markets) {
      expect(market.selections.length).toBeGreaterThan(0);
      for (const sel of market.selections) {
        expect(sel.decimal).toBeGreaterThan(1);
        expect(sel.impliedProb).toBeGreaterThan(0);
        expect(sel.impliedProb).toBeLessThan(1);
        expect(sel.trueProb).toBeGreaterThanOrEqual(0);
        expect(sel.trueProb).toBeLessThanOrEqual(1);
      }
    }
  });

  it("always includes the core match_result market", () => {
    const odds = oddsFor(makeMatch());
    const result = odds.markets.find((m) => m.key === "match_result");
    expect(result).toBeDefined();
    expect(result!.selections.map((s) => s.id).sort()).toEqual([
      "away",
      "draw",
      "home",
    ]);
  });

  it("only offers the To Advance market in knockout stages", () => {
    const group = oddsFor(makeMatch({ stage: "group" }));
    expect(group.markets.some((m) => m.key === "to_qualify")).toBe(false);

    const knockout = oddsFor(makeMatch({ stage: "r32" }));
    expect(knockout.markets.some((m) => m.key === "to_qualify")).toBe(true);
  });

  it("bakes the margin in so implied probabilities overround above 1", () => {
    const odds = oddsFor(makeMatch());
    const result = odds.markets.find((m) => m.key === "match_result")!;
    const book = result.selections.reduce((a, s) => a + s.impliedProb, 0);
    expect(book).toBeGreaterThan(1);
  });
});

describe("decimalToFractional", () => {
  it("returns a string in num/den form", () => {
    const frac = decimalToFractional(3.0);
    expect(typeof frac).toBe("string");
    expect(frac).toMatch(/^\d+\/\d+$/);
    // 3.0 decimal == 2/1 fractional.
    expect(frac).toBe("2/1");
  });

  it("handles evens (2.0 -> 1/1)", () => {
    expect(decimalToFractional(2.0)).toBe("1/1");
  });
});

describe("combinedOdds", () => {
  it("multiplies the decimal odds of every leg", () => {
    const legs = [{ decimal: 2.0 }, { decimal: 1.5 }, { decimal: 3.0 }];
    expect(combinedOdds(legs)).toBe(9);
  });

  it("returns 1 for an empty slip", () => {
    expect(combinedOdds([])).toBe(1);
  });

  it("a single leg's combined odds equal its own price", () => {
    expect(combinedOdds([{ decimal: 2.4 }])).toBe(2.4);
  });
});
