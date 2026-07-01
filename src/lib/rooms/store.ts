import { getRedis } from "@/lib/redis";
import type { ChatMessage, PresenceStatus } from "@/types";

/**
 * Lightweight, Vercel-native room backend for real cross-device presence and
 * chat. Uses Upstash Redis when configured; otherwise an in-process memory
 * store (works within a single dev/serverless instance). Either way the API
 * shape is identical, so the client can rely on it uniformly.
 *
 * Only two things are synced here — who is in the room and what they said —
 * because that is what makes real people and their nicknames actually show up.
 * The Oracle host, ambient chatter and reactions stay client-side.
 */

/** How long a presence heartbeat stays "live" before a member is pruned. */
const PRESENCE_TTL_MS = 15_000;
/** Idle rooms self-clean after this long with no writes. */
const ROOM_TTL_SEC = 60 * 60 * 24;
/** The community roster is kept far longer than an ephemeral room. */
const PEOPLE_TTL_SEC = 60 * 60 * 24 * 45;
/** A return after this much quiet counts as a fresh visit. */
const SESSION_GAP_MS = 30 * 60_000;
/** Cap on retained chat history per room. */
const MSG_CAP = 120;

export interface RoomMember {
  userId: string;
  name: string;
  avatar: string;
  status: PresenceStatus;
  favoriteTeamId?: string;
  /** Last heartbeat, epoch ms. */
  ts: number;
}

/** A durable record of someone who has joined — the community roster. */
export interface RegisteredPerson {
  userId: string;
  name: string;
  avatar: string;
  favoriteTeamId?: string;
  /** First time we ever saw them, epoch ms. */
  firstSeen: number;
  /** Most recent activity, epoch ms. */
  lastSeen: number;
  /** Distinct sessions (a return after >30min of quiet counts as a new one). */
  visits: number;
}

/** A stored chat message: the client ChatMessage plus a server receipt stamp. */
export interface StoredMessage extends ChatMessage {
  /** Server receipt time (epoch ms) — used for monotonic `since` polling. */
  ts: number;
}

/**
 * Whether the client should run in real-time mode. True when Redis is
 * configured (durable, multi-instance) or when explicitly forced on for local
 * testing via NEXT_PUBLIC_LIVE_ROOMS. When false, the client keeps the fully
 * simulated demo experience and never touches this store.
 */
export function isLiveRooms(): boolean {
  return Boolean(getRedis()) || process.env.NEXT_PUBLIC_LIVE_ROOMS === "1";
}

export function roomsBackend(): "redis" | "memory" {
  return getRedis() ? "redis" : "memory";
}

/* ----------------------------- keys / memory ---------------------------- */

const presenceKey = (roomId: string) => `ff:room:${roomId}:presence`;
const messagesKey = (roomId: string) => `ff:room:${roomId}:messages`;

interface MemRoom {
  presence: Map<string, RoomMember>;
  messages: StoredMessage[];
}
// Module-level singletons survive across requests within one server instance.
const g = globalThis as unknown as {
  __ffRooms?: Map<string, MemRoom>;
  __ffPeople?: Map<string, RegisteredPerson>;
};
const memory: Map<string, MemRoom> = (g.__ffRooms ??= new Map());
const memPeople: Map<string, RegisteredPerson> = (g.__ffPeople ??= new Map());
const PEOPLE_KEY = "ff:people";

function memRoom(roomId: string): MemRoom {
  let r = memory.get(roomId);
  if (!r) {
    r = { presence: new Map(), messages: [] };
    memory.set(roomId, r);
  }
  return r;
}

function fresh(members: RoomMember[], now: number): RoomMember[] {
  return members
    .filter((m) => now - m.ts < PRESENCE_TTL_MS)
    .sort((a, b) => a.ts - b.ts);
}

/* ------------------------------- presence ------------------------------- */

/** Record a heartbeat and return the room's currently-live members. */
export async function heartbeat(
  roomId: string,
  member: Omit<RoomMember, "ts">
): Promise<RoomMember[]> {
  const now = Date.now();
  const stamped: RoomMember = { ...member, ts: now };
  const redis = getRedis();

  if (!redis) {
    const room = memRoom(roomId);
    room.presence.set(member.userId, stamped);
    const live = fresh([...room.presence.values()], now);
    // Prune stale entries so memory doesn't grow unbounded.
    for (const [id, m] of room.presence) {
      if (now - m.ts >= PRESENCE_TTL_MS) room.presence.delete(id);
    }
    return live;
  }

  const key = presenceKey(roomId);
  await redis.hset(key, { [member.userId]: JSON.stringify(stamped) });
  await redis.expire(key, ROOM_TTL_SEC);
  return readPresence(roomId, now);
}

