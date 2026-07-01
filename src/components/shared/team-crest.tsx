"use client";
import { cn } from "@/lib/utils";
import type { Team } from "@/types";
import { SmartImage } from "./smart-image";

const SIZES = {
  xs: "h-5 w-7 text-[8px]",
  sm: "h-6 w-9 text-[9px]",
  md: "h-8 w-12 text-[10px]",
  lg: "h-12 w-16 text-xs",
  xl: "h-16 w-24 text-sm",
};

interface TeamCrestProps {
  team?: Team | null;
  size?: keyof typeof SIZES;
  className?: string;
  rounded?: boolean;
}

/** A flag with a robust fallback (team colors + code) when the CDN flag fails. */
export function TeamCrest({ team, size = "md", className, rounded }: TeamCrestProps) {
  if (!team) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-white/[0.06] font-bold text-muted-foreground",
          SIZES[size],
          rounded ? "rounded-full" : "rounded-md",
          className
        )}
      >
        ?
      </div>
    );
  }
  return (
    <SmartImage
      src={team.flag}
      alt={team.name}
      className={cn(
        "object-cover shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5)] ring-1 ring-white/10",
        SIZES[size],
        rounded ? "rounded-full" : "rounded-md",
        className
      )}
      fallbackClassName={cn(SIZES[size], rounded ? "rounded-full" : "rounded-md")}
      fallback={
        <span
          className="font-bold"
          style={{ color: team.colors.secondary === "#ffffff" ? "#fff" : team.colors.secondary }}
        >
          {team.code}
        </span>
      }
    />
  );
}

interface TeamLabelProps {
  team?: Team | null;
  size?: keyof typeof SIZES;
  showName?: boolean;
  showCode?: boolean;
  className?: string;
  reverse?: boolean;
}

export function TeamLabel({
  team,
  size = "sm",
  showName = true,
  showCode = false,
  className,
  reverse,
}: TeamLabelProps) {
  return (
    <div className={cn("flex items-center gap-2", reverse && "flex-row-reverse", className)}>
      <TeamCrest team={team} size={size} />
      {showName && (
        <span className="truncate font-medium">{team?.name ?? "TBD"}</span>
      )}
      {showCode && <span className="tabular text-muted-foreground">{team?.code}</span>}
    </div>
  );
}
