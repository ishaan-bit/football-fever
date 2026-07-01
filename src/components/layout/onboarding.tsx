"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Search, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamCrest } from "@/components/shared/team-crest";
import { SmartImage } from "@/components/shared/smart-image";
import { useUserStore } from "@/stores/user";
import { useHydrated } from "@/hooks/use-hydrated";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ALL_TEAMS, getTeam } from "@/lib/data";
import { sceneImage, type SceneName } from "@/lib/imagery";
import { cn } from "@/lib/utils";

const VIBES = ["Here for the chaos", "Tactical nerd", "Casual & chill", "Ultra. No notes.", "Just here for the memes"];

/** A cinematic still that sets the tone for each step of onboarding. */
const STEP_SCENE: SceneName[] = ["stadium", "tunnel", "crowd"];

export function Onboarding() {
  const hydrated = useHydrated();
  const profile = useUserStore((s) => s.profile);
  const onboarded = useUserStore((s) => s.onboarded);
  const setName = useUserStore((s) => s.setName);
  const setFavoriteTeam = useUserStore((s) => s.setFavoriteTeam);
  const setVibe = useUserStore((s) => s.setVibe);
  const complete = useUserStore((s) => s.completeOnboarding);

  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [name, setLocalName] = useState(profile.name === "You" ? "" : profile.name);
  const [team, setTeam] = useState(profile.favoriteTeamId ?? "");
  const [vibe, setLocalVibe] = useState(profile.vibe ?? "");
  const [q, setQ] = useState("");

  if (!hydrated || onboarded) return null;

  const pickedTeam = getTeam(team);

  const teams = ALL_TEAMS.filter((t) =>
    t.name.toLowerCase().includes(q.toLowerCase()) || t.code.toLowerCase().includes(q.toLowerCase())
  );

  const finish = () => {
    if (name.trim()) setName(name.trim());
    if (team) setFavoriteTeam(team);
    if (vibe) setVibe(vibe);
    complete();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && finish()}>
      <DialogContent hideClose className="max-w-lg overflow-hidden p-0">
        <DialogTitle className="sr-only">Welcome to Football Fever</DialogTitle>
        <div className="relative h-40 overflow-hidden sm:h-44">
          {/* Cinematic still that crossfades to match the step. */}
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={step}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: reduced ? 1 : 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <SmartImage
                src={sceneImage(STEP_SCENE[step] ?? "stadium", step, 900)}
                alt=""
                className={cn(
                  "h-full w-full object-cover",
                  reduced ? "" : "animate-ken-burns"
                )}
              />
            </motion.div>
          </AnimatePresence>
          {/* Favourite-team colour wash once a side is chosen. */}
          {pickedTeam && (
            <div
              className="absolute inset-0 mix-blend-soft-light transition-opacity"
              style={{
                background: `linear-gradient(135deg, ${pickedTeam.colors.primary}cc, transparent 65%)`,
              }}
            />
          )}
          <div className="absolute inset-0 aurora-field opacity-60 mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-popover" />
          {!reduced && (
            <div className="pointer-events-none absolute inset-0 animate-light-sweep bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          )}
          <div className="grain absolute inset-0" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-center pt-5">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3.5 py-1.5 text-sm font-medium backdrop-blur">
              <Sparkles className="h-4 w-4 text-gold" />
              <span className="text-gradient font-display text-lg font-bold">Football Fever</span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex gap-1.5 px-6 pb-3">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn("h-1 flex-1 rounded-full transition-colors", i <= step ? "bg-electric" : "bg-white/15")}
              />
            ))}
          </div>
        </div>

        <div className="p-6 pt-4">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <h2 className="font-display text-2xl font-bold">Welcome to the room.</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  This is where your group gathers for every match of the World Cup. First — what should we call you?
                </p>
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="Your name or nickname"
                  className="mt-5 h-12"
                  onKeyDown={(e) => e.key === "Enter" && name.trim() && setStep(1)}
                />
                <Button className="mt-5 w-full" size="lg" disabled={!name.trim()} onClick={() => setStep(1)}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <h2 className="font-display text-2xl font-bold">Who do you ride with?</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">Pick your team. The Oracle will hold it against you.</p>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 48 nations…" className="pl-9" />
                </div>
                <div className="mt-3 grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTeam(t.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-2 text-left text-sm transition",
                        team === t.id ? "border-electric/50 bg-electric/10" : "border-white/[0.06] hover:bg-white/[0.04]"
                      )}
                    >
                      <TeamCrest team={t} size="sm" />
                      <span className="truncate text-xs font-medium">{t.name}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                  <Button className="flex-1" onClick={() => setStep(2)}>
                    {team ? "Continue" : "Skip for now"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <h2 className="font-display text-2xl font-bold">Set your vibe.</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">So the room knows what they're dealing with.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {VIBES.map((v) => (
                    <button
                      key={v}
                      onClick={() => setLocalVibe(v)}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-sm transition",
                        vibe === v ? "border-gold/50 bg-gold/10 text-gold" : "border-white/[0.08] hover:bg-white/[0.04]"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <Button className="mt-6 w-full" size="lg" variant="electric" onClick={finish}>
                  <Check className="h-4 w-4" /> Enter Football Fever
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