export async function getPresence(roomId: string): Promise<RoomMember[]> {
  return readPresence(roomId, Date.now());
}

async function readPresence(roomId: string, now: number): Promise<RoomMember[]> {
  const redis = getRedis();
  if (!redis) return fresh([...memRoom(roomId).presence.values()], now);

  const key = presenceKey(roomId);
  const raw = (await redis.hgetall(key)) as Record<string, string> | null;
  if (!raw) return [];

  const members: RoomMember[] = [];
  const stale: string[] = [];
  for (const [userId, value] of Object.entries(raw)) {
    const m = safeParse<RoomMember>(value);
    if (!m) {
      stale.push(userId);
      continue;
    }
    if (now - m.ts >= PRESENCE_TTL_MS) stale.push(userId);
    else members.push(m);
  }
  if (stale.length) await redis.hdel(key, ...stale);
  return members.sort((a, b) => a.ts - b.ts);
}

/* ------------------------------- messages ------------------------------- */

/** Append a chat message and cap history. Returns the stored (stamped) copy. */
export async function appendMessage(
  roomId: string,
  msg: ChatMessage
): Promise<StoredMessage> {
  const stored: StoredMessage = { ...msg, ts: Date.now() };
  const redis = getRedis();

  if (!redis) {
    const room = memRoom(roomId);
    room.messages.push(stored);
    if (room.messages.length > MSG_CAP) {
      room.messages.splice(0, room.messages.length - MSG_CAP);
    }
    return stored;
  }

  const key = messagesKey(roomId);
  await redis.rpush(key, JSON.stringify(stored));
  await redis.ltrim(key, -MSG_CAP, -1);
  await redis.expire(key, ROOM_TTL_SEC);
  return stored;
}

/** Fetch messages received after `since` (epoch ms). */
export async function getMessages(
  roomId: string,
  since = 0
): Promise<StoredMessage[]> {
  const redis = getRedis();
  if (!redis) {
    return memRoom(roomId).messages.filter((m) => m.ts > since);
  }
  const raw = (await redis.lrange(messagesKey(roomId), 0, -1)) as string[];
  return raw
    .map((v) => safeParse<StoredMessage>(v))
    .filter((m): m is StoredMessage => Boolean(m) && m!.ts > since);
}

/* --------------------------- people registry --------------------------- */

/**
 * Record (or refresh) a person in the durable community roster. Returns the
 * stored record and whether this is the first time we've ever seen them — used
 * to announce newcomers to the room.
 */
export async function registerPerson(input: {
  userId: string;
  name: string;
  avatar: string;
  favoriteTeamId?: string;
}): Promise<{ person: RegisteredPerson; isNew: boolean }> {
  const now = Date.now();
  const redis = getRedis();

  const build = (existing: RegisteredPerson | null): RegisteredPerson => {
    const returning = existing && now - existing.lastSeen > SESSION_GAP_MS;
    return {
      userId: input.userId,
      name: input.name,
      avatar: input.avatar,
      favoriteTeamId: input.favoriteTeamId,
      firstSeen: existing?.firstSeen ?? now,
      lastSeen: now,
      visits: (existing?.visits ?? 0) + (!existing || returning ? 1 : 0),
    };
  };

  if (!redis) {
    const existing = memPeople.get(input.userId) ?? null;
    const person = build(existing);
    memPeople.set(input.userId, person);
    return { person, isNew: !existing };
  }

  const raw = (await redis.hget(PEOPLE_KEY, input.userId)) as string | null;
  const existing = raw ? safeParse<RegisteredPerson>(raw) : null;
  const person = build(existing);
  await redis.hset(PEOPLE_KEY, { [input.userId]: JSON.stringify(person) });
  await redis.expire(PEOPLE_KEY, PEOPLE_TTL_SEC);
  return { person, isNew: !existing };
}

/** The whole roster, most-recently-active first. */
export async function getPeople(): Promise<RegisteredPerson[]> {
  const redis = getRedis();
  if (!redis) {
    return [...memPeople.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  }
  const raw = (await redis.hgetall(PEOPLE_KEY)) as Record<string, string> | null;
  if (!raw) return [];
  return Object.values(raw)
    .map((v) => safeParse<RegisteredPerson>(v))
    .filter((p): p is RegisteredPerson => Boolean(p))
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

function safeParse<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "object") return value as T; // SDK already deserialized
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}
