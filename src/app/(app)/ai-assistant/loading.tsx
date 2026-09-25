import { HeaderSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <HeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
