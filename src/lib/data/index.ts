import type { Match, MatchStatus, Group, GroupId, GroupStandingRow, MatchEvent } from "@/types";
import { BASE_MATCHES, GROUPS, BRACKET_NODES } from "./fixtures";
import { TEAMS, getTeam, TEAMS_BY_GROUP, GROUP_IDS } from "./teams";
import { VENUES, getVenue } from "./venues";
import { getLiveOverride, liveVersion } from "./live-store";

export * from "./teams";
export * from "./venues";
export { GROUPS, BRACKET_NODES } from "./fixtures";
export * from "./people";

/* ------------------------- Live-status engine ------------------------- */

const FINISHED_AFTER = 110; // minutes after kickoff a match is considered done

interface ClockState {
  status: MatchStatus;
  minute: number | null;
}

export function statusFromClock(kickoff: string, now: number): ClockState {
  const e = (now - new Date(kickoff).getTime()) / 60000;
  if (e < 0) return { status: "scheduled", minute: null };
  if (e < 45) return { status: "live", minute: Math.max(1, Math.ceil(e)) };
  if (e < 60) return { status: "halftime", minute: 45 };
  if (e < 105) return { status: "live", minute: Math.min(90, 46 + Math.floor(e - 60)) };
  if (e < FINISHED_AFTER) return { status: "live", minute: 90 };
  return { status: "finished", minute: null };
}

const isFinished = (kickoff: string, now: number) =>
  statusFromClock(kickoff, now).status === "finished";

function scoreAtMinute(events: MatchEvent[], minute: number) {
  let home = 0;
  let away = 0;
  for (const e of events) {
    if (e.minute > minute) continue;
    if (e.type === "goal" || e.type === "penalty_goal") {
      if (e.team === "home") home++;
      else if (e.team === "away") away++;
    } else if (e.type === "own_goal") {
      if (e.team === "home") away++;
      else home++;
    }
  }
  return { home, away };
}

const nodeById = Object.fromEntries(BRACKET_NODES.map((n) => [n.id, n]));
const baseById = Object.fromEntries(BASE_MATCHES.map((m) => [m.id, m]));

/** Apply the wall clock to a base match: reveal/hide teams, scores, events. */
export function projectMatch(base: Match, now: number): Match {
  const { status, minute } = statusFromClock(base.kickoff, now);

  // Gate knockout team reveal behind feeder completion (a realistic bracket).
  let homeTeamId = base.homeTeamId;
  let awayTeamId = base.awayTeamId;
  if (base.stage !== "group" && base.stage !== "r32") {
    const node = nodeById[base.id];
    if (node?.feeders) {
      const [f1, f2] = node.feeders;
      const known =
        baseById[f1] &&
        baseById[f2] &&
        isFinished(baseById[f1]!.kickoff, now) &&
        isFinished(baseById[f2]!.kickoff, now);
      if (!known) {
        homeTeamId = null;
        awayTeamId = null;
      }
    }
  }

  const hasTeams = Boolean(homeTeamId && awayTeamId);

  if (!hasTeams || status === "scheduled") {
    return {
      ...base,
      homeTeamId,
      awayTeamId,
      status: "scheduled",
      minute: null,
      homeScore: null,
      awayScore: null,
      homePenalties: null,
      awayPenalties: null,
      events: [],
    };
  }

  if (status === "finished") {
    return { ...base, homeTeamId, awayTeamId, status, minute: null };
  }

  // Live / halftime — derive running score + partial timeline.
  const shownMinute = minute ?? 0;
  const { home, away } = scoreAtMinute(base.events, shownMinute);
  const events = base.events.filter(
    (ev) => ev.minute <= shownMinute && ev.type !== "fulltime"
  );
  return {
    ...base,
    homeTeamId,
    awayTeamId,
    status,
    minute,
    homeScore: home,
    awayScore: away,
    homePenalties: null,
    awayPenalties: null,
    events,
  };
}

/* ------------------------------ Accessors ----------------------------- */

const byKickoffAsc = (a: Match, b: Match) =>
  new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();

/**
 * Project a live-feed match through the wall clock so its status is single-
 * sourced (matching StatusPill/useMatchClock which independently derive from
 * the clock). Real API scores/penalties/teams are preserved; only the
 * status/minute and score visibility are driven by `now`. This is what keeps a
 * match from showing "FT" + "Kicking off…" + "Not kicked off" simultaneously.
 */
function projectLiveMatch(m: Match, now: number): Match {
  const { status, minute } = statusFromClock(m.kickoff, now);
  if (status === "scheduled") {
    return { ...m, status, minute: null, homeScore: null, awayScore: null, homePenalties: null, awayPenalties: null, events: [] };
  }
  if (status === "finished") {
    return { ...m, status, minute: null };
  }
  // live / halftime — derive the running score from the parsed goal timeline.
  const shown = minute ?? 0;
  const { home, away } = scoreAtMinute(m.events, shown);
  return {
    ...m,
    status,
    minute,
    homeScore: home,
    awayScore: away,
    homePenalties: null,
    awayPenalties: null,
    events: m.events.filter((e) => e.minute <= shown && e.type !== "fulltime"),
  };
}

// Memoize the projected+sorted live set per (data version, now) so the many
// accessors called within a single render don't each re-map 104 matches.
let projCache: { key: string; val: Match[] } | null = null;

export function getMatches(now: number = Date.now()): Match[] {
  const live = getLiveOverride();
  if (live) {
    const key = `${liveVersion()}|${now}`;
    if (projCache && projCache.key === key) return projCache.val;
    const val = live.map((m) => projectLiveMatch(m, now)).sort(byKickoffAsc);
    projCache = { key, val };
    return val;
  }
  return BASE_MATCHES.map((m) => projectMatch(m, now));
}

