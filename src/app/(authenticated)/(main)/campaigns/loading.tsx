import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignsLoading() {
  return (
    <div className="flex flex-col bg-muted/30 h-full">
      {/* PageHeader skeleton */}
      <div className="h-[60px] border-b border-border bg-background px-4 md:px-6 flex items-center justify-between shrink-0">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-40" />
      </div>

      {/* GlobalContextBar skeleton */}
      <div className="h-[52px] border-b border-border bg-background px-4 md:px-6 flex items-center gap-3 shrink-0">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-36" />
        <div className="ml-auto">
          <Skeleton className="h-8 w-[200px]" />
        </div>
      </div>

      {/* Table skeleton */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 no-scrollbar">
        <div className="mx-auto max-w-[1600px] space-y-3">
          {/* Table header */}
          <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8" />
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-4 border-b border-border last:border-0"
              >
                <Skeleton className="h-4 w-4" />
                <div className="flex flex-col gap-1 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
