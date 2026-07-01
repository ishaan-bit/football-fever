import type {
  Match,
  MatchEvent,
  MatchStage,
  GroupId,
  Group,
  GroupStandingRow,
} from "@/types";
import { seededRandom, hashSeed } from "@/lib/utils";
import { GROUP_IDS, TEAMS_BY_GROUP, TEAMS_BY_ID, REAL_ID_TO_TEAM } from "./teams";
import rawMatches from "./raw/matches.json";

/* ------------------------------------------------------------------ *
 *  Real fixtures, simulated results.
 *  The schedule, draw, venues and bracket structure come verbatim from
 *  the worldcup2026 dataset. Results are produced by a deterministic
 *  simulator so the tournament feels alive without the live API, and the
 *  knockout bracket is resolved from the dataset's own slot labels
 *  ("Winner Group I", "Winner Match 74", "Loser Match 101"...).
 * ------------------------------------------------------------------ */

interface RawMatch {
  id: string;
  home_team_id: string;
  away_team_id: string;
  group?: string;
  matchday?: string;
  local_date?: string;
  stadium_id: string;
  type?: string;
  home_team_label?: string;
  away_team_label?: string;
}

const STAGE_MAP: Record<string, MatchStage> = {
  group: "group", r32: "r32", r16: "r16", qf: "qf", sf: "sf", third: "third", final: "final",
};

/** Dataset kickoff times are venue-local (North America). Treat as US Eastern
 *  (EDT, UTC-4 in June/July) so IST conversion lands in a sensible window. */
function parseKickoff(s?: string): string {
  if (!s) return new Date(Date.UTC(2026, 5, 11, 16, 0)).toISOString();
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return new Date(Date.UTC(2026, 5, 11, 16, 0)).toISOString();
  const [, mm, dd, yyyy, hh, min] = m;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh) + 4, Number(min))).toISOString();
}

/* ----------------------------- Scorers ------------------------------ */

const STAR_NAMES: Record<string, string[]> = {
  arg: ["Messi", "J. Álvarez", "L. Martínez", "Mac Allister", "Almada"],
  fra: ["Mbappé", "Dembélé", "Thuram", "Olise", "Barcola"],
  esp: ["Lamine Yamal", "N. Williams", "Olmo", "Merino", "Oyarzabal"],
  eng: ["Kane", "Bellingham", "Saka", "Foden", "Palmer"],
  bra: ["Vinícius Jr", "Rodrygo", "Raphinha", "Endrick", "Paquetá"],
  por: ["Ronaldo", "B. Fernandes", "Leão", "Félix", "R. Neves"],
  ned: ["Gakpo", "Depay", "Simons", "Reijnders"],
  ger: ["Wirtz", "Musiala", "Havertz", "Füllkrug"],
  bel: ["Lukaku", "De Bruyne", "Doku", "Trossard"],
  cro: ["Modrić", "Kramarić", "Budimir"],
  uru: ["Núñez", "Pellistri", "De Arrascaeta"],
  mar: ["Hakimi", "En-Nesyri", "Ziyech", "Amrabat"],
  nor: ["Haaland", "Ødegaard", "Sørloth", "Nusa"],
  col: ["J. Rodríguez", "L. Díaz", "Borré"],
  sen: ["Mané", "Sarr", "Dia"],
  jpn: ["Mitoma", "Kubo", "Kamada"],
};

const GENERIC_NAMES = [
  "Silva", "Santos", "Hassan", "Kim", "Tanaka", "García", "Müller", "Okafor",
  "Hansen", "Rossi", "Novak", "Diallo", "Mensah", "Park", "Costa", "Ali",
  "Sørensen", "Petrov", "Yilmaz", "Mendoza", "Traoré", "Nakamura", "Dubois",
];

function scorerFor(teamId: string, rng: () => number): string {
  const stars = STAR_NAMES[teamId];
  if (stars && rng() < 0.7) return stars[Math.floor(rng() * stars.length)]!;
  return GENERIC_NAMES[Math.floor(rng() * GENERIC_NAMES.length)]!;
}

function poisson(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L && k < 12);
  return k - 1;
}

interface SimResult {
  home: number;
  away: number;
  homePens: number | null;
  awayPens: number | null;
}

