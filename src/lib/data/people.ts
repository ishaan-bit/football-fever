import type {
  UserProfile,
  LeaderboardEntry,
  FriendlyChallenge,
  ChatMessage,
  PresenceMember,
} from "@/types";

export const avatarFor = (seed: string) =>
  `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&radius=50&backgroundType=gradientLinear`;

/** The AI member of the watch party — prediction engine + personality. */
export const ORACLE_PROFILE: UserProfile = {
  id: "oracle",
  name: "The Oracle",
  handle: "@oracle",
  avatar: avatarFor("the-oracle-fc"),
  isGuest: false,
  joinedAt: "2026-06-01T00:00:00Z",
  vibe: "Knows ball. Knows you. Slightly smug.",
};

interface Persona {
  id: string;
  name: string;
  handle: string;
  team: string;
  vibe: string;
}

const PERSONAS: Persona[] = [
  { id: "u_ishaan", name: "Ishaan", handle: "@ishaan", team: "arg", vibe: "Messi or nothing." },
  { id: "u_aditi", name: "Aditi", handle: "@adi", team: "esp", vibe: "Tiki-taka apologist." },
  { id: "u_rohan", name: "Rohan", handle: "@ro", team: "bra", vibe: "Joga bonito believer." },
  { id: "u_meera", name: "Meera", handle: "@meera", team: "fra", vibe: "Mbappé stan acct." },
  { id: "u_kabir", name: "Kabir", handle: "@kabir", team: "eng", vibe: "It's coming home (again)." },
  { id: "u_sara", name: "Sara", handle: "@sara", team: "por", vibe: "SIUUU enthusiast." },
  { id: "u_dev", name: "Dev", handle: "@dev", team: "ned", vibe: "Total football nerd." },
  { id: "u_nisha", name: "Nisha", handle: "@nish", team: "ger", vibe: "Efficiency. Always." },
  { id: "u_arjun", name: "Arjun", handle: "@arjun", team: "mar", vibe: "Atlas Lions till I die." },
  { id: "u_tara", name: "Tara", handle: "@tara", team: "cro", vibe: "Modrić is football." },
];

export const FRIENDS: UserProfile[] = PERSONAS.map((p) => ({
  id: p.id,
  name: p.name,
  handle: p.handle,
  avatar: avatarFor(p.name + p.id),
  favoriteTeamId: p.team,
  isGuest: false,
  joinedAt: "2026-06-05T00:00:00Z",
  vibe: p.vibe,
}));

export const FRIENDS_BY_ID: Record<string, UserProfile> = Object.fromEntries(
  FRIENDS.map((f) => [f.id, f])
);

/** Tournament leaderboard seed (the Oracle competes too — and is winning). */
const LB_SEED: Array<[string, number, number, number, number, number, string[]]> = [
  // id, points, accuracy, streak, predictions, delta, badges
  ["oracle", 1840, 0.74, 6, 64, 0, ["oracle_slayer", "nostradamus"]],
  ["u_ishaan", 1620, 0.68, 5, 61, 2, ["hot_streak", "night_owl"]],
  ["u_dev", 1585, 0.66, 0, 60, -1, ["nostradamus"]],
  ["u_aditi", 1490, 0.64, 3, 58, 1, ["upset_caller"]],
  ["u_tara", 1455, 0.63, 2, 59, 0, ["ever_present"]],
  ["u_rohan", 1390, 0.61, 0, 55, -2, ["loud_one"]],
  ["u_meera", 1360, 0.62, 4, 52, 3, ["first_blood"]],
  ["u_kabir", 1290, 0.58, 0, 54, -1, []],
  ["u_sara", 1240, 0.57, 1, 50, 0, ["night_owl"]],
  ["u_nisha", 1180, 0.56, 0, 49, 1, []],
  ["u_arjun", 1110, 0.55, 2, 47, 2, ["upset_caller"]],
];

