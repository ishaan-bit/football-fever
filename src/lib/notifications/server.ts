import { getRedis } from "@/lib/redis";
import { computeDueAlerts } from "./compute";
import type { Match } from "@/types";

/**
 * The shared notifications feed — a small, backend-driven stream that any
 * client can poll to surface match alerts (kickoff soon, full-time result) and
 * social pings (someone new joined). Deduped so a given alert is only ever
 * created once, even when the scheduler and live clients both run the scan.
 */

const EVENTS_KEY = "ff:notif:events";
const sentKey = (k: string) => `ff:notif:sent:${k}`;
/** Retained history + how long a "sent" marker blocks a duplicate. */
const CAP = 100;
const TTL_SEC = 60 * 60 * 24 * 3;

export type NotifType = "prematch" | "result" | "join";

export interface NotifEvent {
  id: string;
  type: NotifType;
  /** Maps onto the app's NotificationKind for the bell icon. */
  kind: "kickoff" | "fulltime" | "friend_joined";
  title: string;
  body: string;
  matchId?: string;
  href?: string;
  accent?: string;
  /** For "join" events — who joined, so clients can skip announcing themselves. */
  userId?: string;
  ts: number;
  createdAt: string;
}

const g = globalThis as unknown as {
  __ffNotifEvents?: NotifEvent[];
  __ffNotifSent?: Set<string>;
};
const memEvents: NotifEvent[] = (g.__ffNotifEvents ??= []);
const memSent: Set<string> = (g.__ffNotifSent ??= new Set());

function parse(value: unknown): NotifEvent | null {
  if (value == null) return null;
  if (typeof value === "object") return value as NotifEvent;
  try {
    return JSON.parse(String(value)) as NotifEvent;
  } catch {
    return null;
  }
}

/** Claim a one-shot marker. Returns true only the first time for a given key. */
async function claimOnce(key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    if (memSent.has(key)) return false;
    memSent.add(key);
    return true;
  }
  const res = await redis.set(sentKey(key), "1", { nx: true, ex: TTL_SEC });
  return res !== null;
}

export async function pushEvent(
  e: Omit<NotifEvent, "ts" | "createdAt">
): Promise<NotifEvent> {
  const now = Date.now();
  const stored: NotifEvent = { ...e, ts: now, createdAt: new Date(now).toISOString() };
  const redis = getRedis();
  if (!redis) {
    memEvents.push(stored);
    if (memEvents.length > CAP) memEvents.splice(0, memEvents.length - CAP);
    return stored;
  }
  await redis.rpush(EVENTS_KEY, JSON.stringify(stored));
  await redis.ltrim(EVENTS_KEY, -CAP, -1);
  await redis.expire(EVENTS_KEY, TTL_SEC);
  return stored;
}

/** Events created after `since` (epoch ms), oldest first. */
export async function getEvents(since = 0): Promise<NotifEvent[]> {
  const redis = getRedis();
  if (!redis) return memEvents.filter((e) => e.ts > since);
  const raw = (await redis.lrange(EVENTS_KEY, 0, -1)) as string[];
  return raw
    .map(parse)
    .filter((e): e is NotifEvent => Boolean(e) && e!.ts > since);
}

/**
 * The scheduler's heart: scan the fixtures and create any alerts that are now
 * due. Pure w.r.t. the match list passed in, idempotent via `claimOnce`, so
 * it's safe to call from a cron *and* from active clients.
 *
 * - Pre-match: a game kicking off within the next hour.
 * - Result: a game that has finished, with the final score.
 */
export async function scanMatches(matches: Match[], now: number): Promise<NotifEvent[]> {
  const created: NotifEvent[] = [];
  for (const a of computeDueAlerts(matches, now)) {
    if (await claimOnce(a.id)) {
      created.push(
        await pushEvent({
          id: a.id,
          type: a.type,
          kind: a.kind,
          title: a.title,
          body: a.body,
          matchId: a.matchId,
          href: a.href,
          accent: a.accent,
        })
      );
    }
  }
  return created;
}
