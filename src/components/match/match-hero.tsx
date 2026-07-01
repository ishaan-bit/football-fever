"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Users } from "lucide-react";
import type { Match } from "@/types";
import { getTeam, getVenue } from "@/lib/data";
import { TeamCrest } from "@/components/shared/team-crest";
import { SmartImage } from "@/components/shared/smart-image";
import { AmbientVideo } from "@/components/shared/ambient-video";
import { atmosphereClipFor, clipVideo, clipPoster } from "@/lib/media";
import { StatusPill } from "@/components/shared/status-pill";
import { Countdown } from "@/components/shared/countdown";
import { MomentumBar } from "./momentum-bar";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

function Side({ teamId, label }: { teamId: string | null; label?: string }) {
  const team = getTeam(teamId);
  return (
    <div className="flex flex-1 flex-col items-center gap-2.5 text-center">
      <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
        <TeamCrest team={team} size="xl" className="h-14 w-20 shadow-elevated sm:h-16 sm:w-24" />
      </motion.div>
      <div>
        <p className="font-display text-sm font-bold leading-tight sm:text-base">{team?.name ?? label ?? "TBD"}</p>
        {team && <p className="text-[11px] text-muted-foreground">{team.nickname}</p>}
      </div>
    </div>
  );
}

export function MatchHero({
  match, momentum, watchingCount,
}: {
  match: Match;
  momentum: number;
  watchingCount: number;
}) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const venue = getVenue(match.venueId);
  const reduced = useReducedMotion();
  const isLive = match.status === "live" || match.status === "halftime";
  const showScore = isLive || match.status === "finished";

  // Goal flash when the aggregate score increases.
  const prev = useRef<number>(-1);
  const [flash, setFlash] = useState(false);
  const totalGoals = (match.homeScore ?? 0) + (match.awayScore ?? 0);
  useEffect(() => {
    if (prev.current >= 0 && totalGoals > prev.current && !reduced) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1100);
      prev.current = totalGoals;
      return () => clearTimeout(t);
    }
    prev.current = totalGoals;
  }, [totalGoals, reduced]);

  // Live matches get a moving stadium atmosphere loop; otherwise a slow ken-burns
  // push on the venue still. Clip is deterministic per match (no reshuffle).
  const clip = atmosphereClipFor(match.id);

  return (
    <div className="relative isolate overflow-hidden border-b border-white/[0.06]">
      <div className="absolute inset-0 -z-10">
        {isLive ? (
          <AmbientVideo
            src={clipVideo(clip.id)}
            poster={venue?.image || clipPoster(clip.id)}
            mediaClassName="opacity-30"
          />
        ) : (
          <SmartImage
            src={venue?.image}
            alt=""
            className={`h-full w-full object-cover opacity-25 ${reduced ? "" : "animate-ken-burns"}`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/85 to-background" />
        {isLive && <div className="absolute inset-0 aurora-field opacity-40" />}
        <div className="grain absolute inset-0" />
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1 }}
            className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-pitch/30 via-transparent to-transparent"
          />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-center justify-center gap-3">
          <StatusPill match={match} />
          {watchingCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> {watchingCount} watching
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 sm:gap-6">
          <Side teamId={match.homeTeamId} label={match.homeLabel} />

          <div className="flex flex-col items-center">
            {showScore ? (
              <div className="flex items-center gap-2 font-mono text-5xl font-bold tabular-nums sm:gap-4 sm:text-7xl">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={`h-${match.homeScore}`}
                    initial={reduced ? false : { scale: 0.4, y: -10, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 18 }}
                  >
                    {match.homeScore ?? 0}
                  </motion.span>
                </AnimatePresence>
                <span className="text-muted-foreground/30">:</span>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={`a-${match.awayScore}`}
                    initial={reduced ? false : { scale: 0.4, y: -10, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 18 }}
                  >
                    {match.awayScore ?? 0}
                  </motion.span>
                </AnimatePresence>
              </div>
            ) : (
              <Countdown iso={match.kickoff} />
            )}
            {match.homePenalties !== null && (
              <p className="mt-1 text-xs text-muted-foreground">pens {match.homePenalties}–{match.awayPenalties}</p>
            )}
          </div>

          <Side teamId={match.awayTeamId} label={match.awayLabel} />
        </div>

        {isLive && (
          <div className="mx-auto mt-7 max-w-md">
            <MomentumBar value={momentum} homeCode={home?.code} awayCode={away?.code} />
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>{venue ? `${venue.fifaName ?? venue.name} · ${venue.city}, ${venue.country}` : "Venue TBD"}</span>
        </div>
      </div>
    </div>
  );
}
