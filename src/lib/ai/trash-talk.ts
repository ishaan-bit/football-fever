import type {
  Match,
  Team,
  Heat,
  TargetState,
  TrashTalkTarget,
  TrashTalkPrompt,
  TrashTalkBurn,
} from "@/types";
import {
  getLiveMatches,
  getRecentResults,
  getUpcomingMatches,
  getTeam,
} from "@/lib/data";
import { FRIENDS, ORACLE_PROFILE, avatarFor } from "@/lib/data/people";
import { seededRandom, hashSeed, pickFrom } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  Trash Talk = The Roastmaster's domain. Same hard rule as the host:
 *  every starter prompt is anchored to a VERIFIED match fact (scoreline,
 *  minute, form, result) — never an invented event. It punches at the
 *  football, the predictions and the fan overconfidence, never at people.
 * ------------------------------------------------------------------ */

const EN_DASH = "–";

/** Reactions an audience can throw at a burn. */
export const BURN_REACTIONS = ["🔥", "💀", "🧊", "👏"] as const;

/* ------------------------------- Targets ------------------------------- */

interface Side {
  team: Team;
  opp: Team;
  state: TargetState;
  scoreLine: string;
  minuteLabel: string;
  heat: Heat;
  context: string;
}

function minuteLabel(m: Match): string {
  if (m.status === "halftime") return "HT";
  if (m.status === "finished") return "FT";
  if (m.status === "live") return `${m.minute ?? 0}'`;
  return "soon";
}

/** Build a per-side view of a match: who's getting cooked and how badly. */
function sideOf(m: Match, who: "home" | "away"): Side | null {
  const teamId = who === "home" ? m.homeTeamId : m.awayTeamId;
  const oppId = who === "home" ? m.awayTeamId : m.homeTeamId;
  const team = getTeam(teamId);
  const opp = getTeam(oppId);
  if (!team || !opp) return null;

  const mine = (who === "home" ? m.homeScore : m.awayScore) ?? 0;
  const theirs = (who === "home" ? m.awayScore : m.homeScore) ?? 0;
  const scoreLine = `${mine}${EN_DASH}${theirs}`;
  const ml = minuteLabel(m);

  let state: TargetState;
  let heat: Heat;
  if (m.status === "scheduled") {
    state = "upcoming";
    heat = 1;
  } else if (m.status === "finished") {
    state = mine > theirs ? "won" : mine < theirs ? "lost" : "drew";
    heat = state === "lost" ? 3 : state === "drew" ? 2 : 1;
  } else {
    state = mine > theirs ? "leading" : mine < theirs ? "trailing" : "level";
    const gap = Math.abs(mine - theirs);
    heat = state === "trailing" ? (gap >= 2 ? 3 : 2) : state === "level" ? 2 : 1;
  }

  const stateWord: Record<TargetState, string> = {
    trailing: "Trailing",
    leading: "Leading",
    level: "Level",
    lost: "Lost",
    won: "Won",
    drew: "Drew",
    upcoming: "Up next",
  };
  const context =
    state === "upcoming"
      ? `vs ${opp.code} · kicks off ${ml}`
      : `${stateWord[state]} ${scoreLine} · ${ml}`;

  return { team, opp, state, scoreLine, minuteLabel: ml, heat, context };
}

function teamTarget(m: Match, who: "home" | "away"): TrashTalkTarget | null {
  const s = sideOf(m, who);
  if (!s) return null;
  return {
    id: `team:${s.team.id}:${m.id}`,
    kind: "team",
    name: s.team.name,
    flagTeamId: s.team.id,
    matchId: m.id,
    state: s.state,
    scoreLine: s.scoreLine,
    minuteLabel: s.minuteLabel,
    opponentName: s.opp.name,
    opponentCode: s.opp.code,
    context: s.context,
    heat: s.heat,
  };
}

function rivalTarget(
  friendId: string,
  m: Match,
  who: "home" | "away"
): TrashTalkTarget | null {
  const friend = FRIENDS.find((f) => f.id === friendId);
  const s = sideOf(m, who);
  if (!friend || !s) return null;
  return {
    id: `rival:${friend.id}:${m.id}`,
    kind: "rival",
    name: friend.name,
    handle: friend.handle,
    avatar: friend.avatar,
    flagTeamId: s.team.id,
    matchId: m.id,
    state: s.state,
    scoreLine: s.scoreLine,
    minuteLabel: s.minuteLabel,
    opponentName: s.opp.name,
    opponentCode: s.opp.code,
    context: `${s.team.code} fan · ${s.context}`,
    heat: s.heat,
  };
}

