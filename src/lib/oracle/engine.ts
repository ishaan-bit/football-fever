import type { Match, OraclePrediction, OracleInsight, Team } from "@/types";
import { getTeam } from "@/lib/data/teams";
import { seededRandom, hashSeed, clamp, pickFrom } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  The Oracle — an explainable, deterministic match model.
 *  It blends a strength rating, a bivariate-Poisson goal model, recent
 *  form and stage stakes into probabilities, a scoreline, an xG read and
 *  a human, slightly-smug preview. Same match in -> same call out.
 * ------------------------------------------------------------------ */

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
const pois = (k: number, l: number) => (Math.exp(-l) * l ** k) / factorial(k);

export interface OracleContext {
  /** Recent results for each side, newest last. */
  homeForm?: Array<"W" | "D" | "L">;
  awayForm?: Array<"W" | "D" | "L">;
  /** Is the home team literally a tournament host? (crowd factor) */
  homeIsHost?: boolean;
}

const formScore = (form?: Array<"W" | "D" | "L">) =>
  !form || !form.length
    ? 0
    : form.reduce((a, r) => a + (r === "W" ? 1 : r === "D" ? 0 : -1), 0) / form.length;

const MAX_GOALS = 6;

export function runOracle(
  match: Match,
  ctx: OracleContext = {}
): OraclePrediction | null {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  if (!home || !away) return null;

  const rng = seededRandom(hashSeed("oracle:" + match.id));
  const diff = home.rating - away.rating;
  const stageBoost = match.stage === "group" ? 0 : 0.05; // knockouts tighten up

  // Expected goals from ratings, form and a small host/crowd lift.
  const formH = formScore(ctx.homeForm);
  const formA = formScore(ctx.awayForm);
  const hostLift = ctx.homeIsHost ? 0.12 : 0;
  const xgHome = clamp(1.32 + diff * 0.032 + formH * 0.25 + hostLift, 0.35, 3.6);
  const xgAway = clamp(1.24 - diff * 0.028 + formA * 0.22 - stageBoost, 0.3, 3.4);

  // Score matrix via independent Poisson (good enough, very stable).
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  const grid: Array<{ score: string; prob: number }> = [];
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = pois(h, xgHome) * pois(a, xgAway);
      grid.push({ score: `${h}-${a}`, prob: p });
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
    }
  }
  const total = homeWin + draw + awayWin || 1;
  homeWin /= total;
  draw /= total;
  awayWin /= total;

  const scorelineProbabilities = grid
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 6)
    .map((g) => ({ score: g.score, prob: g.prob / total }));
  const [likH, likA] = scorelineProbabilities[0]!.score.split("-").map(Number);

  // Confidence: how separated is the leading outcome from the field.
  const sorted = [homeWin, draw, awayWin].sort((a, b) => b - a);
  const separation = sorted[0]! - sorted[1]!;
  const confidence = Math.round(clamp(38 + separation * 120 + Math.abs(diff) * 0.8, 25, 96));

  const favored = homeWin >= awayWin ? home : away;
  const underdog = favored.id === home.id ? away : home;
  const underdogProb = favored.id === home.id ? awayWin : homeWin;
  const upsetActive = Math.abs(diff) >= 7 && underdogProb >= 0.27;

  // momentum: positive = home edge, negative = away edge (-100..100)
  const momentum = Math.round(clamp((homeWin - awayWin) * 100 + formH * 12 - formA * 12, -100, 100));

  const dangerTeamId = xgHome >= xgAway ? home.id : away.id;

  const insights = buildInsights({
    home, away, diff, xgHome, xgAway, homeWin, awayWin, draw,
    formH, formA, upsetActive, underdog, ctx, rng, stage: match.stage,
  });

  const preview = buildPreview({
    home, away, favored, underdog, homeWin, awayWin, draw,
    likH: likH!, likA: likA!, confidence, upsetActive, rng, stage: match.stage,
  });

  const verdict = buildVerdict(favored, underdog, homeWin, awayWin, draw, likH!, likA!);

  return {
    matchId: match.id,
    homeWinProb: homeWin,
    drawProb: draw,
    awayWinProb: awayWin,
    likelyScoreline: { home: likH!, away: likA! },
    scorelineProbabilities,
    expectedGoals: { home: Math.round(xgHome * 100) / 100, away: Math.round(xgAway * 100) / 100 },
    confidence,
    dangerTeamId,
    upset: {
      active: upsetActive,
      underdogId: upsetActive ? underdog.id : null,
      note: upsetActive
        ? `${underdog.name} are live here — ${Math.round(underdogProb * 100)}% says this is no formality.`
        : "",
    },
    momentum,
    insights,
    qualificationNote: buildQualificationNote(match.stage, favored, underdog),
    tournamentImpact: buildTournamentImpact(match.stage),
    preview,
    verdict,
    generatedAt: new Date().toISOString(),
  };
}

