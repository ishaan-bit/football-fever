"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useUiStore } from "@/stores/ui";
import { useUserStore } from "@/stores/user";
import { setLiveMatches } from "@/lib/data/live-store";

/** Fetches the live World Cup feed on mount and polls it, populating the
 *  client match override that getMatches()/getMatch() read from. Silently
 *  degrades to the seed dataset if the endpoint is unavailable. */
function LiveData() {
  React.useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/matches", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { matches?: unknown };
        if (active && Array.isArray(data.matches)) {
          setLiveMatches(data.matches as never);
        }
      } catch {
        /* keep the seed fallback */
      }
    };
    load();
    const ms = Number(process.env.NEXT_PUBLIC_LIVE_POLL_MS) || 20000;
    const id = setInterval(load, ms);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);
  return null;
}

/** Applies the persisted theme to <html> and registers the service worker. */
function ThemeAndSW() {
  const theme = useUiStore((s) => s.theme);
  const ensureIdentity = useUserStore((s) => s.ensureIdentity);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.style.colorScheme = theme;
  }, [theme]);

  React.useEffect(() => {
    ensureIdentity();
  }, [ensureIdentity]);

  React.useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={300}>
      <ThemeAndSW />
      <LiveData />
      {children}
      <Toaster />
    </TooltipProvider>
  );
}
