import type { MiniGameMeta } from "@/types";

export const APP = {
  name: "Football Fever",
  tagline: "Your group's home for World Cup 2026.",
  description:
    "Watch every match together. Predict live. Play. Celebrate. The place your friends gather for the FIFA World Cup 2026.",
  tournament: {
    name: "FIFA World Cup 2026",
    start: "2026-06-11T00:00:00Z",
    final: "2026-07-19T19:00:00Z",
    hosts: ["USA", "Canada", "Mexico"],
    teams: 48,
    matches: 104,
  },
};

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide name
  description?: string;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "Home", description: "Today, live now & your group" },
  { href: "/fixtures", label: "Fixtures", icon: "CalendarDays", description: "Timeline, groups & bracket" },
  { href: "/oracle", label: "Oracle", icon: "Sparkles", description: "Explainable predictions" },
  { href: "/predictions", label: "Predict", icon: "Target", description: "The friendly league" },
  { href: "/games", label: "Games", icon: "Gamepad2", description: "Party micro-games" },
  { href: "/betting", label: "Markets", icon: "TrendingUp", description: "AI value picks & odds" },
  { href: "/leaderboard", label: "Ranks", icon: "Trophy", description: "Standings & badges" },
];

/** Bottom mobile dock — the 5 most-used destinations. */
export const DOCK: NavItem[] = [
  { href: "/", label: "Home", icon: "Home" },
  { href: "/fixtures", label: "Matches", icon: "CalendarDays" },
  { href: "/oracle", label: "Oracle", icon: "Sparkles" },
  { href: "/games", label: "Play", icon: "Gamepad2" },
  { href: "/leaderboard", label: "Ranks", icon: "Trophy" },
];

/** Curated cinematic stadium / football imagery (Unsplash). SmartImage falls
 *  back to a brand gradient if any of these fail to load. */
export const IMAGERY = {
  heroes: [
    "https://images.unsplash.com/photo-1522778526097-ce0a22ceb253?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1540379708242-14a809bef941?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=1920&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1920&q=80&auto=format&fit=crop",
  ],
  pitch:
    "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?w=1600&q=80&auto=format&fit=crop",
  crowd:
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1600&q=80&auto=format&fit=crop",
  ball: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1200&q=80&auto=format&fit=crop",
  trophy:
    "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=1200&q=80&auto=format&fit=crop",
} as const;

export const REACTIONS = ["⚽️", "🔥", "😱", "😂", "🙌", "💔", "🤯", "👏", "🇦🇷", "🧤"];

export const GIF_CATEGORIES = [
  "celebration",
  "disbelief",
  "nervous",
  "let's go",
  "no way",
  "crying",
  "goat",
  "var",
];

