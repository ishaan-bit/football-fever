"use client";
import * as React from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { SmartImage } from "./smart-image";
import { sceneImage, type SceneName } from "@/lib/imagery";
import { cn } from "@/lib/utils";

interface SceneBackgroundProps {
  /** A themed scene to pull a verified photo from… */
  scene?: SceneName;
  /** …or an explicit image url (wins over `scene`). */
  src?: string;
  /** Keeps the scene pick stable per surface (game id, match id, step…). */
  seed?: number | string;
  className?: string;
  /** How much the image reads through. Default `subtle`. */
  intensity?: "subtle" | "soft" | "vivid";
  /** Scrim direction — where the content sits. Default bottom. */
  from?: "bottom" | "top" | "left" | "none";
  /** Slow cinematic drift on the image (ignored under reduced motion). */
  kenBurns?: boolean;
  /** Add the film-grain overlay for cinematic depth. */
  grain?: boolean;
  /** Extra layers rendered above the scrim (aurora, glows…). */
  children?: React.ReactNode;
}

const OPACITY: Record<NonNullable<SceneBackgroundProps["intensity"]>, string> = {
  subtle: "opacity-[0.16]",
  soft: "opacity-30",
  vivid: "opacity-50",
};

const SCRIM: Record<NonNullable<SceneBackgroundProps["from"]>, string> = {
  bottom: "bg-gradient-to-t from-background via-background/70 to-transparent",
  top: "bg-gradient-to-b from-background/60 via-background/30 to-transparent",
  left: "bg-gradient-to-r from-background via-background/60 to-transparent",
  none: "bg-background/40",
};

/**
 * A decorative, full-bleed photographic backdrop that degrades gracefully.
 *
 * It layers: a verified stadium/football still (via `SmartImage`, so a dead URL
 * falls back to the brand gradient), a readable scrim, an optional grain, and
 * whatever extra light layers you pass as children. Purely presentational —
 * always `aria-hidden` and `pointer-events-none`, so it never traps taps on the
 * content sitting above it. Motion respects the in-app reduced-motion switch.
 */
export function SceneBackground({
  scene = "stadium",
  src,
  seed = 0,
  className,
  intensity = "subtle",
  from = "bottom",
  kenBurns = true,
  grain = true,
  children,
}: SceneBackgroundProps) {
  const reduced = useReducedMotion();
  const url = src ?? sceneImage(scene, seed);
  const ken = kenBurns && !reduced ? "animate-ken-burns" : "";

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      <SmartImage
        src={url}
        alt=""
        className={cn(
          "absolute inset-0 h-full w-full object-cover will-change-transform",
          OPACITY[intensity],
          ken
        )}
        fallbackClassName="absolute inset-0 h-full w-full"
      />
      <div className={cn("absolute inset-0", SCRIM[from])} />
      {grain && <div className="grain absolute inset-0" />}
      {children}
    </div>
  );
}
