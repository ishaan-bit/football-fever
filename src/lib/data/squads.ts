import type { Team } from "@/types";
import { TEAMS, getTeam } from "./teams";
import { seededRandom, hashSeed, clamp } from "@/lib/utils";
import { REAL_SQUADS, type RealPlayer } from "./real-squads";

/**
 * Deterministic squads for the squad-pick party games.
 *
 * There's no real roster in the dataset (lineups are procedurally generated),
 * so we synthesise a stable 23-player squad per nation seeded from the team id.
 * Same team -> same squad on every render, server or client. The stats are
 * playful "top-trumps" numbers, nudged by the team's Oracle rating — accurate
 * enough to feel real, loose enough to be fun.
 */

export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface PlayerStats {
  pace: number;
  shooting: number;
  passing: number;
  defending: number;
  flair: number;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  /** Shirt number 1–23 */
  number: number;
  position: Position;
  /** 0–99 overall rating */
  overall: number;
  stats: PlayerStats;
  /** A one-word vibe used by the games for flavour */
  trait: string;
  /** The squad's marquee name */
  star: boolean;
}

const FIRST = [
  "Leo", "Kai", "Mateo", "Yusuf", "Diego", "Hugo", "Noah", "Luca", "Omar", "Felix",
  "Marco", "Tariq", "Sami", "Tomas", "Bruno", "Nico", "Adam", "Ravi", "Iker", "Jonas",
  "Karim", "Dario", "Emre", "Sven", "Pedro", "Aron", "Milo", "Ji-ho", "Kenji", "Mo",
  "Andrés", "Viktor", "Said", "Lars", "Theo", "Rafa", "Dani", "Cole", "Enzo", "Gabe",
];

const LAST = [
  "Silva", "Kovač", "Hassan", "Kim", "Tanaka", "García", "Müller", "Okafor", "Hansen",
  "Rossi", "Novak", "Diallo", "Mensah", "Park", "Costa", "Ali", "Sørensen", "Petrov",
  "Yılmaz", "Mendoza", "Traoré", "Nakamura", "Dubois", "Schmidt", "Andersen", "Ferreira",
  "Vidal", "Larsson", "Haddad", "Romero", "Becker", "Conte", "Bauer", "Moreno", "Fofana",
  "Nielsen", "Ortega", "Lindqvist", "Bayo", "Ünal", "Marković", "Castro", "De Boer", "Quint",
];

const TRAITS: Record<Position, string[]> = {
  GK: ["Wall", "Sweeper", "Penalty hero", "Cat-like", "Vocal"],
  DEF: ["Tank", "Ball-player", "No-nonsense", "Overlapper", "Iron lung"],
  MID: ["Maestro", "Engine", "Press monster", "Dead-ball merchant", "Tempo-setter"],
  FWD: ["Poacher", "Speed demon", "Showman", "Target man", "Big-game player"],
};

/** 23-player shape: 3 GK · 8 DEF · 7 MID · 5 FWD. */
const SHAPE: Array<{ pos: Position; count: number }> = [
  { pos: "GK", count: 3 },
  { pos: "DEF", count: 8 },
  { pos: "MID", count: 7 },
  { pos: "FWD", count: 5 },
];

/** Per-position stat weighting so numbers feel position-appropriate. */
const PROFILE: Record<Position, PlayerStats> = {
  GK: { pace: 0.55, shooting: 0.2, passing: 0.6, defending: 0.95, flair: 0.4 },
  DEF: { pace: 0.7, shooting: 0.35, passing: 0.7, defending: 0.95, flair: 0.45 },
  MID: { pace: 0.75, shooting: 0.7, passing: 0.95, defending: 0.7, flair: 0.85 },
  FWD: { pace: 0.9, shooting: 0.95, passing: 0.7, defending: 0.4, flair: 0.9 },
};

function statFor(base: number, weight: number, rng: () => number) {
  // base is the player's centre of mass; weight tilts each attribute; noise adds spice.
  const v = base * weight + (rng() - 0.5) * 18;
  return Math.round(clamp(v, 38, 99));
}

