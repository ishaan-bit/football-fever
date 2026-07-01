"use client";
import { useCountdown } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils";

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="tabular text-2xl font-bold leading-none sm:text-3xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

export function Countdown({ iso, className }: { iso: string; className?: string }) {
  const c = useCountdown(iso);
  if (!c.mounted) {
    return <div className={cn("h-10", className)} />;
  }
  if (c.done) {
    return <span className={cn("text-sm font-semibold text-live", className)}>Kicking off…</span>;
  }
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {c.days > 0 && <Unit value={c.days} label="days" />}
      <Unit value={c.hours} label="hrs" />
      <Unit value={c.minutes} label="min" />
      {c.days === 0 && <Unit value={c.seconds} label="sec" />}
    </div>
  );
}

/** Compact inline countdown like "in 2h 14m". */
export function CountdownInline({ iso, className }: { iso: string; className?: string }) {
  const c = useCountdown(iso, 30000);
  if (!c.mounted) return <span className={className}>—</span>;
  if (c.done) return <span className={cn("text-live", className)}>now</span>;
  const parts = [c.days && `${c.days}d`, c.hours && `${c.hours}h`, !c.days && `${c.minutes}m`].filter(Boolean);
  return <span className={cn("tabular", className)}>in {parts.join(" ")}</span>;
}
