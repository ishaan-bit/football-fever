import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMatch, getTeam } from "@/lib/data";
import { loadMatches } from "@/lib/worldcup";
import { MatchRoom } from "@/components/match/match-room";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  // Use the live feed (falls back to seed) so the tab title matches the room body.
  const matches = await loadMatches();
  const match = matches.find((m) => m.id === id);
  if (!match) return { title: "Match" };
  const home = getTeam(match.homeTeamId)?.name ?? match.homeLabel ?? "TBD";
  const away = getTeam(match.awayTeamId)?.name ?? match.awayLabel ?? "TBD";
  return {
    title: `${home} vs ${away}`,
    description: `Live watch-party room for ${home} vs ${away} — chat, predictions, the Oracle and group voice.`,
  };
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = getMatch(id);
  if (!match) notFound();
  return <MatchRoom matchId={id} />;
}
