import type { Team, Confederation, GroupId } from "@/types";
import rawTeams from "./raw/teams.json";

/**
 * Teams are sourced from the official worldcup2026 dataset (real 48-team draw).
 * We attach a strength rating + brand colors + nickname per FIFA code for the
 * Oracle model and the UI. Team ids are the lowercased FIFA code (e.g. "nor").
 */

interface RawTeam {
  name_en: string;
  name_fa: string;
  flag: string;
  fifa_code: string;
  iso2: string;
  groups: string;
  id: string;
}

interface Meta {
  r: number;
  c: Confederation;
  p: string;
  s: string;
  n: string;
}

const META: Record<string, Meta> = {
  MEX: { r: 79, c: "CONCACAF", p: "#006847", s: "#ce1126", n: "El Tri" },
  RSA: { r: 70, c: "CAF", p: "#007a4d", s: "#fcb514", n: "Bafana Bafana" },
  KOR: { r: 76, c: "AFC", p: "#c60c30", s: "#003478", n: "Taegeuk Warriors" },
  CZE: { r: 76, c: "UEFA", p: "#11457e", s: "#d7141a", n: "Národní tým" },
  CAN: { r: 75, c: "CONCACAF", p: "#c8102e", s: "#ffffff", n: "Les Rouges" },
  BIH: { r: 72, c: "UEFA", p: "#10428d", s: "#fcd116", n: "Zmajevi" },
  QAT: { r: 68, c: "AFC", p: "#8a1538", s: "#ffffff", n: "The Maroon" },
  SUI: { r: 79, c: "UEFA", p: "#d52b1e", s: "#ffffff", n: "La Nati" },
  BRA: { r: 90, c: "CONMEBOL", p: "#ffdf00", s: "#009c3b", n: "A Seleção" },
  MAR: { r: 81, c: "CAF", p: "#c1272d", s: "#006233", n: "Atlas Lions" },
  HAI: { r: 60, c: "CONCACAF", p: "#00209f", s: "#d21034", n: "Les Grenadiers" },
  SCO: { r: 73, c: "UEFA", p: "#0065bf", s: "#ffffff", n: "The Tartan Army" },
  USA: { r: 78, c: "CONCACAF", p: "#1c2b6b", s: "#bf2a3b", n: "The Stars & Stripes" },
  PAR: { r: 70, c: "CONMEBOL", p: "#d52b1e", s: "#0038a8", n: "La Albirroja" },
  AUS: { r: 72, c: "AFC", p: "#ffd100", s: "#00843d", n: "The Socceroos" },
  TUR: { r: 76, c: "UEFA", p: "#e30a17", s: "#ffffff", n: "The Crescent-Stars" },
  GER: { r: 86, c: "UEFA", p: "#111111", s: "#dd0000", n: "Die Mannschaft" },
  CUW: { r: 58, c: "CONCACAF", p: "#002b7f", s: "#fcd116", n: "Famia Kòrsou" },
  CIV: { r: 74, c: "CAF", p: "#f77f00", s: "#009e60", n: "Les Éléphants" },
  ECU: { r: 75, c: "CONMEBOL", p: "#ffd100", s: "#0033a0", n: "La Tri" },
  NED: { r: 87, c: "UEFA", p: "#f36c21", s: "#21468b", n: "Oranje" },
  JPN: { r: 79, c: "AFC", p: "#0b1f4e", s: "#e60012", n: "Samurai Blue" },
  SWE: { r: 74, c: "UEFA", p: "#fecc02", s: "#005293", n: "Blågult" },
  TUN: { r: 71, c: "CAF", p: "#e70013", s: "#ffffff", n: "Eagles of Carthage" },
  BEL: { r: 84, c: "UEFA", p: "#e30613", s: "#fdda24", n: "The Red Devils" },
  EGY: { r: 74, c: "CAF", p: "#c8102e", s: "#111111", n: "The Pharaohs" },
  IRN: { r: 73, c: "AFC", p: "#239f40", s: "#da0000", n: "Team Melli" },
  NZL: { r: 62, c: "OFC", p: "#cdcdcd", s: "#111111", n: "All Whites" },
  ESP: { r: 91, c: "UEFA", p: "#c60b1e", s: "#ffc400", n: "La Roja" },
  CPV: { r: 63, c: "CAF", p: "#003893", s: "#cf2027", n: "Blue Sharks" },
  KSA: { r: 69, c: "AFC", p: "#006c35", s: "#ffffff", n: "The Green Falcons" },
  URU: { r: 82, c: "CONMEBOL", p: "#5cbfeb", s: "#ffffff", n: "La Celeste" },
  FRA: { r: 92, c: "UEFA", p: "#0055a4", s: "#ffffff", n: "Les Bleus" },
  SEN: { r: 78, c: "CAF", p: "#00853f", s: "#fdef42", n: "Lions of Teranga" },
  IRQ: { r: 66, c: "AFC", p: "#007a3d", s: "#ce1126", n: "Lions of Mesopotamia" },
  NOR: { r: 78, c: "UEFA", p: "#ba0c2f", s: "#00205b", n: "Løvene" },
  ARG: { r: 93, c: "CONMEBOL", p: "#75aadb", s: "#ffffff", n: "La Albiceleste" },
  ALG: { r: 74, c: "CAF", p: "#006233", s: "#ffffff", n: "Les Fennecs" },
  AUT: { r: 76, c: "UEFA", p: "#ed2939", s: "#ffffff", n: "Das Team" },
  JOR: { r: 64, c: "AFC", p: "#007a3d", s: "#ce1126", n: "Al-Nashama" },
  POR: { r: 89, c: "UEFA", p: "#c8102e", s: "#006600", n: "A Seleção das Quinas" },
  COD: { r: 70, c: "CAF", p: "#007fff", s: "#f7d618", n: "Les Léopards" },
  UZB: { r: 66, c: "AFC", p: "#1eb53a", s: "#0099b5", n: "The White Wolves" },
  COL: { r: 80, c: "CONMEBOL", p: "#fcd116", s: "#003893", n: "Los Cafeteros" },
  ENG: { r: 90, c: "UEFA", p: "#f0f0f0", s: "#cf1020", n: "The Three Lions" },
  CRO: { r: 83, c: "UEFA", p: "#ff0000", s: "#0093dd", n: "Vatreni" },
  GHA: { r: 72, c: "CAF", p: "#006b3f", s: "#fcd116", n: "The Black Stars" },
  PAN: { r: 66, c: "CONCACAF", p: "#db0a16", s: "#005293", n: "La Marea Roja" },
};

