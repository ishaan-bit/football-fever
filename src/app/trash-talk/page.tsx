import type { Metadata } from "next";
import { PageShell, PageHeader } from "@/components/shared/page-shell";
import { RoastRoom } from "@/components/trash-talk/roast-room";

export const metadata: Metadata = {
  title: "Trash Talk",
  description:
    "The Roast Room — drop cinematic burns on the teams getting cooked live, the friends riding for them, and the smug Oracle. All starter prompts are built from the live scoreline.",
};

export default async function TrashTalkPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>;
}) {
  const { match } = await searchParams;

  return (
    <PageShell size="wide" className="space-y-7">
      <PageHeader
        eyebrow="Trash Talk"
        title={
          <span className="flex items-center gap-2.5">
            The Roast Room
            <span className="text-3xl sm:text-4xl">🎤🔥</span>
          </span>
        }
        description="Step up to the mic and bash whoever's getting cooked out there. Every starter burn is built live from the actual scoreline — pick a victim, fire, and let the Roastmaster score the carnage."
      />
      <RoastRoom matchId={match} />
    </PageShell>
  );
}