function buildSquad(team: Team): Player[] {
  const rng = seededRandom(hashSeed("squad:" + team.id));
  const teamBase = 55 + (team.rating / 100) * 42; // ~55–97 centre per nation
  const usedFirst = new Set<number>();
  const usedLast = new Set<number>();

  const pick = (arr: string[], used: Set<number>) => {
    let i = Math.floor(rng() * arr.length);
    let guard = 0;
    while (used.has(i) && guard < arr.length) {
      i = (i + 1) % arr.length;
      guard++;
    }
    used.add(i);
    return arr[i]!;
  };

  const players: Player[] = [];
  let n = 0;
  for (const block of SHAPE) {
    for (let k = 0; k < block.count; k++) {
      n++;
      const pos = block.pos;
      // Centre of mass per player: a spread around the nation base.
      const base = clamp(teamBase + (rng() - 0.45) * 22, 40, 99);
      const prof = PROFILE[pos];
      const stats: PlayerStats = {
        pace: statFor(base, prof.pace, rng),
        shooting: statFor(base, prof.shooting, rng),
        passing: statFor(base, prof.passing, rng),
        defending: statFor(base, prof.defending, rng),
        flair: statFor(base, prof.flair, rng),
      };
      const overall = Math.round(
        (stats.pace + stats.shooting + stats.passing + stats.defending + stats.flair) / 5
      );
      const traits = TRAITS[pos];
      players.push({
        id: `${team.id}-p${n}`,
        teamId: team.id,
        name: `${pick(FIRST, usedFirst)} ${pick(LAST, usedLast)}`,
        number: n,
        position: pos,
        overall,
        stats,
        trait: traits[Math.floor(rng() * traits.length)]!,
        star: false,
      });
    }
  }

  // Crown the highest-rated player and hand them the iconic #10.
  let starIdx = 0;
  players.forEach((p, i) => {
    if (p.overall > players[starIdx]!.overall) starIdx = i;
  });
  const star = players[starIdx]!;
  star.star = true;
  const tenIdx = players.findIndex((p) => p.number === 10);
  if (tenIdx >= 0 && tenIdx !== starIdx) {
    const tmp = players[tenIdx]!.number;
    players[tenIdx]!.number = star.number;
    star.number = tmp;
  }

  return players;
}

/** Shirt numbers by position block: keepers 1/12/23, then sequential. */
const GK_NUMBERS = [1, 12, 23];

/** Build a squad from real, researched players — deterministic per team so the
 *  same nation always shows the same numbers/stats. Overall = researched rating;
 *  the five top-trumps sub-stats are spread around it, tilted by position. */
function buildRealSquad(team: Team, real: RealPlayer[]): Player[] {
  const order: Record<Position, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
  const sorted = [...real].sort(
    (a, b) => order[a.position] - order[b.position] || b.rating - a.rating
  );
  let gk = 0;
  let outfield = 1;
  const players: Player[] = sorted.map((p, i) => {
    const rng = seededRandom(hashSeed("rsquad:" + team.id + ":" + p.name));
    const prof = PROFILE[p.position];
    const mk = (w: number) => Math.round(clamp(p.rating + (w - 0.6) * 40 + (rng() - 0.5) * 10, 40, 99));
    const number = p.position === "GK" ? GK_NUMBERS[gk++] ?? 30 + i : ++outfield;
    return {
      id: `${team.id}-p${i + 1}`,
      teamId: team.id,
      name: p.name,
      number,
      position: p.position,
      overall: clamp(p.rating, 40, 99),
      stats: {
        pace: mk(prof.pace),
        shooting: mk(prof.shooting),
        passing: mk(prof.passing),
        defending: mk(prof.defending),
        flair: mk(prof.flair),
      },
      trait: TRAITS[p.position][Math.floor(rng() * TRAITS[p.position].length)]!,
      star: p.star,
    };
  });
  // Ensure exactly one star (highest overall if none/many flagged) with the #10.
  if (!players.some((p) => p.star) && players.length) {
    players.reduce((b, p) => (p.overall > b.overall ? p : b), players[0]!).star = true;
  }
  const star = players.find((p) => p.star);
  if (star && star.number !== 10) {
    const tenIdx = players.findIndex((p) => p.number === 10);
    if (tenIdx >= 0) players[tenIdx]!.number = star.number;
    star.number = 10;
  }
  return players;
}

const CACHE = new Map<string, Player[]>();

/** Stable squad for a team id (real players when available, else procedural). */
export function getSquad(teamId: string): Player[] {
  const cached = CACHE.get(teamId);
  if (cached) return cached;
  const team = getTeam(teamId);
  if (!team) return [];
  const real = REAL_SQUADS[teamId];
  const squad = real && real.length >= 11 ? buildRealSquad(team, real) : buildSquad(team);
  CACHE.set(teamId, squad);
  return squad;
}

export function getPlayer(teamId: string, playerId: string): Player | undefined {
  return getSquad(teamId).find((p) => p.id === playerId);
}

/** The marquee player for a nation. */
export function getStarPlayer(teamId: string): Player | undefined {
  return getSquad(teamId).find((p) => p.star) ?? getSquad(teamId)[0];
}

/** Teams worth picking, strongest first — used to seed the picker grid. */
export function squadTeams(): Team[] {
  return [...TEAMS].sort((a, b) => b.rating - a.rating);
}

export const POSITION_LABEL: Record<Position, string> = {
  GK: "Goalkeepers",
  DEF: "Defenders",
  MID: "Midfielders",
  FWD: "Forwards",
};

export const POSITION_ORDER: Position[] = ["GK", "DEF", "MID", "FWD"];
