"use client";
import { useEffect, useState } from "react";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icon";
import { useNotificationStore, NOTIFICATION_ICON } from "@/stores/notifications";
import { useHydrated } from "@/hooks/use-hydrated";
import { relativeTime, hslVar } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSound } from "@/hooks/use-sound";
import { useHaptics } from "@/hooks/use-haptics";

const PANEL_SPRING = { type: "spring" as const, stiffness: 340, damping: 30 };
const POP_SPRING = { type: "spring" as const, stiffness: 500, damping: 24 };

export function NotificationsButton() {
  const items = useNotificationStore((s) => s.items);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const markRead = useNotificationStore((s) => s.markRead);
  const hydrated = useHydrated();
  const now = useNow(30000);
  const unread = hydrated ? items.filter((i) => !i.read).length : 0;

  const reduced = useReducedMotion();
  const { play } = useSound();
  const { buzz } = useHaptics();

  // OS-level alert permission (kickoff pings + full-time scores surface even
  // when the tab is backgrounded). We only prompt on an explicit tap.
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");
  useEffect(() => {
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
  }, []);
  const enableAlerts = async () => {
    if (typeof Notification === "undefined") return;
    play("click");
    buzz("tap");
    try {
      setPerm(await Notification.requestPermission());
    } catch {
      /* dismissed */
    }
  };

  const handleMarkAll = () => {
    markAllRead();
    play("swoosh");
    buzz("success");
  };
  const handleMarkRead = (id: string) => {
    markRead(id);
    play("click");
    buzz("tap");
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          {/* Bell gently swings when there's unread — a soft "ring" tell. */}
          <motion.span
            className="grid place-items-center"
            animate={unread > 0 && !reduced ? { rotate: [0, -12, 10, -6, 4, 0] } : { rotate: 0 }}
            transition={
              unread > 0 && !reduced
                ? { duration: 0.9, repeat: Infinity, repeatDelay: 3.4, ease: "easeInOut" }
                : { duration: 0.2 }
            }
            style={{ transformOrigin: "50% 20%" }}
          >
            <Bell className="h-5 w-5" />
          </motion.span>
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={POP_SPRING}
                className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-live px-1 text-[10px] font-bold text-white"
              >
                {/* Soft pulsing halo around the badge. */}
                {!reduced && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-live"
                    animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={unread}
                    initial={{ y: reduced ? 0 : -8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: reduced ? 0 : 8, opacity: 0 }}
                    transition={POP_SPRING}
                    className="relative"
                  >
                    {unread > 9 ? "9+" : unread}
                  </motion.span>
                </AnimatePresence>
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md overflow-hidden p-0">
        {/* Aurora accent wash behind the header for a live, vibrant feel. */}
        <div className="relative">
          {!reduced && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-16 h-40 opacity-60 blur-2xl"
              style={{
                background: `radial-gradient(60% 100% at 20% 0%, ${hslVar("var(--electric)", 0.28)}, transparent 70%), radial-gradient(60% 100% at 85% 0%, ${hslVar("var(--brand-violet)", 0.26)}, transparent 70%)`,
              }}
              animate={{ opacity: [0.35, 0.6, 0.35] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <SheetHeader className="relative flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle>Notifications</SheetTitle>
              <AnimatePresence>
                {unread > 0 && (
                  <motion.span
                    key="unread-pill"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={POP_SPRING}
                    className="relative flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: hslVar("var(--live)", 0.14), color: hslVar("var(--live)") }}
                  >
                    {!reduced && (
                      <motion.span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full bg-live"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                    {unread} new
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-1">
              {hydrated && perm === "default" && (
                <motion.button
                  onClick={enableAlerts}
                  whileHover={reduced ? undefined : { y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-electric transition hover:text-electric/80"
                >
                  <BellRing className="h-3.5 w-3.5" /> Enable alerts
                </motion.button>
              )}
              <motion.button
                onClick={handleMarkAll}
                whileHover={reduced ? undefined : { y: -2 }}
                whileTap={{ scale: 0.94 }}
                className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </motion.button>
            </div>
          </SheetHeader>
        </div>
        <div className="max-h-[calc(100dvh-5rem)] space-y-1.5 overflow-y-auto px-3 pb-6">
          {items.length === 0 && (
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={PANEL_SPRING}
              className="px-3 py-10 text-center text-sm text-muted-foreground"
            >
              You&apos;re all caught up. 🎉
            </motion.p>
          )}
          <AnimatePresence initial={false}>
            {items.map((n, idx) => {
              const inner = (
                <motion.div
                  className={`relative flex gap-3 overflow-hidden rounded-2xl border border-white/[0.06] p-3 transition hover:bg-white/[0.04] ${
                    n.read ? "opacity-60" : ""
                  }`}
                  whileHover={reduced ? undefined : { y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Unread rows get a faint accent glow along the leading edge. */}
                  {!n.read && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-full"
                      style={{ background: hslVar(n.accent ?? "var(--electric)", 0.6) }}
                    />
                  )}
                  <div
                    className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                    style={{ background: hslVar(n.accent ?? "var(--electric)", 0.13), color: hslVar(n.accent ?? "var(--electric)") }}
                  >
                    {/* Breathing halo on unread icons. */}
                    {!n.read && !reduced && (
                      <motion.span
                        aria-hidden
                        className="absolute inset-0 rounded-xl"
                        style={{ boxShadow: `0 0 0 0 ${hslVar(n.accent ?? "var(--electric)", 0.5)}` }}
                        animate={{ boxShadow: [
                          `0 0 0 0 ${hslVar(n.accent ?? "var(--electric)", 0.45)}`,
                          `0 0 0 6px ${hslVar(n.accent ?? "var(--electric)", 0)}`,
                        ] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}
                    <Icon name={NOTIFICATION_ICON[n.kind]} className="relative h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{n.title}</p>
                      {hydrated && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {relativeTime(n.createdAt, now || Date.now())}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  </div>
                  {!n.read && (
                    <motion.span
                      className="relative mt-1.5 h-2 w-2 shrink-0 rounded-full bg-electric"
                      animate={reduced ? undefined : { scale: [1, 1.35, 1], opacity: [1, 0.6, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                </motion.div>
              );
              const rowProps = {
                initial: reduced ? false : ({ opacity: 0, y: 8, scale: 0.98 } as const),
                animate: { opacity: 1, y: 0, scale: 1 },
                exit: reduced ? undefined : ({ opacity: 0, x: 24, height: 0, marginTop: 0 } as const),
                transition: { ...PANEL_SPRING, delay: reduced ? 0 : Math.min(idx * 0.04, 0.3) },
              };
              return n.href ? (
                <SheetClose asChild key={n.id}>
                  <motion.div {...rowProps} layout={!reduced}>
                    <Link href={n.href} onClick={() => handleMarkRead(n.id)} className="block">
                      {inner}
                    </Link>
                  </motion.div>
                </SheetClose>
              ) : (
                <motion.button
                  key={n.id}
                  {...rowProps}
                  layout={!reduced}
                  onClick={() => handleMarkRead(n.id)}
                  className="block w-full text-left"
                >
                  {inner}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