const ORACLE_TARGET: TrashTalkTarget = {
  id: "oracle",
  kind: "oracle",
  name: "The Oracle",
  handle: "@oracle",
  avatar: ORACLE_PROFILE.avatar,
  context: "Smug. Allegedly never wrong.",
  heat: 2,
};

const ROOM_TARGET: TrashTalkTarget = {
  id: "room",
  kind: "room",
  name: "Open Mic",
  context: "No target. Pure chaos. Roast the room.",
  heat: 2,
};

/**
 * The line-up of who's roastable right now — anchored to the live API/clock.
 * Live teams first (most cooked), then the friends whose teams are on the
 * pitch, then the Oracle, then an open mic. Always returns something.
 */
export function buildTargets(now: number): TrashTalkTarget[] {
  const live = getLiveMatches(now);
  const matches = live.length ? live : getRecentResults(3, now);
  const upcoming = getUpcomingMatches(2, now);

  const teams: TrashTalkTarget[] = [];
  const rivals: TrashTalkTarget[] = [];
  const seenRival = new Set<string>();

  const consider = (m: Match) => {
    for (const who of ["home", "away"] as const) {
      const t = teamTarget(m, who);
      if (t) teams.push(t);
      const teamId = who === "home" ? m.homeTeamId : m.awayTeamId;
      const fan = FRIENDS.find((f) => f.favoriteTeamId === teamId);
      if (fan && !seenRival.has(fan.id)) {
        const r = rivalTarget(fan.id, m, who);
        if (r) {
          rivals.push(r);
          seenRival.add(fan.id);
        }
      }
    }
  };

  for (const m of matches) consider(m);
  for (const m of upcoming) {
    const t = teamTarget(m, "home");
    if (t) teams.push(t);
  }

  // Most-cooked first: trailing/lost > level/drew > leading/won/upcoming.
  const rank = (t: TrashTalkTarget) => -t.heat;
  teams.sort((a, b) => rank(a) - rank(b));
  rivals.sort((a, b) => rank(a) - rank(b));

  return [
    ...teams.slice(0, 6),
    ...rivals.slice(0, 5),
    ORACLE_TARGET,
    ROOM_TARGET,
  ];
}

/* ---------------------------- Starter prompts -------------------------- */

interface Cand {
  text: string;
  heat: Heat;
  tag: string;
}

/** Fill-ins available to every template. */
interface Ctx {
  name: string; // target / team display name
  handle: string; // @handle or name
  opp: string; // opponent name
  oppCode: string;
  line: string; // scoreline from target POV
  minute: string; // "67'" | "HT" | "FT"
}

