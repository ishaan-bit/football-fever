"use client";
import { useEffect, useRef } from "react";
import { useUserStore } from "@/stores/user";
import { useNotificationStore } from "@/stores/notifications";
import { roomsLive, registerMe } from "@/lib/rooms/client";
import { fetchNotifications, triggerScan, type NotifEventDTO } from "@/lib/notifications/client";
import { toast } from "@/components/ui/sonner";

const POLL_MS = 30_000;
/** How often an active client pokes the scheduler scan (Cron fallback). */
const SCAN_EVERY = 6; // × POLL_MS ≈ every 3 min
/** On first load, backfill the bell with the last hour (no toast/OS ping). */
const BACKFILL_MS = 60 * 60 * 1000;

/**
 * App-wide notifications engine. When a real backend is live it:
 *  - records the current user in the community roster (tracking who shows up),
 *  - polls the shared feed for match alerts (kickoff soon / full-time result)
 *    and social pings, surfacing new ones as an in-app toast, the bell, and an
 *    OS notification when the user has granted permission,
 *  - nudges the scheduler scan so alerts still fire without Vercel Cron.
 * In pure demo mode (no backend) it stays completely dormant.
 */
export function useNotificationsFeed() {
  const profile = useUserStore((s) => s.profile);
  const pushNote = useNotificationStore((s) => s.push);

  const liveRef = useRef(false);
  const sinceRef = useRef(0);
  const firstRef = useRef(true);
  const seen = useRef<Set<string>>(new Set());
  const prof = useRef(profile);
  prof.current = profile;

  // Register in the roster once we're live and have a real nickname.
  useEffect(() => {
    let stop = false;
    roomsLive().then((isLive) => {
      liveRef.current = isLive;
      if (stop || !isLive) return;
      if (profile.name && profile.name !== "You") {
        registerMe({
          userId: profile.id,
          name: profile.name,
          avatar: profile.avatar,
          favoriteTeamId: profile.favoriteTeamId,
        });
      }
    });
    return () => {
      stop = true;
    };
  }, [profile.id, profile.name, profile.avatar, profile.favoriteTeamId]);

  // Poll the feed + periodically poke the scan.
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    let ticks = 0;

    const surface = (e: NotifEventDTO, announce: boolean) => {
      if (seen.current.has(e.id)) return;
      seen.current.add(e.id);
      // Don't announce my own arrival back to me.
      if (e.type === "join" && e.userId && e.userId === prof.current.id) return;

      pushNote({
        id: e.id,
        kind: e.kind,
        title: e.title,
        body: e.body,
        matchId: e.matchId,
        accent: e.accent,
        href: e.href,
      });

      if (!announce) return;
      toast(e.title, { description: e.body });
      // OS-level notification when the tab is backgrounded and allowed.
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        typeof navigator !== "undefined" &&
        navigator.serviceWorker
      ) {
        navigator.serviceWorker.ready
          .then((reg) =>
            reg.showNotification(e.title, {
              body: e.body,
              icon: "/icons/icon-192.png",
              badge: "/icons/badge-72.png",
              tag: e.id,
              data: { url: e.href ?? "/" },
            })
          )
          .catch(() => {});
      }
    };

    const loop = async () => {
      if (liveRef.current && !(typeof document !== "undefined" && document.hidden)) {
        // Nudge the scheduler occasionally so alerts fire without Cron.
        if (ticks % SCAN_EVERY === 0) await triggerScan();
        ticks++;

        const since = firstRef.current ? Date.now() - BACKFILL_MS : sinceRef.current;
        const { events, now } = await fetchNotifications(since);
        if (!stop) {
          // First pass backfills the bell silently; later passes announce.
          for (const e of events) surface(e, !firstRef.current);
          sinceRef.current = now;
          firstRef.current = false;
        }
      }
      timer = setTimeout(loop, POLL_MS);
    };

    // Kick off shortly after mount so roomsLive() has resolved.
    timer = setTimeout(loop, 1200);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [pushNote]);
}
