"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Target, Trophy, Flame, TrendingUp, ArrowRight, Lock, Check, X,
  Sparkles, ListChecks, Layers, Info, Radio, CalendarDays,
} from "lucide-react";
import type { Match, Prediction, RiskLevel } from "@/types";
import { PageShell, PageHeader } from "@/components/shared/page-shell";
import { SectionHeader } from "@/components/shared/section-header";
import { TeamCrest } from "@/components/shared/team-crest";
import { StatusPill, stageLabel } from "@/components/shared/status-pill";
import { EmptyState } from "@/components/shared/empty-state";
import { Icon } from "@/components/shared/icon";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { useNow } from "@/hooks/use-now";
import { useHydrated } from "@/hooks/use-hydrated";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { usePredictionStore } from "@/stores/predictions";
import { useUserStore } from "@/stores/user";
import {
  getUpcomingMatches, getLiveMatches, getMatch, getTeam,
} from "@/lib/data";
import {
  marketDefs, RISK_META, RISK_MULTIPLIER, MARKET_BASE_POINTS,
} from "@/lib/predictions/scoring";
import { pct, hslVar, cn } from "@/lib/utils";

const RISKS: RiskLevel[] = ["safe", "balanced", "bold", "wild"];

const MARKET_META: Record<string, { label: string; hint: string; icon: string }> = {
  winner: { label: "Match Winner", hint: "Who takes the three points", icon: "Trophy" },
  scoreline: { label: "Exact Scoreline", hint: "Nail the final score", icon: "Hash" },
  first_scorer: { label: "First Goal", hint: "Which side strikes first", icon: "Flag" },
  total_goals: { label: "Total Goals", hint: "Over or under 2.5", icon: "Target" },
  cards: { label: "Cards", hint: "How card-happy is the ref", icon: "Shield" },
  corners: { label: "Corners", hint: "Set-piece volume", icon: "Flag" },
  clean_sheet: { label: "Clean Sheet", hint: "Does anyone keep it tidy", icon: "Shield" },
  motm: { label: "Player of the Match", hint: "Who runs the show", icon: "Star" },
  penalty: { label: "Penalty Awarded", hint: "Spot-kick drama", icon: "Goal" },
  extra_time: { label: "Goes to Extra Time", hint: "Knockout nerves", icon: "Clock" },
};

export default function PredictionsPage() {
  const now = useNow(15000);
  const clock = now; // SSR-stable: 0 on first render, then ticks (avoids hydration mismatch)
  const hydrated = useHydrated();
  const reduce = useReducedMotion();

  const profile = useUserStore((s) => s.profile);
  const predictions = usePredictionStore((s) => s.predictions);
  const pointsTotal = usePredictionStore((s) => s.pointsTotal());
  const accuracy = usePredictionStore((s) => s.accuracy());
  const streak = usePredictionStore((s) => s.streak());

  const total = hydrated ? 900 + pointsTotal : 0;

  return (
    <PageShell className="space-y-8">
      <PageHeader
        scene="ball"
        eyebrow="Friendly League"
        title="Predictions"
        description="Call the matches before they kick off. The bolder the bet, the bigger the points — settle up with the room at full time."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/leaderboard"><Trophy className="h-4 w-4" /> Standings</Link>
          </Button>
        }
      />

      {/* Your form strip */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-white/[0.07] glass p-5 sm:p-6"
      >
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FormStat label="Points" value={hydrated ? total.toLocaleString() : "—"} icon="Trophy" accent="var(--gold)" />
          <FormStat label="Accuracy" value={hydrated ? pct(accuracy) : "—"} icon="Target" accent="var(--pitch)" />
          <FormStat label="Streak" value={hydrated ? `${streak} 🔥` : "—"} icon="Flame" accent="var(--live)" />
          <FormStat label="Predictions" value={hydrated ? `${predictions.length}` : "—"} icon="ListChecks" accent="var(--electric)" />
        </div>
      </motion.div>

      <Tabs defaultValue="open">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="open" className="flex-1 gap-1.5 sm:flex-none">
            <Target className="h-3.5 w-3.5" /> Open
          </TabsTrigger>
          <TabsTrigger value="mine" className="flex-1 gap-1.5 sm:flex-none">
            <ListChecks className="h-3.5 w-3.5" /> My picks
          </TabsTrigger>
          <TabsTrigger value="markets" className="flex-1 gap-1.5 sm:flex-none">
            <Layers className="h-3.5 w-3.5" /> Markets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          <OpenTab now={clock} reduce={reduce} userId={profile.id} hydrated={hydrated} />
        </TabsContent>

        <TabsContent value="mine">
          <MyPicksTab
            now={clock}
            reduce={reduce}
            hydrated={hydrated}
            predictions={predictions}
            points={hydrated ? pointsTotal : 0}
          />
        </TabsContent>

        <TabsContent value="markets">
          <MarketsTab reduce={reduce} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

/* ------------------------------- Form stat ------------------------------ */

function FormStat({ label, value, icon, accent }: { label: string; value: string; icon: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <span className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: hslVar(accent, 0.14), color: hslVar(accent) }}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <p className="mt-2.5 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-bold tabular-nums" style={{ color: hslVar(accent) }}>{value}</p>
    </div>
  );
}