function simulate(homeId: string, awayId: string, seedKey: string, allowDraw: boolean): SimResult {
  const a = TEAMS_BY_ID[homeId]?.rating ?? 72;
  const b = TEAMS_BY_ID[awayId]?.rating ?? 72;
  const rng = seededRandom(hashSeed(seedKey));
  const diff = a - b;
  const lhome = Math.min(4.2, Math.max(0.25, 1.35 + diff * 0.035 + 0.18));
  const laway = Math.min(4.2, Math.max(0.2, 1.3 - diff * 0.03));
  let home = poisson(lhome, rng);
  let away = poisson(laway, rng);
  let homePens: number | null = null;
  let awayPens: number | null = null;
  if (!allowDraw && home === away) {
    if (rng() < 0.35) {
      if (rng() < 0.5) home++;
      else away++;
    } else {
      homePens = 3 + Math.floor(rng() * 3);
      awayPens = 3 + Math.floor(rng() * 3);
      if (homePens === awayPens) {
        if (rng() < 0.5) homePens++;
        else awayPens++;
      }
    }
  }
  return { home, away, homePens, awayPens };
}

function buildEvents(homeId: string, awayId: string, hs: number, as: number, seedKey: string): MatchEvent[] {
  const rng = seededRandom(hashSeed(seedKey + ":events"));
  const events: MatchEvent[] = [];
  const goals: Array<{ team: "home" | "away"; minute: number }> = [];
  for (let i = 0; i < hs; i++) goals.push({ team: "home", minute: 1 + Math.floor(rng() * 90) });
  for (let i = 0; i < as; i++) goals.push({ team: "away", minute: 1 + Math.floor(rng() * 90) });
  goals.sort((a, b) => a.minute - b.minute);

  let id = 0;
  events.push({ id: `e${id++}`, minute: 0, type: "kickoff", team: "neutral" });
  for (const g of goals) {
    const teamId = g.team === "home" ? homeId : awayId;
    const penalty = rng() < 0.14;
    events.push({
      id: `e${id++}`,
      minute: g.minute,
      type: penalty ? "penalty_goal" : "goal",
      team: g.team,
      player: scorerFor(teamId, rng),
      assist: !penalty && rng() < 0.6 ? scorerFor(teamId, rng) : undefined,
      detail: penalty ? "Penalty" : undefined,
    });
  }
  const cards = Math.floor(rng() * 4);
  for (let i = 0; i < cards; i++) {
    const team = rng() < 0.5 ? "home" : "away";
    events.push({
      id: `e${id++}`,
      minute: 10 + Math.floor(rng() * 80),
      type: "yellow",
      team,
      player: scorerFor(team === "home" ? homeId : awayId, rng),
    });
  }
  if (rng() < 0.25) {
    events.push({
      id: `e${id++}`,
      minute: 20 + Math.floor(rng() * 65),
      type: "var",
      team: "neutral",
      detail: rng() < 0.5 ? "Goal check — confirmed" : "Penalty review",
    });
  }
  events.push({ id: `e${id++}`, minute: 45, type: "halftime", team: "neutral" });
  events.push({ id: `e${id++}`, minute: 90, type: "fulltime", team: "neutral" });
  return events.sort((a, b) => a.minute - b.minute || (a.type === "kickoff" ? -1 : 0));
}

/* ------------------------------ Assemble ---------------------------- */

interface KnockoutNode {
  id: string;
  stage: MatchStage;
  feeders?: [string, string];
}

const RAW = (rawMatches as unknown as RawMatch[]).slice();
const groupRaws = RAW.filter((r) => (r.type ?? "group") === "group");
const koRaws = RAW.filter((r) => (r.type ?? "group") !== "group").sort((a, b) => Number(a.id) - Number(b.id));

const tid = (realId: string) => REAL_ID_TO_TEAM[realId] ?? null;

const builtMatches: Match[] = [];
const tally: Record<GroupId, Record<string, GroupStandingRow>> = {} as any;

for (const g of GROUP_IDS) {
  tally[g] = {};
  for (const t of TEAMS_BY_GROUP[g]) {
    tally[g][t.id] = {
      teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, gd: 0, points: 0, form: [], rank: 0, qualified: "pending",
    };
  }
}

// 1) Group stage — simulate every real fixture, update standings.
for (const r of groupRaws) {
  const home = tid(r.home_team_id);
  const away = tid(r.away_team_id);
  const group = (r.group?.toUpperCase() as GroupId) ?? "A";
  if (!home || !away) continue;
  const seedKey = `g:${r.id}`;
  const res = simulate(home, away, seedKey, true);
  builtMatches.push({
    id: r.id,
    stage: "group",
    group,
    matchday: r.matchday ? Number(r.matchday) : undefined,
    homeTeamId: home,
    awayTeamId: away,
    homeScore: res.home,
    awayScore: res.away,
    homePenalties: null,
    awayPenalties: null,
    kickoff: parseKickoff(r.local_date),
    venueId: r.stadium_id,
    status: "finished",
    minute: null,
    events: buildEvents(home, away, res.home, res.away, seedKey),
  });

  const H = tally[group][home];
  const A = tally[group][away];
  if (H && A) {
    H.played++; A.played++;
    H.gf += res.home; H.ga += res.away; A.gf += res.away; A.ga += res.home;
    if (res.home > res.away) { H.won++; H.points += 3; H.form.push("W"); A.lost++; A.form.push("L"); }
    else if (res.home < res.away) { A.won++; A.points += 3; A.form.push("W"); H.lost++; H.form.push("L"); }
    else { H.drawn++; A.drawn++; H.points++; A.points++; H.form.push("D"); A.form.push("D"); }
  }
}

