"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "lucide-react";
import { useUserStore } from "@/stores/user";
import { useHydrated } from "@/hooks/use-hydrated";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  body: string;
  /** CSS selector of the element to spotlight; null = centered welcome/finish. */
  target: string | null;
}

const STEPS: Step[] = [
  {
    title: "Welcome to Football Fever",
    body: "Your group's home base for World Cup 2026 — live scores, predictions, party games and (friendly) trash talk. Here's the 20-second tour.",
    target: null,
  },
  {
    title: "Fixtures & live scores",
    body: "Every match with live scores, the 12 group tables and the full knockout bracket.",
    target: '[data-tour="nav-fixtures"]',
  },
  {
    title: "The Oracle",
    body: "AI predictions, an upset radar and a hot take for every game — with the reasoning shown.",
    target: '[data-tour="nav-oracle"]',
  },
  {
    title: "Predict & climb",
    body: "Lock your calls before kickoff, then earn points and rise up the leaderboard.",
    target: '[data-tour="nav-predictions"]',
  },
  {
    title: "Party games",
    body: "Mini-games plus Squad Mode — draft your famous five and duel the Oracle.",
    target: '[data-tour="nav-games"]',
  },
  {
    title: "Markets — just for fun",
    body: "Play-money predictions with AI odds. 18+ and purely for laughs — no real money, ever.",
    target: '[data-tour="nav-betting"]',
  },
  {
    title: "Always-on live ticker",
    body: "Live scores, goals and our little peace feed scroll down here all tournament long. 🕊️",
    target: '[data-tour="ticker"]',
  },
  {
    title: "Ask the Oracle anytime",
    body: "Tap this orb on any page to get a read on any match. That's it — enjoy the tournament!",
    target: '[data-tour="ai-orb"]',
  },
];

const PAD = 8; // spotlight padding around the target
const CARD_W = 340;

export function GuidedTour() {
  const hydrated = useHydrated();
  const onboarded = useUserStore((s) => s.onboarded);
  const tourDone = useUserStore((s) => s.tourDone);
  const completeTour = useUserStore((s) => s.completeTour);
  const reduce = useReducedMotion();

  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const active = hydrated && onboarded && !tourDone;
  const step = STEPS[i]!;
  const isLast = i === STEPS.length - 1;

  const findTarget = useCallback((): HTMLElement | null => {
    if (!step.target) return null;
    // Several elements can share a data-tour key (desktop nav + mobile dock);
    // pick the one that's actually visible in this viewport.
    const els = Array.from(document.querySelectorAll(step.target)) as HTMLElement[];
    return els.find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) ?? null;
  }, [step.target]);

  const measure = useCallback(() => {
    const el = findTarget();
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect(r.width > 0 && r.height > 0 ? r : null);
  }, [findTarget]);

  // Bring the target into view, then measure (twice, to settle scrolling).
  useEffect(() => {
    if (!active) return;
    findTarget()?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    measure();
    const t = setTimeout(measure, reduce ? 0 : 320);
    return () => clearTimeout(t);
  }, [active, i, findTarget, measure, reduce]);

  useEffect(() => {
    if (!active) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [active, measure]);

  const finish = useCallback(() => {
    completeTour();
    setI(0);
  }, [completeTour]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") setI((p) => Math.min(p + 1, STEPS.length - 1));
      else if (e.key === "ArrowLeft") setI((p) => Math.max(p - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active || typeof document === "undefined") return null;

  // Card placement: below the target if it fits, else above; clamped to viewport.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  // Clamp width so the card always fits narrow viewports (mobile).
  const cardW = Math.min(CARD_W, vw - 32);
  let cardTop = vh / 2 - 90;
  // Always use a numeric left (never translateX(-50%)) — framer-motion owns the
  // transform property and would clobber a translate-based centering.
  let cardLeft = Math.round((vw - cardW) / 2);
  if (rect) {
    const below = rect.bottom + 14;
    const wantAbove = below + 200 > vh;
    cardTop = wantAbove ? Math.max(16, rect.top - 210) : below;
    cardLeft = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 16);
  }

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Guided tour">
      {/* click blocker + dim (when no target to spotlight) */}
      <div
        className={cn("absolute inset-0", !rect && "bg-[hsl(230_40%_3%/0.72)]")}
        onClick={finish}
      />

      {/* spotlight hole via a big box-shadow around the target rect */}
      {rect && (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute rounded-2xl"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px hsl(230 40% 3% / 0.74)",
            outline: "2px solid hsl(var(--electric))",
            outlineOffset: 2,
          }}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="absolute overflow-hidden rounded-2xl border border-white/10 bg-[hsl(230_40%_7%)] shadow-2xl"
          style={{ top: cardTop, left: cardLeft, width: cardW }}
        >
          <div className="relative h-1 w-full bg-white/10">
            <div
              className="h-full bg-electric transition-[width] duration-300"
              style={{ width: `${((i + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-electric">
                <Sparkles className="h-3.5 w-3.5" /> Tour · {i + 1}/{STEPS.length}
              </span>
              <button
                onClick={finish}
                className="rounded-full p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                aria-label="Skip tour"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 className="font-display text-lg font-bold">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                onClick={finish}
                className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                Skip
              </button>
              <div className="flex items-center gap-2">
                {i > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setI((p) => Math.max(p - 1, 0))}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                )}
                {isLast ? (
                  <Button size="sm" variant="electric" onClick={finish}>
                    <Check className="h-4 w-4" /> Done
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setI((p) => Math.min(p + 1, STEPS.length - 1))}>
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