function teamCands(state: TargetState, c: Ctx): Cand[] {
  switch (state) {
    case "trailing":
      return [
        { text: `${c.name} down ${c.line} and the defending is a group project nobody showed up for.`, heat: 3, tag: "Scoreline" },
        { text: `It's ${c.minute} and ${c.name} are losing to ${c.opp}. Someone check if they've left the dressing room.`, heat: 2, tag: "Time" },
        { text: `${c.name} fans went quiet at ${c.line}. From "we've got this" to "it's still early" real fast.`, heat: 2, tag: "Vibes" },
        { text: `Tactical masterclass from ${c.name}: concede, then concede again. Bold. Different.`, heat: 3, tag: "Tactics" },
        { text: `${c.opp} are using ${c.name}'s half like a free parking spot. ${c.line}, ${c.minute}.`, heat: 2, tag: "Map" },
      ];
    case "level":
      return [
        { text: `${c.name} ${c.line} at ${c.minute} — playing not to lose like the trophy is participation.`, heat: 2, tag: "Bottle" },
        { text: `Level against ${c.opp}? ${c.name} were "favourites" an hour ago. Funny how that fades.`, heat: 2, tag: "Favourites" },
        { text: `${c.name} drawing ${c.line} and somehow still booking the open-top bus parade. Optimism is wild.`, heat: 1, tag: "Hubris" },
      ];
    case "leading":
      return [
        { text: `${c.name} ahead ${c.line} and already celebrating like ${c.opp} can't count to two.`, heat: 1, tag: "Early" },
        { text: `Nice lead, ${c.name}. Now do the hard part — not bottling it in the last ${c.minute === "HT" ? "45" : "10"}.`, heat: 2, tag: "Jinx" },
        { text: `${c.name} winning ${c.line}. Statistically, this is exactly when your lot fall apart. Just saying.`, heat: 2, tag: "History" },
      ];
    case "lost":
      return [
        { text: `Full time: ${c.name} ${c.line}. Pack it up, the bracket said no. ${c.opp} say thanks for coming.`, heat: 3, tag: "Eliminated" },
        { text: `${c.name} lost to ${c.opp} and the group chat just went eerily silent. We see you.`, heat: 2, tag: "Silence" },
        { text: `${c.name} ${c.line} — a result they'll be "learning from" until 2030.`, heat: 2, tag: "Cope" },
      ];
    case "drew":
      return [
        { text: `${c.name} drew ${c.line} with ${c.opp}. A point! For the museum of "could've been more".`, heat: 2, tag: "Meh" },
        { text: `Nothing says ${c.name} like a ${c.line} draw and 14 sideways passes a minute.`, heat: 2, tag: "Snooze" },
      ];
    case "won":
      return [
        { text: `${c.name} won ${c.line}? Even a broken clock, ${c.opp} were clearly on holiday.`, heat: 1, tag: "Lucky" },
        { text: `Congrats ${c.name} on beating ${c.opp}. Now try it against someone who showed up.`, heat: 1, tag: "Asterisk" },
      ];
    case "upcoming":
    default:
      return [
        { text: `${c.name} vs ${c.opp} kicks off ${c.minute}. ${c.name} fans already typing their excuses.`, heat: 1, tag: "Preview" },
        { text: `${c.name} talk a big game pre-match. ${c.minute} we find out if the mouth writes cheques the legs can't cash.`, heat: 2, tag: "Preview" },
        { text: `Prediction: ${c.name} start strong, then remember they're ${c.name}.`, heat: 2, tag: "Preview" },
      ];
  }
}

function rivalCands(state: TargetState, c: Ctx): Cand[] {
  const trailing = state === "trailing" || state === "lost" || state === "drew";
  if (trailing) {
    return [
      { text: `${c.handle} your ${c.oppCode} is currently ${c.line}. How's that "trust the process" working out? 💀`, heat: 3, tag: "Personal" },
      { text: `Imagine picking ${c.name}'s team as your whole personality and it's ${c.line}. Stay strong ${c.handle}.`, heat: 2, tag: "Personality" },
      { text: `${c.handle} hasn't sent a message since ${c.line}. The mute button is doing numbers tonight.`, heat: 2, tag: "Ghosted" },
      { text: `Somebody do a wellness check on ${c.handle}, their team is getting bodied ${c.line} and they've gone quiet.`, heat: 2, tag: "Welfare" },
    ];
  }
  if (state === "leading" || state === "won") {
    return [
      { text: `${c.handle} acting like THEY scored. Sit down, you kicked a ball precisely zero times tonight.`, heat: 2, tag: "Glory" },
      { text: `${c.handle} will be insufferable about ${c.line} for a week. Screenshot this for when it goes wrong.`, heat: 2, tag: "Insufferable" },
      { text: `One good result and ${c.handle} thinks they're a tactician. It's ${c.line}, not a managerial CV.`, heat: 1, tag: "Expert" },
    ];
  }
  return [
    { text: `${c.handle} riding for ${c.name} at ${c.line}. Loyalty is admirable. Misguided, but admirable.`, heat: 2, tag: "Loyalty" },
    { text: `${c.handle} said this was "their year". It's ${c.line}, ${c.minute}, and the year is looking nervous.`, heat: 2, tag: "Their Year" },
    { text: `${c.handle}, your team is ${c.line}. Want to double down or quietly change the subject?`, heat: 1, tag: "Dare" },
  ];
}

const ORACLE_CANDS: Cand[] = [
  { text: `Hey Oracle, your "high-confidence lock" is aging like milk. Run the numbers again, nerd. 🤓`, heat: 2, tag: "Wrong" },
  { text: `The Oracle ran 10,000 simulations and still couldn't predict it'd get this humbled. Beautiful.`, heat: 2, tag: "Sims" },
  { text: `Imagine being an all-knowing AI and your bracket is more busted than mine. Humble yourself, Oracle.`, heat: 3, tag: "Bracket" },
  { text: `Oracle out here with 74% confidence and 0% spine. We don't fear the algorithm anymore.`, heat: 2, tag: "Spine" },
  { text: `The Oracle's "verdict" and a coin flip walk into a bar. The coin flip buys the drinks tonight.`, heat: 1, tag: "Coin Flip" },
];

