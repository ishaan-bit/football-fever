import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageShell, PageHeader } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { SquadLab } from "@/components/games/squad/squad-lab";

export const metadata = {
  title: "Squad Mode · Football Fever",
  description: "Pick a nation, draft your famous five, and play party games with the players you choose.",
};

export default function SquadModePage() {
  return (
    <PageShell size="narrow" className="space-y-7">
      <PageHeader
        scene="action"
        eyebrow="Squad Mode"
        title="Build your five, then play"
        description="Pick any of the 48 nations, draft the players you rate, and put them through the silliest games on the platform."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/games">
              <ArrowLeft className="h-4 w-4" /> All games
            </Link>
          </Button>
        }
      />
      <SquadLab />
    </PageShell>
  );
}
