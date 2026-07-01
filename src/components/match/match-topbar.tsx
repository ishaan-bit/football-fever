"use client";
import Link from "next/link";
import { ArrowLeft, Share2, Volume2, VolumeX } from "lucide-react";
import type { Match } from "@/types";
import { getTeam } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { StatusPill, stageLabel } from "@/components/shared/status-pill";
import { useUiStore } from "@/stores/ui";
import { toast } from "@/components/ui/sonner";

export function MatchTopbar({ match }: { match: Match }) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const sound = useUiStore((s) => s.sound);
  const toggleSound = useUiStore((s) => s.toggleSound);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: `${home?.name} vs ${away?.name}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Room link copied", { description: "Send it to the group chat." });
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <header className="sticky top-0 z-40 safe-top">
      <div className="glass border-b border-white/[0.06]">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:px-5">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link href="/fixtures"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">
              {home?.name ?? match.homeLabel ?? "TBD"} <span className="text-muted-foreground">v</span> {away?.name ?? match.awayLabel ?? "TBD"}
            </p>
            <p className="text-[11px] text-muted-foreground">{stageLabel(match.stage, match.group)}</p>
          </div>
          <StatusPill match={match} />
          <Button variant="ghost" size="icon" onClick={toggleSound} aria-label="Toggle sound">
            {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={share} aria-label="Share room">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
