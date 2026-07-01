"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Volume2, VolumeX, Command } from "lucide-react";
import { NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui";
import { NotificationsButton } from "./notifications-button";
import { InstallButton } from "./install-button";
import { ProfileMenu } from "./profile-menu";

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const sound = useUiStore((s) => s.sound);
  const toggleSound = useUiStore((s) => s.toggleSound);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 safe-top">
      <div className="glass border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo className="shrink-0" />

          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-tour={"nav-" + (item.href === "/" ? "home" : item.href.slice(1))}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive(item.href) && (
                  <span className="absolute inset-0 rounded-full bg-white/[0.07] ring-1 ring-white/10" />
                )}
                <Icon name={item.icon} className="relative h-4 w-4" />
                <span className="relative">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <span
              title="A satire for peace — rivalries belong on the pitch, never the battlefield."
              className="mr-1 hidden select-none items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent xl:flex"
            >
              🕊️ Football, not war
            </span>
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground transition hover:bg-white/[0.06] md:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="ml-2 flex items-center gap-0.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSound}
              aria-label={sound ? "Mute sounds" : "Enable sounds"}
            >
              {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
            </Button>

            <InstallButton />
            <NotificationsButton />
            <ProfileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