const ROOM_CANDS: Cand[] = [
  { text: `Whoever predicted a boring 0${EN_DASH}0 — this watch party has a strict no-cowards policy. Step up.`, heat: 2, tag: "Cowards" },
  { text: `Roll call: who's still defending their pre-tournament bracket? Lying to yourself is not a flex.`, heat: 2, tag: "Roll Call" },
  { text: `Someone in here turned the group chat into a tactics podcast. Mate. You play right-back in 5-a-side.`, heat: 2, tag: "Podcast" },
  { text: `The loudest person in this room has the worst predictions. It's science. Name yourselves.`, heat: 3, tag: "Science" },
  { text: `If your hot take didn't age, this is your reminder that we all saw it. No takesie-backsies.`, heat: 1, tag: "Receipts" },
];

/**
 * A fresh deck of anchored burns for a target. Deterministic per
 * (target, salt) so re-renders are stable; bump `salt` to shuffle.
 */
export function starterPrompts(
  target: TrashTalkTarget,
  salt = 0,
  count = 4
): TrashTalkPrompt[] {
  const c: Ctx = {
    name: target.name,
    handle: target.handle ?? target.name,
    opp: target.opponentName ?? "the other lot",
    oppCode: target.opponentCode ?? "them",
    line: target.scoreLine ?? "0–0",
    minute: target.minuteLabel ?? "soon",
  };

  let pool: Cand[];
  switch (target.kind) {
    case "team":
      pool = teamCands(target.state ?? "upcoming", c);
      break;
    case "rival":
      pool = rivalCands(target.state ?? "level", c);
      break;
    case "oracle":
      pool = ORACLE_CANDS;
      break;
    default:
      pool = ROOM_CANDS;
  }

  const rng = seededRandom(hashSeed(`deck:${target.id}:${salt}`));
  const shuffled = [...pool].sort(() => rng() - 0.5).slice(0, Math.min(count, pool.length));
  const anchor =
    target.kind === "team" || target.kind === "rival"
      ? `${target.state}@${target.minuteLabel ?? ""}`
      : target.kind;

  return shuffled.map((cand, i) => ({
    id: `prompt:${target.id}:${salt}:${i}`,
    targetId: target.id,
    text: cand.text,
    heat: cand.heat,
    tag: cand.tag,
    anchor,
  }));
}

/* ----------------------------- Roastmaster ----------------------------- */

const VERDICTS: Record<"weak" | "decent" | "savage" | "nuclear", string[]> = {
  weak: [
    "Cute. My grandma roasts harder over Sunday lunch.",
    "That landed softer than a relegated backline. Try again.",
    "Mild. We're at a roast, not a tea party.",
  ],
  decent: [
    "Okay, okay — that drew blood. The room felt it.",
    "Respectable heat. The target's left eye is twitching.",
    "Solid hit. Not a knockout, but they're wobbling.",
  ],
  savage: [
    "OOOF. Somebody get the burn unit on standby. 🔥",
    "Brutal. That's getting screenshotted and framed.",
    "The room just went 'OHHHH' in unison. Filthy work.",
  ],
  nuclear: [
    "MIC DROP. 🎤 Nothing survives that. Pack it up.",
    "NUCLEAR. The target has left the chat and possibly the country.",
    "That's a war crime. The Roastmaster bows. 👑",
  ],
};

/**
 * The Roastmaster judges a burn 0–100. Deterministic per (text, seed).
 * Sharper, longer, spicier burns score higher; a mic-drop fires at 90+.
 */
