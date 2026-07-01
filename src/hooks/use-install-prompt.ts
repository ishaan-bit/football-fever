"use client";
import { useCallback, useEffect, useState } from "react";

/** The (non-standard) event Chromium fires when the PWA is installable. */
interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

export type InstallPlatform = "android" | "ios" | "desktop" | "unknown";

export interface InstallState {
  /** Native install prompt is available and can be fired right now. */
  canPrompt: boolean;
  /** Fire the native install prompt. Resolves to the outcome, or null when
   *  no native prompt is available (iOS, or already dismissed). */
  promptInstall: () => Promise<"accepted" | "dismissed" | null>;
  /** Already running as an installed PWA (standalone / home-screen launch). */
  isStandalone: boolean;
  /** iOS Safari — no native prompt exists; needs manual Add to Home Screen. */
  isIOS: boolean;
  /** Best-guess platform, for tailoring the manual instructions. */
  platform: InstallPlatform;
}

/* The beforeinstallprompt event can fire before any React component mounts, so
 * we capture it at module load and fan out to subscribed hooks. */
let deferred: BeforeInstallPromptEvent | null = null;
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // stop Chrome's default mini-infobar; we drive our own UI
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export function useInstallPrompt(): InstallState {
  const [, force] = useState(0);
  const [env, setEnv] = useState({
    isIOS: false,
    isStandalone: false,
    platform: "unknown" as InstallPlatform,
  });

  useEffect(() => {
    const ua = navigator.userAgent || "";
    // iPadOS 13+ masquerades as a Mac, so also treat touch-capable "MacIntel".
    const isIOS =
      /ip(hone|ad|od)/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /android/i.test(ua);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari exposes standalone launches here.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const platform: InstallPlatform = isIOS ? "ios" : isAndroid ? "android" : "desktop";
    setEnv({ isIOS, isStandalone, platform });

    const rerender = () => force((n) => n + 1);
    subscribers.add(rerender);
    const onInstalled = () => setEnv((s) => ({ ...s, isStandalone: true }));
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      subscribers.delete(rerender);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return null;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null; // a prompt can only be used once
    notify();
    return outcome;
  }, []);

  return {
    canPrompt: deferred !== null,
    promptInstall,
    isStandalone: env.isStandalone,
    isIOS: env.isIOS,
    platform: env.platform,
  };
}
