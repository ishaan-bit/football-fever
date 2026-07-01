"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles, Radio, ArrowRight, Trophy, Target, Flame, Gamepad2,
  TrendingUp, Zap, CalendarDays, ChevronRight, Users,
} from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { SectionHeader } from "@/components/shared/section-header";
import { MatchCard } from "@/components/shared/match-card";
import { FriendStack } from "@/components/shared/friend-stack";
import { TeamCrest } from "@/components/shared/team-crest";
import { AmbientVideo } from "@/components/shared/ambient-video";
import { StatusPill, stageLabel } from "@/components/shared/status-pill";
import { ProbabilityBar } from "@/components/shared/probability-bar";
import { Countdown } from "@/components/shared/countdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/shared/icon";
import { useNow } from "@/hooks/use-now";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePredictionStore } from "@/stores/predictions";
import { useUserStore } from "@/stores/user";
import {
  getLiveMatches, getUpcomingMatches, getRecentResults, getFeaturedMatch,
  getTeam, getVenue, buildLeaderboard, FRIENDS,
} from "@/lib/data";
import { runOracle } from "@/lib/oracle/engine";
import { APP, MINI_GAMES } from "@/lib/constants";
import { worldCupDay } from "@/lib/backgrounds";
import { stadiumClipFor, clipVideo, clipPoster } from "@/lib/media";
import { pct, ordinal, hslVar } from "@/lib/utils";

export default function HomePage() {
  // `now` is 0 on the server + first client render (SSR-stable), then ticks.
  const clock = useNow(15000);
  const hydrated = useHydrated();

  const live = useMemo(() => getLiveMatches(clock), [clock]);
  const upcoming = useMemo(() => getUpcomingMatches(6, clock), [clock]);
  const results = useMemo(() => getRecentResults(4, clock), [clock]);
  const featured = useMemo(() => getFeaturedMatch(clock), [clock]);

  const points = usePredictionStore((s) => s.predictions.reduce((a, p) => a + p.points, 0));
  const accuracy = usePredictionStore((s) => s.accuracy());
  const streak = usePredictionStore((s) => s.streak());
  const profile = useUserStore((s) => s.profile);
  const myRank = useMemo(
    () => buildLeaderboard(profile.id, 900 + points).find((e) => e.isYou)?.rank ?? "—",
    [profile.id, points]
  );

  return (
    <div>
      {featured && <Hero match={featured} now={clock} />}

      <PageShell className="space-y-12 pt-2">
        {live.length > 0 && (
          <section>
            <SectionHeader
              title="Live now"
              icon={<Radio className="h-4 w-4 text-live" />}
              action={
                <Link href="/fixtures" className="text-xs text-muted-foreground hover:text-foreground">
                  All matches
                </Link>
              }
            />
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
              {live.map((m) => (
                <MatchCard key={m.id} match={m} className="min-w-[300px] sm:min-w-0" />
              ))}
            </div>
          </section>
        )}

        {/* Oracle highlight + your form */}
        <section className="grid gap-4 lg:grid-cols-3">
          <OracleHighlight match={featured} className="lg:col-span-2" />
          <YourForm
            hydrated={hydrated}
            points={hydrated ? points : 0}
            accuracy={hydrated ? accuracy : 0}
            streak={hydrated ? streak : 0}
            rank={myRank}
            name={hydrated ? profile.name : "You"}
          />
        </section>

        <section>
          <SectionHeader
            title="Coming up"
            icon={<CalendarDays className="h-4 w-4 text-electric" />}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/fixtures">Full schedule <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <FriendActivity className="lg:col-span-2" />
          <GamesTeaser />
        </section>

        {results.length > 0 && (
          <section>
            <SectionHeader
              title="Latest results"
              icon={<Trophy className="h-4 w-4 text-gold" />}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {results.map((m) => (
                <MatchCard key={m.id} match={m} variant="compact" />
              ))}
            </div>
          </section>
        )}
      </PageShell>
    </div>
  );
}

/* ------------------------------- Hero -------------------------------- */