export function roastmasterVerdict(
  text: string,
  heat: Heat,
  seed: number
): { score: number; verdict: string; micDrop: boolean } {
  const rng = seededRandom(hashSeed(`verdict:${text}:${seed}`));
  const base = heat === 3 ? 78 : heat === 2 ? 66 : 54;
  const lengthBonus = Math.min(12, Math.floor(text.trim().length / 14));
  const punchBonus = /[🔥💀😂🤓👑]|[A-Z]{3,}/.test(text) ? 6 : 0;
  const jitter = Math.floor(rng() * 16) - 4;
  const score = Math.max(38, Math.min(99, base + lengthBonus + punchBonus + jitter));

  const band =
    score >= 90 ? "nuclear" : score >= 80 ? "savage" : score >= 66 ? "decent" : "weak";
  const verdict = pickFrom(VERDICTS[band], rng);

  return { score, verdict, micDrop: score >= 90 };
}

/* ------------------------------- Heat meter ---------------------------- */

export interface HeatBand {
  label: string;
  emoji: string;
  color: string; // hsl token
}

export function heatBand(heat: number): HeatBand {
  if (heat >= 85) return { label: "Nuclear", emoji: "☢️", color: "var(--live)" };
  if (heat >= 68) return { label: "Scorching", emoji: "🔥", color: "var(--magenta)" };
  if (heat >= 45) return { label: "Toasty", emoji: "🌶️", color: "var(--gold)" };
  return { label: "Lukewarm", emoji: "🧊", color: "var(--electric)" };
}

/** Arena temperature 0–100 from the most recent burns + their reactions. */
export function arenaHeat(burns: TrashTalkBurn[]): number {
  if (!burns.length) return 18;
  const recent = burns.slice(0, 12);
  const avgScore =
    recent.reduce((sum, b) => sum + b.score, 0) / recent.length;
  const reactionBump = Math.min(
    14,
    recent.reduce(
      (sum, b) => sum + (b.reactions["🔥"] ?? 0) + (b.reactions["💀"] ?? 0),
      0
    )
  );
  return Math.max(0, Math.min(100, Math.round(avgScore * 0.86 + reactionBump)));
}

/* ------------------------------- Seed feed ----------------------------- */

interface SeedSpec {
  mins: number;
  authorId: string;
  authorName: string;
  target: string;
  targetKind: TrashTalkBurn["targetKind"];
  flagTeamId?: string;
  text: string;
  heat: Heat;
  tag: string;
  reactions: Record<string, number>;
}

const SEED_SPECS: SeedSpec[] = [
  {
    mins: 14, authorId: "u_tara", authorName: "Tara", target: "The Oracle", targetKind: "oracle",
    text: "The Oracle called a 'comfortable win' and it's going to penalties. Comfortable for WHO exactly? 💀",
    heat: 3, tag: "Wrong", reactions: { "🔥": 12, "💀": 9, "👏": 4 },
  },
  {
    mins: 9, authorId: "u_dev", authorName: "Dev", target: "Open Mic", targetKind: "room",
    text: "Whoever's still defending their pre-tournament bracket — the receipts are right here and they are NOT pretty.",
    heat: 2, tag: "Receipts", reactions: { "🔥": 7, "💀": 3 },
  },
  {
    mins: 5, authorId: "u_meera", authorName: "Meera", target: "Kabir", targetKind: "rival", flagTeamId: "eng",
    text: "@kabir it's not coming home. it's not even getting on the bus. it's still at the airport filling out a lost luggage form.",
    heat: 3, tag: "Personal", reactions: { "🔥": 15, "💀": 11, "👏": 6 },
  },
  {
    mins: 2, authorId: "u_rohan", authorName: "Rohan", target: "Open Mic", targetKind: "room",
    text: "the tactics podcast in this group chat is wild for people who get winded jogging to the fridge.",
    heat: 2, tag: "Podcast", reactions: { "🔥": 5, "🧊": 1 },
  },
];

/** A few evergreen burns so the arena is already roaring on first load. */
export function seedBurns(now: number): TrashTalkBurn[] {
  return SEED_SPECS.map((s, i) => {
    const { score, verdict, micDrop } = roastmasterVerdict(s.text, s.heat, i);
    return {
      id: `seed-burn-${i}`,
      targetId: `seed:${i}`,
      targetName: s.target,
      targetKind: s.targetKind,
      flagTeamId: s.flagTeamId,
      authorId: s.authorId,
      authorName: s.authorName,
      authorAvatar: avatarFor(s.authorName + s.authorId),
      text: s.text,
      heat: s.heat,
      tag: s.tag,
      reactions: s.reactions,
      score,
      verdict,
      micDrop,
      createdAt: new Date(now - s.mins * 60000).toISOString(),
    };
  });
}
