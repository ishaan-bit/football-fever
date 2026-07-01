"use client";
import type { Match } from "@/types";
import { useMatchClock } from "@/hooks/use-match-clock";
import { formatInTz } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STAGE_LABEL: Record<Match["stage"], string> = {
  group: "Group",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-final",
  sf: "Semi-final",
  third: "3rd place",
  final: "Final",
};

export function stageLabel(stage: Match["stage"], group?: string) {
  return stage === "group" && group ? `Group ${group}` : STAGE_LABEL[stage];
}

/** Live status chip: pulsing LIVE + minute, HT, FT, or the IST kickoff time. */
export function StatusPill({ match, className }: { match: Match; className?: string }) {
  const clock = useMatchClock(match.kickoff, match.status);

  if (!clock.mounted) {
    return <span className={cn("inline-flex h-5 items-center text-xs text-muted-foreground", className)}>—</span>;
  }

  if (clock.status === "live") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2 py-0.5 text-xs font-bold text-live", className)}>
        <span className="live-dot" />
        {clock.minute}'
      </span>
    );
  }
  if (clock.status === "halftime") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold", className)}>
        HT
      </span>
    );
  }
  if (clock.status === "finished") {
    return (
      <span className={cn("inline-flex items-center rounded-full bg-white/[0.08] px-2 py-0.5 text-xs font-semibold text-muted-foreground", className)}>
        FT
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-foreground/80", className)}>
      {formatInTz(match.kickoff, "Asia/Kolkata", { hour: "2-digit", minute: "2-digit", hour12: false })} IST
    </span>
  );
}