interface InsightArgs {
  home: Team; away: Team; diff: number; xgHome: number; xgAway: number;
  homeWin: number; awayWin: number; draw: number; formH: number; formA: number;
  upsetActive: boolean; underdog: Team; ctx: OracleContext; rng: () => number;
  stage: Match["stage"];
}

function buildInsights(a: InsightArgs): OracleInsight[] {
  const out: OracleInsight[] = [];
  const strongerHome = a.diff >= 0;
  out.push({
    icon: "Gauge",
    label: "Strength rating",
    detail: `${(strongerHome ? a.home : a.away).name} grade ${Math.abs(a.diff) < 2 ? "barely" : "clearly"} higher (${a.home.rating} vs ${a.away.rating}).`,
    weight: clamp(Math.abs(a.diff) / 20, 0.15, 1),
    tone: "neutral",
  });
  out.push({
    icon: "Target",
    label: "Expected goals",
    detail: `Model reads ${a.xgHome.toFixed(2)} xG for ${a.home.code}, ${a.xgAway.toFixed(2)} for ${a.away.code}.`,
    weight: clamp(Math.abs(a.xgHome - a.xgAway) / 2 + 0.3, 0.2, 1),
    tone: "neutral",
  });
  const formGap = a.formH - a.formA;
  out.push({
    icon: "Activity",
    label: "Momentum",
    detail:
      Math.abs(formGap) < 0.15
        ? "Both arrive in similar nick — recent form cancels out."
        : `${(formGap > 0 ? a.home : a.away).name} carry the better recent form into this one.`,
    weight: clamp(Math.abs(formGap) + 0.2, 0.15, 0.9),
    tone: Math.abs(formGap) < 0.15 ? "neutral" : "positive",
  });
  if (a.ctx.homeIsHost) {
    out.push({
      icon: "Home",
      label: "Host factor",
      detail: `${a.home.name} ride a partisan crowd — worth roughly a tenth of a goal.`,
      weight: 0.4,
      tone: "positive",
    });
  }
  if (a.upsetActive) {
    out.push({
      icon: "Zap",
      label: "Upset radar",
      detail: `${a.underdog.name} have the profile to spring it. The Oracle is nervous, and the Oracle is never nervous.`,
      weight: 0.7,
      tone: "warning",
    });
  }
  if (a.stage !== "group") {
    out.push({
      icon: "Swords",
      label: "Knockout effect",
      detail: pickFrom(
        [
          "One game, no second chances — expect a cagier, lower-tempo opening.",
          "Win-or-fly-home football tends to suppress goals early. Patience.",
          "History says knockouts tighten up; the brave still win them.",
        ],
        a.rng
      ),
      weight: 0.45,
      tone: "neutral",
    });
  }
  return out.sort((x, y) => y.weight - x.weight).slice(0, 5);
}

