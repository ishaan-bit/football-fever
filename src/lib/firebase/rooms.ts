"use client";
import {
  collection,
  doc,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { getDb } from "./client";
import type { ChatMessage } from "@/types";

/** Retained chat history per room. */
const MSG_LIMIT = 100;

/** Firestore rejects undefined — drop any undefined fields before writing. */
function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

/** Publish a message so everyone in the room sees it in realtime. */
export async function publishMessage(roomId: string, msg: ChatMessage): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await setDoc(doc(db, "rooms", roomId, "messages", msg.id), clean({ ...msg }));
  } catch {
    /* best-effort; optimistic local copy already rendered */
  }
}

/**
 * Subscribe to a room's chat (last N messages, chronological). ISO `createdAt`
 * sorts lexicographically = chronologically. Returns an unsubscribe function.
 */
export function subscribeMessages(
  roomId: string,
  cb: (messages: ChatMessage[]) => void
): () => void {
  const db = getDb();
  if (!db) return () => {};
  const q = query(
    collection(db, "rooms", roomId, "messages"),
    orderBy("createdAt"),
    limitToLast(MSG_LIMIT)
  );
  return onSnapshot(
    q,
    (snap) => {
      const messages: ChatMessage[] = [];
      snap.forEach((d) => messages.push(d.data() as ChatMessage));
      cb(messages);
    },
    () => {}
  );
}
