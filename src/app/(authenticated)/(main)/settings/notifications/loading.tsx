import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[200px] w-full rounded-md" />
      <Skeleton className="h-[300px] w-full rounded-md" />
    </div>
  );
}
