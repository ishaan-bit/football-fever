import { Skeleton } from "@/components/ui/skeleton";

export default function MatchLoading() {
  return (
    <div className="min-h-dvh">
      <div className="h-14 border-b border-white/[0.06]" />
      <div className="border-b border-white/[0.06] px-4 py-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-6">
          <div className="flex flex-1 flex-col items-center gap-2">
            <Skeleton className="h-16 w-24 rounded-md" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-16 w-28 rounded-2xl" />
          <div className="flex flex-1 flex-col items-center gap-2">
            <Skeleton className="h-16 w-24 rounded-md" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-[55vh] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
