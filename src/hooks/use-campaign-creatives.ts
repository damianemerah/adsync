"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";
import { useDashboardStore } from "@/store/dashboard-store";
import type { CTAData } from "@/types/cta-types";

export type CampaignCreativeFormat =
  | "single"
  | "carousel"
  | "dynamic_creative";

export interface CampaignCreativeCarouselCard {
  imageUrl: string;
  headline?: string;
  description?: string;
  link?: string;
}

export interface CampaignCreativeAssetMetric {
  url: string;
  hash: string;
  impressions: number;
  clicks: number;
  spendCents: number;
  ctr: number | null;
}

export interface CampaignCreativeCardMetric {
  impressions: number;
  clicks: number;
  spendCents: number;
  ctr: number | null;
}

export interface CampaignCreative {
  campaignId: string;
  campaignName: string;
  status: string;
  adFormatType: CampaignCreativeFormat;
  creatives: string[];
  carouselCards?: CampaignCreativeCarouselCard[];
  adCopy?: {
    primary?: string;
    headline?: string;
    cta?: CTAData | string;
  };
  destination?: string;
  performance: {
    ctr: number | null;
    impressions: number;
    clicks: number;
    spendCents: number;
  };
  assetMetrics?: CampaignCreativeAssetMetric[];
  carouselCardMetrics?: Array<CampaignCreativeCardMetric | undefined>;
}

type CreativeSnapshot = {
  creatives?: string[];
  ad_copy?: CampaignCreative["adCopy"];
  destination?: string;
  ad_format_type?: CampaignCreativeFormat;
  carousel_cards?: Array<{
    imageUrl?: string;
    image?: string;
    headline?: string;
    description?: string;
    link?: string;
  }>;
  creative_hashes?: Record<string, string>;
} | null;

type CreativeAssetCache = {
  assets?: CampaignCreativeAssetMetric[];
  syncedAt?: string;
} | null;

export function useCampaignCreatives() {
  const supabase = createClient();
  const { activeOrgId } = useActiveOrgContext();
  const { selectedPlatform, selectedAccountId, selectedCampaignIds } =
    useDashboardStore();

  const includesAll = selectedCampaignIds.includes("all");

  return useQuery({
    queryKey: [
      "campaign-creatives",
      activeOrgId,
      selectedPlatform,
      selectedAccountId,
      includesAll ? "all" : selectedCampaignIds.slice().sort().join(","),
    ],
    queryFn: async (): Promise<CampaignCreative[]> => {
      if (!activeOrgId) return [];

      let query = supabase
        .from("campaigns")
        .select("id, name, status, creative_snapshot, creative_asset_cache")
        .eq("organization_id", activeOrgId)
        .in("status", ["active", "paused", "pending_review"])
        .order("created_at", { ascending: false });

      if (selectedPlatform && selectedPlatform !== "all") {
        query = query.eq("platform", selectedPlatform);
      }
      if (selectedAccountId) {
        query = query.eq("ad_account_id", selectedAccountId);
      }
      if (!includesAll && selectedCampaignIds.length > 0) {
        query = query.in("id", selectedCampaignIds);
      }

      const { data: campaigns, error } = await query;

      if (error) throw error;
      if (!campaigns || campaigns.length === 0) return [];

      const campaignIds = campaigns.map((c) => c.id);

      const [{ data: adRows }, { data: creativeRows }] = await Promise.all([
        supabase
          .from("ads")
          .select("campaign_id, creative_id, ctr, impressions, clicks, spend_cents")
          .in("campaign_id", campaignIds),
        supabase
          .from("creatives")
          .select("id, thumbnail_url")
          .in("campaign_id", campaignIds)
          .is("parent_id", null),
      ]);

      type PerfEntry = { impressions: number; clicks: number; spendCents: number; ctrNumerator: number };

      const perfByCampaign = new Map<string, PerfEntry>();
      const perfByCreativeId = new Map<string, PerfEntry>();

      for (const ad of adRows ?? []) {
        const impressions = ad.impressions ?? 0;
        const ctrW = (ad.ctr ?? 0) * impressions;

        if (ad.campaign_id) {
          const e = perfByCampaign.get(ad.campaign_id) ?? { impressions: 0, clicks: 0, spendCents: 0, ctrNumerator: 0 };
          e.impressions += impressions;
          e.clicks += ad.clicks ?? 0;
          e.spendCents += ad.spend_cents ?? 0;
          e.ctrNumerator += ctrW;
          perfByCampaign.set(ad.campaign_id, e);
        }

        if (ad.creative_id) {
          const e = perfByCreativeId.get(ad.creative_id) ?? { impressions: 0, clicks: 0, spendCents: 0, ctrNumerator: 0 };
          e.impressions += impressions;
          e.clicks += ad.clicks ?? 0;
          e.spendCents += ad.spend_cents ?? 0;
          e.ctrNumerator += ctrW;
          perfByCreativeId.set(ad.creative_id, e);
        }
      }

      // Build URL → per-creative metrics (for carousel card matching)
      const metricsByUrl = new Map<string, CampaignCreativeCardMetric>();
      for (const creative of creativeRows ?? []) {
        if (!creative.thumbnail_url) continue;
        const m = perfByCreativeId.get(creative.id);
        if (!m) continue;
        metricsByUrl.set(creative.thumbnail_url, {
          impressions: m.impressions,
          clicks: m.clicks,
          spendCents: m.spendCents,
          ctr: m.impressions > 0 ? m.ctrNumerator / m.impressions : null,
        });
      }

      return campaigns
        .map((campaign) => {
          const snapshot = campaign.creative_snapshot as CreativeSnapshot;
          const adFormatType: CampaignCreativeFormat =
            snapshot?.ad_format_type ?? "single";
          const carouselCards = (snapshot?.carousel_cards ?? [])
            .map((c) => ({
              imageUrl: c.imageUrl ?? c.image ?? "",
              headline: c.headline,
              description: c.description,
              link: c.link,
            }))
            .filter((c) => c.imageUrl);

          const perf = perfByCampaign.get(campaign.id);
          const impressions = perf?.impressions ?? 0;
          const ctr =
            perf && impressions > 0 ? perf.ctrNumerator / impressions : null;

          const assetCache = campaign.creative_asset_cache as CreativeAssetCache;

          return {
            campaignId: campaign.id,
            campaignName: campaign.name,
            status: campaign.status ?? "active",
            adFormatType,
            creatives: snapshot?.creatives ?? [],
            carouselCards: carouselCards.length > 0 ? carouselCards : undefined,
            adCopy: snapshot?.ad_copy,
            destination: snapshot?.destination,
            performance: {
              ctr,
              impressions,
              clicks: perf?.clicks ?? 0,
              spendCents: perf?.spendCents ?? 0,
            },
            assetMetrics: assetCache?.assets?.length ? assetCache.assets : undefined,
            carouselCardMetrics: adFormatType === "carousel" && carouselCards.length > 0
              ? carouselCards.map((card) => metricsByUrl.get(card.imageUrl))
              : undefined,
            // internal flag for filtering — not exposed on the public type
            _hasAds: perfByCampaign.has(campaign.id),
          };
        })
        // Hide paused campaigns Meta never actually provisioned (no ads row).
        // Active / pending_review always pass — they're either running or being
        // set up, and may legitimately have no ads/impressions yet.
        // Paused campaigns must have at least one ads row to prove they ran.
        .filter((c) => c._hasAds)
        .map(({ _hasAds, ...rest }) => rest);
    },
    staleTime: 1000 * 60 * 5,
  });
}
