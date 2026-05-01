import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BillingSkeleton() {
  return (
    <div className="space-y-12 w-full pb-8">
      {/* Subscription overview card */}
      <section>
        <Card className="border-border shadow-sm overflow-hidden pt-3">
          <div className="bg-muted/30 border-b border-border px-6 pb-3 flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-48" />
          </div>
          <CardContent className="px-6">
            <div className="flex items-start justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
              <Skeleton className="h-9 w-9 rounded-md shrink-0" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-border">
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-48" />
              </div>
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-3 w-48 mt-3" />
      </section>

      {/* Payment method card */}
      <section>
        <Card className="border-border shadow-sm">
          <CardContent className="px-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-9 w-36 rounded-md shrink-0" />
            </div>
            <div className="border border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-72" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Credit packs */}
      <section>
        <div className="mb-6 space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Card className="border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 sm:px-6 gap-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-md shrink-0" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-9 w-24 rounded-md shrink-0" />
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Plan CTA strip */}
      <section className="pt-4 border-t border-border mt-4">
        <div className="flex items-center justify-between bg-muted/30 rounded-lg p-6 border border-border gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-40 rounded-md shrink-0" />
        </div>
      </section>
    </div>
  );
}
