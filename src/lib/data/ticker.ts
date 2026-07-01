import type { Match } from "@/types";
import {
  getLiveMatches,
  getRecentResults,
  getUpcomingMatches,
  getTeam,
} from "@/lib/data";
import { formatInTz, relativeTime } from "@/lib/utils";

/**
 * The always-on bottom crawl. A live sports ticker (scores, goals, kick-offs)
 * spliced with a running peace feed — this app is a satire that insists the
 * only place rival nations should ever meet is the pitch. Wars are never good.
 */

export type TickerKind = "live" | "goal" | "result" | "upcoming" | "peace";

export interface TickerItem {
  id: string;
  kind: TickerKind;
  /** Short tag rendered in the accent colour, e.g. "LIVE", "GOAL", "PEACE". */
  tag: string;
  text: string;
  /** HSL token for the accent (see globals tokens). */
  accent: string;
  pulse?: boolean;
}

/** The peace feed — satire aimed at the absurdity of war, never its victims. */
export const PEACE_LINES: string[] = [
  "Settle it on the pitch, not the battlefield.",
  "Make goals, not war. 🕊️",
  "The only strikes we want are on target.",
  "Trade sanctions for substitutions.",
  "No flag is worth a life — play football.",
  "The only red cards should come from referees.",
  "Rivalries belong in the group stage.",
  "90 minutes, one ball, zero missiles.",
  "Ceasefire is the real home advantage.",
  "Más fútbol, menos guerra. ☮️",
  "Borders close. Stadiums open. Be a stadium.",
  "Drop the rhetoric, not the bombs — drop a shoulder instead.",
];

const code = (id: string | null) => getTeam(id ?? "")?.code ?? "TBD";

function scoreLine(m: Match) {
  return `${code(m.homeTeamId)} ${m.homeScore ?? 0}–${m.awayScore ?? 0} ${code(m.awayTeamId)}`;
}

function lastGoal(m: Match) {
  const goals = m.events.filter(
    (e) => e.type === "goal" || e.type === "penalty_goal" || e.type === "own_goal"
  );
  return goals[goals.length - 1];
}

/** Build the crawl for a given wall-clock time. SSR-stable when now === 0. */
export function getTickerItems(now: number): TickerItem[] {
  const live = getLiveMatches(now);
  const results = getRecentResults(4, now);
  const upcoming = getUpcomingMatches(4, now);

  const items: TickerItem[] = [];

  // Live scores + the freshest goal in each live game.
  for (const m of live) {
    const min = m.status === "halftime" ? "HT" : `${m.minute ?? 0}'`;
    items.push({
      id: `live-${m.id}`,
      kind: "live",
      tag: "LIVE",
      accent: "var(--live)",
      pulse: true,
      text: `${min} · ${scoreLine(m)}`,
    });
    const g = lastGoal(m);
    if (g?.player) {
      items.push({
        id: `goal-${m.id}-${g.id}`,
        kind: "goal",
        tag: "GOAL",
        accent: "var(--pitch)",
        text: `${g.player} ${g.minute}'${g.type === "own_goal" ? " (OG)" : ""} — ${scoreLine(m)}`,
      });
    }
  }

  // Final results.
  for (const m of results) {
    items.push({
      id: `ft-${m.id}`,
      kind: "result",
      tag: "FT",
      accent: "var(--electric)",
      text: scoreLine(m),
    });
  }

  // Next kick-offs.
  for (const m of upcoming) {
    const ko = now > 0 ? formatInTz(m.kickoff, "Asia/Kolkata", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
    const when = now > 0 ? relativeTime(m.kickoff, now) : "soon";
    items.push({
      id: `ko-${m.id}`,
      kind: "upcoming",
      tag: "NEXT",
      accent: "var(--gold)",
      text: `${code(m.homeTeamId)} vs ${code(m.awayTeamId)} · ${ko ? `${ko} IST · ` : ""}${when}`,
    });
  }

  // Splice in the peace feed so it threads through the scores (every ~3 items).
  const peace: TickerItem[] = PEACE_LINES.map((text, i) => ({
    id: `peace-${i}`,
    kind: "peace" as const,
    tag: "PEACE",
    accent: "var(--brand-violet)",
    text,
  }));

  const woven: TickerItem[] = [];
  let p = 0;
  items.forEach((it, i) => {
    woven.push(it);
    if ((i + 1) % 3 === 0 && p < peace.length) {
      woven.push(peace[p++]!);
    }
  });
  // If there were few/no matches, make sure the peace feed still carries the crawl.
  while (p < peace.length && woven.length < 10) woven.push(peace[p++]!);

  return woven.length ? woven : peace;
}
