"use client";
import { useMemo } from "react";
import { Sparkles, Zap, Crosshair, TrendingUp, Quote } from "lucide-react";
import type { Match, OracleInsight } from "@/types";
import { getTeam, getStandings } from "@/lib/data";
import { runOracle, type OracleContext } from "@/lib/oracle/engine";
import { ProbabilityBar, CompareStat } from "@/components/shared/probability-bar";
import { TeamCrest } from "@/components/shared/team-crest";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/shared/icon";
import { EmptyState } from "@/components/shared/empty-state";
import { pct, hslVar } from "@/lib/utils";

const TONE: Record<OracleInsight["tone"], string> = {
  neutral: "var(--muted-foreground)",
  positive: "var(--pitch)",
  warning: "var(--gold)",
  danger: "var(--live)",
};

function ConfidenceRing({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-20 w-20 place-items-center">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--brand-violet))" strokeWidth="5"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * value) / 100}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-lg font-bold leading-none">{value}</p>
        <p className="text-[8px] uppercase text-muted-foreground">conf</p>
      </div>
    </div>
  );
}

export function OraclePanel({ match }: { match: Match }) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);

  const oracle = useMemo(() => {
    if (!home || !away) return null;
    const standings = getStandings();
    const formOf = (teamId: string) =>
      standings.flatMap((g) => g.standings).find((r) => r.teamId === teamId)?.form ?? [];
    const ctx: OracleContext = {
      homeForm: formOf(home.id),
      awayForm: formOf(away.id),
      homeIsHost: ["usa", "mex", "can"].includes(home.id),
    };
    return runOracle(match, ctx);
  }, [match, home, away]);

  if (!oracle || !home || !away) {
    return (
      <EmptyState
        icon={<Sparkles className="h-5 w-5" />}
        title="The Oracle is waiting"
        description="Once both teams are confirmed, a full explainable prediction appears here."
      />
    );
  }

  const danger = getTeam(oracle.dangerTeamId);

  return (
    <div className="space-y-5">
      {/* Headline call */}
      <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-accent/[0.04] p-5">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <ConfidenceRing value={oracle.confidence} />
          <div className="flex-1">
            <Badge variant="violet"><Sparkles className="h-3 w-3" /> The Oracle's call</Badge>
            <p className="mt-2 font-display text-xl font-bold text-gradient-pitch">{oracle.verdict}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Likely scoreline {oracle.likelyScoreline.home}–{oracle.likelyScoreline.away}
            </p>
          </div>
        </div>
        <ProbabilityBar
          className="mt-4"
          home={oracle.homeWinProb} draw={oracle.drawProb} away={oracle.awayWinProb}
          homeLabel={home.code} awayLabel={away.code}
          knockout={match.stage !== "group"}
        />
      </div>

      {oracle.upset.active && (
        <div className="flex items-start gap-3 rounded-2xl border border-live/30 bg-live/[0.06] p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-live/15 text-live">
            <Zap className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-live">Upset alert</p>
            <p className="text-sm text-muted-foreground">{oracle.upset.note}</p>
          </div>
        </div>
      )}

      {/* xG + danger + scorelines */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.06] p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Crosshair className="h-3.5 w-3.5" /> Expected goals
          </p>
          <CompareStat label="xG" home={oracle.expectedGoals.home} away={oracle.expectedGoals.away} format={(n) => n.toFixed(2)} />
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Most dangerous:</span>
            <TeamCrest team={danger} size="xs" />
            <span className="font-medium">{danger?.name}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Likeliest scorelines
          </p>
          <div className="space-y-1.5">
            {oracle.scorelineProbabilities.slice(0, 4).map((s) => (
              <div key={s.score} className="flex items-center gap-2">
                <span className="tabular w-10 text-sm font-semibold">{s.score}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-electric/70" style={{ width: pct(s.prob / oracle.scorelineProbabilities[0]!.prob) }} />
                </div>
                <span className="tabular w-9 text-right text-xs text-muted-foreground">{pct(s.prob)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explainability */}
      <div className="rounded-2xl border border-white/[0.06] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why this call</p>
        <div className="space-y-3">
          {oracle.insights.map((ins, i) => (
            <div key={i} className="flex gap-3">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                style={{ background: hslVar(TONE[ins.tone], 0.14), color: hslVar(TONE[ins.tone]) }}
              >
                <Icon name={ins.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{ins.label}</p>
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full" style={{ width: pct(ins.weight), background: hslVar(TONE[ins.tone]) }} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{ins.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview + stakes */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <Quote className="h-5 w-5 text-accent/60" />
        <p className="mt-2 text-sm leading-relaxed text-foreground/85">{oracle.preview}</p>
        <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <p><span className="font-semibold text-foreground/70">Qualification: </span>{oracle.qualificationNote}</p>
          <p><span className="font-semibold text-foreground/70">Tournament: </span>{oracle.tournamentImpact}</p>
        </div>
      </div>
    </div>
  );
}
