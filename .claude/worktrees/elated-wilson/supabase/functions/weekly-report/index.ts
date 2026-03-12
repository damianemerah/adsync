import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL =
  Deno.env.get("RESEND_FROM_EMAIL") || "alerts@sellam.app";
const APP_NAME = "Sellam";

async function sendResendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("No RESEND_API_KEY, skipping email to", to);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${APP_NAME} <${RESEND_FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    console.error("Resend error:", await res.text());
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch users with alert_weekly_report = true
    const { data: settings, error: setErr } = await supabase
      .from("notification_settings")
      .select("user_id")
      .eq("alert_weekly_report", true);

    if (setErr) throw setErr;
    if (!settings || settings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users opted in" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const userIds = settings.map((s) => s.user_id);

    // 2. Fetch users and owners
    const { data: users } = await supabase
      .from("users")
      .select("id, email, full_name")
      .in("id", userIds);

    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id, organization_id")
      .in("user_id", userIds)
      .eq("role", "owner");

    if (!users || !members) throw new Error("Could not fetch users or members");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];

    // Map for easy lookup
    const userMap = new Map(users.map((u) => [u.id, u]));
    const orgMap = new Map();
    for (const m of members) {
      if (!orgMap.has(m.organization_id)) orgMap.set(m.organization_id, []);
      orgMap.get(m.organization_id).push(m.user_id);
    }

    let reportsSent = 0;

    // 3. Process each org
    for (const [orgId, orgUserIds] of orgMap.entries()) {
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("organization_id", orgId);

      if (!campaigns || campaigns.length === 0) continue;

      const campaignIds = campaigns.map((c) => c.id);
      const campIdToName = new Map(campaigns.map((c) => [c.id, c.name]));

      const { data: metrics } = await supabase
        .from("campaign_metrics")
        .select("campaign_id, impressions, clicks, spend_cents")
        .in("campaign_id", campaignIds)
        .gte("date", dateStr);

      if (!metrics || metrics.length === 0) continue;

      let totalSpend = 0;
      let totalImpressions = 0;
      let totalClicks = 0;
      const campAgg: Record<string, any> = {};

      for (const m of metrics) {
        totalSpend += m.spend_cents || 0;
        totalImpressions += m.impressions || 0;
        totalClicks += m.clicks || 0;

        if (!campAgg[m.campaign_id]) {
          campAgg[m.campaign_id] = { spend: 0, impressions: 0, clicks: 0 };
        }
        campAgg[m.campaign_id].spend += m.spend_cents || 0;
        campAgg[m.campaign_id].impressions += m.impressions || 0;
        campAgg[m.campaign_id].clicks += m.clicks || 0;
      }

      if (totalSpend === 0 && totalImpressions === 0) continue;

      const totalSpendNgn = totalSpend / 100;
      const avgCtr =
        totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      // Find top campaign by CTR
      let topCampId = null;
      let topCtr = -1;
      for (const [cid, agg] of Object.entries(campAgg)) {
        if (agg.impressions > 500) {
          // arbitrary minimum for statistical relevance
          const ctr = (agg.clicks / agg.impressions) * 100;
          if (ctr > topCtr) {
            topCtr = ctr;
            topCampId = cid;
          }
        }
      }

      const topCampMessage = topCampId
        ? `Top campaign: "${campIdToName.get(topCampId)}" (${topCtr.toFixed(2)}% CTR)`
        : `No runaway campaigns this week.`;

      const msg = `You spent ₦${totalSpendNgn.toLocaleString()} and reached ${totalImpressions.toLocaleString()} people. ${topCampMessage}`;

      // Insert in-app notification & send email for each opted-in owner
      for (const uid of orgUserIds) {
        const user = userMap.get(uid);
        if (!user) continue;

        // In-App
        const dedupKey = `weekly_report:${orgId}:${todayStr}`;
        const { error: insertErr } = await supabase
          .from("notifications")
          .insert({
            user_id: uid,
            type: "info",
            category: "system",
            title: "🗓️ Your Weekly Ad Report",
            message: msg,
            action_label: "View Dashboard",
            action_url: "/dashboard",
            dedup_key: dedupKey,
            read: false,
          });

        // Email
        if (!insertErr || insertErr.code === "23505") {
          // If deduped or successfully inserted, we still send the email
          // (or skip if we want strict dedup for emails too, but we'll send it)
          if (user.email) {
            const html = `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
                <h2 style="color:#111827;">Weekly Ad Report</h2>
                <p>Hello ${user.full_name || "there"},</p>
                <p>Here is your campaign performance for the last 7 days:</p>
                <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:20px 0;">
                  <ul style="list-style-type:none;padding:0;margin:0;font-size:16px;">
                    <li style="margin-bottom:10px;">💵 <strong>Total Spend:</strong> ₦${totalSpendNgn.toLocaleString()}</li>
                    <li style="margin-bottom:10px;">👀 <strong>Impressions:</strong> ${totalImpressions.toLocaleString()}</li>
                    <li style="margin-bottom:10px;">🖱️ <strong>Clicks:</strong> ${totalClicks.toLocaleString()}</li>
                    <li>📊 <strong>Avg. CTR:</strong> ${avgCtr.toFixed(2)}%</li>
                  </ul>
                </div>
                <p><strong>Insight:</strong> ${topCampMessage}</p>
                <div style="margin-top:30px;">
                  <a href="${Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://sellam.app"}/dashboard"
                     style="background:#111827;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
                    Open Dashboard
                  </a>
                </div>
              </div>
            `;
            await sendResendEmail(user.email, "Your Weekly Ad Report", html);
          }
        }
        reportsSent++;
      }
    }

    return new Response(JSON.stringify({ success: true, reportsSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[WeeklyReport] Fatal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
