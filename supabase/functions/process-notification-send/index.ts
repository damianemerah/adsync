/**
 * Notification Send Processor Edge Function
 *
 * Processes notification_send jobs from the queue.
 * Handles external delivery channels (Email via Resend, WhatsApp via Twilio).
 *
 * The in-app DB insert happens synchronously at the point of the event.
 * This worker handles the external delivery that can fail transiently.
 *
 * Invoked by pg_cron every 2 minutes
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const APP_NAME = "Tenzu";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // 1. ATOMICALLY CLAIM NEXT PENDING JOB (Bug 1+4 fix: FOR UPDATE SKIP LOCKED)
    const { data: claimedRows, error: fetchErr } = await supabase
      .rpc("claim_next_job", { p_type: "notification_send" });

    if (fetchErr) {
      throw fetchErr;
    }

    const job = claimedRows?.[0] ?? null;

    if (!job) {
      return new Response(
        JSON.stringify({ message: "No pending notification jobs" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const payload = job.payload as {
      userId: string;
      type: "critical" | "warning" | "success" | "info";
      category: "billing" | "campaign" | "system" | "security";
      title: string;
      message: string;
      actionLabel?: string;
      actionUrl?: string;
      channels: ("email" | "whatsapp")[];
    };

    console.log(`[Notifications] Processing job ${job.id} for user ${payload.userId}`);

    // 3. LOOK UP USER + SETTINGS
    const [{ data: userRow }, { data: settings }] = await Promise.all([
      supabase
        .from("users")
        .select("email, full_name")
        .eq("id", payload.userId)
        .single(),
      supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", payload.userId)
        .single(),
    ]);

    const results: Record<string, string> = {};

    // 4. EMAIL VIA RESEND
    if (payload.channels.includes("email") && userRow?.email && settings) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "alerts@tenzu.app";
      const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") || "";

      if (resendKey) {
        const borderColor =
          payload.type === "critical" ? "#ef4444"
          : payload.type === "warning" ? "#f97316"
          : payload.type === "success" ? "#22c55e"
          : "#3b82f6";

        const ctaHtml =
          payload.actionLabel && payload.actionUrl
            ? `<div style="margin:28px 0;">
               <a href="${appUrl}${payload.actionUrl}"
                  style="background:#111827;color:#fff;padding:12px 24px;border-radius:8px;
                         text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
                 ${payload.actionLabel}
               </a>
             </div>`
            : "";

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${APP_NAME} <${fromEmail}>`,
            to: [userRow.email],
            subject: `${payload.title} — ${APP_NAME}`,
            html: `
              <div style="font-family:'Inter',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                <div style="background:#111827;padding:20px 32px;">
                  <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.5px;">${APP_NAME}</span>
                </div>
                <div style="padding:32px;border-left:4px solid ${borderColor};">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">
                    ${payload.category.toUpperCase()} ALERT
                  </p>
                  <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">${payload.title}</h2>
                  <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">${payload.message}</p>
                  ${ctaHtml}
                </div>
                <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">
                    You're receiving this because you enabled ${payload.category} alerts in ${APP_NAME}.
                    <a href="${appUrl}/settings/notifications" style="color:#6b7280;">Manage preferences</a>
                  </p>
                </div>
              </div>
            `,
          }),
        });

        if (emailRes.ok) {
          console.log(`[Notifications] ✅ Email sent to ${userRow.email}`);
          results.email = "sent";
        } else {
          const errBody = await emailRes.text();
          console.error(`[Notifications] ❌ Email failed: ${emailRes.status} ${errBody}`);
          results.email = `failed: ${emailRes.status}`;
          throw new Error(`Resend API error ${emailRes.status}: ${errBody}`);
        }
      } else {
        console.warn("[Notifications] RESEND_API_KEY not set, skipping email");
        results.email = "skipped: not configured";
      }
    }

    // 5. WHATSAPP VIA TWILIO
    if (payload.channels.includes("whatsapp") && settings?.verified && settings?.whatsapp_number) {
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const fromNumber = Deno.env.get("TWILIO_WHATSAPP_FROM");
      const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") || "";

      if (accountSid && authToken && fromNumber) {
        const body = `*${APP_NAME} Alert: ${payload.title}*\n\n${payload.message}${
          payload.actionUrl ? `\n\nTake action: ${appUrl}${payload.actionUrl}` : ""
        }`;

        const waRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              Body: body,
              From: fromNumber,
              To: `whatsapp:${settings.whatsapp_number}`,
            }),
          }
        );

        if (waRes.ok) {
          console.log(`[Notifications] ✅ WhatsApp sent to ${settings.whatsapp_number}`);
          results.whatsapp = "sent";
        } else {
          const errBody = await waRes.text();
          console.error(`[Notifications] ❌ WhatsApp failed: ${waRes.status} ${errBody}`);
          results.whatsapp = `failed: ${waRes.status}`;
          throw new Error(`Twilio API error ${waRes.status}: ${errBody}`);
        }
      } else {
        console.warn("[Notifications] Twilio not configured, skipping WhatsApp");
        results.whatsapp = "skipped: not configured";
      }
    }

    // 6. MARK COMPLETE
    const duration = Date.now() - startTime;
    await supabase
      .from("job_queue")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        payload: { ...job.payload, result: results },
      })
      .eq("id", job.id);

    await supabase.from("job_metrics").insert({
      job_type: "notification_send",
      duration_ms: duration,
      success: true,
    });

    console.log(`[Notifications] ✅ Job ${job.id} completed in ${duration}ms`);

    return new Response(
      JSON.stringify({ success: true, results, duration }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Notifications] Fatal error:", error);

    // Mark job as failed with retry logic
    const { data: currentJob } = await supabase
      .from("job_queue")
      .select("attempts, max_attempts")
      .eq("id", job?.id)
      .single();

    if (currentJob) {
      const newAttempts = (currentJob.attempts ?? 0) + 1;
      const exhausted = newAttempts >= (currentJob.max_attempts ?? 3);

      if (exhausted) {
        // Bug 3 fix: atomic RPC — inserts into job_dlq AND marks job failed in one transaction
        await supabase.rpc("fail_job_to_dlq", {
          p_job_id: job.id,
          p_error_msg: error.message,
          p_error_stack: null,
          p_attempts: newAttempts,
        });
      } else {
        const backoffMs = Math.min(1000 * Math.pow(2, newAttempts), 300000);
        await supabase
          .from("job_queue")
          .update({
            status: "pending",
            last_error: error.message,
            attempts: newAttempts,
            updated_at: new Date(Date.now() + backoffMs).toISOString(),
          })
          .eq("id", job.id);
        console.log(`[Notifications] Will retry in ${Math.round(backoffMs / 1000)}s`);
      }
    }

    const duration = Date.now() - startTime;
    await supabase.from("job_metrics").insert({
      job_type: "notification_send",
      duration_ms: duration,
      success: false,
      error_code: "DELIVERY_ERROR",
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { "Content-Type": "application/json" } } // 200 so cron doesn't halt
    );
  }
});
