import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET!;

// ─── Shared Types ─────────────────────────────────────────────────────────────

interface AccountContext {
  organization_id: string;
}

interface OwnerContext {
  user_id: string;
}

// ─── 1. VERIFICATION HANDLER ──────────────────────────────────────────────────

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

// ─── 2. EVENT HANDLER ─────────────────────────────────────────────────────────

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
    console.log("🔥body🔥", body);

    // B. Process Entries
    if (body.object === "ad_account" || body.object === "page") {
      if (body.entry) {
        for (const entry of body.entry) {
          // entry.id is the Ad Account ID (e.g. "act_12345" or "12345")
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

// ─── 3. MAIN DISPATCHER ───────────────────────────────────────────────────────

async function processMetaEvent(change: unknown, accountIdRaw: string) {
  const field = (change as { field: string }).field;
  const value = (change as { value: unknown }).value;

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

  // Resolve account + owner — shared by most handlers
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

  // ── v25.0+ Consolidated Health Signals ───────────────────────────────────

  // 1. Rejections / issues at any level (AD, ADSET, CAMPAIGN)
  if (field === "with_issues_ad_objects") {
    await handleWithIssuesAdObjects(value, account, owner, supabase);
    return;
  }

  // 2. Under-review state + approval-by-disappearance detection
  if (field === "in_process_ad_objects") {
    await handleInProcessAdObjects(
      value,
      account,
      owner,
      platformAccountId,
      supabase,
    );
    return;
  }

  // ── Account-Level Events ──────────────────────────────────────────────────

  if (field === "ad_account_update" || field === "client_account_status") {
    await handleAccountStatusChange(
      value,
      account,
      owner,
      platformAccountId,
      supabase,
    );
    return;
  }

  // ── Lead Form Submissions ─────────────────────────────────────────────────

  if (field === "leadgen") {
    await handleLeadgen(change as Record<string, unknown>, account, supabase);
    return;
  }

  // ── TEMP: v24 Legacy Per-Object Fields ────────────────────────────────────
  // These fields may still fire on older API versions or legacy objects.
  // They must NEVER overwrite data already set by the consolidated handlers above.
  // Remove these once all webhooks are confirmed firing v25 events only.
  if (field === "ads" || field === "adsets" || field === "campaigns") {
    await handleLegacyObjectStatus(
      change as Record<string, unknown>,
      account,
      owner,
      supabase,
    );
  }
}

// ─── 4a. HANDLER: with_issues_ad_objects (v25.0 Primary) ─────────────────────
// Source of truth for rejections and delivery issues at all 3 levels.

async function handleWithIssuesAdObjects(
  value: unknown,
  account: AccountContext,
  owner: OwnerContext,
  supabase: SupabaseClient,
) {
  const issues = Array.isArray(value) ? value : [value];

  for (const issue of issues as Array<Record<string, unknown>>) {
    const level = (issue.level as string) || "AD";
    console.log("level🔥", level);
    const errorMsg =
      (issue.error_user_msg as string) ||
      (issue.error_message as string) ||
      (issue.error_summary as string) ||
      "Unknown issue";
    const errorCode = issue.error_code as number | undefined;
    const objectId = issue.id as string | undefined;

    console.log(
      `🚨 [with_issues] Level=${level} ID=${objectId} Code=${errorCode} Error="${errorMsg}"`,
    );

    // Hard rejections: policy violations, disapprovals (codes 1815xxx range)
    // Delivery limits: page issues (1487390, 1487391), audience (1487370),
    // frequency caps, bid too low, etc. — ad is approved but constrained.
    const isHardRejection =
      (errorCode !== undefined && errorCode >= 1815000 && errorCode <= 1815999) ||
      errorMsg.toLowerCase().includes("disapprov") ||
      errorMsg.toLowerCase().includes("violat") ||
      errorMsg.toLowerCase().includes("prohibited");

    if (level === "AD" && objectId) {
      const adStatus = isHardRejection ? "rejected" : "limited";

      const { error } = await supabase
        .from("ads")
        .update({ rejection_reason: errorMsg, status: adStatus })
        .eq("platform_ad_id", objectId);

      if (error) {
        console.error(`Failed to mark ad ${objectId} as ${adStatus}:`, error);
      } else {
        console.log(`✅ Ad ${objectId} marked ${adStatus}`);
      }
    } else if (level === "ADSET" && objectId) {
      const { error } = await supabase
        .from("ad_sets")
        .update({ status: "with_issues" })
        .eq("platform_adset_id", objectId);

      if (error) {
        console.error(
          `Failed to mark ad set ${objectId} as with_issues:`,
          error,
        );
      } else {
        console.log(`✅ Ad Set ${objectId} marked with_issues`);
      }
    } else if (level === "CAMPAIGN" && objectId) {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "with_issues" })
        .eq("platform_campaign_id", objectId);

      if (error) {
        console.error(
          `Failed to mark campaign ${objectId} as with_issues:`,
          error,
        );
      } else {
        console.log(`✅ Campaign ${objectId} marked with_issues`);
      }
    }

    // Determine notification title and severity by level + rejection type
    let title: string;
    let notifType: "critical" | "warning";

    if (level === "AD") {
      title = isHardRejection
        ? "❌ Ad Rejected by Meta"
        : "⚠️ Ad Approved But Not Running";
      notifType = isHardRejection ? "critical" : "warning";
    } else if (level === "ADSET") {
      title = "⚠️ Ad Set Has Issues";
      notifType = "warning";
    } else {
      title = "⚠️ Campaign Has Issues";
      notifType = "warning";
    }

    await sendNotification(
      {
        userId: owner.user_id,
        organizationId: account.organization_id,
        title,
        message: `${errorMsg}. Please review your campaign.`,
        type: notifType,
        category: "campaign",
        actionUrl: "/campaigns",
        actionLabel: "View Campaigns",
      },
      supabase,
    );
  }
}

// ─── 4b. HANDLER: in_process_ad_objects (v25.0 Primary) ──────────────────────
// Source of truth for "under review" status.
// Also detects approvals by checking which previously-in-review ads
// are no longer present in the snapshot — those are now approved.

async function handleInProcessAdObjects(
  value: unknown,
  account: AccountContext,
  owner: OwnerContext,
  platformAccountId: string,
  supabase: SupabaseClient,
) {
  const inProcessList = Array.isArray(value) ? value : [value];

  // (c) Early exit — nothing to process, avoid pointless DB reads
  if (!inProcessList.length) return;

  // Build a set of IDs currently under review according to Meta.
  // v25: in_process_ad_objects uses `type` (not `level`).
  const currentInProcessSet = new Set(
    (inProcessList as Array<Record<string, unknown>>)
      .filter((o) => o.type === "AD")
      .map((o) => o.id as string),
  );

  // Mark each AD-level object as in_review
  for (const obj of inProcessList as Array<Record<string, unknown>>) {
    // (b) v25: in_process_ad_objects always carries `type`, never `level`
    const type = obj.type as string;
    const adId = obj.id as string;

    if (type === "AD" && adId) {
      console.log(`🔄 [in_process] Ad ${adId} is now under review`);

      const { error } = await supabase
        .from("ads")
        .update({ status: "in_review" })
        .eq("platform_ad_id", adId)
        // Only update if not already rejected — consolidated handler has priority
        .not("status", "eq", "rejected");

      if (error) {
        console.error(`Failed to mark ad ${adId} as in_review:`, error);
      } else {
        console.log(`✅ Ad ${adId} marked in_review`);
      }

      await sendNotification(
        {
          userId: owner.user_id,
          organizationId: account.organization_id,
          title: "📋 Ad Under Review",
          message: `Your ad is being reviewed by Meta. We'll notify you when it goes live.`,
          type: "warning",
          category: "campaign",
          actionUrl: "/campaigns",
          actionLabel: "View Campaigns",
        },
        supabase,
      );
    }
  }

  // ── Approval Detection via Disappearance ──────────────────────────────────
  // Any ad that WAS in_review but is NOT in the current snapshot → approved.
  // ── Approval Detection via Disappearance ──────────────────────────────────
  // Any ad that WAS in_review but is NOT in the current snapshot → approved.
  // (a) Scope to this ad account only — prevents accidentally approving ads
  // from other orgs in a multi-account scenario.
  const { data: allInReviewAds, error: queryError } = await supabase
    .from("ads")
    .select(
      "platform_ad_id, campaign_id, campaigns!inner(name, organization_id, ad_account_id)",
    )
    .eq("status", "in_review");

  if (queryError) {
    console.error("Failed to query in_review ads:", queryError);
    return;
  }

  // Filter to only this account's ads in JS (reliable across all Supabase versions)
  const inReviewAds = (allInReviewAds ?? []).filter((ad) => {
    const camp = ad.campaigns as unknown as { ad_account_id: string };
    return camp?.ad_account_id === platformAccountId;
  });

  if (!inReviewAds || inReviewAds.length === 0) return;

  for (const ad of inReviewAds) {
    if (!currentInProcessSet.has(ad.platform_ad_id)) {
      // No longer in Meta's review queue → approved
      const campaignName = (ad.campaigns as unknown as { name: string }).name;
      const campaignId = ad.campaign_id;

      console.log(
        `✅ [approval-by-disappearance] Ad ${ad.platform_ad_id} no longer in_process → marking active`,
      );

      const { error: approveError } = await supabase
        .from("ads")
        .update({ status: "active" })
        .eq("platform_ad_id", ad.platform_ad_id);

      if (approveError) {
        console.error(
          `Failed to approve ad ${ad.platform_ad_id}:`,
          approveError,
        );
        continue;
      }

      await sendNotification(
        {
          userId: owner.user_id,
          organizationId: account.organization_id,
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
  }
}

// ─── 4c. HANDLER: Account Status Changes ─────────────────────────────────────

async function handleAccountStatusChange(
  value: unknown,
  account: AccountContext,
  owner: OwnerContext,
  platformAccountId: string,
  supabase: SupabaseClient,
) {
  const v = value as Record<string, unknown>;
  const status = v.account_status as number | undefined;

  // 2=Disabled, 3=Unsettled, 9=In Grace Period
  if (status === 2 || status === 3 || status === 9) {
    const alertTitle = status === 2 ? "Ad Account Disabled" : "Payment Failed";
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

    await supabase
      .from("ad_accounts")
      .update({
        health_status: status === 2 ? "disabled" : "payment_issue",
      })
      .eq("platform_account_id", platformAccountId);
  }
}

// ─── 4d. HANDLER: Lead Form Submissions ──────────────────────────────────────

async function handleLeadgen(
  change: Record<string, unknown>,
  account: AccountContext,
  supabase: SupabaseClient,
) {
  const value = change.value as Record<string, unknown>;
  const leadgenId = value.leadgen_id as string;
  const formId = value.form_id as string;
  const adId = value.ad_id as string;
  const adgroupId = value.adgroup_id as string;
  const pageId = value.page_id as string;
  const createdTime = value.created_time as number | undefined;

  console.log(`📋 Lead Form Submission [${leadgenId}] from Ad [${adId}]`);

  try {
    // Step 1: Find the campaign and organization via the ad_id
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
    const organizationId = (
      ad.campaigns as unknown as { organization_id: string }
    ).organization_id;

    // Step 2: Get access token for this org's ad account
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("ad_account_id, ad_accounts!inner(access_token)")
      .eq("id", campaignId)
      .single();

    if (
      !campaign ||
      !(campaign.ad_accounts as unknown as { access_token: string })
        ?.access_token
    ) {
      console.error("Could not fetch access token for lead retrieval");
      return;
    }

    const accessToken = decrypt(
      (campaign.ad_accounts as unknown as { access_token: string })
        .access_token,
    );

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

    // Step 5: Notify org owner
    const { data: owner } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("role", "owner")
      .single();

    if (owner) {
      const emailField = leadData.field_data.find((f) =>
        f.name.toLowerCase().includes("email"),
      );
      const nameField = leadData.field_data.find((f) =>
        f.name.toLowerCase().includes("name"),
      );

      const contactInfo =
        emailField?.values?.[0] || nameField?.values?.[0] || "New contact";

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
    // Don't throw — Meta expects 200 OK even if internal processing fails
  }
}

// ─── 4e. HANDLER: Legacy Per-Object Status (TEMP: v24 legacy) ────────────────
// These fire on older API versions / legacy objects.
// IMPORTANT: Never overwrite statuses already set by handleWithIssuesAdObjects
// or handleInProcessAdObjects. Guards are in place below.

async function handleLegacyObjectStatus(
  change: Record<string, unknown>,
  account: AccountContext,
  owner: OwnerContext,
  supabase: SupabaseClient,
) {
  const field = change.field as string;
  const value = change.value as Record<string, unknown>;

  // TEMP: v24 legacy — campaigns field
  if (field === "campaigns") {
    const status =
      (value.effective_status as string) || (value.configured_status as string);
    const campaignId = value.id as string;

    if (
      status &&
      ["ACTIVE", "PAUSED", "ARCHIVED", "IN_PROCESS", "WITH_ISSUES"].includes(
        status,
      )
    ) {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("name, id, status")
        .eq("platform_campaign_id", campaignId)
        .single();

      if (campaign) {
        // Guard: don't overwrite consolidated with_issues status
        if (campaign.status === "with_issues" && status !== "with_issues") {
          console.log(
            `[v24 legacy] Skipping campaign ${campaignId} — already flagged with_issues by consolidated handler`,
          );
        } else {
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

          await supabase
            .from("campaigns")
            .update({ status: status.toLowerCase() })
            .eq("id", campaign.id);
        }
      }
    }
  }

  // TEMP: v24 legacy — adsets field
  if (field === "adsets") {
    const adsetId = value.id as string;
    const effectiveStatus = value.effective_status as string | undefined;

    console.log(
      `[v24 legacy] 📊 Ad Set Status Change [${adsetId}]: ${effectiveStatus}`,
    );

    try {
      const { data: adset } = await supabase
        .from("ad_sets")
        .select("campaign_id, status, campaigns!inner(name, organization_id)")
        .eq("platform_adset_id", adsetId)
        .single();

      if (!adset) {
        console.log(
          "[v24 legacy] Skipping adset event: Ad Set not found in AdSync DB.",
        );
        return;
      }

      // Guard: don't overwrite consolidated with_issues status
      if (adset.status === "with_issues") {
        console.log(
          `[v24 legacy] Skipping ad set ${adsetId} — already flagged with_issues by consolidated handler`,
        );
        return;
      }

      const campaignId = adset.campaign_id;
      const campaignName = (adset.campaigns as unknown as { name: string })
        .name;
      const organizationId = (
        adset.campaigns as unknown as { organization_id: string }
      ).organization_id;

      const { data: adsetOwner } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("role", "owner")
        .single();

      if (!adsetOwner) return;

      if (effectiveStatus === "CAMPAIGN_PAUSED") {
        await sendNotification(
          {
            userId: adsetOwner.user_id,
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
            userId: adsetOwner.user_id,
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
            userId: adsetOwner.user_id,
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

      if (effectiveStatus) {
        await supabase
          .from("ad_sets")
          .update({ status: effectiveStatus.toLowerCase() })
          .eq("platform_adset_id", adsetId);

        console.log(
          `[v24 legacy] ✅ Ad Set ${adsetId} status updated: ${effectiveStatus}`,
        );
      }
    } catch (error) {
      console.error("[v24 legacy] Error processing adset webhook:", error);
    }
  }

  // TEMP: v24 legacy — ads field
  if (field === "ads") {
    const adId = value.id as string;
    const effectiveStatus = value.effective_status as string | undefined;
    const configuredStatus = value.configured_status as string | undefined;

    console.log(
      `[v24 legacy] 🎬 Ad Status Change [${adId}]: ${effectiveStatus}`,
    );

    try {
      const { data: ad } = await supabase
        .from("ads")
        .select("campaign_id, status, campaigns!inner(name, organization_id)")
        .eq("platform_ad_id", adId)
        .single();

      if (!ad) {
        console.log(
          "[v24 legacy] Skipping ad event: Ad not found in AdSync DB.",
        );
        return;
      }

      // Guard: don't overwrite consolidated handler results
      if (ad.status === "rejected" || ad.status === "in_review") {
        console.log(
          `[v24 legacy] Skipping ad ${adId} — status already set to '${ad.status}' by consolidated handler`,
        );
        return;
      }

      const campaignId = ad.campaign_id;
      const campaignName = (ad.campaigns as unknown as { name: string }).name;
      const organizationId = (
        ad.campaigns as unknown as { organization_id: string }
      ).organization_id;

      const { data: adOwner } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("role", "owner")
        .single();

      if (!adOwner) return;

      if (effectiveStatus === "DISAPPROVED") {
        const rejectionReason =
          (value.issues_info as Array<Record<string, string>> | undefined)?.[0]
            ?.error_summary ||
          (value.issues_info as Array<Record<string, string>> | undefined)?.[0]
            ?.error_message ||
          "Ad was disapproved by Meta. Please review Meta's ad policies.";

        await supabase
          .from("ads")
          .update({ rejection_reason: rejectionReason, status: "rejected" })
          .eq("platform_ad_id", adId);

        console.log(
          `[v24 legacy] ✅ Stored rejection reason for ad ${adId}: ${rejectionReason}`,
        );

        await sendNotification(
          {
            userId: adOwner.user_id,
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
      } else if (
        effectiveStatus === "ACTIVE" &&
        configuredStatus === "ACTIVE"
      ) {
        await supabase
          .from("ads")
          .update({ status: "active" })
          .eq("platform_ad_id", adId);

        await sendNotification(
          {
            userId: adOwner.user_id,
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
      } else if (effectiveStatus) {
        await supabase
          .from("ads")
          .update({ status: effectiveStatus.toLowerCase() })
          .eq("platform_ad_id", adId);
      }

      console.log(
        `[v24 legacy] ✅ Ad ${adId} status updated: ${effectiveStatus}`,
      );
    } catch (error) {
      console.error("[v24 legacy] Error processing ad webhook:", error);
    }
  }
}
