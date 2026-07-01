import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.05] text-muted-foreground">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold">You're offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The watch party needs a connection for live scores and chat. Your predictions and
          progress are saved on this device and will sync when you're back.
        </p>
        <Button asChild className="mt-5">
          <Link href="/">Try again</Link>
        </Button>
      </div>
    </div>
  );
}
