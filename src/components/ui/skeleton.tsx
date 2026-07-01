import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shimmer rounded-xl bg-white/[0.05]", className)} {...props} />;
}

export { Skeleton };
