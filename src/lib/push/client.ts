"use client";
import { firebaseEnabled } from "@/lib/firebase/config";

/**
 * Browser side of Web Push: subscribe this device via the standard Push API
 * (VAPID) and store the subscription in Firestore so the server can reach it —
 * that's what makes match alerts arrive even when the app is fully closed.
 * On iOS this requires the app to be installed to the home screen (16.4+).
 */

// Strip any stray BOM/whitespace the env value may carry (piped-in secrets).
const vapidPublic = (() => {
  let v = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
  while (v.charCodeAt(0) === 0xfeff) v = v.slice(1).trim();
  return v || undefined;
})();

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  typeof Notification !== "undefined";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Deterministic Firestore doc id for a subscription endpoint. */
function subId(endpoint: string): string {
  const b64 = btoa(endpoint).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return b64.slice(-140); // endpoint tails are unique; keeps ids well under limits
}

/**
 * Ensure this device has a push subscription and that it's stored in Firestore.
 * Call after Notification permission is granted (or on load when it already
 * is). Silently no-ops when unsupported or unconfigured.
 */
export async function ensurePushSubscription(user: {
  id: string;
  name: string;
}): Promise<boolean> {
  if (!pushSupported() || !vapidPublic || !firebaseEnabled) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublic),
      }));

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    const { getDb } = await import("@/lib/firebase/client");
    const { doc, setDoc } = await import("firebase/firestore");
    const db = getDb();
    if (!db) return false;

    await setDoc(doc(db, "pushSubs", subId(json.endpoint)), {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userId: user.id,
      name: user.name,
      ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 160) : "",
      createdAt: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}
