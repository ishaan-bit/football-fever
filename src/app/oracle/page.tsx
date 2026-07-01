"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Zap, ArrowRight, Trophy, Crown, Flame } from "lucide-react";
import { PageShell, PageHeader } from "@/components/shared/page-shell";
import { SectionHeader } from "@/components/shared/section-header";
import { OraclePanel } from "@/components/match/oracle-panel";
import { ProbabilityBar } from "@/components/shared/probability-bar";
import { TeamCrest } from "@/components/shared/team-crest";
import { StatusPill, stageLabel } from "@/components/shared/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import {
  getUpcomingMatches, getLiveMatches, getFeaturedMatch, getTeam, ALL_TEAMS,
} from "@/lib/data";
import { runOracle } from "@/lib/oracle/engine";
import { cn, pct } from "@/lib/utils";
import type { Match } from "@/types";

export default function OraclePage() {
  // SSR-stable: 0 on first render, then ticks.
  const clock = useNow(20000);

  const pool = useMemo(() => {
    const live = getLiveMatches(clock);
    const up = getUpcomingMatches(10, clock);
    return [...live, ...up].filter((m) => m.homeTeamId && m.awayTeamId);
  }, [clock]);

  const featured = useMemo(() => getFeaturedMatch(clock), [clock]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => pool.find((m) => m.id === selectedId) ?? featured ?? pool[0],
    [pool, selectedId, featured]
  );

  const calls = useMemo(
    () => pool.map((m) => ({ match: m, oracle: runOracle(m)! })).filter((c) => c.oracle),
    [pool]
  );
  const upsets = calls.filter((c) => c.oracle.upset.active);

  const titleRace = useMemo(
    () => [...ALL_TEAMS].sort((a, b) => b.rating - a.rating).slice(0, 6),
    []
  );

  return (
    <PageShell size="wide">
      <PageHeader
        eyebrow="The Oracle"
        title={<>Predictions, <span className="text-gradient">explained.</span></>}
        description="The smartest fan in the room. Every call comes with the why — not just a number. Beat it for bragging rights."
      />

      {/* Oracle persona banner */}
      <div className="mb-6 flex flex-col gap-4 overflow-hidden rounded-3xl border border-accent/20 glass p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
            <Sparkles className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display text-lg font-bold">The Oracle is feeling confident.</p>
            <p className="text-sm text-muted-foreground">
              10,000 simulations per match. Currently topping the leaderboard — and unbearably smug about it.
            </p>
          </div>
        </div>
        <div className="flex gap-3 sm:ml-auto">
          <Stat label="Win rate" value="74%" />
          <Stat label="Streak" value="6 🔥" />
          <Stat label="Rank" value="#1" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,380px)]">
        {/* Selected breakdown */}
        <div className="min-w-0">
          {selected && (
            <>
              <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {pool.slice(0, 10).map((m) => {
                  const h = getTeam(m.homeTeamId);
                  const a = getTeam(m.awayTeamId);
                  const active = selected.id === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        active ? "border-accent/50 bg-accent/10 text-accent" : "border-white/[0.08] text-muted-foreground hover:bg-white/[0.04]"
                      )}
                    >
                      <TeamCrest team={h} size="xs" /> {h?.code}
                      <span className="text-muted-foreground/50">v</span>
                      {a?.code} <TeamCrest team={a} size="xs" />
                    </button>
                  );
                })}
              </div>
              <div className="rounded-3xl border border-white/[0.07] glass p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {stageLabel(selected.stage, selected.group)}
                  </span>
                  <StatusPill match={selected} />
                </div>
                <OraclePanel match={selected} />
                <Button asChild variant="electric" className="mt-5 w-full">
                  <Link href={`/match/${selected.id}`}>Open the match room <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Side: upsets + title race */}
        <div className="space-y-6">
          <section>
            <SectionHeader title="Upset radar" icon={<Zap className="h-4 w-4 text-live" />} />
            {upsets.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-muted-foreground">
                No alarms ringing. The favourites should hold — for now.
              </p>
            ) : (
              <div className="space-y-2">
                {upsets.slice(0, 4).map(({ match, oracle }) => {
                  const dog = getTeam(oracle.upset.underdogId);
                  return (
                    <Link key={match.id} href={`/match/${match.id}`} className="flex items-center gap-3 rounded-2xl border border-live/20 bg-live/[0.04] p-3 transition hover:bg-live/[0.07]">
                      <TeamCrest team={dog} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{dog?.name} are live</p>
                        <p className="truncate text-[11px] text-muted-foreground">{stageLabel(match.stage, match.group)}</p>
                      </div>
                      <Flame className="h-4 w-4 text-live" />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <SectionHeader title="Title race" icon={<Trophy className="h-4 w-4 text-gold" />} />
            <div className="space-y-1.5">
              {titleRace.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-2.5">
                  <span className="tabular w-5 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                  <TeamCrest team={t} size="sm" />
                  <span className="flex-1 truncate text-sm font-medium">{t.name}</span>
                  {i === 0 && <Crown className="h-4 w-4 text-gold" />}
                  <span className="tabular text-xs text-muted-foreground">{t.rating}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Today's calls */}
      <section className="mt-10">
        <SectionHeader title="Every call, today" icon={<Sparkles className="h-4 w-4 text-accent" />} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {calls.slice(0, 9).map(({ match, oracle }, i) => {
            const h = getTeam(match.homeTeamId);
            const a = getTeam(match.awayTeamId);
            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
              >
                <Link href={`/match/${match.id}`} className="block rounded-2xl border border-white/[0.06] bg-card/60 p-4 transition hover:border-white/15">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <TeamCrest team={h} size="xs" /> {h?.code}
                      <span className="text-muted-foreground/50">v</span>
                      {a?.code} <TeamCrest team={a} size="xs" />
                    </div>
                    {oracle.upset.active ? <Badge variant="live" className="text-[10px]"><Zap className="h-2.5 w-2.5" /> Upset</Badge> : <span className="text-[11px] text-muted-foreground">{oracle.confidence}/100</span>}
                  </div>
                  <ProbabilityBar home={oracle.homeWinProb} draw={oracle.drawProb} away={oracle.awayWinProb} homeLabel={h?.code} awayLabel={a?.code} knockout={match.stage !== "group"} />
                  <p className="mt-2.5 text-sm font-medium text-gradient-pitch">{oracle.verdict}</p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-center">
      <p className="font-display text-base font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
