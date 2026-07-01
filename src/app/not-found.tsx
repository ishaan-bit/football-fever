import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="max-w-sm">
        <p className="font-display text-7xl font-black text-gradient">404</p>
        <div className="mx-auto my-5 grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.05] text-muted-foreground">
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="font-display text-xl font-bold">Off the pitch</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page isn't part of the tournament. Let's get you back to the action.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild><Link href="/">Home</Link></Button>
          <Button asChild variant="outline"><Link href="/fixtures">Fixtures</Link></Button>
        </div>
      </div>
    </div>
  );
}
