import { connection } from "next/server";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getNotificationSettings } from "@/actions/notifications";
import { NotificationsClient } from "./notifications-client";

export const metadata = {
  title: "Notifications | Settings | Tenzu",
  description: "Manage your notification preferences",
};

export default async function NotificationsSettingsPage() {
  await connection();

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["notification-settings"],
    queryFn: () => getNotificationSettings(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotificationsClient />
    </HydrationBoundary>
  );
}
