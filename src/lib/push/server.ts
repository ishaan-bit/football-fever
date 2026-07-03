import webpush from "web-push";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { serverDb } from "@/lib/firebase/server-db";

/**
 * Web Push dispatch (standard VAPID protocol — the same transport FCM uses for
 * the web). Subscriptions live in Firestore (`pushSubs`); alert docs live in
 * `notifications`. The scan route calls `dispatchUnpushed` after scanning: any
 * recent alert that hasn't been pushed yet goes out to every subscription, then
 * gets stamped `pushedAt` so it is only ever pushed once — no matter whether a
 * client scan or a server scan created it.
 */

/** Env values can arrive with a stray BOM/whitespace (e.g. piped-in secrets). */
const cleanEnv = (v: string | undefined): string | undefined => {
  if (!v) return undefined;
  let t = v.trim();
  while (t.charCodeAt(0) === 0xfeff) t = t.slice(1).trim();
  return t || undefined;
};

const vapidPublic = cleanEnv(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
const vapidPrivate = cleanEnv(process.env.VAPID_PRIVATE_KEY);
const vapidSubject = cleanEnv(process.env.VAPID_SUBJECT) ?? "mailto:admin@example.com";

export const pushConfigured = Boolean(vapidPublic && vapidPrivate);

/** Only alerts created within this window are eligible for OS push. */
const PUSH_MAX_AGE_MS = 2 * 60 * 60 * 1000;
/** Pushes expire at the push service if undelivered for this long (seconds). */
const PUSH_TTL_SEC = 3600;

interface StoredSub {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userId?: string;
}

interface AlertDoc {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  href?: string;
  userId?: string;
  ts?: number;
  pushedAt?: number;
}

export interface DispatchResult {
  eligible: number;
  sent: number;
  failed: number;
  removedSubs: number;
}

/** Send every recent, not-yet-pushed alert to all live subscriptions. */
export async function dispatchUnpushed(): Promise<DispatchResult> {
  const result: DispatchResult = { eligible: 0, sent: 0, failed: 0, removedSubs: 0 };
  const db = serverDb();
  if (!db || !pushConfigured) return result;

  webpush.setVapidDetails(vapidSubject, vapidPublic!, vapidPrivate!);

  // Recent alerts still awaiting a push.
  const now = Date.now();
  const alertSnap = await getDocs(
    query(collection(db, "notifications"), orderBy("ts", "desc"), limit(50))
  );
  const due: AlertDoc[] = [];
  alertSnap.forEach((d) => {
    const a = d.data() as AlertDoc;
    if (!a.pushedAt && typeof a.ts === "number" && now - a.ts <= PUSH_MAX_AGE_MS) {
      due.push({ ...a, id: d.id });
    }
  });
  result.eligible = due.length;
  if (!due.length) return result;

  // All subscriptions.
  const subSnap = await getDocs(collection(db, "pushSubs"));
  const subs: StoredSub[] = [];
  subSnap.forEach((d) => {
    const s = d.data() as Omit<StoredSub, "id">;
    if (s?.endpoint && s?.keys?.p256dh && s?.keys?.auth) subs.push({ ...s, id: d.id });
  });

  const dead = new Set<string>();
  for (const alert of due) {
    const payload = JSON.stringify({
      title: alert.title ?? "Football Fever",
      body: alert.body ?? "",
      tag: alert.id,
      url: alert.href ?? "/",
    });
    for (const sub of subs) {
      if (dead.has(sub.id)) continue;
      // Don't push someone's own join back at them.
      if (alert.type === "join" && alert.userId && alert.userId === sub.userId) continue;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload,
          { TTL: PUSH_TTL_SEC }
        );
        result.sent++;
      } catch (err) {
        result.failed++;
        const status = (err as { statusCode?: number })?.statusCode;
        // Gone/expired subscription — drop it so we stop paying for it.
        if (status === 404 || status === 410) dead.add(sub.id);
      }
    }
    // Stamp as pushed so no future dispatch repeats it.
    try {
      await setDoc(doc(db, "notifications", alert.id), { pushedAt: now }, { merge: true });
    } catch {
      /* if this fails the alert may re-push next tick — acceptable */
    }
  }

  for (const id of dead) {
    try {
      await deleteDoc(doc(db, "pushSubs", id));
      result.removedSubs++;
    } catch {
      /* best-effort */
    }
  }

  return result;
}
