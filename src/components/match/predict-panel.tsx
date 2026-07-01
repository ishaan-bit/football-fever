"use client";
import { useEffect, useMemo, useState } from "react";
import { Lock, Check, X, Sparkles } from "lucide-react";
import type { Match, RiskLevel } from "@/types";
import { marketDefs, RISK_META, RISK_MULTIPLIER, MARKET_BASE_POINTS } from "@/lib/predictions/scoring";
import { runOracle } from "@/lib/oracle/engine";
import { getTeam } from "@/lib/data";
import { usePredictionStore } from "@/stores/predictions";
import { useUserStore } from "@/stores/user";
import { useHydrated } from "@/hooks/use-hydrated";
import { Icon } from "@/components/shared/icon";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSound } from "@/hooks/use-sound";
import { toast } from "@/components/ui/sonner";

const RISKS: RiskLevel[] = ["safe", "balanced", "bold", "wild"];

export function PredictPanel({ match }: { match: Match }) {
  const hydrated = useHydrated();
  const profile = useUserStore((s) => s.profile);
  const predictions = usePredictionStore((s) => s.predictions);
  const add = usePredictionStore((s) => s.add);
  const settleForMatch = usePredictionStore((s) => s.settleForMatch);
  const { play } = useSound();
  const [riskLevel, setRiskLevel] = useLocalRisk();

  const defs = useMemo(() => marketDefs(match), [match]);
  const locked = match.status !== "scheduled";
  const finished = match.status === "finished";
  const oracle = useMemo(() => (match.homeTeamId && match.awayTeamId ? runOracle(match) : null), [match]);

  useEffect(() => {
    if (finished) settleForMatch(match);
  }, [finished, match, settleForMatch]);

  const mine = predictions.filter((p) => p.matchId === match.id);
  const valueFor = (market: string) => mine.find((p) => p.market === market)?.value;

  const choose = (market: any, value: string, label: string) => {
    if (locked) return;
    add({ userId: profile.id, matchId: match.id, market, value, risk: riskLevel });
    play("click");
    toast.success(`Locked: ${label}`, { description: `${RISK_META[riskLevel].label} risk · settles at full time` });
  };

  if (!hydrated) return <div className="h-40 shimmer rounded-2xl" />;

  return (
    <div className="space-y-4">
      {locked && (
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          {finished ? "Predictions are settled — see your results below." : "Predictions locked at kick-off. Watch them play out!"}
        </div>
      )}

      {!locked && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk level</p>
          <div className="grid grid-cols-4 gap-1.5">
            {RISKS.map((r) => (
              <button
                key={r}
                onClick={() => setRiskLevel(r)}
                className={cn(
                  "rounded-xl border px-1 py-2 text-center transition",
                  riskLevel === r ? "border-white/25 bg-white/[0.08]" : "border-white/[0.06] hover:bg-white/[0.04]"
                )}
              >
                <p className="text-xs font-semibold" style={{ color: `hsl(${RISK_META[r].color})` }}>{RISK_META[r].label}</p>
                <p className="text-[9px] text-muted-foreground">×{RISK_MULTIPLIER[r]}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {defs.map((def) => {
          const opts = def.options(match);
          const chosen = valueFor(def.market);
          const settled = mine.find((p) => p.market === def.market && p.settled);
          const oraclePick = def.market === "winner" && oracle
            ? oracle.homeWinProb > oracle.awayWinProb && oracle.homeWinProb > oracle.drawProb ? "home"
              : oracle.awayWinProb > oracle.drawProb ? "away" : "draw"
            : undefined;
          return (
            <div key={def.market} className="rounded-2xl border border-white/[0.06] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Icon name={def.icon} className="h-3.5 w-3.5 text-muted-foreground" /> {def.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {settled ? "" : `${Math.round(MARKET_BASE_POINTS[def.market] * RISK_MULTIPLIER[riskLevel])} pts`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {opts.map((o) => {
                  const isChosen = chosen === o.value;
                  const correct = settled && isChosen ? settled.correct : null;
                  return (
                    <button
                      key={o.value}
                      onClick={() => choose(def.market, o.value, o.label)}
                      disabled={locked}
                      className={cn(
                        "relative flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-default",
                        isChosen
                          ? correct === true
                            ? "border-pitch/50 bg-pitch/15 text-pitch"
                            : correct === false
                              ? "border-live/50 bg-live/15 text-live line-through"
                              : "border-electric/50 bg-electric/15 text-electric"
                          : "border-white/[0.07] text-foreground/80 hover:bg-white/[0.05] disabled:opacity-40"
                      )}
                    >
                      {o.label}
                      {isChosen && correct === true && <Check className="h-3 w-3" />}
                      {isChosen && correct === false && <X className="h-3 w-3" />}
                      {oraclePick === o.value && !isChosen && (
                        <Sparkles className="h-3 w-3 text-accent" aria-label="Oracle's pick" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {finished && mine.length > 0 && (
        <div className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-3 text-center">
          <p className="text-sm font-semibold">
            You banked{" "}
            <span className="text-gradient-gold">{mine.reduce((a, p) => a + p.points, 0)} pts</span> this match
          </p>
          <p className="text-xs text-muted-foreground">
            {mine.filter((p) => p.correct).length}/{mine.length} predictions landed
          </p>
        </div>
      )}

      {oracle && (
        <p className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-accent" /> Sparkle = the Oracle's pick. Beat it for bragging rights.
        </p>
      )}
    </div>
  );
}

/* tiny risk preference, scoped to the session */
function useLocalRisk(): [RiskLevel, (r: RiskLevel) => void] {
  const [r, setR] = useState<RiskLevel>("balanced");
  return [r, setR];
}
