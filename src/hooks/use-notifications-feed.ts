"use client";
import { useEffect, useRef } from "react";
import { useUserStore } from "@/stores/user";
import { useNotificationStore } from "@/stores/notifications";
import type { NotifEventDTO } from "@/lib/notifications/client";
import { firebaseEnabled } from "@/lib/firebase/config";
import { toast } from "@/components/ui/sonner";

/** How often an active client runs the scheduler scan. */
const SCAN_MS = 3 * 60_000;

/**
 * App-wide notifications engine, backed entirely by Firebase (Firestore). It:
 *  - records the current user in the community roster (who shows up),
 *  - surfaces match alerts (kickoff soon / full-time score) + social pings as an
 *    in-app toast, the bell, and an OS notification when permission is granted,
 *  - runs an idempotent, client-driven scan so alerts fire without a server cron.
 * Dormant when Firebase isn't configured.
 */
export function useNotificationsFeed() {
  const profile = useUserStore((s) => s.profile);
  const pushNote = useNotificationStore((s) => s.push);

  const prof = useRef(profile);
  prof.current = profile;
  const seen = useRef<Set<string>>(new Set());
  const surfaceRef = useRef<(e: NotifEventDTO, announce: boolean) => void>(() => {});

  // Surface one event: bell always; toast + OS ping only when announcing.
  useEffect(() => {
    surfaceRef.current = (e, announce) => {
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
  }, [pushNote]);

  // Register in the roster and announce a genuine newcomer.
  useEffect(() => {
    if (!firebaseEnabled) return;
    let stop = false;
    (async () => {
      const p = prof.current;
      if (!p.name || p.name === "You") return;
      const people = await import("@/lib/firebase/people");
      const { isNew } = await people.registerPerson({
        userId: p.id,
        name: p.name,
        avatar: p.avatar,
        favoriteTeamId: p.favoriteTeamId,
      });
      if (isNew && !stop) {
        const notif = await import("@/lib/firebase/notifications");
        notif.publishJoin(p.id, p.name);
      }
    })();
    return () => {
      stop = true;
    };
  }, [profile.id, profile.name, profile.avatar, profile.favoriteTeamId]);

  // If OS alerts were already granted, keep this device's push subscription
  // registered (endpoints rotate; the stored copy must stay current).
  useEffect(() => {
    if (!firebaseEnabled) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    import("@/lib/push/client").then(({ ensurePushSubscription }) =>
      ensurePushSubscription({ id: prof.current.id, name: prof.current.name })
    );
  }, [profile.id, profile.name]);

  // Realtime feed + client-driven scheduler scan.
  useEffect(() => {
    if (!firebaseEnabled) return;
    let stopped = false;
    let unsub = () => {};
    let scanTimer: ReturnType<typeof setInterval>;
    let announced = false; // first snapshot is backlog → silent

    import("@/lib/firebase/notifications").then((notif) => {
      if (stopped) return;
      notif.scanAndPublish();
      scanTimer = setInterval(() => {
        if (!(typeof document !== "undefined" && document.hidden)) notif.scanAndPublish();
      }, SCAN_MS);
      unsub = notif.subscribeNotifications((events) => {
        for (const e of events) surfaceRef.current(e, announced);
        announced = true;
      });
    });

    return () => {
      stopped = true;
      unsub();
      clearInterval(scanTimer);
    };
  }, []);
}
