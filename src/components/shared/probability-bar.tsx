import { cn } from "@/lib/utils";
import { pct } from "@/lib/utils";

interface ProbabilityBarProps {
  home: number;
  draw: number;
  away: number;
  homeLabel?: string;
  awayLabel?: string;
  className?: string;
  showLabels?: boolean;
}

/** The broadcast-style 3-way win probability bar. */
export function ProbabilityBar({
  home, draw, away, homeLabel, awayLabel, className, showLabels = true,
}: ProbabilityBarProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabels && (
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="text-electric">{homeLabel ?? "Home"} {pct(home)}</span>
          <span className="text-muted-foreground">Draw {pct(draw)}</span>
          <span className="text-accent">{awayLabel ?? "Away"} {pct(away)}</span>
        </div>
      )}
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        <div className="h-full rounded-l-full bg-gradient-to-r from-electric to-electric/70 transition-all duration-700" style={{ width: pct(home) }} />
        <div className="h-full bg-white/15 transition-all duration-700" style={{ width: pct(draw) }} />
        <div className="h-full rounded-r-full bg-gradient-to-r from-accent/70 to-accent transition-all duration-700" style={{ width: pct(away) }} />
      </div>
    </div>
  );
}

/** A single labelled stat comparison row (e.g. xG, possession). */
export function CompareStat({
  label, home, away, format = (n) => String(n),
}: {
  label: string;
  home: number;
  away: number;
  format?: (n: number) => string;
}) {
  const total = home + away || 1;
  const homePct = (home / total) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="tabular text-electric">{format(home)}</span>
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular text-accent">{format(away)}</span>
      </div>
      <div className="mt-1 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-l-full bg-electric/70" style={{ width: `${homePct}%` }} />
        <div className="h-full rounded-r-full bg-accent/70" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}
