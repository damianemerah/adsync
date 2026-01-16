import { createClient } from "@/lib/supabase/server";

export type NotificationType = "critical" | "warning" | "success" | "info";
export type NotificationCategory = "campaign" | "budget" | "account" | "system";

interface CreateNotificationParams {
  userId: string;
  organizationId: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  actionUrl?: string;
  actionLabel?: string;
}

export async function sendNotification(
  params: CreateNotificationParams,
  client?: any
) {
  const supabase = client || (await createClient());

  // 1. Insert into DB (User Inbox)
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    organization_id: params.organizationId,
    title: params.title,
    message: params.message,
    type: params.type,
    category: params.category,
    action_url: params.actionUrl,
    action_label: params.actionLabel,
    is_read: false,
  });

  if (error) {
    console.error("Failed to create notification:", error);
  }

  // Future: Realtime & External Channels (Email/WhatsApp)
}
