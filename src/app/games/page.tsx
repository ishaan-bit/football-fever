"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Gamepad2, ArrowRight, Sparkles, Users, Mic, Flame, Shield, Star } from "lucide-react";
import { PageShell, PageHeader } from "@/components/shared/page-shell";
import { Icon } from "@/components/shared/icon";
import { SceneBackground } from "@/components/shared/scene-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSound } from "@/hooks/use-sound";
import { MINI_GAMES } from "@/lib/constants";
import { cn, hslVar } from "@/lib/utils";
import type { SceneName } from "@/lib/imagery";
import type { MiniGameId, MiniGameMeta } from "@/types";

/** The photographic mood behind each game's card + play surface. */
const GAME_SCENE: Record<MiniGameId, SceneName> = {
  trash_talk: "fire",
  crowd_meter: "crowd",
  flash_predictions: "action",
  guess_next_event: "shot",
  hot_take_roulette: "fire",
  penalty_panic: "shot",
  emoji_battle: "crowd",
  team_trivia: "stadium",
  golden_goal: "pitch",
  var_court: "tunnel",
  pass_the_curse: "tunnel",
};

import { CrowdMeter } from "@/components/games/crowd-meter";
import { FlashPredictions } from "@/components/games/flash-predictions";
import { HotTakeRoulette } from "@/components/games/hot-take-roulette";
import { PenaltyPanic } from "@/components/games/penalty-panic";
import { EmojiBattle } from "@/components/games/emoji-battle";
import { TeamTrivia } from "@/components/games/team-trivia";
import { GoldenGoal } from "@/components/games/golden-goal";

/** Map of fully playable games. Ids not present here are "room-only" teases. */
const PLAYABLE: Partial<Record<MiniGameId, () => React.ReactNode>> = {
  crowd_meter: () => <CrowdMeter />,
  flash_predictions: () => <FlashPredictions />,
  hot_take_roulette: () => <HotTakeRoulette />,
  penalty_panic: () => <PenaltyPanic />,
  emoji_battle: () => <EmojiBattle />,
  team_trivia: () => <TeamTrivia />,
  golden_goal: () => <GoldenGoal />,
};

