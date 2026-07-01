"use client";
import Link from "next/link";
import { Trophy, Target, UserPen, Moon, Sun, Sparkles, Compass } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useUserStore } from "@/stores/user";
import { useUiStore } from "@/stores/ui";
import { useHydrated } from "@/hooks/use-hydrated";
import { getTeam } from "@/lib/data/teams";
import { initials } from "@/lib/utils";

export function ProfileMenu() {
  const profile = useUserStore((s) => s.profile);
  const resetOnboarding = useUserStore((s) => s.resetOnboarding);
  const startTour = useUserStore((s) => s.startTour);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const hydrated = useHydrated();
  const team = getTeam(profile.favoriteTeamId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative ml-0.5 rounded-full ring-2 ring-white/10 transition hover:ring-electric/40 focus:outline-none"
          aria-label="Your profile"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile.avatar} alt={profile.name} />
            <AvatarFallback>{initials(profile.name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile.avatar} alt={profile.name} />
            <AvatarFallback>{initials(profile.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{hydrated ? profile.name : "You"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {team ? `${team.name} fan` : profile.handle}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/leaderboard"><Trophy className="h-4 w-4" /> Your ranking</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/predictions"><Target className="h-4 w-4" /> Your predictions</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/oracle"><Sparkles className="h-4 w-4" /> Ask the Oracle</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => startTour()}>
          <Compass className="h-4 w-4" /> Take the tour
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => resetOnboarding()}>
          <UserPen className="h-4 w-4" /> Edit profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
