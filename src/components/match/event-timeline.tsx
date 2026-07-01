"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Goal, ArrowRightLeft, ScanSearch, Flag, Timer, CircleDot, RectangleVertical } from "lucide-react";
import type { Match, MatchEvent } from "@/types";
import { getTeam } from "@/lib/data";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";

const META: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  goal: { label: "Goal", color: "var(--pitch)", icon: Goal },
  penalty_goal: { label: "Penalty", color: "var(--pitch)", icon: Goal },
  own_goal: { label: "Own goal", color: "var(--live)", icon: Goal },
  yellow: { label: "Yellow card", color: "var(--gold)", icon: RectangleVertical },
  red: { label: "Red card", color: "var(--live)", icon: RectangleVertical },
  var: { label: "VAR", color: "var(--electric)", icon: ScanSearch },
  sub: { label: "Substitution", color: "var(--muted-foreground)", icon: ArrowRightLeft },
  kickoff: { label: "Kick-off", color: "var(--muted-foreground)", icon: CircleDot },
  halftime: { label: "Half-time", color: "var(--gold)", icon: CircleDot },
  fulltime: { label: "Full-time", color: "var(--muted-foreground)", icon: Flag },
};

export function EventTimeline({ match }: { match: Match }) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const events = [...match.events].sort((a, b) => b.minute - a.minute || (b.id > a.id ? 1 : -1));

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Timer className="h-5 w-5" />}
        title={match.status === "scheduled" ? "Not kicked off yet" : "No events yet"}
        description={
          match.status === "scheduled"
            ? "The timeline lights up the moment the referee blows the whistle."
            : "Goals, cards and VAR drama will appear here live."
        }
      />
    );
  }

  return (
    <ol className="relative space-y-1.5">
      <AnimatePresence initial={false}>
        {events.map((ev) => {
          const meta = META[ev.type] ?? META.sub!;
          const Ico = meta.icon;
          const teamName = ev.team === "home" ? home?.code : ev.team === "away" ? away?.code : "";
          const isGoal = ev.type === "goal" || ev.type === "penalty_goal" || ev.type === "own_goal";
          return (
            <motion.li
              key={ev.id}
              layout
              initial={{ opacity: 0, x: ev.team === "away" ? 16 : -16 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-2.5",
                isGoal ? "border-pitch/25 bg-pitch/[0.05]" : "border-white/[0.05]"
              )}
            >
              <span className="tabular w-9 shrink-0 text-center text-sm font-bold text-muted-foreground">
                {ev.minute}'
              </span>
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                style={{ background: `hsl(${meta.color} / 0.16)`, color: `hsl(${meta.color})` }}
              >
                <Ico className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {ev.player ?? meta.label}
                  {teamName && <span className="ml-1.5 text-xs text-muted-foreground">{teamName}</span>}
                </p>
                {(ev.assist || ev.detail) && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {ev.detail ?? (ev.assist ? `assist · ${ev.assist}` : "")}
                  </p>
                )}
              </div>
              {isGoal && <span className="text-base">⚽️</span>}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
