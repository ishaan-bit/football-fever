"use client";
import { Download } from "lucide-react";
import { useUiStore } from "@/stores/ui";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useHydrated } from "@/hooks/use-hydrated";

/** Persistent "Install app" entry point in the top bar. Opens the install
 *  guide (native prompt on Android/desktop, manual steps on iOS). Hidden once
 *  the app is already running installed (standalone). */
export function InstallButton() {
  const hydrated = useHydrated();
  const { isStandalone } = useInstallPrompt();
  const setInstallOpen = useUiStore((s) => s.setInstallOpen);

  // Avoid an SSR/CSR flash: only render after mount, and never when installed.
  if (!hydrated || isStandalone) return null;

  return (
    <button
      data-tour="install"
      onClick={() => setInstallOpen(true)}
      aria-label="Install Football Fever"
      className="flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3 py-2 text-xs font-semibold text-electric transition hover:bg-electric/20"
    >
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Install</span>
    </button>
  );
}
