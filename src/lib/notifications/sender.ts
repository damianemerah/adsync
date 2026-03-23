import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export type NotificationType = "critical" | "warning" | "success" | "info";
export type NotificationCategory =
  | "billing"
  | "campaign"
  | "system"
  | "security";

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  /**
   * Optional dedup key. When set, the DB unique index prevents the same
   * notification from being inserted twice within the same window.
   * Convention: "rule_id:campaign_id:YYYY-WNN"
   * e.g.  "low_ctr:abc123:2026-W09"
   */
  dedupKey?: string;
  /** Pass an existing admin client from edge functions / crons to avoid auth overhead */
  supabaseClient?: any;
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "alerts@Tenzu.app";
const APP_NAME = "Tenzu";

export async function sendNotification(params: SendNotificationParams) {
  const supabase = params.supabaseClient ?? (await createClient());

  // ── 1. Insert In-App Notification ──────────────────────────────────────────
  const { error: insertError } = await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    category: params.category,
    title: params.title,
    message: params.message,
    action_label: params.actionLabel,
    action_url: params.actionUrl,
    dedup_key: params.dedupKey ?? null,
  });

  if (insertError) {
    // Code 23505 = unique_violation — dedup fired, silent skip
    if (insertError.code === "23505") {
      console.log(`[Notification] Deduped (already sent): ${params.dedupKey}`);
      return { deduped: true };
    }
    console.error("[Notification] Failed to insert:", insertError.message);
    // Continue — try external channels anyway
  }

  // ── 2. Look up user settings ───────────────────────────────────────────────
  const { data: settings } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", params.userId)
    .single();

  // ── 3. Look up user email ──────────────────────────────────────────────────
  const { data: userRow } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", params.userId)
    .single();

  const userEmail = userRow?.email;
  const userName = userRow?.full_name ?? "there";

  if (!settings) return { ok: true };

  // ── 4. Determine channel eligibility ──────────────────────────────────────
  const isCritical = params.type === "critical";
  const isWarning = params.type === "warning";

  const shouldWhatsApp = Boolean(
    settings.verified &&
    settings.whatsapp_number &&
    ((params.category === "billing" &&
      isCritical &&
      settings.alert_payment_failed) ||
      (params.category === "campaign" &&
        (isCritical || isWarning) &&
        settings.alert_ad_rejected) ||
      (params.category === "billing" &&
        isWarning &&
        settings.alert_low_funds) ||
      (params.category === "campaign" &&
        isWarning &&
        settings.alert_low_funds)),
  );

  const shouldEmail = Boolean(
    userEmail &&
    ((params.category === "billing" &&
      isCritical &&
      settings.alert_payment_failed) ||
      (params.category === "campaign" &&
        (isCritical || isWarning) &&
        settings.alert_ad_rejected) ||
      (params.category === "billing" &&
        isWarning &&
        settings.alert_low_funds) ||
      (params.category === "system" && settings.alert_weekly_report)),
  );

  // ── 5. WhatsApp via Twilio ─────────────────────────────────────────────────
  if (shouldWhatsApp) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

    if (accountSid && authToken && fromNumber) {
      try {
        const twilio = (await import("twilio")).default;
        const client = twilio(accountSid, authToken);
        await client.messages.create({
          body: `*${APP_NAME} Alert: ${params.title}*\n\n${params.message}${params.actionUrl ? `\n\nTake action: ${process.env.NEXT_PUBLIC_APP_URL ?? ""}${params.actionUrl}` : ""}`,
          from: fromNumber,
          to: `whatsapp:${settings.whatsapp_number}`,
        });
        console.log(
          `[WhatsApp] Sent to ${settings.whatsapp_number}: ${params.title}`,
        );
      } catch (err: any) {
        console.error("[WhatsApp] Send failed:", err.message);
      }
    } else {
      console.warn(
        `[WhatsApp] Twilio not configured. Would have sent: ${params.title}`,
      );
    }
  }

  // ── 6. Email via Resend ────────────────────────────────────────────────────
  if (shouldEmail && resend) {
    try {
      const ctaHtml =
        params.actionLabel && params.actionUrl
          ? `<div style="margin: 28px 0;">
             <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}${params.actionUrl}"
                style="background:#111827;color:#fff;padding:12px 24px;border-radius:8px;
                       text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
               ${params.actionLabel}
             </a>
           </div>`
          : "";

      const borderColor =
        params.type === "critical"
          ? "#ef4444"
          : params.type === "warning"
            ? "#f97316"
            : params.type === "success"
              ? "#22c55e"
              : "#3b82f6";

      await resend.emails.send({
        from: `${APP_NAME} <${FROM_EMAIL}>`,
        to: [userEmail!],
        subject: `${params.title} — ${APP_NAME}`,
        html: `
          <div style="font-family:'Inter',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:#111827;padding:20px 32px;display:flex;align-items:center;gap:10px;">
              <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.5px;">${APP_NAME}</span>
            </div>
            <div style="padding:32px;border-left:4px solid ${borderColor};">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">
                ${params.category.toUpperCase()} ALERT
              </p>
              <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">${params.title}</h2>
              <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">${params.message}</p>
              ${ctaHtml}
            </div>
            <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because you enabled ${params.category} alerts in ${APP_NAME}.
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/settings/notifications" style="color:#6b7280;">Manage preferences</a>
              </p>
            </div>
          </div>
        `,
      });
      console.log(`[Email] Sent to ${userEmail}: ${params.title}`);
    } catch (err: any) {
      console.error("[Email] Resend failed:", err.message);
    }
  } else if (shouldEmail && !resend) {
    console.warn(
      `[Email] Resend not configured. Would have sent: ${params.title} → ${userEmail}`,
    );
  }

  return { ok: true };
}
