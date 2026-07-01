"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Download,
  MoreVertical,
  Share,
  Smartphone,
  SquarePlus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui";
import { useInstallPrompt, type InstallPlatform } from "@/hooks/use-install-prompt";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface InstructionStep {
  icon: LucideIcon;
  text: React.ReactNode;
}

/** Manual "add to home screen" steps, tailored per platform. */
const STEPS: Record<Exclude<InstallPlatform, "unknown">, InstructionStep[]> = {
  ios: [
    { icon: Share, text: <>Tap the <b>Share</b> button in Safari&apos;s toolbar (the square with an up-arrow).</> },
    { icon: SquarePlus, text: <>Scroll down and choose <b>Add to Home Screen</b>.</> },
    { icon: Check, text: <>Tap <b>Add</b> — Football Fever lands on your home screen like a native app.</> },
  ],
  android: [
    { icon: MoreVertical, text: <>Open your browser menu (the <b>⋮</b> in the top-right).</> },
    { icon: Download, text: <>Tap <b>Install app</b> (or <b>Add to Home screen</b>).</> },
    { icon: Check, text: <>Confirm <b>Install</b> — it opens full-screen, no browser bars.</> },
  ],
  desktop: [
    { icon: Download, text: <>Click the <b>install icon</b> in the address bar (a monitor/▾ on the right).</> },
    { icon: MoreVertical, text: <>No icon? Open the browser menu → <b>Install Football Fever</b>.</> },
    { icon: Check, text: <>Confirm <b>Install</b> to get it as a standalone desktop app.</> },
  ],
};

const PLATFORM_LABEL: Record<Exclude<InstallPlatform, "unknown">, string> = {
  ios: "On iPhone & iPad",
  android: "On Android",
  desktop: "On desktop",
};

export function InstallGuide() {
  const open = useUiStore((s) => s.installOpen);
  const setOpen = useUiStore((s) => s.setInstallOpen);
  const { canPrompt, promptInstall, isIOS, isStandalone, platform } = useInstallPrompt();
  const [busy, setBusy] = useState(false);

  const manualPlatform: Exclude<InstallPlatform, "unknown"> =
    platform === "unknown" ? "desktop" : platform;

  const handleInstall = async () => {
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    if (outcome === "accepted") {
      toast.success("Installing Football Fever…", { description: "Look for it on your home screen." });
      setOpen(false);
    } else if (outcome === "dismissed") {
      toast("Maybe next time", { description: "You can install anytime from the header." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-electric/15 text-electric ring-1 ring-electric/30">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle>Install Football Fever</DialogTitle>
            <DialogDescription className="mt-0.5">
              {isStandalone
                ? "You're all set — it's already installed."
                : "Add it to your home screen for a full-screen, app-like experience."}
            </DialogDescription>
          </div>
        </div>

        {isStandalone ? (
          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-pitch/25 bg-pitch/10 px-4 py-3 text-sm text-foreground">
            <Check className="h-4 w-4 text-pitch" />
            You&apos;re running the installed app. Enjoy match day. 🕊️
          </div>
        ) : (
          <>
            {/* Perks */}
            <ul className="grid gap-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-pitch" /> Full-screen, no browser bars</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-pitch" /> Faster loads &amp; offline-ready fixtures</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-pitch" /> One tap from your home screen on match day</li>
            </ul>

            {/* Native one-tap install (Android / desktop Chromium) */}
            {canPrompt && (
              <Button
                variant="electric"
                size="lg"
                className="w-full"
                disabled={busy}
                onClick={handleInstall}
              >
                <Download className="h-4 w-4" /> {busy ? "Opening…" : "Install app"}
              </Button>
            )}

            {/* Manual steps — the only path on iOS, and a fallback everywhere else */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-electric">
                {canPrompt ? "Prefer to do it manually?" : PLATFORM_LABEL[manualPlatform]}
              </p>
              <ol className="space-y-3">
                {STEPS[isIOS ? "ios" : manualPlatform].map((s, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.06] text-xs font-bold text-foreground">
                      {idx + 1}
                    </span>
                    <span className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                      <s.icon className={cn("mt-0.5 h-4 w-4 shrink-0 text-foreground/70")} />
                      <span>{s.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              {isIOS && (
                <p className="mt-3 text-xs text-muted-foreground/80">
                  Note: Add to Home Screen is only available in <b>Safari</b> on iOS.
                </p>
              )}
            </div>

            <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
              Maybe later
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
