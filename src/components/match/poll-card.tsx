"use client";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Check } from "lucide-react";
import { seededRandom, hashSeed, cn } from "@/lib/utils";

interface PollOption {
  id: string;
  label: string;
}

export function PollCard({
  id, question, options, accent = "var(--electric)",
}: {
  id: string;
  question: string;
  options: PollOption[];
  accent?: string;
}) {
  const [voted, setVoted] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Seeded base votes so SSR and client agree; drift upward over time.
  const base = useMemo(() => {
    const rng = seededRandom(hashSeed("poll:" + id));
    return options.map(() => 8 + Math.floor(rng() * 40));
  }, [id, options]);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 4000);
    return () => clearInterval(t);
  }, []);

  const counts = options.map((o, i) => {
    const drift = Math.floor((tick * (i + 1)) % 3);
    return base[i]! + drift + (voted === o.id ? 1 : 0);
  });
  const total = counts.reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
        <BarChart3 className="h-4 w-4" style={{ color: `hsl(${accent})` }} /> {question}
      </p>
      <div className="space-y-2">
        {options.map((o, i) => {
          const p = Math.round((counts[i]! / total) * 100);
          const mine = voted === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setVoted(o.id)}
              className={cn(
                "relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition",
                mine ? "border-white/25" : "border-white/[0.07] hover:bg-white/[0.04]"
              )}
            >
              {voted && (
                <span
                  className="absolute inset-y-0 left-0 -z-0 rounded-xl transition-all duration-500"
                  style={{ width: `${p}%`, background: `hsl(${accent} / 0.18)` }}
                />
              )}
              <span className="relative z-10 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  {mine && <Check className="h-3.5 w-3.5" style={{ color: `hsl(${accent})` }} />}
                  {o.label}
                </span>
                {voted && <span className="tabular text-xs text-muted-foreground">{p}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {voted ? `${total} votes · live` : "Tap to vote with the room"}
      </p>
    </div>
  );
}
