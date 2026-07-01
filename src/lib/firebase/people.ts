"use client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDb } from "./client";

/** A return after this much quiet counts as a fresh visit. */
const SESSION_GAP_MS = 30 * 60_000;

export interface RegisterInput {
  userId: string;
  name: string;
  avatar: string;
  favoriteTeamId?: string;
}

/**
 * Record/refresh a person in the durable community roster (Firestore `people`).
 * Returns whether this is a brand-new joiner so the caller can announce them.
 */
export async function registerPerson(
  input: RegisterInput
): Promise<{ isNew: boolean }> {
  const db = getDb();
  if (!db) return { isNew: false };
  try {
    const ref = doc(db, "people", input.userId);
    const snap = await getDoc(ref);
    const now = Date.now();
    const existing = snap.exists() ? (snap.data() as Record<string, number>) : null;
    const isNew = !existing;
    const returning = existing && now - (existing.lastSeen ?? 0) > SESSION_GAP_MS;
    await setDoc(
      ref,
      {
        userId: input.userId,
        name: input.name,
        avatar: input.avatar,
        favoriteTeamId: input.favoriteTeamId ?? null,
        firstSeen: existing?.firstSeen ?? now,
        lastSeen: now,
        visits: (existing?.visits ?? 0) + (!existing || returning ? 1 : 0),
      },
      { merge: true }
    );
    return { isNew };
  } catch {
    return { isNew: false };
  }
}
