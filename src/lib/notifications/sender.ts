import { createClient } from "@/lib/supabase/server";

export type NotificationType = "critical" | "warning" | "success" | "info";
export type NotificationCategory =
  | "billing"
  | "campaign"
  | "system"
  | "security";

export async function sendNotification(
  userId: string,
  data: {
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    actionLabel?: string;
    actionUrl?: string;
  },
) {
  const supabase = await createClient();

  // 1. Insert In-App Notification
  const { error: insertError } = await supabase.from("notifications").insert({
    user_id: userId,
    type: data.type,
    category: data.category,
    title: data.title,
    message: data.message,
    action_label: data.actionLabel,
    action_url: data.actionUrl,
  });

  if (insertError) {
    console.error("Failed to insert notification:", insertError);
    // Don't throw, we still want to try sending external alerts
  }

  // 2. Check User Settings for External Alerts
  const { data: settings } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!settings) return; // No settings, no alerts

  // 3. Dispatch External Alerts (Simulated)

  // WhatsApp Logic
  if (settings.verified && settings.whatsapp_number) {
    let shouldSendWhatsapp = false;

    // Logic for when to send WhatsApp based on settings
    // For MVP, we map categories/types to specific settings
    if (data.category === "billing" && data.type === "critical") {
      shouldSendWhatsapp = settings.alert_payment_failed ?? false;
    } else if (data.category === "campaign" && data.type === "warning") {
      shouldSendWhatsapp = settings.alert_ad_rejected ?? false;
    } else if (data.title.includes("Funds")) {
      shouldSendWhatsapp = settings.alert_low_funds ?? false;
    }

    if (shouldSendWhatsapp) {
      console.log(
        `[MOCK WHATSAPP] Sending to ${settings.whatsapp_number}: ${data.title} - ${data.message}`,
      );
    }
  }

  // Email Logic (Simulated)
  // For MVP, we assume Email is always "on" for critical/warning if not explicitly opt-out
  // But we have switches for specific categories too
  let shouldSendEmail = false;
  if (data.category === "billing" && data.type === "critical") {
    shouldSendEmail = settings.alert_payment_failed ?? false;
  } else if (data.category === "campaign" && data.type === "warning") {
    shouldSendEmail = settings.alert_ad_rejected ?? false;
  } else if (data.category === "system" && data.title.includes("Report")) {
    shouldSendEmail = settings.alert_weekly_report ?? false;
  }

  if (shouldSendEmail) {
    // In real app: await resend.emails.send(...)
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();
    if (user?.email) {
      console.log(
        `[MOCK EMAIL] Sending to ${user.email}: ${data.title} - ${data.message}`,
      );
    }
  }
}