export default function GamesPage() {
  const reduced = useReducedMotion();
  const { play } = useSound();
  const router = useRouter();
  const [active, setActive] = useState<MiniGameMeta | null>(null);

  const open = (g: MiniGameMeta) => {
    play("click");
    // Trash Talk is a full cinematic mode, not a dialog mini-game.
    if (g.id === "trash_talk") {
      router.push("/trash-talk");
      return;
    }
    setActive(g);
  };

  return (
    <PageShell className="space-y-8">
      <PageHeader
        scene="pitch"
        seed="games-lounge"
        eyebrow="Lounge"
        title="Party Games"
        description="Jump in between the action. Minimal taps, maximum chaos."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/fixtures">
              <Users className="h-4 w-4" /> Find a room
            </Link>
          </Button>
        }
      />

      {/* Trash Talk — the headline mode */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link
          href="/trash-talk"
          onClick={() => play("click")}
          className="group relative isolate flex flex-col items-start gap-4 overflow-hidden rounded-3xl border border-live/25 bg-live/[0.05] p-6 transition-colors hover:border-live/45 sm:flex-row sm:items-center sm:justify-between"
        >
          <SceneBackground scene="fire" seed="trash-talk" intensity="soft" from="left" grain={false} />
          <div className="absolute -left-10 -top-16 h-44 w-44 rounded-full bg-live/25 blur-3xl transition-opacity group-hover:opacity-80" />
          <div className="absolute -right-12 bottom-0 h-36 w-36 rounded-full bg-magenta/20 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-live/15 text-live shadow-glow-live">
              <Mic className="h-7 w-7" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="live" className="gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" /> Live
                </Badge>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-live">New mode</span>
              </div>
              <h2 className="mt-1.5 font-display text-2xl font-black tracking-tight">Trash Talk 🎤🔥</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Bash anyone playing. Starter burns built live from the scoreline — fire them off and let the Roastmaster score the carnage.
              </p>
            </div>
          </div>
          <span className="relative flex shrink-0 items-center gap-1.5 rounded-full bg-live px-5 py-2.5 text-sm font-bold text-white shadow-glow-live">
            <Flame className="h-4 w-4" /> Enter the Roast Room
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </motion.div>

      {/* Squad Mode — pick a team + players, then play */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduced ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link
          href="/games/squad"
          onClick={() => play("click")}
          className="group relative isolate flex flex-col items-start gap-4 overflow-hidden rounded-3xl border border-electric/25 bg-electric/[0.05] p-6 transition-colors hover:border-electric/45 sm:flex-row sm:items-center sm:justify-between"
        >
          <SceneBackground scene="action" seed="squad-mode" intensity="soft" from="left" grain={false} />
          <div className="absolute -left-10 -top-16 h-44 w-44 rounded-full bg-electric/20 blur-3xl transition-opacity group-hover:opacity-80" />
          <div className="absolute -right-12 bottom-0 h-36 w-36 rounded-full bg-gold/15 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-electric/15 text-electric shadow-[0_8px_30px_-12px_hsl(var(--electric)/0.8)]">
              <Shield className="h-7 w-7" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="electric" className="gap-1">
                  <Star className="h-3 w-3 fill-electric" /> Squad Mode
                </Badge>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-electric">Pick & play</span>
              </div>
              <h2 className="mt-1.5 font-display text-2xl font-black tracking-tight">Your team. Your five. ⚽️</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Pick any nation, draft the players you rate, then call the hero and duel the Oracle with the squad you built.
              </p>
            </div>
          </div>
          <span className="relative flex shrink-0 items-center gap-1.5 rounded-full bg-electric px-5 py-2.5 text-sm font-bold text-background shadow-[0_8px_30px_-12px_hsl(var(--electric)/0.8)]">
            <Gamepad2 className="h-4 w-4" /> Build your squad
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MINI_GAMES.filter((g) => g.id !== "trash_talk").map((g, i) => {
          const playable = g.id in PLAYABLE;
          return (
            <motion.div
              key={g.id}
              initial={reduced ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: reduced ? 0 : i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <GameCard meta={g} scene={GAME_SCENE[g.id]} playable={playable} onOpen={() => open(g)} />
            </motion.div>
          );
        })}
      </div>

      {/* Active game / tease dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-md">
          {active && <DialogBody meta={active} />}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

/* ------------------------------- Card -------------------------------- */

function GameCard({
  meta,
  scene,
  playable,
  onOpen,
}: {
  meta: MiniGameMeta;
  scene: SceneName;
  playable: boolean;
  onOpen: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      onClick={onOpen}
      whileHover={reduced ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group relative isolate flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/[0.07] glass p-5 text-left transition-colors hover:border-white/15"
    >
      {/* themed photographic wash — brightens on hover. Static (no ken-burns) so a
          dense grid of cards never runs a dozen zoom loops at once on mobile. */}
      <SceneBackground
        scene={scene}
        seed={meta.id}
        intensity="subtle"
        from="top"
        grain={false}
        kenBurns={false}
        className="opacity-70 transition-opacity duration-500 group-hover:opacity-100"
      />
      {/* accent glow */}
      <div
        className="absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-40 blur-3xl transition-opacity group-hover:opacity-70"
        style={{ background: hslVar(meta.accent, 0.4) }}
      />

      <div className="relative flex items-start justify-between">
        <span
          className="grid h-11 w-11 place-items-center rounded-2xl"
          style={{ background: hslVar(meta.accent, 0.14), color: hslVar(meta.accent) }}
        >
          <Icon name={meta.icon} className="h-5 w-5" />
        </span>
        <div className="flex items-center gap-2">
          {meta.live && (
            <Badge variant="live" className="gap-1">
              <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-live" /> Live
            </Badge>
          )}
          {!playable && (
            <Badge variant="secondary" className="text-[10px]">
              In rooms
            </Badge>
          )}
        </div>
      </div>

      <div className="relative mt-4 flex-1">
        <h3 className="font-display text-lg font-bold tracking-tight">{meta.name}</h3>
        <p className="text-sm text-muted-foreground">{meta.tagline}</p>
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {meta.players}
          </span>
          <span>·</span>
          <span>{meta.duration}</span>
        </div>
        <Intensity level={meta.intensity} accent={meta.accent} />
      </div>

      <span
        className="relative mt-3 flex items-center gap-1 text-sm font-semibold"
        style={{ color: hslVar(meta.accent) }}
      >
        {playable ? "Play now" : "Peek inside"}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </motion.button>
  );
}

function Intensity({ level, accent }: { level: 1 | 2 | 3; accent: string }) {
  return (
    <span className="flex items-center gap-1" title={`Intensity ${level}/3`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn("h-1.5 w-1.5 rounded-full transition-colors", n > level && "bg-white/12")}
          style={n <= level ? { background: hslVar(accent) } : undefined}
        />
      ))}
    </span>
  );
}

/* ----------------------------- Dialog body --------------------------- */

function DialogBody({ meta }: { meta: MiniGameMeta }) {
  const render = PLAYABLE[meta.id];

  return (
    <>
      {/* Cinematic cover band bleeding to the dialog edges. */}
      <div className="relative isolate -mx-6 -mt-6 mb-1 h-24 overflow-hidden rounded-t-3xl">
        <SceneBackground scene={GAME_SCENE[meta.id]} seed={meta.id} intensity="vivid" from="bottom" />
        <div
          className="absolute -left-8 top-0 h-28 w-28 rounded-full opacity-50 blur-3xl"
          style={{ background: hslVar(meta.accent, 0.5) }}
        />
        <DialogHeader className="absolute inset-x-4 bottom-3">
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl backdrop-blur"
              style={{ background: hslVar(meta.accent, 0.22), color: hslVar(meta.accent) }}
            >
              <Icon name={meta.icon} className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>{meta.name}</DialogTitle>
              <DialogDescription>{meta.tagline}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
      </div>

      <div className="max-h-[70vh] overflow-y-auto no-scrollbar">
        {render ? render() : <RoomTease meta={meta} />}
      </div>
    </>
  );
}

function RoomTease({ meta }: { meta: MiniGameMeta }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div
        className="grid h-16 w-16 place-items-center rounded-3xl"
        style={{ background: hslVar(meta.accent, 0.14), color: hslVar(meta.accent) }}
      >
        <Sparkles className="h-7 w-7" />
      </div>
      <div>
        <p className="font-display text-lg font-bold">Best played live in a Match Room</p>
        <p className="mt-1.5 text-sm text-muted-foreground">{meta.description}</p>
      </div>
      <p className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] text-muted-foreground">
        {meta.players} · {meta.duration}
      </p>
      <Button asChild variant="outline" className="w-full">
        <Link href="/fixtures">
          <Gamepad2 className="h-4 w-4" /> Join a room to play
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
