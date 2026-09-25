import { HeaderSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <HeaderSkeleton />
      <Skeleton className="mb-5 h-9 w-80" />
      <div className="divide-y rounded-xl border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 px-4 py-4">
            <Skeleton className="size-4 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-64" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
