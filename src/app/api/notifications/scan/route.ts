import { NextResponse } from "next/server";
import { loadMatches } from "@/lib/worldcup";
import { scanToFirestore } from "@/lib/firebase/server-scan";
import { firebaseEnabled } from "@/lib/firebase/config";
import { dispatchUnpushed, pushConfigured } from "@/lib/push/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The scheduler tick — hit by the GitHub Actions cron (~10 min), the daily
 * Vercel cron, and active clients. Two idempotent steps:
 *  1. Scan the fixtures and write any now-due alerts to Firestore (deduped by
 *     deterministic doc id, shared with the client-driven scan).
 *  2. Web-push every recent alert that hasn't been pushed yet to all stored
 *     subscriptions — this is what reaches phones with the app fully closed —
 *     then stamp it `pushedAt` so it never pushes twice.
 */
export async function GET() {
  const now = Date.now();
  const noStore = { headers: { "Cache-Control": "no-store" } };
  if (!firebaseEnabled) {
    return NextResponse.json({ enabled: false, created: 0 }, noStore);
  }
  const matches = await loadMatches(now);
  const created = await scanToFirestore(matches, now);
  const push = await dispatchUnpushed();
  return NextResponse.json(
    {
      enabled: true,
      scanned: matches.length,
      created: created.length,
      events: created.map((e) => ({ id: e.id, type: e.type, title: e.title })),
      push: { configured: pushConfigured, ...push },
      now,
    },
    noStore
  );
}