function Hero({ match, now }: { match: import("@/types").Match; now: number }) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);
  const venue = getVenue(match.venueId);
  const watching = FRIENDS.slice(0, 7);
  const isLive = match.status === "live" || match.status === "halftime";
  // Cinematic stadium loop, deterministic per WC day so it's SSR-stable (day 0
  // on first paint) and doesn't reshuffle on every tick.
  const heroClip = stadiumClipFor(worldCupDay(now));

  return (
    <div className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <AmbientVideo
          src={clipVideo(heroClip.id)}
          poster={clipPoster(heroClip.id)}
          mediaClassName="opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-background/70 to-background" />
        <div className="absolute inset-0 aurora-field opacity-50 mix-blend-screen" />
        <div className="grain absolute inset-0" />
      </div>

      <PageShell size="wide" className="py-10 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Badge variant="electric" className="mb-4">
            <Sparkles className="h-3 w-3" /> {APP.tournament.name} · Live
          </Badge>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Watch every match <span className="text-gradient">together.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            {APP.description}
          </p>

          <div className="mt-7 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            {/* Featured match card */}
            <Link
              href={`/match/${match.id}`}
              className="group relative overflow-hidden rounded-3xl border border-white/10 glass-strong p-5 transition hover:border-white/20 sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {isLive ? <Radio className="h-3.5 w-3.5 text-live" /> : <CalendarDays className="h-3.5 w-3.5" />}
                  {stageLabel(match.stage, match.group)}
                </span>
                <StatusPill match={match} />
              </div>

              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                  <TeamCrest team={home} size="xl" className="h-14 w-20 sm:h-16 sm:w-24" />
                  <span className="max-w-full truncate text-sm font-semibold">{home?.name ?? match.homeLabel ?? "TBD"}</span>
                </div>
                <div className="flex flex-col items-center">
                  {match.status === "scheduled" ? (
                    <Countdown iso={match.kickoff} />
                  ) : (
                    <div className="font-mono text-4xl font-bold tabular-nums sm:text-5xl">
                      {match.homeScore ?? 0}<span className="text-muted-foreground/40">:</span>{match.awayScore ?? 0}
                    </div>
                  )}
                  <span className="mt-2 text-[11px] text-muted-foreground">{venue?.city}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                  <TeamCrest team={away} size="xl" className="h-14 w-20 sm:h-16 sm:w-24" />
                  <span className="max-w-full truncate text-sm font-semibold">{away?.name ?? match.awayLabel ?? "TBD"}</span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <FriendStack people={watching.map((f) => ({ userId: f.id, name: f.name, avatar: f.avatar }))} size="sm" label={`${watching.length} in the room`} />
                <span className="flex items-center gap-1 text-sm font-semibold text-electric">
                  Enter room <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>

            {/* Tournament countdown / quick links */}
            <div className="flex flex-col gap-4">
              <div className="rounded-3xl border border-white/10 glass p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Countdown to the Final</p>
                <div className="mt-3">
                  <Countdown iso={APP.tournament.final} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {APP.tournament.teams} teams · {APP.tournament.matches} matches · 3 host nations
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <QuickLink href="/oracle" icon={<Sparkles className="h-4 w-4" />} label="The Oracle" sub="Explainable picks" accent="var(--brand-violet)" />
                <QuickLink href="/predictions" icon={<Target className="h-4 w-4" />} label="Predict" sub="Beat your friends" accent="var(--pitch)" />
                <QuickLink href="/games" icon={<Gamepad2 className="h-4 w-4" />} label="Party games" sub="Jump in" accent="var(--electric)" />
                <QuickLink href="/leaderboard" icon={<Trophy className="h-4 w-4" />} label="Leaderboard" sub="Your rank" accent="var(--gold)" />
              </div>
            </div>
          </div>
        </motion.div>
      </PageShell>
    </div>
  );
}

function QuickLink({ href, icon, label, sub, accent }: { href: string; icon: React.ReactNode; label: string; sub: string; accent: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 transition hover:bg-white/[0.05]">
      <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: hslVar(accent, 0.13), color: hslVar(accent) }}>
        {icon}
      </span>
      <p className="mt-2.5 text-sm font-semibold">{label}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </Link>
  );
}

/* -------------------------- Oracle highlight ------------------------- */

