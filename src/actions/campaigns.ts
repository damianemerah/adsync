"use server";

import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { MetaService } from "@/lib/api/meta";
import { revalidatePath } from "next/cache";
import { generateWhatsAppLink } from "@/lib/utils";
import { AdSyncObjective } from "@/lib/constants";
import { sendNotification } from "@/lib/notifications";

interface LaunchConfig {
  name: string;
  objective: AdSyncObjective; // Uses the type from constants
  budget: number; // In Naira
  platform: "meta" | "tiktok";
  adCopy: { primary: string; headline: string; cta: string };
  creatives: string[]; // List of URLs (Supabase Storage)
  targetLocations: string[]; // ["Lagos", "Abuja"] - Used for record keeping in MVP
  targetInterests: string[]; // ["Fashion", "Shoes"]
  destinationValue: string; // The raw input (Phone or URL)
}

export async function launchCampaign(config: LaunchConfig) {
  console.log("🚀 Launching campaign:", config.name);
  const supabase = await createClient();

  // 1. Auth & User Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 2. Organization & Subscription Check
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(subscription_status)")
    .eq("user_id", user.id)
    .single();

  if (!member || !member.organizations) {
    throw new Error("No organization found");
  }

  // @ts-ignore - Types might need regeneration for join, but logic is valid
  const subStatus = member.organizations.subscription_status;

  // 🛑 GATEKEEPER: Check Subscription
  if (subStatus !== "active" && subStatus !== "trialing") {
    throw new Error(
      "Your subscription has expired. Please renew to launch campaigns."
    );
  }

  const orgId = member.organization_id;

  // 3. Get Ad Account
  const { data: adAccount } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("organization_id", orgId as string)
    .eq("platform", config.platform)
    .eq("health_status", "healthy")
    .order("is_default", { ascending: false })
    .limit(1)
    .single();

  if (!adAccount)
    throw new Error(`No connected ${config.platform} account found.`);

  // 4. DATA PREPARATION

  // A. Format Destination URL
  let finalUrl = config.destinationValue;

  if (config.objective === "whatsapp") {
    // Generate deep link: https://wa.me/23480...?text=...
    // Fallback for dev testing if empty
    const phone = config.destinationValue || "2348012345678";
    const defaultMessage = `Hi, I saw your ad about "${config.adCopy.headline}". Is it available?`;
    finalUrl = generateWhatsAppLink(phone, defaultMessage);
  } else {
    // Ensure Website URL has protocol
    if (finalUrl && !finalUrl.startsWith("http")) {
      finalUrl = `https://${finalUrl}`;
    }
    // Fallback
    if (!finalUrl) finalUrl = "https://google.com";
  }

  // B. Budget to Cents
  const budgetInCents = config.budget * 100;

  try {
    const accessToken = decrypt(adAccount.access_token);
    const adAccountId = adAccount.platform_account_id;

    // 5. META API CHAIN

    // Step A: Find Facebook Page ID
    // We need a Page to represent the business in the ad
    const pages = await MetaService.request(
      "/me/accounts?fields=id,name",
      "GET",
      accessToken
    );
    if (!pages.data?.length)
      throw new Error("No Facebook Page found. Please create one on Facebook.");
    const pageId = pages.data[0].id;

    // Step B: Interest Deduplication & Validation
    const validatedInterests = [];
    const seenInterestIds = new Set();

    for (const interest of config.targetInterests) {
      const match = await MetaService.searchInterests(accessToken, interest);

      if (match && !seenInterestIds.has(match.id)) {
        seenInterestIds.add(match.id);
        validatedInterests.push({ id: match.id, name: match.name });
      }
    }

    console.log("Validated Interests:", validatedInterests);

    // Step C: Location Logic
    // MVP: Target Nigeria Country to ensure broad reach within budget
    // V2: Implement City-ID lookup for config.targetLocations
    const geo_locations = { countries: ["NG"] };

    // Step D: Create Campaign Container
    // MetaService handles mapping 'whatsapp' -> 'OUTCOME_TRAFFIC'
    const campaignRes = await MetaService.createCampaign(
      accessToken,
      adAccountId,
      config.name,
      config.objective
    );

    console.log("Campaign Created:", campaignRes);

    // Step E: Create Ad Set (Targeting & Budget)
    const adSetRes = await MetaService.createAdSet(
      accessToken,
      adAccountId,
      campaignRes.id,
      {
        name: config.name,
        dailyBudget: budgetInCents,
        targeting: {
          geo_locations,
          interests: validatedInterests,
          age_min: 18,
          age_max: 65,
        },
      }
    );

    console.log("Ad Set Created:", adSetRes);

    // Step F: Upload Image (Binary)
    // We take the first creative from the list (MVP Single Image)
    const imageRes = await MetaService.createAdImage(
      accessToken,
      adAccountId,
      config.creatives[0]
    );

    console.log("Image Created:", imageRes);

    // Extract Image Hash
    const imageKey = Object.keys(imageRes.images)[0];
    const imageHash = imageRes.images[imageKey].hash;

    // Step G: Create Ad Creative & Ad
    const adRes = await MetaService.createAd(
      accessToken,
      adAccountId,
      adSetRes.id,
      imageHash,
      {
        pageId,
        primaryText: config.adCopy.primary,
        headline: config.adCopy.headline,
        destinationUrl: finalUrl, // The processed WhatsApp or Website link
      }
    );

    console.log("Ad Created:", adRes);

    // 6. SAVE TO DATABASE
    await supabase.from("campaigns").insert({
      organization_id: orgId,
      ad_account_id: adAccount.id,
      platform: config.platform,
      platform_campaign_id: campaignRes.id,
      name: config.name,
      objective: config.objective,
      status: "active", // It's created as 'PAUSED' on FB, but 'active' in our list means 'created'
      daily_budget_cents: budgetInCents,
      placement_type: "automatic",
    });

    await sendNotification({
      userId: user.id,
      organizationId: orgId as string,
      title: "Campaign Launched",
      message: `Your campaign "${config.name}" has been sent to Meta for review.`,
      type: "success",
      category: "campaign",
      actionUrl: `/campaigns`,
      actionLabel: "View Campaigns",
    });

    revalidatePath("/campaigns");
    return { success: true, campaignId: campaignRes.id };
  } catch (error: any) {
    console.error("Launch Error:", error);
    // Return error message to UI
    return {
      success: false,
      error: error.message || "Failed to launch campaign",
    };
  }
}
