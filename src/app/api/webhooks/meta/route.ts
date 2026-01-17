import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications";

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
}
