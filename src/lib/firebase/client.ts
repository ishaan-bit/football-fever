"use client";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  type Firestore,
  initializeFirestore,
} from "firebase/firestore";
import { firebaseConfig, firebaseEnabled } from "./config";

/**
 * Firebase client — the real backend for live presence, chat, the community
 * roster and match alerts. This module pulls in the (heavy) Firebase SDK, so it
 * is only ever reached through the provider modules' dynamic imports; check
 * `firebaseEnabled` from ./config (SDK-free) to gate on availability.
 */
let db: Firestore | null = null;

/** Lazily-initialized Firestore singleton. Null when unconfigured. */
export function getDb(): Firestore | null {
  if (!firebaseEnabled || typeof window === "undefined") return null;
  if (db) return db;
  const app: FirebaseApp = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig as Record<string, string>);
  try {
    // Long-polling auto-detect keeps realtime working behind strict proxies.
    db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    db = getFirestore(app);
  }
  return db;
}
