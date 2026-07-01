"use client";
import { useMemo } from "react";
import type { Match } from "@/types";
import { getTeam, getGroup } from "@/lib/data";
import { runOracle } from "@/lib/oracle/engine";
import { CompareStat } from "@/components/shared/probability-bar";
import { TeamCrest } from "@/components/shared/team-crest";
import { seededRandom, hashSeed, clamp } from "@/lib/utils";
import { cn } from "@/lib/utils";

function simStats(match: Match) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const rng = seededRandom(hashSeed("stats:" + match.id));
  const diff = (home?.rating ?? 75) - (away?.rating ?? 75);
  const minute = match.minute ?? (match.status === "finished" ? 90 : 0);
  const f = clamp(minute / 90, 0, 1);
  const hPoss = Math.round(clamp(50 + diff * 0.7 + (rng() - 0.5) * 12, 32, 68));
  const oracle = home && away ? runOracle(match) : null;
  const mul = (base: number) => Math.round(base * f * (0.7 + rng() * 0.6));
  return {
    possession: [hPoss, 100 - hPoss] as [number, number],
    shots: [mul(14 + diff * 0.1), mul(11)] as [number, number],
    onTarget: [Math.max(match.homeScore ?? 0, mul(5)), Math.max(match.awayScore ?? 0, mul(4))] as [number, number],
    corners: [mul(7), mul(6)] as [number, number],
    fouls: [mul(11), mul(12)] as [number, number],
    xg: [oracle?.expectedGoals.home ?? 1, oracle?.expectedGoals.away ?? 1] as [number, number],
  };
}

export function StatsPanel({ match }: { match: Match }) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const stats = useMemo(() => simStats(match), [match]);
  const group = match.group ? getGroup(match.group) : undefined;
  const notStarted = match.status === "scheduled";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/[0.06] p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {notStarted ? "Projected stats" : "Match stats"}
        </p>
        <div className="space-y-3.5">
          <CompareStat label="Possession %" home={stats.possession[0]} away={stats.possession[1]} format={(n) => `${n}%`} />
          <CompareStat label="Expected goals" home={stats.xg[0]} away={stats.xg[1]} format={(n) => n.toFixed(2)} />
          {!notStarted && (
            <>
              <CompareStat label="Shots" home={stats.shots[0]} away={stats.shots[1]} />
              <CompareStat label="On target" home={stats.onTarget[0]} away={stats.onTarget[1]} />
              <CompareStat label="Corners" home={stats.corners[0]} away={stats.corners[1]} />
              <CompareStat label="Fouls" home={stats.fouls[0]} away={stats.fouls[1]} />
            </>
          )}
        </div>
      </div>

      {group && (
        <div className="rounded-2xl border border-white/[0.06] p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Group {group.id} · standings impact
          </p>
          <div className="space-y-1">
            <div className="grid grid-cols-[1.5rem_1fr_repeat(4,1.6rem)] gap-1 px-2 text-[10px] uppercase text-muted-foreground">
              <span>#</span><span>Team</span><span className="text-center">P</span>
              <span className="text-center">GD</span><span className="text-center">Pts</span><span />
            </div>
            {group.standings.map((row) => {
              const team = getTeam(row.teamId);
              const involved = row.teamId === match.homeTeamId || row.teamId === match.awayTeamId;
              return (
                <div
                  key={row.teamId}
                  className={cn(
                    "grid grid-cols-[1.5rem_1fr_repeat(4,1.6rem)] items-center gap-1 rounded-lg px-2 py-1.5 text-sm",
                    involved ? "bg-electric/[0.08] ring-1 ring-electric/20" : "",
                    row.rank <= 2 && "font-medium"
                  )}
                >
                  <span className="text-muted-foreground">{row.rank}</span>
                  <span className="flex items-center gap-2 truncate">
                    <TeamCrest team={team} size="xs" />
                    <span className="truncate">{team?.code}</span>
                  </span>
                  <span className="text-center tabular text-muted-foreground">{row.played}</span>
                  <span className="text-center tabular text-muted-foreground">{row.gd > 0 ? `+${row.gd}` : row.gd}</span>
                  <span className="text-center tabular font-semibold">{row.points}</span>
                  <span className={cn("text-center", row.rank <= 2 ? "text-pitch" : "text-transparent")}>•</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