export const MINI_GAMES: MiniGameMeta[] = [
  {
    id: "trash_talk",
    name: "Trash Talk",
    tagline: "Bash anyone playing",
    description: "Step up to the mic and roast the teams getting cooked live, the friends riding for them, and the smug Oracle. Starter burns are built from the real scoreline; the Roastmaster scores every one.",
    icon: "Mic",
    players: "Whole room",
    duration: "Full mode",
    intensity: 3,
    accent: "var(--live)",
    live: true,
  },
  {
    id: "crowd_meter",
    name: "Crowd Meter",
    tagline: "Mash to make noise",
    description: "Tap as fast as you can when your team attacks. The room's energy becomes a live roar bar.",
    icon: "Volume2",
    players: "Whole room",
    duration: "Always on",
    intensity: 1,
    accent: "var(--electric)",
    live: true,
  },
  {
    id: "flash_predictions",
    name: "Flash Predictions",
    tagline: "10 seconds. One call.",
    description: "A question drops at a key moment — corner, free kick, sub. Lock your answer before the whistle.",
    icon: "Zap",
    players: "2–20",
    duration: "10s rounds",
    intensity: 2,
    accent: "var(--gold)",
    live: true,
  },
  {
    id: "guess_next_event",
    name: "Guess the Next Event",
    tagline: "Goal, card, or corner?",
    description: "Predict what happens next on the pitch. Closest call banks the points.",
    icon: "Crosshair",
    players: "2–20",
    duration: "Rolling",
    intensity: 2,
    accent: "var(--pitch)",
    live: true,
  },
  {
    id: "hot_take_roulette",
    name: "Hot Take Roulette",
    tagline: "Defend the indefensible",
    description: "The wheel hands you a spicy football opinion. Sell it to the group. They vote: based or banned.",
    icon: "Flame",
    players: "3–12",
    duration: "2 min",
    intensity: 3,
    accent: "var(--live)",
  },
  {
    id: "penalty_panic",
    name: "Penalty Panic",
    tagline: "Pick your corner",
    description: "Shootout reflex duel. Swipe to shoot, tap to dive. Sudden death until someone blinks.",
    icon: "Goal",
    players: "1v1",
    duration: "90s",
    intensity: 3,
    accent: "var(--magenta)",
  },
  {
    id: "emoji_battle",
    name: "Emoji Battle",
    tagline: "Out-react the room",
    description: "When the moment hits, spam the right emoji. Fastest, funniest reaction wins the round.",
    icon: "Laugh",
    players: "Whole room",
    duration: "Live moments",
    intensity: 1,
    accent: "var(--brand-violet)",
    live: true,
  },
  {
    id: "team_trivia",
    name: "Team Trivia",
    tagline: "Know your football",
    description: "Rapid-fire World Cup trivia tied to the teams on the pitch. Streaks multiply your score.",
    icon: "Brain",
    players: "2–16",
    duration: "5 rounds",
    intensity: 2,
    accent: "var(--electric)",
  },
  {
    id: "golden_goal",
    name: "Golden Goal",
    tagline: "Call the exact minute",
    description: "Pick the minute of the next goal at kickoff. Nail it and the whole room owes you.",
    icon: "Clock",
    players: "Whole room",
    duration: "Per match",
    intensity: 1,
    accent: "var(--gold)",
  },
  {
    id: "var_court",
    name: "VAR Court",
    tagline: "You are the referee",
    description: "A controversial moment goes to the room. Vote the decision. The AI delivers the verdict with zero chill.",
    icon: "Scale",
    players: "Whole room",
    duration: "On VAR",
    intensity: 2,
    accent: "var(--live)",
    live: true,
  },
  {
    id: "pass_the_curse",
    name: "Pass the Curse",
    tagline: "Don't hold it at full time",
    description: "A hot-potato jinx gets passed on every goal. Whoever holds it at full time does a forfeit.",
    icon: "Ghost",
    players: "3–12",
    duration: "Per match",
    intensity: 2,
    accent: "var(--brand-violet)",
  },
];

export const BADGES_CATALOG = [
  { id: "first_blood", name: "First Blood", description: "Predicted the opening goal of a match", icon: "Swords", tier: "bronze" as const },
  { id: "oracle_slayer", name: "Oracle Slayer", description: "Beat the Oracle's call 5 times", icon: "Sparkles", tier: "gold" as const },
  { id: "hot_streak", name: "On Fire", description: "5 correct predictions in a row", icon: "Flame", tier: "silver" as const },
  { id: "nostradamus", name: "Nostradamus", description: "Called an exact scoreline", icon: "Eye", tier: "gold" as const },
  { id: "night_owl", name: "Night Owl", description: "In the room for a 3:30am IST kickoff", icon: "Moon", tier: "bronze" as const },
  { id: "loud_one", name: "The Loud One", description: "Top of the Crowd Meter in a match", icon: "Volume2", tier: "silver" as const },
  { id: "upset_caller", name: "Upset Caller", description: "Predicted a tournament upset", icon: "Zap", tier: "legendary" as const },
  { id: "ever_present", name: "Ever Present", description: "Attended 10 watch parties", icon: "CalendarCheck", tier: "silver" as const },
];

/** Where the floating AI host sits in mood-space, for the avatar ring color. */
export const AI_MOOD_COLOR: Record<string, string> = {
  hype: "var(--gold)",
  calm: "var(--electric)",
  cheeky: "var(--magenta)",
  shook: "var(--live)",
  analytical: "var(--brand-violet)",
  celebratory: "var(--pitch)",
};