// 2) Finalize standings.
const GROUPS: Group[] = GROUP_IDS.map((g) => {
  const standings = Object.values(tally[g]).sort(
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

const groupById: Record<string, Group> = Object.fromEntries(GROUPS.map((g) => [g.id, g]));
const winnerOf = (g: string) => groupById[g]?.standings[0]?.teamId ?? null;
const runnerOf = (g: string) => groupById[g]?.standings[1]?.teamId ?? null;

// 8 best third-placed teams, in ranked order, for the "3rd ..." slots.
const thirdsQueue = GROUPS.map((g) => g.standings[2]!)
  .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.teamId.localeCompare(b.teamId))
  .slice(0, 8)
  .map((r) => {
    r.qualified = "advanced";
    return r.teamId;
  });

// 3) Knockouts — resolve slots from labels, simulate, chain winners/losers.
const koResult: Record<string, { winnerId: string | null; loserId: string | null }> = {};
const bracketNodes: KnockoutNode[] = [];

function resolveLabel(label?: string): string | null {
  if (!label) return null;
  let m: RegExpMatchArray | null;
  if ((m = label.match(/Winner Group ([A-L])/i))) return winnerOf(m[1]!.toUpperCase());
  if ((m = label.match(/Runner-?up Group ([A-L])/i))) return runnerOf(m[1]!.toUpperCase());
  if (/3rd Group/i.test(label)) return thirdsQueue.shift() ?? null;
  if ((m = label.match(/Winner Match (\d+)/i))) return koResult[m[1]!]?.winnerId ?? null;
  if ((m = label.match(/Loser Match (\d+)/i))) return koResult[m[1]!]?.loserId ?? null;
  return null;
}

function feedersOf(a?: string, b?: string): [string, string] | undefined {
  const ma = a?.match(/Match (\d+)/i);
  const mb = b?.match(/Match (\d+)/i);
  if (ma && mb) return [ma[1]!, mb[1]!];
  return undefined;
}

for (const r of koRaws) {
  const stage = STAGE_MAP[r.type ?? "group"] ?? "r32";
  const home = r.home_team_id !== "0" ? tid(r.home_team_id) : resolveLabel(r.home_team_label);
  const away = r.away_team_id !== "0" ? tid(r.away_team_id) : resolveLabel(r.away_team_label);
  const feeders = feedersOf(r.home_team_label, r.away_team_label);
  bracketNodes.push({ id: r.id, stage, feeders });

  const base: Match = {
    id: r.id,
    stage,
    homeTeamId: home,
    awayTeamId: away,
    homeLabel: r.home_team_label,
    awayLabel: r.away_team_label,
    homeScore: null,
    awayScore: null,
    homePenalties: null,
    awayPenalties: null,
    kickoff: parseKickoff(r.local_date),
    venueId: r.stadium_id,
    status: "scheduled",
    minute: null,
    events: [],
  };

  if (home && away) {
    const seedKey = `ko:${r.id}`;
    const res = simulate(home, away, seedKey, false);
    base.homeScore = res.home;
    base.awayScore = res.away;
    base.homePenalties = res.homePens;
    base.awayPenalties = res.awayPens;
    base.status = "finished";
    base.events = buildEvents(home, away, res.home, res.away, seedKey);
    let winnerId: string;
    if (res.home > res.away) winnerId = home;
    else if (res.away > res.home) winnerId = away;
    else winnerId = (res.homePens ?? 0) > (res.awayPens ?? 0) ? home : away;
    koResult[r.id] = { winnerId, loserId: winnerId === home ? away : home };
  } else {
    koResult[r.id] = { winnerId: null, loserId: null };
  }

  builtMatches.push(base);
}

/** Base matches — deterministic, clock-independent. Live status is applied at
 *  read-time by `lib/data`. */
export const BASE_MATCHES: Match[] = builtMatches.sort(
  (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
);

export { GROUPS };
export const BRACKET_NODES = bracketNodes;

export const PROJECTED_WINNER: string | null = (() => {
  const final = builtMatches.find((m) => m.stage === "final");
  if (!final || final.homeScore === null) return null;
  return (final.homeScore ?? 0) >= (final.awayScore ?? 0) ? final.homeTeamId : final.awayTeamId;
})();
