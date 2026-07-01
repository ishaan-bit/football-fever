"use client";
import { motion } from "framer-motion";
import type { Group } from "@/types";
import { getTeam } from "@/lib/data";
import { TeamCrest } from "@/components/shared/team-crest";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn, hslVar } from "@/lib/utils";

const FORM_COLOR: Record<"W" | "D" | "L", string> = {
  W: "var(--pitch)",
  D: "var(--muted-foreground)",
  L: "var(--live)",
};

function FormChip({ r }: { r: "W" | "D" | "L" }) {
  return (
    <span
      className="grid h-4 w-4 place-items-center rounded-[5px] text-[9px] font-bold leading-none"
      style={{ background: hslVar(FORM_COLOR[r], 0.18), color: hslVar(FORM_COLOR[r]) }}
      title={r === "W" ? "Win" : r === "D" ? "Draw" : "Loss"}
    >
      {r}
    </span>
  );
}

/** A single group's standings as a broadcast-style table inside a glass card. */
export function GroupTable({ group, index = 0 }: { group: Group; index?: number }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-3xl border border-white/[0.06] glass"
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-electric/15 font-display text-sm font-bold text-electric">
            {group.id}
          </span>
          Group {group.id}
        </h3>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Final standings</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">#</th>
            <th className="py-2 pr-2 text-left font-medium">Team</th>
            <th className="px-1.5 py-2 text-center font-medium tabular">P</th>
            <th className="px-1.5 py-2 text-center font-medium tabular">W</th>
            <th className="px-1.5 py-2 text-center font-medium tabular">D</th>
            <th className="px-1.5 py-2 text-center font-medium tabular">L</th>
            <th className="px-1.5 py-2 text-center font-medium tabular">GD</th>
            <th className="px-2 py-2 text-center font-semibold text-foreground/70 tabular">Pts</th>
            <th className="hidden py-2 pr-3 text-right font-medium sm:table-cell">Form</th>
          </tr>
        </thead>
        <tbody>
          {group.standings.map((row) => {
            const team = getTeam(row.teamId);
            const qualified = row.rank <= 2;
            return (
              <tr
                key={row.teamId}
                className={cn(
                  "border-t border-white/[0.04] transition-colors",
                  qualified ? "bg-pitch/[0.05]" : "hover:bg-white/[0.02]"
                )}
              >
                <td className="px-3 py-2.5">
                  <span className="relative flex items-center">
                    {qualified && (
                      <span className="absolute -left-3 h-5 w-[3px] rounded-full bg-pitch" aria-hidden />
                    )}
                    <span
                      className={cn(
                        "tabular text-xs font-semibold",
                        qualified ? "text-pitch" : "text-muted-foreground"
                      )}
                    >
                      {row.rank}
                    </span>
                  </span>
                </td>
                <td className="py-2.5 pr-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamCrest team={team} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold leading-tight">
                        {team?.name ?? "TBD"}
                      </p>
                      <p className="text-[10px] uppercase text-muted-foreground">{team?.code}</p>
                    </div>
                  </div>
                </td>
                <td className="px-1.5 py-2.5 text-center text-xs text-muted-foreground tabular">{row.played}</td>
                <td className="px-1.5 py-2.5 text-center text-xs tabular">{row.won}</td>
                <td className="px-1.5 py-2.5 text-center text-xs tabular">{row.drawn}</td>
                <td className="px-1.5 py-2.5 text-center text-xs tabular">{row.lost}</td>
                <td
                  className={cn(
                    "px-1.5 py-2.5 text-center text-xs tabular",
                    row.gd > 0 ? "text-pitch" : row.gd < 0 ? "text-live/80" : "text-muted-foreground"
                  )}
                >
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td className="px-2 py-2.5 text-center font-display text-sm font-bold tabular">{row.points}</td>
                <td className="hidden py-2.5 pr-3 sm:table-cell">
                  <div className="flex items-center justify-end gap-1">
                    {row.form.map((r, i) => (
                      <FormChip key={i} r={r} />
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-2.5 text-[11px] text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-pitch" />
        Top 2 advance to the knockout stage
      </div>
    </motion.div>
  );
}
