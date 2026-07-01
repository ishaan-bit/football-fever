import { statusFromClock } from "@/lib/data";
import { getTeam } from "@/lib/data/teams";
import type { Match } from "@/types";

/**
 * Pure, side-effect-free alert derivation, shared by the server scan and the
 * client-side Firestore scan. Given the fixtures and "now", it returns the
 * alerts that are currently due — pre-match (within an hour of kickoff) and
 * full-time results (just finished, with score). Deterministic ids let either
 * caller de-dupe.
 */

/** Pre-match ping fires once a game is within this window of kickoff. */
const PREMATCH_WINDOW_MS = 60 * 60 * 1000;
/** Result only for a game that *just* finished (measured from kickoff). */
const RESULT_MAX_AGE_MS = 4 * 60 * 60 * 1000;

export interface DueAlert {
  id: string;
  type: "prematch" | "result";
  kind: "kickoff" | "fulltime";
  title: string;
  body: string;
  matchId: string;
  href: string;
  accent: string;
}

export function computeDueAlerts(matches: Match[], now: number): DueAlert[] {
  const due: DueAlert[] = [];

  for (const m of matches) {
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const koMs = Date.parse(m.kickoff);
    if (Number.isNaN(koMs)) continue;

    const home = getTeam(m.homeTeamId);
    const away = getTeam(m.awayTeamId);
    const untilKo = koMs - now;

    if (untilKo > 0 && untilKo <= PREMATCH_WINDOW_MS) {
      const mins = Math.max(1, Math.round(untilKo / 60_000));
      due.push({
        id: `pre:${m.id}`,
        type: "prematch",
        kind: "kickoff",
        title: `Kicks off in ${mins} min`,
        body: `${home?.name ?? "Home"} vs ${away?.name ?? "Away"} is about to start — lock your predictions and get in the room.`,
        matchId: m.id,
        href: `/match/${m.id}`,
        accent: "var(--gold)",
      });
    }

    const finished = statusFromClock(m.kickoff, now).status === "finished";
    if (finished && now - koMs <= RESULT_MAX_AGE_MS && m.homeScore != null && m.awayScore != null) {
      const line = `${home?.code ?? "HOM"} ${m.homeScore}–${m.awayScore} ${away?.code ?? "AWY"}`;
      due.push({
        id: `res:${m.id}`,
        type: "result",
        kind: "fulltime",
        title: `Full time — ${line}`,
        body: `${home?.name ?? "Home"} ${m.homeScore}–${m.awayScore} ${away?.name ?? "Away"}. See how the room's predictions held up.`,
        matchId: m.id,
        href: `/match/${m.id}`,
        accent: "var(--pitch)",
      });
    }
  }

  return due;
}
