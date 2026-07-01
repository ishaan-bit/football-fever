"use client";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { getDb } from "./client";
import { computeDueAlerts } from "@/lib/notifications/compute";
import type { NotifEventDTO } from "@/lib/notifications/client";

/**
 * Firestore-backed notifications feed + scheduler. The scan runs client-side
 * (any active tab), reads the fixtures from /api/matches, and writes due alerts
 * as documents keyed by a deterministic id — so a given alert is created once,
 * no matter how many clients scan. Reads are cheap because only *due* alerts
 * ever touch Firestore.
 */

/** Create a notification doc only if it doesn't already exist (dedupe). */
async function createIfAbsent(id: string, data: Record<string, unknown>): Promise<void> {
  const db = getDb();
  if (!db) return;
  const ref = doc(db, "notifications", id);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return;
    const now = Date.now();
    await setDoc(ref, { ...data, ts: now, createdAt: new Date(now).toISOString() });
  } catch {
    /* best-effort */
  }
}

/** Scan the fixtures and publish any pre-match / full-time alerts now due. */
export async function scanAndPublish(): Promise<void> {
  if (!getDb()) return;
  let matches: unknown;
  try {
    const res = await fetch("/api/matches", { cache: "no-store" });
    if (!res.ok) return;
    matches = (await res.json())?.matches;
  } catch {
    return;
  }
  if (!Array.isArray(matches)) return;
  for (const a of computeDueAlerts(matches, Date.now())) {
    await createIfAbsent(a.id, {
      id: a.id,
      type: a.type,
      kind: a.kind,
      title: a.title,
      body: a.body,
      matchId: a.matchId,
      href: a.href,
      accent: a.accent,
    });
  }
}

/** Announce a genuine newcomer (once, ever). */
export async function publishJoin(userId: string, name: string): Promise<void> {
  await createIfAbsent(`join:${userId}`, {
    id: `join:${userId}`,
    type: "join",
    kind: "friend_joined",
    title: `${name} joined the party`,
    body: `${name} just pulled up to Football Fever. Say hi 👋`,
    href: "/",
    accent: "var(--electric)",
    userId,
  });
}

/** Subscribe to the live notifications feed (oldest-first). */
export function subscribeNotifications(
  cb: (events: NotifEventDTO[]) => void
): () => void {
  const db = getDb();
  if (!db) return () => {};
  const q = query(collection(db, "notifications"), orderBy("ts", "desc"), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const events: NotifEventDTO[] = [];
      snap.forEach((d) => events.push(d.data() as NotifEventDTO));
      events.reverse();
      cb(events);
    },
    () => {}
  );
}
