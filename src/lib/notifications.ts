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
  /** External delivery channels. Defaults to ["email"]. Pass [] to skip external delivery. */
  channels?: ("email" | "whatsapp")[];
  /**
   * Optional deduplication key. If set and a notification with this key already exists,
   * the insert is silently skipped (relies on unique constraint on notifications.dedup_key).
   */
  dedupKey?: string;
}

export async function sendNotification(
  params: CreateNotificationParams,
  client?: any
) {
  const supabase = client || (await createClient());

  // 1. Insert into DB (User Inbox) — synchronous, always happens
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
    ...(params.dedupKey ? { dedup_key: params.dedupKey } : {}),
  });

  if (error) {
    // 23505 = unique_violation — dedup_key already exists, silently skip
    if (error.code !== "23505") {
      console.error("Failed to create notification:", error);
    }
  }

  // 2. Enqueue external delivery (email/WhatsApp) via the job queue for retry capability
  const channels = params.channels ?? ["email"];
  if (channels.length > 0) {
    await supabase.from("job_queue").insert({
      type: "notification_send",
      organization_id: params.organizationId ?? null,
      user_id: params.userId,
      status: "pending",
      max_attempts: 3,
      payload: {
        userId: params.userId,
        type: params.type,
        category: params.category,
        title: params.title,
        message: params.message,
        actionLabel: params.actionLabel,
        actionUrl: params.actionUrl,
        channels,
      },
    });
  }
}
