import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET!;

// 1. VERIFICATION HANDLER
export async function GET(request: Request) {
  console.log("Meta Webhook Verification Request🤧🤧");
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Meta Webhook Verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// 2. EVENT HANDLER
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    // A. Verify Signature
    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 401 });
    }

    const expectedSignature =
      "sha256=" +
      crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");

    if (signature !== expectedSignature) {
      console.error("Invalid Meta Signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // B. Process Entries
    if (body.object === "ad_account" || body.object === "page") {
      if (body.entry) {
        for (const entry of body.entry) {
          // The entry.id is the Ad Account ID (e.g. "act_12345" or "12345")
          const accountId = entry.id;

          if (entry.changes) {
            for (const change of entry.changes) {
              await processMetaEvent(change, accountId);
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

// 3. EVENT PROCESSOR LOGIC
async function processMetaEvent(change: any, accountIdRaw: string) {
  const field = change.field;
  const value = change.value;

  // Clean ID (remove "act_" if present)
  const platformAccountId = accountIdRaw.replace("act_", "");

  console.log(`🔔 Meta Event [${field}] for Acct [${platformAccountId}]`);

  // Create Admin Client (Service Role)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  // --- 1. Find the Owner of this Ad Account ---
  const { data: account } = await supabase
    .from("ad_accounts")
    .select("organization_id")
    .eq("platform_account_id", platformAccountId)
    .single();

  if (!account) {
    console.log("Skipping event: Ad Account not found in AdSync DB.");
    return;
  }

  const { data: owner } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", account.organization_id)
    .eq("role", "owner")
    .single();

  if (!owner) return;

  // --- 2. Handle Rejections / Issues ---
  if (field === "with_issues_ad_objects") {
    // Value is typically an array or object describing the error
    // Example: { id: "...", level: "AD", error_summary: "Policy Violation", ... }

    // Normalize if array
    const issues = Array.isArray(value) ? value : [value];

    for (const issue of issues) {
      const level = issue.level || "AD";
      const errorMsg =
        issue.error_user_msg ||
        issue.error_message ||
        issue.error_summary ||
        "Unknown issue";

      await sendNotification(
        {
          userId: owner.user_id,
          organizationId: account.organization_id,
          title: `Meta Issue: ${level}`,
          message: `${errorMsg}. Please review your campaign.`,
          type: "critical",
          category: "campaign",
          actionUrl: "/campaigns",
          actionLabel: "View Campaigns",
        },
        supabase, // Pass the admin client instance
      );
    }
  }

  // --- 3. Handle Account Status (Payment Fails) ---
  if (field === "ad_account_update" || field === "client_account_status") {
    const status = value.account_status;
    // 2=Disabled, 3=Unsettled, 9=In Grace Period
    if (status === 2 || status === 3 || status === 9) {
      const alertTitle =
        status === 2 ? "Ad Account Disabled" : "Payment Failed";
      const alertMsg =
        status === 2
          ? "Your ad account has been disabled by Meta."
          : "Your ads have stopped running due to a payment failure. Please fund your card.";

      await sendNotification(
        {
          userId: owner.user_id,
          organizationId: account.organization_id,
          title: alertTitle,
          message: alertMsg,
          type: "critical",
          category: "budget",
          actionUrl: "/ad-accounts",
          actionLabel: "Fix Account",
        },
        supabase,
      );

      // Update DB Status
      await supabase
        .from("ad_accounts")
        .update({
          health_status: status === 2 ? "disabled" : "payment_issue",
        })
        .eq("platform_account_id", platformAccountId);
    }
  }

  // --- 4. Handle Campaign Status Changes ---
  if (field === "campaigns") {
    // Value typically contains: { id: "...", effective_status: "ACTIVE", configured_status: "ACTIVE", name: "..." }
    const status = value.effective_status || value.configured_status;
    const campaignId = value.id;

    if (
      status &&
      ["ACTIVE", "PAUSED", "ARCHIVED", "IN_PROCESS", "WITH_ISSUES"].includes(
        status,
      )
    ) {
      // Find the campaign in DB to get its name (and verify ownership implicitly via ad account)
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("name, id")
        .eq("platform_campaign_id", campaignId)
        .single();

      if (campaign) {
        let msg = `Campaign "${campaign.name}" is now ${status}.`;
        let type: "info" | "success" | "warning" | "critical" = "info";

        if (status === "ACTIVE") {
          msg = `🚀 Great news! Campaign "${campaign.name}" is now ACTIVE and running.`;
          type = "success";
        } else if (status === "WITH_ISSUES") {
          msg = `⚠️ Attention: Campaign "${campaign.name}" has issues.`;
          type = "critical";
        } else if (status === "ARCHIVED") {
          msg = `Campaign "${campaign.name}" has been archived.`;
          type = "info";
        }

        await sendNotification(
          {
            userId: owner.user_id,
            organizationId: account.organization_id,
            title: `Campaign Update: ${status}`,
            message: msg,
            type: type,
            category: "campaign",
            actionUrl: `/campaigns/${campaign.id}`,
            actionLabel: "View Campaign",
          },
          supabase,
        );

        // Optional: Update DB status immediately for fresher UI
        await supabase
          .from("campaigns")
          .update({ status: status.toLowerCase() }) // Map to our enum if needed, or keep raw
          .eq("id", campaign.id);
      }
    }
  }

  // --- 5. Handle Lead Form Submissions ---
  if (field === "leadgen") {
    const leadgenId = value.leadgen_id;
    const formId = value.form_id;
    const adId = value.ad_id;
    const adgroupId = value.adgroup_id;
    const pageId = value.page_id;
    const createdTime = value.created_time;

    console.log(`📋 Lead Form Submission [${leadgenId}] from Ad [${adId}]`);

    try {
      // Step 1: Find the campaign and organization via the ad_id
      // Ads are stored with platform_ad_id in the ads table
      const { data: ad } = await supabase
        .from("ads")
        .select("campaign_id, campaigns!inner(organization_id)")
        .eq("platform_ad_id", adId)
        .single();

      if (!ad) {
        console.log("Skipping leadgen event: Ad not found in AdSync DB.");
        return;
      }

      const campaignId = ad.campaign_id;
      const organizationId = (ad.campaigns as any).organization_id;

      // Step 2: Get access token for this organization's ad account
      // (We need this to fetch the full lead data from Meta API)
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("ad_account_id, ad_accounts!inner(access_token)")
        .eq("id", campaignId)
        .single();

      if (!campaign || !(campaign.ad_accounts as any)?.access_token) {
        console.error("Could not fetch access token for lead retrieval");
        return;
      }

      const accessToken = decrypt((campaign.ad_accounts as any).access_token);

      // Step 3: Fetch full lead data from Meta API
      const leadData = await MetaService.getLeadData(accessToken, leadgenId);

      // Step 4: Store in lead_submissions table
      const { error: insertError } = await supabase
        .from("lead_submissions")
        .insert({
          leadgen_id: leadgenId,
          form_id: formId,
          ad_id: adId,
          adgroup_id: adgroupId,
          page_id: pageId,
          campaign_id: campaignId,
          organization_id: organizationId,
          field_data: leadData.field_data,
          submitted_at: new Date(
            createdTime ? createdTime * 1000 : leadData.created_time,
          ).toISOString(),
        });

      if (insertError) {
        console.error("Failed to insert lead submission:", insertError);
        return;
      }

      // Step 5: Send notification to org owner
      const { data: owner } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("role", "owner")
        .single();

      if (owner) {
        // Extract email or name from field_data for notification
        const emailField = leadData.field_data.find((f) =>
          f.name.toLowerCase().includes("email"),
        );
        const nameField = leadData.field_data.find((f) =>
          f.name.toLowerCase().includes("name"),
        );

        const contactInfo =
          emailField?.values?.[0] ||
          nameField?.values?.[0] ||
          "New contact";

        await sendNotification(
          {
            userId: owner.user_id,
            organizationId: organizationId,
            title: "🎯 New Lead Captured!",
            message: `You received a new lead: ${contactInfo}. View details to follow up.`,
            type: "success",
            category: "campaign",
            actionUrl: `/campaigns/${campaignId}?tab=leads`,
            actionLabel: "View Leads",
          },
          supabase,
        );
      }

      console.log(`✅ Lead ${leadgenId} successfully captured and stored`);
    } catch (error) {
      console.error("Error processing leadgen webhook:", error);
      // Don't throw - Meta expects 200 OK even if internal processing fails
    }
  }

  // --- 6. Handle Ad Set Status Changes ---
  if (field === "adsets") {
    const adsetId = value.id;
    const effectiveStatus = value.effective_status;
    const configuredStatus = value.configured_status;
    const adsetName = value.name || "Ad Set";

    console.log(`📊 Ad Set Status Change [${adsetId}]: ${effectiveStatus}`);

    try {
      // Find campaign via ad set
      const { data: adset } = await supabase
        .from("ad_sets")
        .select("campaign_id, campaigns!inner(name, organization_id)")
        .eq("platform_adset_id", adsetId)
        .single();

      if (!adset) {
        console.log("Skipping adset event: Ad Set not found in AdSync DB.");
        return;
      }

      const campaignId = adset.campaign_id;
      const campaignName = (adset.campaigns as any).name;
      const organizationId = (adset.campaigns as any).organization_id;

      // Get org owner
      const { data: owner } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("role", "owner")
        .single();

      if (!owner) return;

      // Alert on critical status changes
      if (effectiveStatus === "CAMPAIGN_PAUSED") {
        await sendNotification(
          {
            userId: owner.user_id,
            organizationId: organizationId,
            title: "⚠️ Ad Set Paused: Budget Issue",
            message: `Your ad set in campaign "${campaignName}" has been paused due to budget depletion or account issues.`,
            type: "critical",
            category: "budget",
            actionUrl: `/campaigns/${campaignId}`,
            actionLabel: "Review Campaign",
          },
          supabase,
        );
      } else if (effectiveStatus === "ACCOUNT_PAUSED") {
        await sendNotification(
          {
            userId: owner.user_id,
            organizationId: organizationId,
            title: "🚨 Ad Set Stopped: Account Issue",
            message: `Your ad set in campaign "${campaignName}" has stopped due to an ad account issue. Please check your ad account health.`,
            type: "critical",
            category: "account",
            actionUrl: "/ad-accounts",
            actionLabel: "Check Account",
          },
          supabase,
        );
      } else if (effectiveStatus === "WITH_ISSUES") {
        await sendNotification(
          {
            userId: owner.user_id,
            organizationId: organizationId,
            title: "⚠️ Ad Set Has Issues",
            message: `Your ad set in campaign "${campaignName}" is experiencing delivery issues.`,
            type: "warning",
            category: "campaign",
            actionUrl: `/campaigns/${campaignId}`,
            actionLabel: "View Details",
          },
          supabase,
        );
      }

      // Update DB status
      await supabase
        .from("ad_sets")
        .update({ status: effectiveStatus.toLowerCase() })
        .eq("platform_adset_id", adsetId);

      console.log(`✅ Ad Set ${adsetId} status updated: ${effectiveStatus}`);
    } catch (error) {
      console.error("Error processing adset webhook:", error);
    }
  }

  // --- 7. Handle Individual Ad Status Changes ---
  if (field === "ads") {
    const adId = value.id;
    const effectiveStatus = value.effective_status;
    const configuredStatus = value.configured_status;
    const adName = value.name || "Ad";

    console.log(`🎬 Ad Status Change [${adId}]: ${effectiveStatus}`);

    try {
      // Find campaign via ad
      const { data: ad } = await supabase
        .from("ads")
        .select("campaign_id, campaigns!inner(name, organization_id)")
        .eq("platform_ad_id", adId)
        .single();

      if (!ad) {
        console.log("Skipping ad event: Ad not found in AdSync DB.");
        return;
      }

      const campaignId = ad.campaign_id;
      const campaignName = (ad.campaigns as any).name;
      const organizationId = (ad.campaigns as any).organization_id;

      // Get org owner
      const { data: owner } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("role", "owner")
        .single();

      if (!owner) return;

      // Alert on ad rejection
      if (effectiveStatus === "DISAPPROVED") {
        await sendNotification(
          {
            userId: owner.user_id,
            organizationId: organizationId,
            title: "❌ Ad Rejected by Meta",
            message: `Your ad in campaign "${campaignName}" was disapproved by Meta. Review and fix the issue to resume delivery.`,
            type: "critical",
            category: "campaign",
            actionUrl: `/campaigns/${campaignId}`,
            actionLabel: "View Campaign",
          },
          supabase,
        );
      }
      // Alert when ad goes live
      else if (
        effectiveStatus === "ACTIVE" &&
        configuredStatus === "ACTIVE"
      ) {
        await sendNotification(
          {
            userId: owner.user_id,
            organizationId: organizationId,
            title: "✅ Ad Approved & Live",
            message: `Great news! Your ad in campaign "${campaignName}" has been approved and is now running.`,
            type: "success",
            category: "campaign",
            actionUrl: `/campaigns/${campaignId}`,
            actionLabel: "View Performance",
          },
          supabase,
        );
      }

      // Update DB status
      await supabase
        .from("ads")
        .update({ status: effectiveStatus.toLowerCase() })
        .eq("platform_ad_id", adId);

      console.log(`✅ Ad ${adId} status updated: ${effectiveStatus}`);
    } catch (error) {
      console.error("Error processing ad webhook:", error);
    }
  }
}
