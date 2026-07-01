"use client";

import { motion } from "framer-motion";
import { Sparkles, Plus, TrendingUp, Check } from "lucide-react";
import type { Match, OddsSelection, MarketKey } from "@/types";
import { getTeam } from "@/lib/data";
import { TeamCrest } from "@/components/shared/team-crest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decimalToFractional } from "@/lib/betting/odds";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { pct, hslVar } from "@/lib/utils";

export interface ValuePick {
  match: Match;
  marketKey: MarketKey;
  marketLabel: string;
  selection: OddsSelection;
  /** The Oracle's one-line read on the match. */
  verdict: string;
}

/**
 * A premium "value pick" card — the AI thinks the price is wrong on this
 * selection and surfaces the edge. Friendly stakes, play-coins only.
 */
export function ValuePickCard({
  pick,
  index = 0,
  inSlip,
  onAdd,
}: {
  pick: ValuePick;
  index?: number;
  inSlip?: boolean;
  onAdd: (pick: ValuePick) => void;
}) {
  const reduced = useReducedMotion();
  const home = getTeam(pick.match.homeTeamId);
  const away = getTeam(pick.match.awayTeamId);
  const edgePct = Math.round(pick.selection.edge * 100);

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: reduced ? 0 : index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-3xl border border-gold/20 glass p-5"
    >
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gold/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="gold">
            <Sparkles className="h-3 w-3" /> Value pick
          </Badge>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular"
            style={{ background: hslVar("var(--pitch)", 0.14), color: hslVar("var(--pitch)") }}
          >
            <TrendingUp className="h-3 w-3" /> VALUE +{Math.max(edgePct, 1)}%
          </span>
        </div>

        {/* Teams */}
        <div className="mt-4 flex items-center gap-2.5">
          <TeamCrest team={home} size="sm" />
          <span className="text-sm font-semibold">{home?.code ?? "TBD"}</span>
          <span className="text-xs text-muted-foreground">vs</span>
          <span className="text-sm font-semibold">{away?.code ?? "TBD"}</span>
          <TeamCrest team={away} size="sm" />
        </div>

        {/* Market + selection + price */}
        <div className="mt-4 flex items-end justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {pick.marketLabel}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold">{pick.selection.label}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Oracle {pct(pick.selection.trueProb)} · priced {pct(pick.selection.impliedProb)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl font-bold tabular leading-none text-gold">
              {pick.selection.decimal.toFixed(2)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground tabular">
              {decimalToFractional(pick.selection.decimal)}
            </p>
          </div>
        </div>

        {/* Oracle reasoning */}
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-foreground/75">
          <span className="font-semibold text-gradient-pitch">{pick.verdict}</span>
        </p>

        <Button
          variant={inSlip ? "outline" : "gold"}
          size="sm"
          className="mt-4 w-full"
          onClick={() => onAdd(pick)}
          disabled={inSlip}
        >
          {inSlip ? (
            <>
              <Check className="h-4 w-4" /> In your slip
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add to slip
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