interface PreviewArgs {
  home: Team; away: Team; favored: Team; underdog: Team;
  homeWin: number; awayWin: number; draw: number; likH: number; likA: number;
  confidence: number; upsetActive: boolean; rng: () => number; stage: Match["stage"];
}

function buildPreview(a: PreviewArgs): string {
  const favProb = a.favored.id === a.home.id ? a.homeWin : a.awayWin;
  const openers = [
    `Right, gather round. ${a.home.name} vs ${a.away.name}.`,
    `I've watched both of these more than I've watched my own family. ${a.home.name} vs ${a.away.name}.`,
    `${a.home.name} vs ${a.away.name}. I ran it ten thousand times so you don't have to.`,
  ];
  const calls = a.upsetActive
    ? [
        `On paper it's ${a.favored.name}, but ${a.underdog.name} keep the receipts. I make it ${Math.round(favProb * 100)}% the favourite — not the lock the group chat thinks it is.`,
        `${a.favored.name} are favoured at ${Math.round(favProb * 100)}%, yet my upset radar is blinking. Back ${a.underdog.name} at your peril, fade them at your greater peril.`,
      ]
    : [
        `${a.favored.name} are the call at ${Math.round(favProb * 100)}%, and I'd want a likely ${a.likH}–${a.likA}.`,
        `My number is ${a.favored.name} (${Math.round(favProb * 100)}%) with a scoreline of ${a.likH}–${a.likA}. Draw is live at ${Math.round(a.draw * 100)}% if you fancy chaos.`,
      ];
  const closers = [
    `Confidence ${a.confidence}/100. Now go make a prediction so I can roast it later.`,
    `Confidence ${a.confidence}/100. Screenshot this. I'll be needing it.`,
    `Confidence ${a.confidence}/100. Disagree if you must — you'd be wrong, but you may.`,
  ];
  return `${pickFrom(openers, a.rng)} ${pickFrom(calls, a.rng)} ${pickFrom(closers, a.rng)}`;
}

function buildVerdict(
  favored: Team, underdog: Team, homeWin: number, awayWin: number, draw: number,
  likH: number, likA: number
): string {
  const sep = Math.abs(homeWin - awayWin);
  if (draw > Math.max(homeWin, awayWin)) return `Stalemate vibes — lean draw, ${likH}–${likA}`;
  if (sep < 0.08) return `Coin-flip, slight edge ${favored.code}`;
  if (sep < 0.2) return `Lean ${favored.code} — ${likH}–${likA}`;
  return `${favored.code} to handle it (${likH}–${likA})`;
}

function buildQualificationNote(stage: Match["stage"], favored: Team, underdog: Team): string {
  switch (stage) {
    case "group":
      return `Three points here puts ${favored.name} in commanding shape to top the group; a slip throws the standings wide open.`;
    case "r32":
      return `Win and you're in the last 16. Lose and the World Cup is over — there is no kinder way to say it.`;
    case "r16":
      return `A quarter-final place is the prize. The winner is two games from a semi.`;
    case "qf":
      return `Ninety (or 120) minutes from a World Cup semi-final. This is where tournaments are defined.`;
    case "sf":
      return `The final beckons. Win and you play for everything; lose and you play for third.`;
    case "third":
      return `Nobody dreams of the bronze, but pride and a medal are still on the line.`;
    case "final":
      return `This is it. The whole tournament collapses into one match. Football immortality awaits.`;
    default:
      return "";
  }
}

function buildTournamentImpact(stage: Match["stage"]): string {
  const map: Record<Match["stage"], string> = {
    group: "Shapes the bracket: who you'd meet in the round of 32 hinges on this result.",
    r32: "First knockout — the field halves tonight.",
    r16: "Quarter-final seeding on the line; a marquee tie could be one win away.",
    qf: "A semi-final spot and a likely clash with a heavyweight beckons.",
    sf: "Winner reaches the showpiece in front of the world.",
    third: "Closure for two teams whose run ended one game short of the final.",
    final: "The champion of the world is decided here.",
  };
  return map[stage];
}