export function buildLeaderboard(youId?: string, youPoints?: number): LeaderboardEntry[] {
  const profiles: Record<string, UserProfile> = {
    oracle: ORACLE_PROFILE,
    ...FRIENDS_BY_ID,
  };
  const rows = LB_SEED.map(([id, points, accuracy, streak, predictions, delta, badges]) => ({
    userId: id,
    name: profiles[id]?.name ?? "Player",
    avatar: profiles[id]?.avatar ?? avatarFor(id),
    points,
    accuracy,
    streak,
    predictions,
    delta,
    badges,
  }));
  if (youId && typeof youPoints === "number") {
    rows.push({
      userId: youId,
      name: "You",
      avatar: avatarFor(youId),
      points: youPoints,
      accuracy: 0.6,
      streak: 0,
      predictions: 0,
      delta: 0,
      badges: [],
    });
  }
  return rows
    .sort((a, b) => b.points - a.points)
    .map((r, i) => ({ rank: i + 1, ...r, isYou: r.userId === youId }));
}

export const SEED_PRESENCE: PresenceMember[] = [
  { userId: "oracle", name: "The Oracle", avatar: ORACLE_PROFILE.avatar, status: "watching" },
  { userId: "u_ishaan", name: "Ishaan", avatar: avatarFor("Ishaanu_ishaan"), status: "watching" },
  { userId: "u_meera", name: "Meera", avatar: avatarFor("Meerau_meera"), status: "in_call" },
  { userId: "u_dev", name: "Dev", avatar: avatarFor("Devu_dev"), status: "watching", typing: true },
  { userId: "u_tara", name: "Tara", avatar: avatarFor("Tarau_tara"), status: "online" },
  { userId: "u_rohan", name: "Rohan", avatar: avatarFor("Rohanu_rohan"), status: "in_call" },
];

export function seedMessages(roomId: string): ChatMessage[] {
  const now = Date.now();
  const m = (
    mins: number,
    userId: string,
    name: string,
    body: string,
    kind: ChatMessage["kind"] = "text"
  ): ChatMessage => ({
    id: `seed-${roomId}-${mins}-${userId}`,
    roomId,
    userId,
    authorName: name,
    authorAvatar: userId === "oracle" ? ORACLE_PROFILE.avatar : avatarFor(name + userId),
    kind,
    body,
    reactions: {},
    createdAt: new Date(now - mins * 60000).toISOString(),
  });
  return [
    m(28, "oracle", "The Oracle", "Welcome to the room. I've run the numbers 10,000 times. You're still going to ignore me. ⚽️", "ai"),
    m(24, "u_ishaan", "Ishaan", "lineups are out, here we go 🔥"),
    m(22, "u_dev", "Dev", "back three again? bold."),
    m(18, "u_meera", "Meera", "calling 2-1. screenshot this.", "prediction"),
    m(15, "oracle", "The Oracle", "Meera predicting 2–1 while her team has conceded first in 4 straight. I admire the optimism.", "ai"),
    m(11, "u_tara", "Tara", "😂😂 she's not wrong tho"),
    m(6, "u_rohan", "Rohan", "anyone in the voice room? it's lonely in here"),
    m(2, "u_ishaan", "Ishaan", "joining now"),
  ];
}

export const SEED_CHALLENGES: FriendlyChallenge[] = [
  {
    id: "ch_1",
    matchId: "73",
    kind: "coffee",
    title: "Loser buys the coffee run",
    stake: "1 cold brew ☕️",
    amount: 250,
    createdBy: "u_ishaan",
    participants: ["u_ishaan", "u_dev"],
    status: "active",
    settlement: { method: "upi", settled: false },
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: "ch_2",
    matchId: "74",
    kind: "pizza",
    title: "Pizza challenge — closest scoreline wins",
    stake: "1 large pizza 🍕",
    amount: 600,
    createdBy: "u_meera",
    participants: ["u_meera", "u_tara", "u_rohan"],
    status: "open",
    settlement: { method: "upi", settled: false },
    createdAt: new Date(Date.now() - 5400_000).toISOString(),
  },
  {
    id: "ch_3",
    matchId: "75",
    kind: "bragging",
    title: "Bragging rights: who called the upset",
    stake: "Eternal glory 👑",
    createdBy: "u_dev",
    participants: ["u_dev", "u_aditi", "u_kabir"],
    status: "open",
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
  },
];
