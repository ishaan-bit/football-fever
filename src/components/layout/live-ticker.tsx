"use client";
import { useMemo } from "react";
import { Radio } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getTickerItems, type TickerItem } from "@/lib/data/ticker";
import { cn, hslVar } from "@/lib/utils";

/**
 * The always-on bottom crawl: live scores + goals + kick-offs threaded with a
 * running peace feed. Sits at the very bottom of every screen; the mobile dock
 * floats just above it.
 */
export function LiveTicker() {
  const now = useNow(30_000);
  const reduced = useReducedMotion();

  // Bucket to the minute so we don't rebuild the DOM (and restart the marquee)
  // more than necessary.
  const minute = Math.floor(now / 60_000);
  const items = useMemo(() => getTickerItems(minute * 60_000), [minute]);

  const hasLive = items.some((i) => i.kind === "live");

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 h-9 border-t border-white/10 glass-strong safe-bottom"
      role="region"
      aria-label="Live scores and peace feed"
      data-tour="ticker"
    >
      <div className="flex h-9 items-center">
        {/* left cap */}
        <div
          className={cn(
            "flex h-full shrink-0 items-center gap-1.5 border-r border-white/10 px-3 text-[11px] font-bold uppercase tracking-wider",
            hasLive ? "text-live" : "text-electric"
          )}
        >
          <Radio className={cn("h-3.5 w-3.5", hasLive && "animate-pulse-live")} />
          <span className="hidden sm:inline">{hasLive ? "Live" : "Feed"}</span>
        </div>

        {/* crawl */}
        <div className="relative h-full flex-1 overflow-hidden">
          {reduced ? (
            <div className="flex h-full items-center gap-1 overflow-x-auto no-scrollbar">
              {items.map((it) => (
                <TickerCell key={it.id} item={it} />
              ))}
            </div>
          ) : (
            <div className="flex h-full w-max animate-marquee items-center hover:[animation-play-state:paused]">
              {items.map((it) => (
                <TickerCell key={it.id} item={it} />
              ))}
              {/* duplicate for a seamless -50% loop */}
              {items.map((it) => (
                <TickerCell key={`${it.id}-dup`} item={it} aria-hidden />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TickerCell({ item, ...rest }: { item: TickerItem } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap px-3.5 text-xs" {...rest}>
      <span
        className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
        style={{ background: hslVar(item.accent, 0.16), color: hslVar(item.accent) }}
      >
        {item.pulse && (
          <span className="h-1.5 w-1.5 animate-pulse-live rounded-full" style={{ background: hslVar(item.accent) }} />
        )}
        {item.tag}
      </span>
      <span className={cn("font-medium", item.kind === "peace" ? "text-foreground/75" : "text-foreground/90")}>
        {item.text}
      </span>
      <span className="select-none px-1 text-white/15">•</span>
    </span>
  );
}
