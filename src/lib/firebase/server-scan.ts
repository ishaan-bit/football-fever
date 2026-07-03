import { doc, getDoc, setDoc } from "firebase/firestore";
import { serverDb } from "./server-db";
import { computeDueAlerts, type DueAlert } from "@/lib/notifications/compute";
import type { Match } from "@/types";

/**
 * Server-side scheduler scan (invoked by the crons). Writes due alerts straight
 * to Firestore under our security rules — no Admin SDK or service account
 * required. Idempotent via deterministic doc ids, so it composes safely with
 * the client-driven scan.
 */
export async function scanToFirestore(matches: Match[], now: number): Promise<DueAlert[]> {
  const db = serverDb();
  if (!db) return [];

  const created: DueAlert[] = [];
  for (const a of computeDueAlerts(matches, now)) {
    const ref = doc(db, "notifications", a.id);
    try {
      if ((await getDoc(ref)).exists()) continue;
      await setDoc(ref, {
        id: a.id,
        type: a.type,
        kind: a.kind,
        title: a.title,
        body: a.body,
        matchId: a.matchId,
        href: a.href,
        accent: a.accent,
        ts: Date.now(),
        createdAt: new Date().toISOString(),
      });
      created.push(a);
    } catch {
      /* skip this one; the next scan retries */
    }
  }
  return created;
}
