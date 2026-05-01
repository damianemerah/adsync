import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen bg-muted/30 font-sans w-full">
      <div className="flex flex-1 flex-col min-w-0 w-full">
        {/* Skeleton for Global Context Bar */}
        <div className="h-[60px] border-b border-border bg-background px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-40 hidden sm:block" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-[200px]" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar">
          <div className="mx-auto max-w-7xl space-y-6">
            
            {/* Performance Trends Skeleton */}
            <div className="rounded-xl border border-border bg-background shadow-sm p-5 space-y-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-8 w-[120px]" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
              <Skeleton className="h-[300px] w-full" />
            </div>

            {/* Recent Campaigns Skeleton */}
            <div className="rounded-xl border border-border bg-background shadow-sm p-5 space-y-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>

            {/* Analytics Bottom Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-background shadow-sm p-5 space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-[250px] w-full rounded-full mx-auto" style={{ width: "200px", height: "200px" }} />
                  <div className="space-y-2 mt-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </div>
              ))}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