export function getMatch(id: string, now: number = Date.now()): Match | undefined {
  const live = getLiveOverride();
  if (live) {
    const m = live.find((x) => x.id === id);
    if (m) return projectLiveMatch(m, now);
  }
  const base = baseById[id];
  return base ? projectMatch(base, now) : undefined;
}

export function getLiveMatches(now: number = Date.now()): Match[] {
  return getMatches(now).filter(
    (m) => m.status === "live" || m.status === "halftime"
  );
}

export function getMatchesOnDate(date: Date, now: number = Date.now()): Match[] {
  return getMatches(now).filter((m) => {
    const d = new Date(m.kickoff);
    return (
      d.getUTCFullYear() === date.getUTCFullYear() &&
      d.getUTCMonth() === date.getUTCMonth() &&
      d.getUTCDate() === date.getUTCDate()
    );
  });
}

/** Upcoming, chronological, and only fixtures whose teams are known (so a
 *  not-yet-determined knockout slot never becomes the "next match" spotlight). */
export function getUpcomingMatches(limit = 6, now: number = Date.now()): Match[] {
  return getMatches(now)
    .filter((m) => m.status === "scheduled" && m.homeTeamId && m.awayTeamId)
    .slice(0, limit);
}

export function getRecentResults(limit = 6, now: number = Date.now()): Match[] {
  return getMatches(now)
    .filter((m) => m.status === "finished")
    .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())
    .slice(0, limit);
}

/**
 * The single match to spotlight: a live one if any, otherwise the next
 * determined scheduled kickoff. The whole home page orbits this.
 */
export function getFeaturedMatch(now: number = Date.now()): Match | undefined {
  const live = getLiveMatches(now);
  if (live.length) {
    return [...live].sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0))[0];
  }
  return getUpcomingMatches(1, now)[0] ?? getRecentResults(1, now)[0];
}

export function getMatchesByStage(stage: Match["stage"], now: number = Date.now()): Match[] {
  return getMatches(now).filter((m) => m.stage === stage);
}

export function getGroupMatches(group: GroupId, now: number = Date.now()): Match[] {
  return getMatches(now).filter((m) => m.group === group);
}

/** Recompute group standings from a match set (used with live data so the
 *  Groups tab agrees with the live scores). Mirrors the seed's tiebreakers. */
function computeStandings(matches: Match[]): Group[] {
  const rows: Record<string, GroupStandingRow> = {};
  for (const g of GROUP_IDS) {
    for (const t of TEAMS_BY_GROUP[g]) {
      rows[t.id] = {
        teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0,
        gf: 0, ga: 0, gd: 0, points: 0, form: [], rank: 0, qualified: "pending",
      };
    }
  }
  const played = matches
    .filter(
      (m) =>
        m.stage === "group" && m.group && m.homeTeamId && m.awayTeamId &&
        m.homeScore != null && m.awayScore != null &&
        (m.status === "finished" || m.status === "live")
    )
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

  for (const m of played) {
    const H = rows[m.homeTeamId!];
    const A = rows[m.awayTeamId!];
    if (!H || !A) continue;
    const hs = m.homeScore!;
    const as = m.awayScore!;
    H.played++; A.played++;
    H.gf += hs; H.ga += as; A.gf += as; A.ga += hs;
    if (hs > as) { H.won++; H.points += 3; H.form.push("W"); A.lost++; A.form.push("L"); }
    else if (hs < as) { A.won++; A.points += 3; A.form.push("W"); H.lost++; H.form.push("L"); }
    else { H.drawn++; A.drawn++; H.points++; A.points++; H.form.push("D"); A.form.push("D"); }
  }

  return GROUP_IDS.map((g) => {
    const standings = TEAMS_BY_GROUP[g]
      .map((t) => rows[t.id]!)
      .sort(
        (x, y) =>
          y.points - x.points ||
          (y.gf - y.ga) - (x.gf - x.ga) ||
          y.gf - x.gf ||
          x.teamId.localeCompare(y.teamId)
      );
    standings.forEach((row, i) => {
      row.gd = row.gf - row.ga;
      row.rank = i + 1;
      row.qualified = i < 2 ? "advanced" : i === 2 ? "playoff" : "eliminated";
    });
    return { id: g, teamIds: TEAMS_BY_GROUP[g].map((t) => t.id), standings };
  });
}

let standingsCache: { key: Match[]; groups: Group[] } | null = null;

export function getStandings(): Group[] {
  const live = getLiveOverride();
  if (!live) return GROUPS;
  if (standingsCache && standingsCache.key === live) return standingsCache.groups;
  const groups = computeStandings(live);
  standingsCache = { key: live, groups };
  return groups;
}

export function getGroup(id: GroupId): Group | undefined {
  return getStandings().find((g) => g.id === id);
}

/** Bracket rounds projected to `now` for the knockout tree view. */
export function getBracket(now: number = Date.now()) {
  const stages: Match["stage"][] = ["r32", "r16", "qf", "sf", "final"];
  return stages.map((stage) => ({
    stage,
    matches: getMatchesByStage(stage, now),
  }));
}

export function getThirdPlaceMatch(now: number = Date.now()): Match | undefined {
  return getMatches(now).find((m) => m.stage === "third");
}

export const ALL_TEAMS = TEAMS;
export const ALL_VENUES = VENUES;
export { getTeam, getVenue };
