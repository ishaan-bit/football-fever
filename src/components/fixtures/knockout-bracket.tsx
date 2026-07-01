"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Medal } from "lucide-react";
import type { Match } from "@/types";
import { getTeam } from "@/lib/data";
import { TeamCrest } from "@/components/shared/team-crest";
import { StatusPill } from "@/components/shared/status-pill";
import { useMatchClock } from "@/hooks/use-match-clock";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn, formatMatchDate } from "@/lib/utils";

type BracketRound = { stage: Match["stage"]; matches: Match[] };

const ROUND_LABEL: Record<string, string> = {
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-finals",
  sf: "Semi-finals",
  final: "Final",
};

/** One side of a knockout cell: crest + code (or a subtle "projected" label). */
function BracketSide({
  teamId,
  label,
  score,
  isWinner,
  dim,
}: {
  teamId: string | null;
  label?: string;
  score: number | null;
  isWinner: boolean;
  dim: boolean;
}) {
  const team = getTeam(teamId);
  return (
    <div className={cn("flex items-center justify-between gap-2 py-1", dim && "opacity-90")}>
      <div className="flex min-w-0 items-center gap-2">
        <TeamCrest team={team} size="xs" />
        {team ? (
          <span className={cn("text-xs font-semibold", isWinner ? "text-foreground" : "text-foreground/80")}>
            {team.code}
          </span>
        ) : (
          <span className="truncate text-[11px] italic text-muted-foreground" title={label}>
            {label ?? "TBD"}
          </span>
        )}
      </div>
      {score !== null ? (
        <span
          className={cn(
            "tabular text-sm font-bold leading-none",
            isWinner ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {score}
        </span>
      ) : null}
    </div>
  );
}

function BracketCell({ match, accent }: { match: Match; accent?: boolean }) {
  const clock = useMatchClock(match.kickoff, match.status);
  const isFinished = clock.status === "finished";
  const isLive = clock.status === "live" || clock.status === "halftime";
  const projected = !match.homeTeamId || !match.awayTeamId;

  const homeWin = isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWin = isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0);
  // Penalties decide a level knockout tie.
  const homePenWin =
    isFinished &&
    match.homeScore === match.awayScore &&
    (match.homePenalties ?? 0) > (match.awayPenalties ?? 0);
  const awayPenWin =
    isFinished &&
    match.homeScore === match.awayScore &&
    (match.awayPenalties ?? 0) > (match.homePenalties ?? 0);

  return (
    <Link
      href={`/match/${match.id}`}
      className={cn(
        "group block w-[180px] shrink-0 rounded-2xl border p-2.5 transition-colors",
        isLive
          ? "border-live/30 bg-live/[0.05] hover:border-live/50"
          : accent
            ? "border-gold/25 bg-gold/[0.04] hover:border-gold/40"
            : "border-white/[0.07] bg-card/60 hover:border-white/20 hover:bg-card"
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
          {formatMatchDate(match.kickoff)}
        </span>
        <StatusPill match={match} className="scale-90" />
      </div>
      <div className="divide-y divide-white/[0.05]">
        <BracketSide
          teamId={match.homeTeamId}
          label={match.homeLabel}
          score={match.homeScore}
          isWinner={homeWin || homePenWin}
          dim={projected}
        />
        <BracketSide
          teamId={match.awayTeamId}
          label={match.awayLabel}
          score={match.awayScore}
          isWinner={awayWin || awayPenWin}
          dim={projected}
        />
      </div>
      {match.homePenalties !== null && match.awayPenalties !== null && (
        <p className="mt-1 text-center text-[9px] text-muted-foreground">
          pens {match.homePenalties}–{match.awayPenalties}
        </p>
      )}
      {projected && (
        <p className="mt-1 text-center text-[9px] uppercase tracking-wide text-muted-foreground/70">
          projected
        </p>
      )}
    </Link>
  );
}

/** Horizontally-scrollable broadcast bracket: R32 → Final, plus 3rd place. */
export function KnockoutBracket({
  rounds,
  thirdPlace,
}: {
  rounds: BracketRound[];
  thirdPlace?: Match;
}) {
  const reduce = useReducedMotion();
  const final = rounds.find((r) => r.stage === "final")?.matches[0];

  return (
    <div className="space-y-6">
      <div className="-mx-4 overflow-x-auto px-4 pb-3 no-scrollbar sm:mx-0 sm:px-0">
        <div className="flex min-w-max items-stretch gap-5">
          {rounds.map((round, ri) => (
            <div key={round.stage} className="flex flex-col">
              <div className="mb-3 flex items-center gap-2">
                <span className="font-display text-sm font-semibold tracking-tight">
                  {ROUND_LABEL[round.stage] ?? round.stage}
                </span>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-muted-foreground tabular">
                  {round.matches.length}
                </span>
              </div>
              <motion.div
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={reduce ? undefined : { opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: ri * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-1 flex-col justify-around gap-3"
              >
                {round.matches.map((m) => (
                  <BracketCell key={m.id} match={m} accent={round.stage === "final"} />
                ))}
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* Trophy + third-place rail beneath the tree. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {final && (
          <div className="relative overflow-hidden rounded-3xl border border-gold/20 glass p-4">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gold/15 blur-3xl" />
            <div className="relative flex items-center gap-2 text-gold">
              <Trophy className="h-4 w-4" />
              <span className="font-display text-sm font-semibold">The Final</span>
            </div>
            <p className="relative mt-1 text-xs text-muted-foreground">
              {getTeam(final.homeTeamId)?.name ?? final.homeLabel} vs{" "}
              {getTeam(final.awayTeamId)?.name ?? final.awayLabel}
            </p>
          </div>
        )}
        {thirdPlace && (
          <div className="rounded-3xl border border-white/[0.06] glass p-4">
            <div className="flex items-center gap-2 text-foreground/80">
              <Medal className="h-4 w-4 text-muted-foreground" />
              <span className="font-display text-sm font-semibold">Third-place play-off</span>
            </div>
            <div className="mt-2.5">
              <BracketCell match={thirdPlace} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
