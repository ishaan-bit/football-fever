import type { Match, MatchEvent, MatchStage, Team, Venue, Host, GroupId } from "@/types";
import { REAL_ID_TO_TEAM } from "@/lib/data/teams";

/** Raw shapes as returned by https://worldcup26.ir (everything is a string). */
export interface RawTeam {
  id: string;
  name_en: string;
  name_fa?: string;
  fifa_code: string;
  groups: string;
  flag: string;
}

export interface RawStadium {
  id: string;
  name_en: string;
  name_fa?: string;
  fifa_name?: string;
  city_en: string;
  country_en: string;
  capacity: number | string;
}

export interface RawGame {
  _id?: string;
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score?: string;
  away_score?: string;
  home_scorers?: string;
  away_scorers?: string;
  group?: string;
  matchday?: string;
  local_date?: string;
  stadium_id: string;
  finished?: string;
  time_elapsed?: string;
  type?: string;
  home_team_label?: string;
  away_team_label?: string;
  home_penalty_score?: string;
  away_penalty_score?: string;
}

const num = (v: string | number | undefined | null): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const STAGE_MAP: Record<string, MatchStage> = {
  group: "group",
  r32: "r32",
  r16: "r16",
  qf: "qf",
  sf: "sf",
  third: "third",
  final: "final",
};

const COUNTRY_MAP: Record<string, Host> = {
  USA: "USA",
  "United States": "USA",
  Mexico: "Mexico",
  Canada: "Canada",
};

export function normalizeTeam(raw: RawTeam): Team {
  return {
    id: raw.id,
    name: raw.name_en,
    nameLocal: raw.name_fa,
    code: raw.fifa_code,
    group: (raw.groups?.trim().toUpperCase() || "A") as GroupId,
    flag: raw.flag,
    colors: { primary: "#1f2a44", secondary: "#ffffff" },
    confederation: "UEFA",
    fifaRank: 0,
    rating: 75,
  };
}

export function normalizeStadium(raw: RawStadium): Venue {
  return {
    id: raw.id,
    name: raw.name_en,
    fifaName: raw.fifa_name,
    city: raw.city_en,
    country: COUNTRY_MAP[raw.country_en] ?? "USA",
    capacity: typeof raw.capacity === "string" ? Number(raw.capacity) || 0 : raw.capacity,
    timezone: "America/New_York",
    image: "",
  };
}

/** Parse the API's "MM/DD/YYYY HH:MM" local string to an ISO string. */
export function parseLocalDate(s: string | undefined): string {
  if (!s) return new Date().toISOString();
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const [, mm, dd, yyyy, hh, min] = m;
  // Dataset times are venue-local (US Eastern, UTC-4 in Jun/Jul). Shift to UTC
  // so downstream display/relative-time math is correct (mirrors data/fixtures).
  return new Date(
    Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh) + 4, Number(min))
  ).toISOString();
}

/** Map the API's numeric team id to our team id ("15" -> "aus"). "0" (or
 *  empty) means the knockout slot is not yet determined -> null. */
const mapTeamId = (raw: string | undefined): string | null => {
  if (!raw || raw === "0") return null;
  return REAL_ID_TO_TEAM[raw] ?? null;
};

/** Parse the API's scorers string ("{\"Messi 27'\",\"Álvarez 90+2' (pen.)\"}")
 *  into goal events. Best-effort and defensive: the displayed score always
 *  comes from home_score/away_score, so a parse miss only thins the timeline. */
function parseScorers(rawStr: string | undefined, team: "home" | "away", startId: number): MatchEvent[] {
  if (!rawStr || rawStr === "null" || rawStr === "{}") return [];
  const inner = rawStr.replace(/^\{/, "").replace(/\}$/, "");
  const quoted = inner.match(/"([^"]*)"/g)?.map((s) => s.slice(1, -1));
  const segs = (quoted && quoted.length ? quoted : inner.split(",")).map((s) => s.trim()).filter(Boolean);
  const events: MatchEvent[] = [];
  let i = startId;
  for (const seg of segs) {
    const min = seg.match(/(\d{1,3})(?:\+(\d{1,2}))?\s*'/);
    const isPen = /\(?\bpen\b\.?\)?/i.test(seg);
    const isOg = /\(?\bo\.?g\b\.?\)?/i.test(seg);
    const player = seg
      .replace(/\d{1,3}(?:\+\d{1,2})?\s*'.*$/, "")
      .replace(/\((?:pen|o\.?g)\.?\)/i, "")
      .trim();
    events.push({
      id: `l-${team}-${i++}`,
      minute: min ? Number(min[1]) : 0,
      plus: min && min[2] ? Number(min[2]) : undefined,
      type: isOg ? "own_goal" : isPen ? "penalty_goal" : "goal",
      team,
      player: player || undefined,
      detail: isPen ? "Penalty" : isOg ? "Own goal" : undefined,
    });
  }
  return events;
}

export function normalizeGame(raw: RawGame): Match {
  const finished = String(raw.finished).toUpperCase() === "TRUE";
  const elapsedRaw = String(raw.time_elapsed ?? "").toLowerCase();
  const elapsed = num(raw.time_elapsed);
  const status: Match["status"] = finished
    ? "finished"
    : elapsedRaw === "live" || elapsedRaw === "halftime" || (elapsed && elapsed > 0)
      ? "live"
      : "scheduled";

  const events: MatchEvent[] =
    status === "scheduled"
      ? []
      : [
          { id: "l-kickoff", minute: 0, type: "kickoff", team: "neutral" } as MatchEvent,
          ...parseScorers(raw.home_scorers, "home", 0),
          ...parseScorers(raw.away_scorers, "away", 0),
        ].sort((a, b) => a.minute + (a.plus ?? 0) / 100 - (b.minute + (b.plus ?? 0) / 100));
  if (finished) events.push({ id: "l-ft", minute: 90, type: "fulltime", team: "neutral" });

  return {
    id: raw.id,
    stage: STAGE_MAP[raw.type ?? "group"] ?? "group",
    group: raw.group ? (raw.group.toUpperCase() as GroupId) : undefined,
    matchday: num(raw.matchday) ?? undefined,
    homeTeamId: mapTeamId(raw.home_team_id),
    awayTeamId: mapTeamId(raw.away_team_id),
    // Scheduled matches must not leak a phantom 0-0 (the feed sends "0"/"0").
    homeScore: status === "scheduled" ? null : num(raw.home_score),
    awayScore: status === "scheduled" ? null : num(raw.away_score),
    homePenalties: status === "scheduled" ? null : num(raw.home_penalty_score),
    awayPenalties: status === "scheduled" ? null : num(raw.away_penalty_score),
    kickoff: parseLocalDate(raw.local_date),
    venueId: raw.stadium_id,
    status,
    minute: status === "live" && elapsed ? elapsed : null,
    events,
  };
}
