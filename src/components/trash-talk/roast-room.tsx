"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Flame, Mic, Shuffle, Send, Radio, Sparkles, Crown, Trophy, Skull,
} from "lucide-react";
import type {
  Heat, TrashTalkTarget, TrashTalkPrompt, TrashTalkBurn,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TeamCrest } from "@/components/shared/team-crest";
import { useNow } from "@/hooks/use-now";
import { useHydrated } from "@/hooks/use-hydrated";
import { useSound } from "@/hooks/use-sound";
import { useConfetti } from "@/hooks/use-confetti";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useUserStore } from "@/stores/user";
import { useTrashTalkStore } from "@/stores/trash-talk";
import { getTeam, getLiveMatches } from "@/lib/data";
import {
  buildTargets, starterPrompts, roastmasterVerdict, seedBurns,
  arenaHeat, heatBand, BURN_REACTIONS,
} from "@/lib/ai/trash-talk";
import { cn, hslVar, initials, formatInTz, seededRandom, hashSeed } from "@/lib/utils";

interface RoastRoomProps {
  /** Optional deep-link: preselect the target whose match is this id. */
  matchId?: string;
}

export function RoastRoom({ matchId }: RoastRoomProps) {
  const now = useNow(15000);
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  const { play } = useSound();
  const { celebrate } = useConfetti();

  const profile = useUserStore((s) => s.profile);
  const burns = useTrashTalkStore((s) => s.burns);
  const firedCount = useTrashTalkStore((s) => s.firedCount);
  const micDrops = useTrashTalkStore((s) => s.micDrops);
  const ensureSeed = useTrashTalkStore((s) => s.ensureSeed);
  const fire = useTrashTalkStore((s) => s.fire);
  const react = useTrashTalkStore((s) => s.react);

  // Seed the arena once on the client (after hydration).
  useEffect(() => {
    if (hydrated) ensureSeed(seedBurns(Date.now()));
  }, [hydrated, ensureSeed]);

  const targets = useMemo(() => buildTargets(now), [now]);
  const liveCount = useMemo(() => getLiveMatches(now).length, [now]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [salt, setSalt] = useState(0);
  const [draft, setDraft] = useState("");
  const [verdictFx, setVerdictFx] = useState<{ id: number; score: number; verdict: string; micDrop: boolean } | null>(null);
  const [flash, setFlash] = useState<{ id: number; micDrop: boolean } | null>(null);
  const fxId = useRef(0);

  // Preselect by deep-linked match, else fall back to the hottest target.
  const selected = useMemo(() => {
    if (selectedId) {
      const hit = targets.find((t) => t.id === selectedId);
      if (hit) return hit;
    }
    if (matchId) {
      const byMatch = targets.find((t) => t.matchId === matchId);
      if (byMatch) return byMatch;
    }
    return targets[0];
  }, [targets, selectedId, matchId]);

  const deck = useMemo(
    () => (selected ? starterPrompts(selected, salt) : []),
    [selected, salt]
  );

  const heat = hydrated ? arenaHeat(burns) : 18;
  const band = heatBand(heat);

  const throwBurn = (text: string, heatLevel: Heat, tag?: string) => {
    if (!selected || !text.trim()) return;
    const verdict = roastmasterVerdict(text, heatLevel, firedCount);
    const author = hydrated ? profile : { id: "you", name: "You", avatar: "" };

    fire({
      targetId: selected.id,
      targetName: selected.name,
      targetKind: selected.kind,
      flagTeamId: selected.flagTeamId,
      authorId: author.id,
      authorName: author.name,
      authorAvatar: author.avatar,
      text: text.trim(),
      heat: heatLevel,
      tag,
      score: verdict.score,
      verdict: verdict.verdict,
      micDrop: verdict.micDrop,
    });

    const id = ++fxId.current;
    setFlash({ id, micDrop: verdict.micDrop });
    setVerdictFx({ id, ...verdict });
    play(verdict.micDrop ? "win" : "swoosh");
    if (verdict.micDrop) {
      celebrate(["#ff3b6b", "#ffce3a", "#ff7ad9", "#ffffff"]);
      setTimeout(() => play("goal"), 120);
    }
    window.setTimeout(() => setFlash((f) => (f?.id === id ? null : f)), 600);
    window.setTimeout(() => setVerdictFx((v) => (v?.id === id ? null : v)), 3200);
  };

  const sendDraft = () => {
    const t = draft.trim();
    if (!t) return;
    const caps = /[A-Z]{3,}/.test(t);
    const spicy = /[🔥💀😂🤬]/.test(t);
    const heatLevel: Heat = t.length > 90 || (caps && spicy) ? 3 : caps || spicy || t.length > 50 ? 2 : 1;
    throwBurn(t, heatLevel, "Freestyle");
    setDraft("");
  };

  return (
    <div className="relative">
      <Backdrop heat={heat} hydrated={hydrated} reduced={reduced} />

      {/* fire flash overlay */}
      <AnimatePresence>
        {flash && !reduced && (
          <motion.div
            key={flash.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: flash.micDrop ? 0.5 : 0.22 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none fixed inset-0 z-30"
            style={{
              background: flash.micDrop
                ? "radial-gradient(60% 60% at 50% 40%, hsl(var(--live)/0.5), transparent 70%)"
                : "radial-gradient(60% 60% at 50% 40%, hsl(var(--magenta)/0.32), transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>

      <div className="relative space-y-6">
        <HeatMeter heat={heat} band={band} liveCount={liveCount} reduced={reduced} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          {/* Left: pick a target + deck + composer */}
          <div className="min-w-0 space-y-5">
            <TargetPicker
              targets={targets}
              selectedId={selected?.id ?? null}
              onSelect={(id) => { setSelectedId(id); setSalt((s) => s + 1); play("click"); }}
              reduced={reduced}
            />

            {selected && (
              <StarterDeck
                target={selected}
                deck={deck}
                onShuffle={() => { setSalt((s) => s + 1); play("pop"); }}
                onThrow={(p) => throwBurn(p.text, p.heat, p.tag)}
                reduced={reduced}
              />
            )}

            {selected && (
              <Composer
                target={selected}
                value={draft}
                onChange={setDraft}
                onSend={sendDraft}
              />
            )}
          </div>

          {/* Right: the live arena */}
          <ArenaFeed
            burns={hydrated ? burns : []}
            hydrated={hydrated}
            firedCount={hydrated ? firedCount : 0}
            micDrops={hydrated ? micDrops : 0}
            verdictFx={verdictFx}
            onReact={(id, e) => { react(id, e); play("pop"); }}
            reduced={reduced}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Backdrop ------------------------------- */

function Backdrop({ heat, hydrated, reduced }: { heat: number; hydrated: boolean; reduced: boolean }) {
  // Deterministic ember field, only mounted on the client to avoid SSR drift.
  const embers = useMemo(() => {
    const rng = seededRandom(hashSeed("roast-embers"));
    return Array.from({ length: 18 }, (_, i) => ({
      left: Math.round(rng() * 100),
      delay: rng() * 6,
      dur: 5 + rng() * 6,
      size: 3 + Math.round(rng() * 5),
      key: i,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* spotlight that warms with the heat */}
      <div
        className="absolute -top-32 left-1/2 h-[440px] w-[680px] -translate-x-1/2 rounded-full blur-3xl transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle, ${hslVar("var(--live)", 0.18 + (heat / 100) * 0.22)}, transparent 65%)`,
        }}
      />
      <div
        className="absolute -bottom-40 left-1/2 h-[360px] w-[760px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${hslVar("var(--magenta)", 0.14)}, transparent 70%)` }}
      />
      {hydrated && !reduced && (
        <>
          {embers.map((e) => (
            <motion.span
              key={e.key}
              className="absolute bottom-0 rounded-full bg-live/50"
              style={{ left: `${e.left}%`, width: e.size, height: e.size }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: -460, opacity: [0, 0.7, 0] }}
              transition={{ duration: e.dur, delay: e.delay, repeat: Infinity, ease: "easeOut" }}
            />
          ))}
        </>
      )}
    </div>
  );
}

/* ------------------------------ Heat meter ------------------------------ */

function HeatMeter({
  heat, band, liveCount, reduced,
}: { heat: number; band: ReturnType<typeof heatBand>; liveCount: number; reduced: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] glass p-5">
      <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full blur-3xl" style={{ background: hslVar(band.color, 0.22) }} />
      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Flame className="h-3.5 w-3.5" style={{ color: hslVar(band.color) }} /> Arena heat
          </p>
          <p className="mt-1 flex items-baseline gap-2 font-display text-3xl font-black tabular-nums">
            <span style={{ color: hslVar(band.color) }}>{heat}°</span>
            <span className="text-base font-bold text-foreground/80">{band.label} {band.emoji}</span>
          </p>
        </div>
        <span className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold",
          liveCount > 0 ? "border-live/30 bg-live/10 text-live" : "border-white/10 bg-white/[0.04] text-muted-foreground"
        )}>
          <Radio className={cn("h-3 w-3", liveCount > 0 && "animate-pulse")} />
          {liveCount > 0 ? `${liveCount} live ${liveCount === 1 ? "game" : "games"} feeding the fire` : "No live games — roasting from the tape"}
        </span>
      </div>

      <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${hslVar("var(--gold)")}, ${hslVar("var(--magenta)")}, ${hslVar("var(--live)")})` }}
          initial={false}
          animate={{ width: `${Math.max(6, heat)}%` }}
          transition={{ duration: reduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

/* ----------------------------- Target picker ---------------------------- */

const KIND_META: Record<TrashTalkTarget["kind"], { label: string; icon: typeof Flame }> = {
  team: { label: "On the pitch", icon: Flame },
  rival: { label: "In the room", icon: Mic },
  oracle: { label: "The Oracle", icon: Sparkles },
  room: { label: "Open mic", icon: Crown },
};

function TargetPicker({
  targets, selectedId, onSelect, reduced,
}: {
  targets: TrashTalkTarget[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  reduced: boolean;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <Skull className="h-3.5 w-3.5" /> Pick your victim
      </p>
      <div className="flex min-w-0 gap-2.5 overflow-x-auto pb-2 no-scrollbar">
        {targets.map((t) => (
          <TargetChip
            key={t.id}
            target={t}
            active={t.id === selectedId}
            onSelect={() => onSelect(t.id)}
            reduced={reduced}
          />
        ))}
      </div>
    </div>
  );
}

function TargetChip({
  target, active, onSelect, reduced,
}: { target: TrashTalkTarget; active: boolean; onSelect: () => void; reduced: boolean }) {
  const KindIcon = KIND_META[target.kind].icon;
  const team = target.flagTeamId ? getTeam(target.flagTeamId) : undefined;

  return (
    <motion.button
      onClick={onSelect}
      whileHover={reduced ? undefined : { y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "group relative flex w-44 shrink-0 flex-col gap-2 rounded-2xl border p-3 text-left transition-colors",
        active ? "border-live/50 bg-live/[0.08]" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"
      )}
    >
      <div className="flex items-center gap-2">
        {target.kind === "team" ? (
          <TeamCrest team={team} size="sm" />
        ) : target.avatar ? (
          <Avatar className="h-7 w-7">
            <AvatarImage src={target.avatar} alt={target.name} />
            <AvatarFallback>{initials(target.name)}</AvatarFallback>
          </Avatar>
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.08]">
            <KindIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight">{target.name}</p>
          <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{KIND_META[target.kind].label}</p>
        </div>
      </div>
      <p className="truncate text-[11px] text-muted-foreground/90">{target.context}</p>
      {active && (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-live text-[9px] font-black text-white">
          ✓
        </span>
      )}
    </motion.button>
  );
}

/* ------------------------------ Starter deck ---------------------------- */

function HeatFlames({ heat }: { heat: Heat }) {
  return (
    <span className="flex items-center gap-0.5" title={`Heat ${heat}/3`}>
      {[1, 2, 3].map((n) => (
        <Flame
          key={n}
          className={cn("h-3 w-3", n <= heat ? "text-live" : "text-white/15")}
          fill={n <= heat ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

function StarterDeck({
  target, deck, onShuffle, onThrow, reduced,
}: {
  target: TrashTalkTarget;
  deck: TrashTalkPrompt[];
  onShuffle: () => void;
  onThrow: (p: TrashTalkPrompt) => void;
  reduced: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-gold" /> Starter burns
        </p>
        <Button variant="ghost" size="sm" onClick={onShuffle} className="h-7 gap-1.5 text-xs">
          <Shuffle className="h-3.5 w-3.5" /> Shuffle
        </Button>
      </div>

      <div className="grid gap-2.5">
        <AnimatePresence mode="popLayout">
          {deck.map((p, i) => (
            <motion.button
              key={p.id}
              layout
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.32, delay: reduced ? 0 : i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => onThrow(p)}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-left transition-colors hover:border-live/40 hover:bg-live/[0.05]"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{p.tag}</Badge>
                <HeatFlames heat={p.heat} />
              </div>
              <p className="text-sm leading-snug text-foreground/90">{p.text}</p>
              <span className="mt-2 flex items-center gap-1 text-[11px] font-bold text-live opacity-0 transition-opacity group-hover:opacity-100">
                <Mic className="h-3 w-3" /> Drop it
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      <p className="mt-2 px-1 text-[11px] text-muted-foreground/70">
        Every burn is built from {target.kind === "team" || target.kind === "rival" ? "the live scoreline" : "tonight's chaos"}. Tap to fire, or write your own below.
      </p>
    </div>
  );
}

/* ------------------------------- Composer ------------------------------- */

function Composer({
  target, value, onChange, onSend,
}: {
  target: TrashTalkTarget;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
      <p className="mb-1.5 px-1 text-[11px] text-muted-foreground">
        Roasting <span className="font-semibold text-foreground">{target.name}</span>
      </p>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          maxLength={180}
          placeholder="Write your own savage take…"
          className="min-w-0 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <Button variant="live" size="sm" onClick={onSend} disabled={!value.trim()} className="gap-1.5">
          <Send className="h-3.5 w-3.5" /> Drop
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------- Arena feed ----------------------------- */

function ArenaFeed({
  burns, hydrated, firedCount, micDrops, verdictFx, onReact, reduced,
}: {
  burns: TrashTalkBurn[];
  hydrated: boolean;
  firedCount: number;
  micDrops: number;
  verdictFx: { id: number; score: number; verdict: string; micDrop: boolean } | null;
  onReact: (id: string, emoji: string) => void;
  reduced: boolean;
}) {
  return (
    <div className="flex flex-col rounded-3xl border border-white/[0.08] glass p-4">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-live/15 text-live">
            <Mic className="h-4 w-4" />
          </span>
          The Roast Arena
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-live" /> {hydrated ? firedCount : "—"} fired</span>
          <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-gold" /> {hydrated ? micDrops : "—"} mic drops</span>
        </div>
      </div>

      {/* Roastmaster verdict banner */}
      <div className="relative h-0">
        <AnimatePresence>
          {verdictFx && (
            <motion.div
              key={verdictFx.id}
              initial={{ opacity: 0, y: -8, scale: reduced ? 1 : 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className={cn(
                "absolute inset-x-0 -top-1 z-10 flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 shadow-elevated",
                verdictFx.micDrop ? "border-live/50 bg-live/15" : "border-gold/40 bg-gold/10"
              )}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background/70 text-lg">
                {verdictFx.micDrop ? "🎤" : "⚖️"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Roastmaster · {verdictFx.score}°</p>
                <p className="truncate text-sm font-semibold">{verdictFx.verdict}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-1 flex-1 space-y-3 overflow-y-auto pr-1 no-scrollbar" style={{ maxHeight: "min(64vh, 640px)" }}>
        {!hydrated ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 shimmer rounded-2xl border border-white/[0.06]" />)}
          </div>
        ) : burns.length === 0 ? (
          <div className="grid place-items-center gap-2 py-16 text-center">
            <span className="text-4xl">🎤</span>
            <p className="font-display text-lg font-bold">Silence. Cowardly.</p>
            <p className="max-w-[16rem] text-sm text-muted-foreground">Pick a victim and drop the first burn. The arena is waiting.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {burns.map((b) => (
              <BurnCard key={b.id} burn={b} onReact={onReact} reduced={reduced} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function BurnCard({
  burn: b, onReact, reduced,
}: { burn: TrashTalkBurn; onReact: (id: string, emoji: string) => void; reduced: boolean }) {
  const team = b.flagTeamId ? getTeam(b.flagTeamId) : undefined;

  return (
    <motion.div
      layout
      initial={reduced ? false : { opacity: 0, x: -36, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={reduced ? undefined : { opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-3.5",
        b.micDrop ? "border-live/45 bg-live/[0.07] shadow-glow-live" : "border-white/[0.08] bg-white/[0.02]"
      )}
    >
      {b.micDrop && (
        <span className="absolute right-2 top-2 rotate-6 rounded-md bg-live px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow">
          Mic Drop 🎤
        </span>
      )}

      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={b.authorAvatar} alt={b.authorName} />
          <AvatarFallback>{initials(b.authorName)}</AvatarFallback>
        </Avatar>
        <span className="text-xs font-semibold">{b.authorName}</span>
        <span className="text-[11px] text-muted-foreground">→</span>
        <span className="flex min-w-0 items-center gap-1 text-[11px] font-medium text-muted-foreground">
          {team && <TeamCrest team={team} size="xs" />}
          <span className="truncate">{b.targetName}</span>
        </span>
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">
          {formatInTz(b.createdAt, "Asia/Kolkata", { hour: "2-digit", minute: "2-digit", hour12: false })}
        </span>
      </div>

      <p className="mt-2 text-sm leading-snug">{b.text}</p>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {BURN_REACTIONS.map((e) => {
            const count = b.reactions[e] ?? 0;
            return (
              <button
                key={e}
                onClick={() => onReact(b.id, e)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                  count > 0 ? "border-white/15 bg-white/[0.06]" : "border-white/[0.07] hover:bg-white/[0.05]"
                )}
              >
                <span>{e}</span>
                {count > 0 && <span className="tabular text-[11px] text-muted-foreground">{count}</span>}
              </button>
            );
          })}
        </div>
        <span
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
          style={{ background: hslVar(heatBandColor(b.score), 0.14), color: hslVar(heatBandColor(b.score)) }}
          title={b.verdict}
        >
          <Flame className="h-3 w-3" /> {b.score}°
        </span>
      </div>
    </motion.div>
  );
}

function heatBandColor(score: number): string {
  return heatBand(score).color;
}
