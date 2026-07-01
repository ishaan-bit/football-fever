import { describe, it, expect } from "vitest";
import { scorePrediction, marketDefs, RISK_MULTIPLIER, MARKET_BASE_POINTS } from "@/lib/predictions/scoring";
import type { Match, MatchEvent, Prediction } from "@/types";

/* ------------------------------------------------------------------ *
 *  The friendly prediction league scoring model. A correct pick must
 *  award positive points scaled by the chosen risk; a wrong pick must
 *  award zero. We also verify market availability gating (no extra-time
 *  market during the group stage).
 * ------------------------------------------------------------------ */

const GOAL = (
  id: string,
  minute: number,
  team: MatchEvent["team"]
): MatchEvent => ({ id, minute, type: "goal", team });

/** A finished match: home (Argentina) beat away (Saudi Arabia) 2-1. */
function finishedMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: "test-finished",
    stage: "group",
    group: "A",
    matchday: 1,
    homeTeamId: "arg",
    awayTeamId: "ksa",
    homeScore: 2,
    awayScore: 1,
    homePenalties: null,
    awayPenalties: null,
    kickoff: "2026-06-11T16:00:00.000Z",
    venueId: "metlife",
    status: "finished",
    minute: null,
    events: [
      GOAL("e1", 12, "home"),
      GOAL("e2", 34, "away"),
      GOAL("e3", 77, "home"),
    ],
    ...overrides,
  };
}

type Pick = Pick<Prediction, "market" | "value" | "risk">;

describe("scorePrediction", () => {
  it("scores a correct winner pick as correct with positive points", () => {
    const pick: Pick = { market: "winner", value: "home", risk: "balanced" };
    const { correct, points } = scorePrediction(pick, finishedMatch());
    expect(correct).toBe(true);
    expect(points).toBeGreaterThan(0);
    // base 40 * balanced 1.4 = 56
    expect(points).toBe(
      Math.round(MARKET_BASE_POINTS.winner * RISK_MULTIPLIER.balanced)
    );
  });

  it("scores a wrong winner pick as incorrect with zero points", () => {
    const pick: Pick = { market: "winner", value: "away", risk: "balanced" };
    const { correct, points } = scorePrediction(pick, finishedMatch());
    expect(correct).toBe(false);
    expect(points).toBe(0);
  });

  it("scales points up with higher risk", () => {
    const safe = scorePrediction(
      { market: "winner", value: "home", risk: "safe" },
      finishedMatch()
    );
    const wild = scorePrediction(
      { market: "winner", value: "home", risk: "wild" },
      finishedMatch()
    );
    expect(wild.points).toBeGreaterThan(safe.points);
  });

  it("settles an exact scoreline pick", () => {
    expect(
      scorePrediction({ market: "scoreline", value: "2-1", risk: "bold" }, finishedMatch()).correct
    ).toBe(true);
    expect(
      scorePrediction({ market: "scoreline", value: "1-1", risk: "bold" }, finishedMatch()).correct
    ).toBe(false);
  });

  it("settles total goals over/under 2.5 (2-1 -> over)", () => {
    expect(
      scorePrediction({ market: "total_goals", value: "over", risk: "safe" }, finishedMatch()).correct
    ).toBe(true);
    expect(
      scorePrediction({ market: "total_goals", value: "under", risk: "safe" }, finishedMatch()).correct
    ).toBe(false);
  });

  it("settles first scorer from the timeline (home scored at 12')", () => {
    expect(
      scorePrediction({ market: "first_scorer", value: "home", risk: "safe" }, finishedMatch()).correct
    ).toBe(true);
  });

  it("returns zero for a match that has not finished", () => {
    const live = finishedMatch({ status: "live", homeScore: 1, awayScore: 0 });
    const { correct, points } = scorePrediction(
      { market: "winner", value: "home", risk: "wild" },
      live
    );
    expect(correct).toBe(false);
    expect(points).toBe(0);
  });

  it("settles extra_time from penalties (homePenalties set -> yes)", () => {
    const koDraw = finishedMatch({
      stage: "r16",
      homeScore: 1,
      awayScore: 1,
      homePenalties: 4,
      awayPenalties: 2,
    });
    expect(
      scorePrediction({ market: "extra_time", value: "yes", risk: "bold" }, koDraw).correct
    ).toBe(true);
    expect(
      scorePrediction({ market: "extra_time", value: "no", risk: "bold" }, koDraw).correct
    ).toBe(false);
  });
});

describe("marketDefs", () => {
  function matchOf(stage: Match["stage"]): Match {
    return finishedMatch({ stage });
  }

  it("excludes the extra_time market in the group stage", () => {
    const defs = marketDefs(matchOf("group"));
    expect(defs.some((d) => d.market === "extra_time")).toBe(false);
  });

  it("includes the extra_time market in knockout stages", () => {
    const defs = marketDefs(matchOf("r16"));
    expect(defs.some((d) => d.market === "extra_time")).toBe(true);
  });

  it("always offers the winner market with home/draw/away options", () => {
    const defs = marketDefs(matchOf("group"));
    const winner = defs.find((d) => d.market === "winner");
    expect(winner).toBeDefined();
    const values = winner!.options(matchOf("group")).map((o) => o.value);
    expect(values).toEqual(["home", "draw", "away"]);
  });
});
