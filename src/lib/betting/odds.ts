import type { Match, MatchOdds, Market, OddsSelection, OraclePrediction } from "@/types";
import { getTeam } from "@/lib/data/teams";

/* ------------------------------------------------------------------ *
 *  Odds engine. Converts the Oracle's "true" probabilities into priced
 *  decimal odds with a configurable margin (overround), then surfaces
 *  where the Oracle thinks the price is wrong — the value picks.
 *  This is play-money / friendly-stakes pricing, not a sportsbook.
 * ------------------------------------------------------------------ */

const DEFAULT_MARGIN = 0.07;

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
const pois = (k: number, l: number) => (Math.exp(-l) * l ** k) / factorial(k);

/** Price a normalized set of true probabilities into selections with margin. */
function price(
  raw: Array<{ id: string; label: string; trueProb: number }>,
  margin: number
): OddsSelection[] {
  const sum = raw.reduce((a, r) => a + r.trueProb, 0) || 1;
  const sels = raw.map((r) => {
    const trueProb = r.trueProb / sum;
    const impliedProb = trueProb * (1 + margin);
    const decimal = Math.max(1.01, 1 / impliedProb);
    const edge = trueProb - impliedProb;
    return {
      id: r.id,
      label: r.label,
      decimal: Math.round(decimal * 100) / 100,
      impliedProb,
      trueProb,
      edge,
      recommended: false,
    };
  });
  // Recommend the best positive-edge selection in the market.
  const best = sels.reduce((b, s) => (s.edge > b.edge ? s : b), sels[0]!);
  if (best && best.edge > 0.01) best.recommended = true;
  return sels;
}

export function makeOdds(
  match: Match,
  prediction: OraclePrediction,
  margin = DEFAULT_MARGIN
): MatchOdds | null {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  if (!home || !away) return null;

  const xgH = prediction.expectedGoals.home;
  const xgA = prediction.expectedGoals.away;
  const p0H = pois(0, xgH);
  const p0A = pois(0, xgA);

  let pOver = 0;
  for (let h = 0; h <= 8; h++)
    for (let a = 0; a <= 8; a++) if (h + a >= 3) pOver += pois(h, xgH) * pois(a, xgA);
  const btts = (1 - p0H) * (1 - p0A);
  const noGoal = p0H * p0A;
  const homeFirst = (1 - noGoal) * (xgH / (xgH + xgA));
  const awayFirst = (1 - noGoal) * (xgA / (xgH + xgA));

  const knockout = match.stage !== "group";

  const markets: Market[] = [
    // Knockouts can't end in a draw over the tie, so price a 2-way "to advance"
    // (the draw probability is split toward each side) instead of a 1X2.
    knockout
      ? {
          key: "match_result",
          label: "To Advance",
          selections: price(
            [
              { id: "home", label: home.name, trueProb: prediction.homeWinProb + prediction.drawProb * 0.5 },
              { id: "away", label: away.name, trueProb: prediction.awayWinProb + prediction.drawProb * 0.5 },
            ],
            margin
          ),
        }
      : {
          key: "match_result",
          label: "Match Result",
          selections: price(
            [
              { id: "home", label: home.name, trueProb: prediction.homeWinProb },
              { id: "draw", label: "Draw", trueProb: prediction.drawProb },
              { id: "away", label: away.name, trueProb: prediction.awayWinProb },
            ],
            margin
          ),
        },
    ...(knockout
      ? []
      : [
          {
            key: "double_chance" as const,
            label: "Double Chance",
            selections: price(
              [
                { id: "1x", label: `${home.code} or Draw`, trueProb: prediction.homeWinProb + prediction.drawProb },
                { id: "12", label: "Either team", trueProb: prediction.homeWinProb + prediction.awayWinProb },
                { id: "x2", label: `Draw or ${away.code}`, trueProb: prediction.drawProb + prediction.awayWinProb },
              ],
              margin
            ),
          },
        ]),
    {
      key: "over_under_2_5",
      label: "Total Goals 2.5",
      selections: price(
        [
          { id: "over", label: "Over 2.5", trueProb: pOver },
          { id: "under", label: "Under 2.5", trueProb: 1 - pOver },
        ],
        margin
      ),
    },
    {
      key: "btts",
      label: "Both Teams to Score",
      selections: price(
        [
          { id: "yes", label: "Yes", trueProb: btts },
          { id: "no", label: "No", trueProb: 1 - btts },
        ],
        margin
      ),
    },
    {
      key: "first_team_to_score",
      label: "First to Score",
      selections: price(
        [
          { id: "home", label: home.name, trueProb: homeFirst },
          { id: "none", label: "No goals", trueProb: noGoal },
          { id: "away", label: away.name, trueProb: awayFirst },
        ],
        margin
      ),
    },
    {
      key: "correct_score",
      label: "Correct Score",
      selections: price(
        prediction.scorelineProbabilities.slice(0, 5).map((s) => ({
          id: s.score,
          label: s.score,
          trueProb: s.prob,
        })),
        margin + 0.05
      ),
    },
  ];

  // Find the single best value selection across every market.
  let best: MatchOdds["bestValue"] = null;
  for (const m of markets) {
    for (const s of m.selections) {
      if (!best || s.edge > best.edge) best = { marketKey: m.key, selectionId: s.id, edge: s.edge };
    }
  }
  if (best && best.edge <= 0) best = null;

  return { matchId: match.id, margin, markets, bestValue: best };
}

export const decimalToFractional = (d: number): string => {
  const dec = d - 1;
  for (let den = 1; den <= 20; den++) {
    const num = dec * den;
    if (Math.abs(num - Math.round(num)) < 0.06) return `${Math.round(num)}/${den}`;
  }
  return `${Math.round(dec * 100)}/100`;
};

export const americanFromDecimal = (d: number): string =>
  d >= 2 ? `+${Math.round((d - 1) * 100)}` : `${Math.round(-100 / (d - 1))}`;

export const combinedOdds = (legs: Array<{ decimal: number }>): number =>
  Math.round(legs.reduce((acc, l) => acc * l.decimal, 1) * 100) / 100;
