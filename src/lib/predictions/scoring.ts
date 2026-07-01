import type {
  Match,
  Prediction,
  PredictionMarket,
  RiskLevel,
} from "@/types";
import { getTeam } from "@/lib/data/teams";

/* ------------------------------------------------------------------ *
 *  The friendly prediction league scoring model.
 *  Points reward difficulty and the risk a player chose to stake.
 * ------------------------------------------------------------------ */

export const RISK_MULTIPLIER: Record<RiskLevel, number> = {
  safe: 1,
  balanced: 1.4,
  bold: 1.9,
  wild: 2.6,
};

export const MARKET_BASE_POINTS: Record<PredictionMarket, number> = {
  winner: 40,
  scoreline: 120,
  first_scorer: 90,
  total_goals: 55,
  cards: 50,
  corners: 50,
  clean_sheet: 45,
  motm: 80,
  penalty: 60,
  extra_time: 60,
};

export interface MarketDef {
  market: PredictionMarket;
  label: string;
  hint: string;
  icon: string;
  /** Build the selectable options for a given match. */
  options: (match: Match) => Array<{ value: string; label: string }>;
}

export function marketDefs(match: Match): MarketDef[] {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const hn = home?.name ?? "Home";
  const an = away?.name ?? "Away";
  const defs: MarketDef[] = [
    {
      market: "winner",
      label: "Match Winner",
      hint: "Who takes it?",
      icon: "Trophy",
      options: () => [
        { value: "home", label: hn },
        { value: "draw", label: "Draw" },
        { value: "away", label: an },
      ],
    },
    {
      market: "scoreline",
      label: "Exact Scoreline",
      hint: "Big points, big risk",
      icon: "Hash",
      options: () =>
        ["1-0", "2-0", "2-1", "1-1", "0-0", "0-1", "1-2", "0-2", "3-1"].map((s) => ({
          value: s,
          label: s,
        })),
    },
    {
      market: "total_goals",
      label: "Total Goals",
      hint: "Over or under 2.5",
      icon: "Target",
      options: () => [
        { value: "over", label: "Over 2.5" },
        { value: "under", label: "Under 2.5" },
      ],
    },
    {
      market: "first_scorer",
      label: "First Goal",
      hint: "Which side strikes first",
      icon: "Flag",
      options: () => [
        { value: "home", label: hn },
        { value: "away", label: an },
        { value: "none", label: "No goals" },
      ],
    },
    {
      market: "clean_sheet",
      label: "Clean Sheet",
      hint: "Anyone keep it tidy?",
      icon: "Shield",
      options: () => [
        { value: "home", label: `${hn} CS` },
        { value: "away", label: `${an} CS` },
        { value: "none", label: "Both score" },
      ],
    },
    {
      market: "penalty",
      label: "Penalty Awarded",
      hint: "Spot kick drama?",
      icon: "Goal",
      options: () => [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      market: "extra_time",
      label: "Goes to Extra Time",
      hint: "Knockout nerves",
      icon: "Clock",
      options: () => [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
  ];
  return defs.filter((d) => !(d.market === "extra_time" && match.stage === "group"));
}

/** Settle a prediction against a finished match. */
export function scorePrediction(
  prediction: Pick<Prediction, "market" | "value" | "risk">,
  match: Match
): { correct: boolean; points: number } {
  if (match.status !== "finished" || match.homeScore === null || match.awayScore === null) {
    return { correct: false, points: 0 };
  }
  const h = match.homeScore;
  const a = match.awayScore;
  const total = h + a;
  const goalEvents = match.events.filter(
    (e) => e.type === "goal" || e.type === "penalty_goal" || e.type === "own_goal"
  );
  const firstGoal = goalEvents.sort((x, y) => x.minute - y.minute)[0];
  const hasPenalty = match.events.some(
    (e) => e.type === "penalty_goal" || e.type === "penalty_miss" || e.detail === "Penalty review"
  );

  let correct = false;
  switch (prediction.market) {
    case "winner":
      correct =
        prediction.value === (h > a ? "home" : h < a ? "away" : "draw");
      break;
    case "scoreline":
      correct = prediction.value === `${h}-${a}`;
      break;
    case "total_goals":
      correct = prediction.value === (total > 2.5 ? "over" : "under");
      break;
    case "first_scorer":
      correct =
        prediction.value === (!firstGoal ? "none" : firstGoal.team === "home" ? "home" : "away");
      break;
    case "clean_sheet":
      correct =
        prediction.value === (a === 0 ? "home" : h === 0 ? "away" : "none") ||
        (prediction.value === "home" && a === 0) ||
        (prediction.value === "away" && h === 0);
      break;
    case "penalty":
      correct = prediction.value === (hasPenalty ? "yes" : "no");
      break;
    case "extra_time":
      correct =
        prediction.value === (match.homePenalties !== null ? "yes" : "no");
      break;
    default:
      correct = false;
  }

  const base = MARKET_BASE_POINTS[prediction.market] ?? 40;
  const points = correct ? Math.round(base * RISK_MULTIPLIER[prediction.risk]) : 0;
  return { correct, points };
}

export const RISK_META: Record<RiskLevel, { label: string; color: string; blurb: string }> = {
  safe: { label: "Safe", color: "var(--pitch)", blurb: "Low risk, low reward" },
  balanced: { label: "Balanced", color: "var(--electric)", blurb: "The sensible stake" },
  bold: { label: "Bold", color: "var(--gold)", blurb: "Fortune favours…" },
  wild: { label: "Wild", color: "var(--live)", blurb: "Hero or zero" },
};
