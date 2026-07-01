"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/shared/icon";
import { TeamCrest } from "@/components/shared/team-crest";
import { useUiStore } from "@/stores/ui";
import { NAV } from "@/lib/constants";
import { ALL_TEAMS, getMatches, getTeam } from "@/lib/data";
import { cn } from "@/lib/utils";

interface Result {
  id: string;
  label: string;
  sub?: string;
  icon?: string;
  flag?: string;
  href: string;
  group: string;
}

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const router = useRouter();
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const pages: Result[] = [
      ...NAV.map((n) => ({
        id: n.href, label: n.label, sub: n.description, icon: n.icon, href: n.href, group: "Pages",
      })),
      {
        id: "/trash-talk", label: "Trash Talk", sub: "The Roast Room — bash anyone playing",
        icon: "Mic", href: "/trash-talk", group: "Pages",
      },
    ];

    const now = Date.now();
    const matches = getMatches(now);
    const liveMatches: Result[] = matches
      .filter((m) => m.status === "live" || m.status === "halftime")
      .slice(0, 6)
      .map((m) => {
        const h = getTeam(m.homeTeamId);
        const a = getTeam(m.awayTeamId);
        return {
          id: m.id,
          label: `${h?.name ?? "TBD"} vs ${a?.name ?? "TBD"}`,
          sub: `Live · ${m.homeScore}–${m.awayScore}`,
          icon: "PlayCircle",
          href: `/match/${m.id}`,
          group: "Live now",
        };
      });

    const teams: Result[] = ALL_TEAMS.map((t) => {
      const next = matches.find(
        (m) => (m.homeTeamId === t.id || m.awayTeamId === t.id) && m.status !== "finished"
      );
      const last = [...matches].reverse().find(
        (m) => m.homeTeamId === t.id || m.awayTeamId === t.id
      );
      const target = next ?? last;
      return {
        id: t.id, label: t.name, sub: `Group ${t.group} · ${t.code}`, flag: t.flag,
        href: target ? `/match/${target.id}` : "/fixtures", group: "Teams",
      };
    });

    const all = [...pages, ...liveMatches, ...teams];
    if (!q.trim()) return [...pages, ...liveMatches];
    const needle = q.toLowerCase();
    return all
      .filter((r) => r.label.toLowerCase().includes(needle) || r.sub?.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Result[]>();
    for (const r of results) {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    }
    return [...map.entries()];
  }, [results]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent hideClose className="top-[15%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search teams, matches, pages…"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) go(results[0].href);
            }}
          />
          <kbd className="hidden items-center gap-1 rounded bg-white/10 px-1.5 py-1 text-[10px] text-muted-foreground sm:flex">
            <CornerDownLeft className="h-3 w-3" /> open
          </kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {grouped.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">No matches for “{q}”.</p>
          )}
          {grouped.map(([group, items]) => (
            <div key={group} className="mb-1">
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group}
              </p>
              {items.map((r) => (
                <button
                  key={`${group}-${r.id}`}
                  onClick={() => go(r.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
                  )}
                >
                  {r.flag ? (
                    <TeamCrest team={getTeam(r.id)} size="sm" />
                  ) : (
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06]">
                      <Icon name={r.icon ?? "ChevronRight"} className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.label}</span>
                    {r.sub && <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
