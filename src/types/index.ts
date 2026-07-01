/**
 * Football Fever — Domain Model
 * Clean, UI-agnostic types. The World Cup API (stringly-typed) is normalized
 * into these shapes by `lib/worldcup/normalize.ts`, so nothing in the UI ever
 * touches a raw API payload.
 */

export type GroupId =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export type Confederation =
  | "UEFA" | "CONMEBOL" | "CONCACAF" | "CAF" | "AFC" | "OFC";

export type Host = "USA" | "Mexico" | "Canada";

export interface Team {
  id: string;
  /** English display name */
  name: string;
  /** Localized name from the API (Persian), kept for completeness */
  nameLocal?: string;
  /** FIFA 3-letter code, e.g. ARG */
  code: string;
  group: GroupId;
  /** Flag image URL (flagcdn or API-provided) */
  flag: string;
  colors: { primary: string; secondary: string };
  confederation: Confederation;
  fifaRank: number;
  /** 0–100 strength rating used by The Oracle */
  rating: number;
  /** Short nickname used by the AI host for color/banter */
  nickname?: string;
}

export type MatchStage =
  | "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";

export type MatchStatus = "scheduled" | "live" | "halftime" | "finished";

export type MatchEventType =
  | "kickoff" | "goal" | "own_goal" | "penalty_goal" | "penalty_miss"
  | "yellow" | "red" | "sub" | "var" | "halftime" | "fulltime"
  | "shot" | "corner" | "save";

export interface MatchEvent {
  id: string;
  minute: number;
  /** stoppage time, e.g. 45+2 -> { minute: 45, plus: 2 } */
  plus?: number;
  type: MatchEventType;
  team: "home" | "away" | "neutral";
  player?: string;
  assist?: string;
  detail?: string;
}

export interface Match {
  id: string;
  stage: MatchStage;
  group?: GroupId;
  matchday?: number;
  /** Knockout label when teams are not yet decided, e.g. "Winner Group A" */
  homeLabel?: string;
  awayLabel?: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  /** ISO 8601 UTC kickoff */
  kickoff: string;
  venueId: string;
  status: MatchStatus;
  /** Live elapsed minute when status is live/halftime */
  minute: number | null;
  events: MatchEvent[];
}

export interface Venue {
  id: string;
  name: string;
  fifaName?: string;
  city: string;
  country: Host;
  capacity: number;
  image: string;
  /** Local IANA timezone for the venue */
  timezone: string;
  surface?: string;
}

export interface GroupStandingRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: Array<"W" | "D" | "L">;
  rank: number;
  /** Qualification status derived from rank within the group */
  qualified: "champion_path" | "advanced" | "playoff" | "eliminated" | "pending";
}

export interface Group {
  id: GroupId;
  teamIds: string[];
  standings: GroupStandingRow[];
}

/* ----------------------------- The Oracle ------------------------------- */

export interface OracleInsight {
  icon: string;
  label: string;
  detail: string;
  /** 0–1 contribution weight, drives the explainability bars */
  weight: number;
  tone: "neutral" | "positive" | "warning" | "danger";
}

export interface OraclePrediction {
  matchId: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  likelyScoreline: { home: number; away: number };
  scorelineProbabilities: Array<{ score: string; prob: number }>;
  expectedGoals: { home: number; away: number };
  /** 0–100 — how strongly the Oracle stands behind its call */
  confidence: number;
  dangerTeamId: string | null;
  upset: { active: boolean; underdogId: string | null; note: string };
  /** -100 (home dominant) .. 100 (away dominant) */
  momentum: number;
  insights: OracleInsight[];
  qualificationNote: string;
  tournamentImpact: string;
  preview: string;
  verdict: string;
  generatedAt: string;
}

/* ------------------------------- Betting -------------------------------- */

export type MarketKey =
  | "match_result"
  | "double_chance"
  | "over_under_2_5"
  | "btts"
  | "correct_score"
  | "first_team_to_score"
  | "clean_sheet"
  | "to_qualify";

export interface OddsSelection {
  id: string;
  label: string;
  /** Decimal odds, e.g. 2.40 */
  decimal: number;
  /** Implied probability after margin */
  impliedProb: number;
  /** Oracle "true" probability */
  trueProb: number;
  /** Positive => value bet (Oracle prob beats implied) */
  edge: number;
  recommended: boolean;
}

export interface Market {
  key: MarketKey;
  label: string;
  selections: OddsSelection[];
}

export interface MatchOdds {
  matchId: string;
  /** Bookmaker margin baked into odds, e.g. 0.06 = 6% overround */
  margin: number;
  markets: Market[];
  /** Oracle's single highest-conviction value pick across all markets */
  bestValue: { marketKey: MarketKey; selectionId: string; edge: number } | null;
}

export interface BetSlipLeg {
  id: string;
  matchId: string;
  marketKey: MarketKey;
  selectionId: string;
  label: string;
  decimal: number;
}

export interface PlacedBet {
  id: string;
  legs: BetSlipLeg[];
  stake: number;
  combinedOdds: number;
  potentialReturn: number;
  placedAt: string;
  status: "open" | "won" | "lost" | "void";
}

/* --------------------------- Prediction League -------------------------- */

export type PredictionMarket =
  | "winner"
  | "scoreline"
  | "first_scorer"
  | "total_goals"
  | "cards"
  | "corners"
  | "clean_sheet"
  | "motm"
  | "penalty"
  | "extra_time";

