"use client";
import { useMemo } from "react";
import type { Match, Team } from "@/types";
import { getTeam } from "@/lib/data";
import { seededRandom, hashSeed } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";

const SURNAMES = [
  "Silva", "Kovač", "Hassan", "Kim", "Tanaka", "García", "Müller", "Okafor", "Hansen",
  "Rossi", "Novak", "Diallo", "Mensah", "Park", "Costa", "Ali", "Sørensen", "Petrov",
  "Yilmaz", "Mendoza", "Traoré", "Nakamura", "Dubois", "Schmidt", "Andersen", "Ferreira",
];

// 4-3-3 positions within a team's own half: x (0-100), y from own goal-line (0-50).
const FORMATION: Array<[number, number]> = [
  [50, 5],
  [16, 18], [38, 15], [62, 15], [84, 18],
  [27, 30], [50, 27], [73, 30],
  [24, 43], [50, 45], [76, 43],
];

// A shared rng + used-set draws distinct surnames across BOTH XIs so no name
// repeats between the two teams (26 names, 22 drawn).
function lineup(rng: () => number, used: Set<number>) {
  const name = () => {
    let i = Math.floor(rng() * SURNAMES.length);
    while (used.has(i)) i = (i + 1) % SURNAMES.length;
    used.add(i);
    return SURNAMES[i]!;
  };
  return FORMATION.map((pos, idx) => ({ pos, name: name(), num: idx === 0 ? 1 : idx + 1 }));
}

function PlayerDot({ x, y, num, name, color, top }: { x: number; y: number; num: number; name: string; color: string; top: boolean }) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${x}%`, top: `${y}%` }}>
      <span
        className="mx-auto grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white shadow-md ring-1 ring-white/30 sm:h-7 sm:w-7"
        style={{ background: color }}
      >
        {num}
      </span>
      <span className={`mt-0.5 block text-[8px] font-medium text-white/80 sm:text-[9px] ${top ? "" : ""}`}>{name}</span>
    </div>
  );
}

export function LineupsPanel({ match }: { match: Match }) {
  const home = getTeam(match.homeTeamId);
  const away = getTeam(match.awayTeamId);

  const { homeXI, awayXI } = useMemo(() => {
    if (!home || !away) return { homeXI: [], awayXI: [] };
    const rng = seededRandom(hashSeed("xi:" + match.id));
    const used = new Set<number>();
    return { homeXI: lineup(rng, used), awayXI: lineup(rng, used) };
  }, [home, away, match.id]);

  if (!home || !away) {
    return <EmptyState icon={<Users className="h-5 w-5" />} title="Line-ups pending" description="Predicted XIs land about an hour before kick-off." />;
  }

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Predicted XI · 4-3-3</p>
      <div className="relative mx-auto aspect-[3/4] max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-pitch-deep/40 to-pitch/20">
        {/* pitch markings */}
        <div className="absolute inset-3 rounded-lg border border-white/15" />
        <div className="absolute left-1/2 top-1/2 h-px w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 bg-white/15" />
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />

        {/* away (top half, mirrored) */}
        {awayXI.map((p, i) => (
          <PlayerDot
            key={`a${i}`}
            x={100 - p.pos[0]}
            y={p.pos[1]}
            num={p.num}
            name={p.name}
            color={away.colors.primary}
            top
          />
        ))}
        {/* home (bottom half) */}
        {homeXI.map((p, i) => (
          <PlayerDot
            key={`h${i}`}
            x={p.pos[0]}
            y={100 - p.pos[1]}
            num={p.num}
            name={p.name}
            color={home.colors.primary}
            top={false}
          />
        ))}

        <span className="absolute left-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold text-white">{away.code}</span>
        <span className="absolute bottom-2 right-2 rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold text-white">{home.code}</span>
      </div>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Indicative line-ups generated for the watch party — not official team sheets.
      </p>
    </div>
  );
}
