"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Target, Gamepad2, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeamCrest } from "@/components/shared/team-crest";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useIsMobile } from "@/hooks/use-media-query";
import { useNow } from "@/hooks/use-now";
import { getFeaturedMatch, getTeam } from "@/lib/data";
import { runOracle } from "@/lib/oracle/engine";
import { hostIdleNudge, hostStageMood } from "@/lib/ai/host";
import { AI_MOOD_COLOR } from "@/lib/constants";
import { pct, hslVar } from "@/lib/utils";

export function AIHostOrb() {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();
  const now = useNow(60000);

  const data = useMemo(() => {
    if (!now) return null;
    const match = getFeaturedMatch(now);
    if (!match || !match.homeTeamId || !match.awayTeamId) return null;
    const oracle = runOracle(match);
    return { match, oracle, mood: hostStageMood(match.stage) };
  }, [now]);

  const accent = AI_MOOD_COLOR[data?.mood ?? "calm"];
  const quip = useMemo(() => hostIdleNudge(data?.match).text, [data?.match]);
  const home = getTeam(data?.match.homeTeamId);
  const away = getTeam(data?.match.awayTeamId);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open The Oracle"
        data-tour="ai-orb"
        className="fixed bottom-28 left-4 z-30 lg:bottom-12 lg:left-6"
      >
        <span className="relative grid h-14 w-14 place-items-center rounded-full">
          {!reduced && (
            <span
              className="absolute inset-0 animate-pulse-live rounded-full opacity-70 blur-md"
              style={{ background: hslVar(accent) }}
            />
          )}
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: `conic-gradient(from 0deg, ${hslVar(accent)}, transparent, ${hslVar(accent)})`, opacity: 0.85 }}
          />
          <span className="relative grid h-12 w-12 place-items-center rounded-full bg-background/90 backdrop-blur">
            <Sparkles className="h-5 w-5" style={{ color: hslVar(accent) }} />
          </span>
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          hideClose
          className={isMobile ? "max-h-[80dvh]" : "w-full max-w-md"}
        >
          <div className="flex h-full flex-col p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-11 w-11 place-items-center rounded-2xl"
                  style={{ background: hslVar(accent, 0.13), color: hslVar(accent) }}
                >
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold leading-none">The Oracle</p>
                  <p className="mt-1 text-xs text-muted-foreground">Football-obsessed. Slightly smug.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-sm leading-relaxed">
              {quip}
            </div>

            {data?.oracle && home && away && (
              <div className="mt-4 rounded-2xl border border-white/[0.07] p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="violet" className="gap-1">
                    <Sparkles className="h-3 w-3" /> My read on the next one
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {data.oracle.confidence}/100 conf.
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TeamCrest team={home} size="sm" />
                    <span className="text-sm font-medium">{home.code}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">vs</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{away.code}</span>
                    <TeamCrest team={away} size="sm" />
                  </div>
                </div>
                <div className="mt-3 flex gap-1 overflow-hidden rounded-full text-[10px] font-semibold">
                  <span className="flex items-center justify-center bg-electric/30 py-1 text-electric" style={{ width: pct(data.oracle.homeWinProb) }}>
                    {pct(data.oracle.homeWinProb)}
                  </span>
                  <span className="flex items-center justify-center bg-white/10 py-1" style={{ width: pct(data.oracle.drawProb) }} />
                  <span className="flex items-center justify-center bg-accent/30 py-1 text-accent" style={{ width: pct(data.oracle.awayWinProb) }}>
                    {pct(data.oracle.awayWinProb)}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-gradient-pitch">{data.oracle.verdict}</p>
              </div>
            )}

            <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
              {data?.match && (
                <Button asChild variant="electric" className="col-span-2" onClick={() => setOpen(false)}>
                  <Link href={`/match/${data.match.id}`}>
                    Enter the match room <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" onClick={() => setOpen(false)}>
                <Link href="/predictions"><Target className="h-4 w-4" /> Predict</Link>
              </Button>
              <Button asChild variant="outline" onClick={() => setOpen(false)}>
                <Link href="/games"><Gamepad2 className="h-4 w-4" /> Play</Link>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