export type RiskLevel = "safe" | "balanced" | "bold" | "wild";

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  market: PredictionMarket;
  value: string;
  /** confidence the user staked, scales points */
  risk: RiskLevel;
  createdAt: string;
  locked: boolean;
  settled: boolean;
  correct: boolean | null;
  points: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  points: number;
  accuracy: number;
  streak: number;
  predictions: number;
  delta: number;
  badges: string[];
  isYou?: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "legendary";
  earned: boolean;
}

/* ----------------------------- Challenges ------------------------------- */

export type ChallengeKind =
  | "coffee" | "pizza" | "restaurant" | "dare" | "bragging" | "host" | "custom";

export interface FriendlyChallenge {
  id: string;
  matchId: string;
  kind: ChallengeKind;
  title: string;
  stake: string;
  /** Optional money amount for UPI settlement (peer-to-peer, friendly) */
  amount?: number;
  createdBy: string;
  participants: string[];
  status: "open" | "active" | "settled" | "cancelled";
  winnerId?: string;
  settlement?: {
    method: "upi" | "cash" | "irl";
    settled: boolean;
    upiId?: string;
  };
  createdAt: string;
}

/* -------------------------------- Social -------------------------------- */

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  favoriteTeamId?: string;
  upiId?: string;
  isGuest: boolean;
  joinedAt: string;
  vibe?: string;
}

export type PresenceStatus = "watching" | "online" | "in_call" | "away" | "offline";

export interface PresenceMember {
  userId: string;
  name: string;
  avatar: string;
  status: PresenceStatus;
  matchId?: string;
  typing?: boolean;
  reaction?: string;
}

export type ChatKind = "text" | "gif" | "voice" | "reaction" | "system" | "ai" | "prediction" | "moment";

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  authorName: string;
  authorAvatar: string;
  kind: ChatKind;
  body: string;
  /** for gif/voice */
  mediaUrl?: string;
  /** seconds, for voice notes */
  duration?: number;
  replyTo?: string;
  reactions: Record<string, string[]>;
  pinned?: boolean;
  createdAt: string;
}

export interface WatchGroup {
  id: string;
  name: string;
  emoji: string;
  memberIds: string[];
  inviteCode: string;
  createdAt: string;
}

/* ------------------------------ Mini games ------------------------------ */

export type MiniGameId =
  | "crowd_meter"
  | "flash_predictions"
  | "hot_take_roulette"
  | "penalty_panic"
  | "emoji_battle"
  | "guess_next_event"
  | "team_trivia"
  | "golden_goal"
  | "var_court"
  | "pass_the_curse"
  | "trash_talk";

export interface MiniGameMeta {
  id: MiniGameId;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  players: string;
  duration: string;
  intensity: 1 | 2 | 3;
  accent: string;
  live?: boolean;
}

/* ----------------------------- Notifications ---------------------------- */

export type NotificationKind =
  | "kickoff" | "goal" | "var" | "halftime" | "fulltime"
  | "friend_joined" | "prediction_closing" | "minigame" | "challenge"
  | "oracle" | "recap" | "badge";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  matchId?: string;
  read: boolean;
  createdAt: string;
  accent?: string;
  href?: string;
}

/* ------------------------------- AI host -------------------------------- */

export interface AiHostMessage {
  id: string;
  /** drives avatar mood ring + animation */
  mood: "hype" | "calm" | "cheeky" | "shook" | "analytical" | "celebratory";
  text: string;
  matchId?: string;
  createdAt: string;
  /** the verified data point this reaction is anchored to */
  anchor?: string;
}

/* ------------------------------ Trash Talk ------------------------------ */

/** Who's in the firing line. Everything is anchored to verified live data. */
export type TrashTalkTargetKind = "team" | "rival" | "oracle" | "room";

/** Heat = how spicy a burn is. 1 playful · 2 spicy · 3 nuclear. */
export type Heat = 1 | 2 | 3;

/** A live match situation, from one side's point of view. */
export type TargetState =
  | "trailing" | "leading" | "level" | "lost" | "won" | "drew" | "upcoming";

export interface TrashTalkTarget {
  /** e.g. "team:arg", "rival:u_kabir", "oracle", "room" */
  id: string;
  kind: TrashTalkTargetKind;
  name: string;
  handle?: string;
  avatar?: string;
  /** team whose crest represents this target (team itself, or a rival's club) */
  flagTeamId?: string;
  matchId?: string;
  state?: TargetState;
  /** from this target's POV, e.g. "0–2" */
  scoreLine?: string;
  /** "67'", "HT", "FT" */
  minuteLabel?: string;
  opponentName?: string;
  opponentCode?: string;
  /** human display hook, e.g. "Trailing 0–2 · 67'" */
  context: string;
  /** suggested base spice for this target's situation */
  heat: Heat;
}

/** A ready-made burn the user can fire, anchored to live data. */
export interface TrashTalkPrompt {
  id: string;
  targetId: string;
  text: string;
  heat: Heat;
  /** short label, e.g. "Scoreline", "Form", "Curse" */
  tag: string;
  /** the verified datapoint this is built on, like AiHostMessage.anchor */
  anchor?: string;
}

/** A burn that has been thrown into the arena. */
export interface TrashTalkBurn {
  id: string;
  targetId: string;
  targetName: string;
  targetKind: TrashTalkTargetKind;
  flagTeamId?: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  heat: Heat;
  tag?: string;
  /** reaction tallies keyed by emoji */
  reactions: Record<string, number>;
  /** the Roastmaster's verdict on this burn */
  score: number;
  verdict: string;
  micDrop: boolean;
  createdAt: string;
}
