"use client";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { getDb } from "./client";
import type { PresenceMember, PresenceStatus } from "@/types";

/** A member is "live" while their heartbeat is younger than this. */
const PRESENCE_TTL_MS = 20_000;

export interface PresenceInput {
  userId: string;
  name: string;
  avatar: string;
  status?: PresenceStatus;
  favoriteTeamId?: string;
}

const memberDoc = (roomId: string, userId: string) =>
  doc(getDb()!, "rooms", roomId, "presence", userId);

/** Announce/refresh me in the room. */
export async function heartbeat(roomId: string, input: PresenceInput): Promise<void> {
  if (!getDb()) return;
  try {
    await setDoc(memberDoc(roomId, input.userId), {
      userId: input.userId,
      name: input.name,
      avatar: input.avatar,
      status: input.status ?? "watching",
      favoriteTeamId: input.favoriteTeamId ?? null,
      ts: Date.now(),
    });
  } catch {
    /* transient; the next heartbeat retries */
  }
}

/** Remove me from the room (called on unmount/close). */
export async function leave(roomId: string, userId: string): Promise<void> {
  if (!getDb()) return;
  try {
    await deleteDoc(memberDoc(roomId, userId));
  } catch {
    /* best-effort */
  }
}

/**
 * Subscribe to a room's live members. Fires immediately and on every change —
 * this is what makes the Lounge reflect real people the instant they join or
 * leave. Returns an unsubscribe function.
 */
export function subscribePresence(
  roomId: string,
  cb: (members: PresenceMember[]) => void
): () => void {
  const db = getDb();
  if (!db) return () => {};
  const col = collection(db, "rooms", roomId, "presence");
  return onSnapshot(
    col,
    (snap) => {
      const now = Date.now();
      const members: PresenceMember[] = [];
      snap.forEach((d) => {
        const m = d.data() as Record<string, unknown>;
        const ts = typeof m.ts === "number" ? m.ts : 0;
        if (now - ts < PRESENCE_TTL_MS) {
          members.push({
            userId: String(m.userId),
            name: String(m.name),
            avatar: String(m.avatar ?? ""),
            status: (m.status as PresenceStatus) ?? "watching",
            matchId: roomId,
          });
        }
      });
      members.sort((a, b) => (a.userId < b.userId ? -1 : 1));
      cb(members);
    },
    () => cb([])
  );
}
