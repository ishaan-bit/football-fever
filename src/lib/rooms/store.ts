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
const g = globalThis as unknown as { __ffRooms?: Map<string, MemRoom> };
const memory: Map<string, MemRoom> = (g.__ffRooms ??= new Map());

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

function safeParse<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "object") return value as T; // SDK already deserialized
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}
