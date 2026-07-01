"use client";
import { usePathname } from "next/navigation";
import { TopBar } from "./top-bar";
import { MobileDock } from "./mobile-dock";
import { AIHostOrb } from "./ai-host-orb";
import { CommandPalette } from "./command-palette";
import { Onboarding } from "./onboarding";
import { GuidedTour } from "./guided-tour";
import { ChatDock } from "@/components/social/chat-dock";
import { LiveTicker } from "./live-ticker";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The match room is immersive — it manages its own top chrome + room chat.
  const immersive = pathname.startsWith("/match/");

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      {!immersive && <TopBar />}
      {/* extra bottom padding clears the mobile dock + AI orb + presence pill +
          the always-on live ticker so page content never scrolls under them */}
      <main className="relative z-0 flex-1 pb-44 lg:pb-20">{children}</main>
      <MobileDock />
      <AIHostOrb />
      {!immersive && <ChatDock />}
      <CommandPalette />
      <Onboarding />
      {/* first-run guided tour (runs after onboarding; replayable from profile) */}
      <GuidedTour />
      {/* the always-on bottom crawl: live scores + peace feed */}
      <LiveTicker />
    </div>
  );
}