/* -------------------------------- Open tab ------------------------------ */

function OpenTab({
  now, reduce, userId, hydrated,
}: { now: number; reduce: boolean; userId: string; hydrated: boolean }) {
  const matches = useMemo(() => {
    const live = getLiveMatches(now);
    const upcoming = getUpcomingMatches(9, now);
    return [...live, ...upcoming].filter((m) => m.homeTeamId && m.awayTeamId);
  }, [now]);

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={<Target className="h-5 w-5" />}
        title="No open fixtures right now"
        description="Predictions reopen the moment the next batch of fixtures locks in. Check the bracket for what's next."
        action={<Button asChild variant="outline" size="sm"><Link href="/fixtures">View fixtures</Link></Button>}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((m, i) => (
        <QuickPredictCard key={m.id} match={m} index={i} reduce={reduce} userId={userId} hydrated={hydrated} />
      ))}
    </div>
  );
}

function QuickPredictCard({
  match, index, reduce, userId, hydrated,
}: { match: Match; index: number; reduce: boolean; userId: string; hydrated: boolean }) {
  const add = usePredictionStore((s) => s.add);
  const mine = usePredictionStore((s) => s.predictions);
  const [risk, setRisk] = useState<RiskLevel>("balanced");

  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const locked = match.status !== "scheduled";
  const isLive = match.status === "live" || match.status === "halftime";

  const chosen = hydrated
    ? mine.find((p) => p.matchId === match.id && p.market === "winner" && !p.settled)?.value
    : undefined;

  const winnerDef = useMemo(() => marketDefs(match).find((d) => d.market === "winner")!, [match]);
  const options = winnerDef.options(match);
  const projected = Math.round(MARKET_BASE_POINTS.winner * RISK_MULTIPLIER[risk]);

  const choose = (value: string, label: string) => {
    if (locked) return;
    add({ userId, matchId: match.id, market: "winner", value, risk });
    toast.success(`Locked: ${label}`, {
      description: `${RISK_META[risk].label} risk · ${projected} pts on the line`,
    });
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.42, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex flex-col rounded-3xl border p-4 transition-colors",
        isLive ? "border-live/25 bg-live/[0.04]" : "border-white/[0.07] glass"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {isLive ? <Radio className="h-3 w-3 text-live" /> : <CalendarDays className="h-3 w-3" />}
          {stageLabel(match.stage, match.group)}
        </span>
        <StatusPill match={match} />
      </div>

      <Link href={`/match/${match.id}`} className="group flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
          <TeamCrest team={home} size="lg" />
          <span className="truncate text-xs font-semibold">{home?.code ?? "TBD"}</span>
        </div>
        <span className="shrink-0 text-[10px] font-medium uppercase text-muted-foreground/70">vs</span>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
          <TeamCrest team={away} size="lg" />
          <span className="truncate text-xs font-semibold">{away?.code ?? "TBD"}</span>
        </div>
      </Link>

      <div className="mt-4">
        <p className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Pick the winner</span>
          {!locked && <span className="tabular-nums text-foreground/70">{projected} pts</span>}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {options.map((o) => {
            const isChosen = hydrated && chosen === o.value;
            return (
              <button
                key={o.value}
                onClick={() => choose(o.value, o.label)}
                disabled={locked || !hydrated}
                className={cn(
                  "rounded-xl border px-1 py-2 text-xs font-semibold transition disabled:cursor-default",
                  isChosen
                    ? "border-electric/50 bg-electric/15 text-electric"
                    : "border-white/[0.07] text-foreground/80 hover:bg-white/[0.05] disabled:opacity-40"
                )}
              >
                {o.value === "draw" ? "Draw" : (o.value === "home" ? home?.code : away?.code) ?? o.label}
              </button>
            );
          })}
        </div>
      </div>

      {!locked && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Risk</p>
          <div className="grid grid-cols-4 gap-1.5">
            {RISKS.map((r) => {
              const active = risk === r;
              return (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  className={cn(
                    "rounded-lg border px-1 py-1.5 text-center transition",
                    active ? "bg-white/[0.08]" : "border-white/[0.06] hover:bg-white/[0.04]"
                  )}
                  style={active ? { borderColor: hslVar(RISK_META[r].color, 0.5) } : undefined}
                >
                  <span className="block text-[10px] font-bold" style={{ color: hslVar(RISK_META[r].color) }}>
                    {RISK_META[r].label}
                  </span>
                  <span className="block text-[8px] text-muted-foreground tabular-nums">×{RISK_MULTIPLIER[r]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3">
        {locked ? (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" /> Locked at kick-off
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">7 markets available</span>
        )}
        <Link href={`/match/${match.id}`} className="flex items-center gap-1 text-xs font-semibold text-electric hover:underline">
          More markets <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}

/* ------------------------------ My picks tab ---------------------------- */

function MyPicksTab({
  now, reduce, hydrated, predictions, points,
}: { now: number; reduce: boolean; hydrated: boolean; predictions: Prediction[]; points: number }) {
  const settleForMatch = usePredictionStore((s) => s.settleForMatch);

  // Settle any finished matches we have picks on.
  useEffect(() => {
    if (!hydrated) return;
    const matchIds = Array.from(new Set(predictions.map((p) => p.matchId)));
    for (const id of matchIds) {
      const m = getMatch(id, now);
      if (m && m.status === "finished") settleForMatch(m);
    }
  }, [hydrated, now, predictions, settleForMatch]);

  const ordered = useMemo(
    () => [...predictions].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [predictions]
  );

  const settled = predictions.filter((p) => p.settled);
  const correct = settled.filter((p) => p.correct).length;

  if (!hydrated) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-20 shimmer rounded-2xl border border-white/[0.06]" />)}
      </div>
    );
  }

  if (ordered.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks className="h-5 w-5" />}
        title="You haven't made a call yet"
        description="Head to the Open tab and pick a winner. Every prediction settles automatically at full time."
        action={<Button variant="outline" size="sm" disabled className="opacity-70">Switch to Open above</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Record summary */}
      <div className="grid grid-cols-3 gap-3">
        <RecordStat label="Banked" value={points.toLocaleString()} accent="var(--gold)" />
        <RecordStat label="Record" value={`${correct}/${settled.length || 0}`} accent="var(--pitch)" />
        <RecordStat label="Pending" value={`${predictions.length - settled.length}`} accent="var(--electric)" />
      </div>

      <div className="space-y-2.5">
        {ordered.map((p, i) => (
          <PickRow key={p.id} prediction={p} now={now} index={i} reduce={reduce} />
        ))}
      </div>
    </div>
  );
}

function RecordStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] glass p-3.5 text-center">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold tabular-nums" style={{ color: hslVar(accent) }}>{value}</p>
    </div>
  );
}

function PickRow({ prediction, now, index, reduce }: { prediction: Prediction; now: number; index: number; reduce: boolean }) {
  const match = useMemo(() => getMatch(prediction.matchId, now), [prediction.matchId, now]);
  const home = getTeam(match?.homeTeamId ?? null);
  const away = getTeam(match?.awayTeamId ?? null);
  const meta = MARKET_META[prediction.market] ?? { label: prediction.market, hint: "", icon: "Target" };

  const valueLabel = useMemo(() => {
    if (!match) return prediction.value;
    if (prediction.market === "winner" || prediction.market === "first_scorer") {
      if (prediction.value === "home") return home?.name ?? "Home";
      if (prediction.value === "away") return away?.name ?? "Away";
      if (prediction.value === "draw") return "Draw";
      if (prediction.value === "none") return "No goals";
    }
    if (prediction.market === "clean_sheet") {
      if (prediction.value === "home") return `${home?.code ?? "Home"} clean sheet`;
      if (prediction.value === "away") return `${away?.code ?? "Away"} clean sheet`;
      if (prediction.value === "none") return "Both score";
    }
    return prediction.value;
  }, [match, prediction, home, away]);

  const state: "correct" | "wrong" | "pending" = prediction.settled
    ? prediction.correct ? "correct" : "wrong"
    : "pending";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.36, delay: Math.min(index * 0.03, 0.24), ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3.5",
        state === "correct" ? "border-pitch/25 bg-pitch/[0.04]"
          : state === "wrong" ? "border-live/20 bg-live/[0.03]"
            : "border-white/[0.07] glass"
      )}
    >
      <Link href={`/match/${prediction.matchId}`} className="flex shrink-0 items-center -space-x-2">
        <TeamCrest team={home} size="sm" className="ring-2 ring-background" />
        <TeamCrest team={away} size="sm" className="ring-2 ring-background" />
      </Link>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Icon name={meta.icon} className="h-3 w-3" /> {meta.label}
        </p>
        <p className={cn("truncate text-sm font-semibold", state === "wrong" && "text-muted-foreground line-through")}>
          {valueLabel}
        </p>
      </div>

      <Badge variant="secondary" className="shrink-0" style={{ color: hslVar(RISK_META[prediction.risk].color) }}>
        {RISK_META[prediction.risk].label}
      </Badge>

      <div className="shrink-0 text-right">
        {state === "pending" && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-electric" /> Pending
          </span>
        )}
        {state === "correct" && (
          <span className="flex items-center gap-1 text-sm font-bold text-pitch">
            <Check className="h-3.5 w-3.5" /> +{prediction.points}
          </span>
        )}
        {state === "wrong" && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-live">
            <X className="h-3.5 w-3.5" /> Missed
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------- Markets tab ---------------------------- */

function MarketsTab({ reduce }: { reduce: boolean }) {
  const markets = (Object.keys(MARKET_BASE_POINTS) as Array<keyof typeof MARKET_BASE_POINTS>);

  return (
    <div className="space-y-6">
      {/* How scoring works */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-accent/20 glass p-5 sm:p-6"
      >
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative">
          <SectionHeader title="How scoring works" icon={<Info className="h-4 w-4 text-accent" />} />
          <p className="text-sm leading-relaxed text-foreground/80">
            Every market has a <span className="font-semibold text-foreground">base value</span> — harder calls are worth more.
            Your <span className="font-semibold text-foreground">risk level</span> multiplies that base: play it safe for a sure thing,
            or go wild to chase a hero moment. Get it right and you bank{" "}
            <span className="text-gradient-gold font-semibold">base × multiplier</span> points. Get it wrong and you bank nothing —
            no penalty, just bragging rights on the line.
          </p>

          {/* Risk multipliers */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RISKS.map((r) => (
              <div
                key={r}
                className="rounded-2xl border p-3"
                style={{ borderColor: hslVar(RISK_META[r].color, 0.25), background: hslVar(RISK_META[r].color, 0.06) }}
              >
                <p className="text-sm font-bold" style={{ color: hslVar(RISK_META[r].color) }}>{RISK_META[r].label}</p>
                <p className="font-mono text-lg font-bold tabular-nums" style={{ color: hslVar(RISK_META[r].color) }}>
                  ×{RISK_MULTIPLIER[r]}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{RISK_META[r].blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Markets table */}
      <div className="overflow-hidden rounded-3xl border border-white/[0.06] glass">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Layers className="h-4 w-4 text-electric" /> Prediction markets
          </h3>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{markets.length} markets</span>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium sm:px-5">Market</th>
              <th className="px-2 py-2.5 text-center font-medium tabular">Base</th>
              <th className="px-2 py-2.5 text-center font-medium tabular" title="Safe">Safe</th>
              <th className="px-2 py-2.5 text-center font-medium tabular" title="Balanced">Bal.</th>
              <th className="px-2 py-2.5 text-center font-medium tabular" title="Bold">Bold</th>
              <th className="px-3 py-2.5 text-center font-medium tabular sm:px-5" title="Wild">Wild</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((m) => {
              const meta = MARKET_META[m] ?? { label: m, hint: "", icon: "Target" };
              const base = MARKET_BASE_POINTS[m];
              return (
                <tr key={m} className="border-t border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-muted-foreground">
                        <Icon name={meta.icon} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold leading-tight">{meta.label}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{meta.hint}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center font-mono font-bold tabular-nums text-foreground/80">{base}</td>
                  <td className="px-2 py-3 text-center font-mono tabular-nums" style={{ color: hslVar(RISK_META.safe.color) }}>
                    {Math.round(base * RISK_MULTIPLIER.safe)}
                  </td>
                  <td className="px-2 py-3 text-center font-mono tabular-nums" style={{ color: hslVar(RISK_META.balanced.color) }}>
                    {Math.round(base * RISK_MULTIPLIER.balanced)}
                  </td>
                  <td className="px-2 py-3 text-center font-mono tabular-nums" style={{ color: hslVar(RISK_META.bold.color) }}>
                    {Math.round(base * RISK_MULTIPLIER.bold)}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold tabular-nums sm:px-5" style={{ color: hslVar(RISK_META.wild.color) }}>
                    {Math.round(base * RISK_MULTIPLIER.wild)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <p className="flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
        <Sparkles className="h-3 w-3 text-accent" />
        Tip: the Oracle marks its pick on every match page. Beat it for serious bragging rights.
      </p>
    </div>
  );
}
