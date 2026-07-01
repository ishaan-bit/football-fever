"use client";
import { useCallback, useRef } from "react";
import { useUiStore } from "@/stores/ui";

type Sfx = "goal" | "whistle" | "click" | "pop" | "swoosh" | "error" | "win";

/**
 * Zero-asset sound effects via the Web Audio API. Synth blips only — keeps the
 * bundle tiny and never autoplays. Gated on the user's sound toggle.
 */
export function useSound() {
  const enabled = useUiStore((s) => s.sound);
  const ctxRef = useRef<AudioContext | null>(null);

  const ctx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  }, []);

  const blip = useCallback(
    (freq: number, dur: number, type: OscillatorType = "sine", gain = 0.06, slideTo?: number) => {
      const ac = ctx();
      if (!ac) return;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
      g.gain.setValueAtTime(gain, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      osc.connect(g).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + dur);
    },
    [ctx]
  );

  const play = useCallback(
    (sfx: Sfx) => {
      if (!enabled) return;
      switch (sfx) {
        case "goal":
          blip(440, 0.12, "sawtooth", 0.07, 880);
          setTimeout(() => blip(660, 0.18, "sawtooth", 0.06, 1320), 90);
          break;
        case "whistle":
          blip(2200, 0.25, "square", 0.04, 2600);
          break;
        case "click":
          blip(520, 0.04, "triangle", 0.04);
          break;
        case "pop":
          blip(700, 0.08, "sine", 0.05, 1100);
          break;
        case "swoosh":
          blip(300, 0.18, "sine", 0.03, 90);
          break;
        case "error":
          blip(180, 0.18, "sawtooth", 0.05, 120);
          break;
        case "win":
          [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.16, "triangle", 0.06), i * 110));
          break;
      }
    },
    [enabled, blip]
  );

  return { play, enabled };
}
