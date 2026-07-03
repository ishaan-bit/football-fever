import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";
import { firebaseConfig, firebaseEnabled } from "./config";

/**
 * Firestore for server (Node/serverless) callers — route handlers and crons.
 * Uses the *client* SDK under our security rules (no Admin SDK / service
 * account needed), on a dedicated named app with long-polling forced, which is
 * the reliable transport in serverless runtimes.
 */
const APP_NAME = "ff-server";

export function serverDb(): Firestore | null {
  if (!firebaseEnabled) return null;
  const app =
    getApps().find((a) => a.name === APP_NAME) ??
    initializeApp(firebaseConfig as Record<string, string>, APP_NAME);
  try {
    return initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    return getFirestore(app);
  }
}
