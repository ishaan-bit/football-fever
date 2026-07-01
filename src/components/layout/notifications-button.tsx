"use client";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icon";
import { useNotificationStore, NOTIFICATION_ICON } from "@/stores/notifications";
import { useHydrated } from "@/hooks/use-hydrated";
import { relativeTime, hslVar } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";

export function NotificationsButton() {
  const items = useNotificationStore((s) => s.items);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const markRead = useNotificationStore((s) => s.markRead);
  const hydrated = useHydrated();
  const now = useNow(30000);
  const unread = hydrated ? items.filter((i) => !i.read).length : 0;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-live px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md p-0">
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>Notifications</SheetTitle>
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        </SheetHeader>
        <div className="max-h-[calc(100dvh-5rem)] space-y-1.5 overflow-y-auto px-3 pb-6">
          {items.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">You're all caught up. 🎉</p>
          )}
          {items.map((n) => {
            const inner = (
              <div
                className={`flex gap-3 rounded-2xl border border-white/[0.06] p-3 transition hover:bg-white/[0.04] ${
                  n.read ? "opacity-60" : ""
                }`}
              >
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                  style={{ background: hslVar(n.accent ?? "var(--electric)", 0.13), color: hslVar(n.accent ?? "var(--electric)") }}
                >
                  <Icon name={NOTIFICATION_ICON[n.kind]} className="h-4 w-4" />
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
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-electric" />}
              </div>
            );
            return n.href ? (
              <SheetClose asChild key={n.id}>
                <Link href={n.href} onClick={() => markRead(n.id)} className="block">
                  {inner}
                </Link>
              </SheetClose>
            ) : (
              <button key={n.id} onClick={() => markRead(n.id)} className="block w-full text-left">
                {inner}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