const DEFAULT: Meta = { r: 70, c: "UEFA", p: "#1f2a44", s: "#ffffff", n: "" };

const raw = rawTeams as unknown as RawTeam[];

export const TEAMS: Team[] = raw.map((t) => {
  const meta = META[t.fifa_code] ?? DEFAULT;
  return {
    id: t.fifa_code.toLowerCase(),
    name: t.name_en,
    nameLocal: t.name_fa,
    code: t.fifa_code,
    group: t.groups.trim().toUpperCase() as GroupId,
    flag: t.flag.replace("/w80/", "/w320/"),
    colors: { primary: meta.p, secondary: meta.s },
    confederation: meta.c,
    fifaRank: 0,
    rating: meta.r,
    nickname: meta.n || undefined,
  };
});

/** Map the dataset's numeric team id (e.g. "36") -> our team id ("nor"). */
export const REAL_ID_TO_TEAM: Record<string, string> = Object.fromEntries(
  raw.map((t) => [t.id, t.fifa_code.toLowerCase()])
);

export const TEAMS_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t])
);

export const GROUP_IDS: GroupId[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
];

export const TEAMS_BY_GROUP: Record<GroupId, Team[]> = GROUP_IDS.reduce(
  (acc, g) => {
    acc[g] = TEAMS.filter((t) => t.group === g);
    return acc;
  },
  {} as Record<GroupId, Team[]>
);

export function getTeam(id: string | null | undefined): Team | undefined {
  if (!id) return undefined;
  return TEAMS_BY_ID[id];
}
