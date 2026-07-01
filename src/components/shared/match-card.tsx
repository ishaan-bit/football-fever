"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, ChevronRight } from "lucide-react";
import type { Match } from "@/types";
import { getTeam, getVenue } from "@/lib/data";
import { TeamCrest } from "./team-crest";
import { StatusPill, stageLabel } from "./status-pill";
import { CountdownInline } from "./countdown";
import { useMatchClock } from "@/hooks/use-match-clock";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  match: Match;
  variant?: "default" | "compact";
  className?: string;
}

function TeamRow({
  teamId, label, score, align = "left", winner,
}: {
  teamId: string | null;
  label?: string;
  score: number | null;
  align?: "left" | "right";
  winner?: boolean;
}) {
  const team = getTeam(teamId);
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2.5", align === "right" && "flex-row-reverse text-right")}>
      <TeamCrest team={team} size="md" />
      <div className={cn("min-w-0", align === "right" && "text-right")}>
        <p className={cn("truncate text-sm font-semibold leading-tight", winner ? "text-foreground" : "text-foreground/90")}>
          {team?.name ?? label ?? "TBD"}
        </p>
        {team && <p className="text-[11px] text-muted-foreground">{team.code}</p>}
      </div>
    </div>
  );
}

export function MatchCard({ match, variant = "default", className }: MatchCardProps) {
  const clock = useMatchClock(match.kickoff, match.status);
  const venue = getVenue(match.venueId);
  const isLive = clock.status === "live" || clock.status === "halftime";
  const isFinished = clock.status === "finished";
  const showScore = isLive || isFinished;

  const homeWin = isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWin = isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className={className}>
      <Link
        href={`/match/${match.id}`}
        className={cn(
          "group relative block overflow-hidden rounded-2xl border p-4 transition-colors",
          isLive
            ? "border-live/25 bg-live/[0.04] hover:border-live/40"
            : "border-white/[0.06] bg-card/60 hover:border-white/15 hover:bg-card"
        )}
      >
        {isLive && (
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-live to-transparent" />
        )}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {stageLabel(match.stage, match.group)}
          </span>
          <StatusPill match={match} />
        </div>

        <div className="flex items-center gap-3">
          <TeamRow teamId={match.homeTeamId} label={match.homeLabel} score={match.homeScore} winner={homeWin} />

          {showScore ? (
            <div className={cn("flex shrink-0 items-center gap-1.5 px-1 font-mono text-2xl font-bold tabular-nums", isLive && "text-live")}>
              <span className={cn(awayWin && "text-muted-foreground")}>{match.homeScore ?? 0}</span>
              <span className="text-muted-foreground/50">:</span>
              <span className={cn(homeWin && "text-muted-foreground")}>{match.awayScore ?? 0}</span>
            </div>
          ) : (
            <div className="flex shrink-0 flex-col items-center px-2">
              <span className="text-[10px] font-medium uppercase text-muted-foreground/70">vs</span>
            </div>
          )}

          <TeamRow teamId={match.awayTeamId} label={match.awayLabel} score={match.awayScore} align="right" winner={awayWin} />
        </div>

        {match.homePenalties !== null && match.awayPenalties !== null && (
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Penalties {match.homePenalties}–{match.awayPenalties}
          </p>
        )}

        {variant === "default" && (
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3 text-[11px] text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{venue ? `${venue.name}, ${venue.city}` : "Venue TBD"}</span>
            </span>
            {!showScore && clock.mounted ? (
              <CountdownInline iso={match.kickoff} className="shrink-0 text-foreground/70" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            )}
          </div>
        )}
      </Link>
    </motion.div>
  );
}