function OracleHighlight({ match, className }: { match?: import("@/types").Match; className?: string }) {
  const oracle = useMemo(() => (match && match.homeTeamId && match.awayTeamId ? runOracle(match) : null), [match]);
  const home = getTeam(match?.homeTeamId);
  const away = getTeam(match?.awayTeamId);

  if (!oracle || !home || !away) {
    return (
      <div className={`rounded-3xl border border-white/[0.07] glass p-6 ${className}`}>
        <SectionHeader title="The Oracle" icon={<Sparkles className="h-4 w-4 text-accent" />} />
        <p className="text-sm text-muted-foreground">Predictions return as soon as the next fixture is set.</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-accent/20 glass p-6 ${className}`}>
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <Badge variant="violet"><Sparkles className="h-3 w-3" /> Oracle's read</Badge>
          {oracle.upset.active ? (
            <Badge variant="live"><Zap className="h-3 w-3" /> Upset alert</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Confidence {oracle.confidence}/100</span>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <TeamCrest team={home} size="md" />
          <span className="text-sm font-semibold">{home.code}</span>
          <span className="text-xs text-muted-foreground">vs</span>
          <span className="text-sm font-semibold">{away.code}</span>
          <TeamCrest team={away} size="md" />
        </div>
        <ProbabilityBar
          className="mt-4"
          home={oracle.homeWinProb}
          draw={oracle.drawProb}
          away={oracle.awayWinProb}
          homeLabel={home.code}
          awayLabel={away.code}
        />
        <p className="mt-4 text-sm leading-relaxed text-foreground/80">
          “{oracle.preview.split(". ").slice(0, 2).join(". ")}.”
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-gradient-pitch">{oracle.verdict}</span>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/match/${match!.id}`}>Full breakdown <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Your form ----------------------------- */

function YourForm({
  hydrated, points, accuracy, streak, rank, name,
}: {
  hydrated: boolean; points: number; accuracy: number; streak: number; rank: number | string; name: string;
}) {
  return (
    <div className="rounded-3xl border border-white/[0.07] glass p-6">
      <SectionHeader title="Your form" icon={<TrendingUp className="h-4 w-4 text-pitch" />} />
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Points" value={hydrated ? points.toLocaleString() : "—"} accent="var(--gold)" />
        <Stat label="Rank" value={hydrated ? `${ordinal(Number(rank) || 0)}` : "—"} accent="var(--electric)" />
        <Stat label="Accuracy" value={hydrated ? pct(accuracy) : "—"} accent="var(--pitch)" />
        <Stat label="Streak" value={hydrated ? `${streak} 🔥` : "—"} accent="var(--live)" />
      </div>
      <Button asChild className="mt-4 w-full" variant="outline">
        <Link href="/predictions"><Target className="h-4 w-4" /> Make a prediction</Link>
      </Button>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold" style={{ color: hslVar(accent) }}>{value}</p>
    </div>
  );
}

/* -------------------------- Friend activity -------------------------- */

const ACTIVITY = [
  { who: 1, icon: "Target", text: "called Argentina to win 2–1", accent: "var(--pitch)", t: "2m" },
  { who: 3, icon: "Sparkles", text: "beat the Oracle's pick", accent: "var(--brand-violet)", t: "11m" },
  { who: 5, icon: "Flame", text: "is on a 4-match streak", accent: "var(--live)", t: "18m" },
  { who: 2, icon: "Coffee", text: "started a coffee challenge", accent: "var(--gold)", t: "24m" },
  { who: 6, icon: "Gamepad2", text: "won a round of Penalty Panic", accent: "var(--electric)", t: "33m" },
];

function FriendActivity({ className }: { className?: string }) {
  return (
    <div className={`rounded-3xl border border-white/[0.07] glass p-6 ${className}`}>
      <SectionHeader title="Friend activity" icon={<Users className="h-4 w-4 text-electric" />} />
      <div className="space-y-2">
        {ACTIVITY.map((a, i) => {
          const f = FRIENDS[a.who]!;
          return (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/[0.05] p-3">
              <TeamCrest team={getTeam(f.favoriteTeamId)} size="sm" rounded />
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-semibold">{f.name}</span>{" "}
                <span className="text-muted-foreground">{a.text}</span>
              </p>
              <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: hslVar(a.accent, 0.13), color: hslVar(a.accent) }}>
                <Icon name={a.icon} className="h-3.5 w-3.5" />
              </span>
              <span className="text-[11px] text-muted-foreground">{a.t}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------- Games teaser --------------------------- */

function GamesTeaser() {
  const games = MINI_GAMES.slice(0, 4);
  return (
    <div className="rounded-3xl border border-white/[0.07] glass p-6">
      <SectionHeader
        title="Party games"
        icon={<Gamepad2 className="h-4 w-4 text-electric" />}
        action={<Link href="/games" className="text-xs text-muted-foreground hover:text-foreground">All</Link>}
      />
      <div className="grid grid-cols-2 gap-2.5">
        {games.map((g) => (
          <Link
            key={g.id}
            href="/games"
            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:bg-white/[0.05]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `hsl(${g.accent} / 0.18)`, color: `hsl(${g.accent})` }}>
              <Icon name={g.icon} className="h-4 w-4" />
            </span>
            <p className="mt-2 text-xs font-semibold">{g.name}</p>
            <p className="text-[10px] text-muted-foreground">{g.tagline}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
