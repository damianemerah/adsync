"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

// Define the shape of the data returned by the Supabase query
interface AdData {
  id: string;
  name: string;
  status: string;
  creative_snapshot: any; // We'll type check this manually or use a more specific type if available
  campaigns: {
    name: string;
    organization_id: string | null;
  } | null; // Join returns an object or null
  clicks: number | null;
  impressions: number | null;
  spend_cents: number | null;
  ctr: number | null;
}

export function useAdAnalysis() {
  const supabase = createClient();
  const { activeOrgId } = useActiveOrgContext();

  return useQuery({
    queryKey: ["ad-analysis", activeOrgId],
    queryFn: async () => {
      // Fetch Ads with metrics, scoped to the active org via the campaigns join
      let q = supabase
        .from("ads")
        .select(
          `
          id,
          name,
          status,
          creative_snapshot,
          campaigns!inner(name, organization_id),
          clicks,
          impressions,
          spend_cents,
          ctr
        `,
        )
        .order("spend_cents", { ascending: false });

      if (activeOrgId) {
        q = q.eq("campaigns.organization_id", activeOrgId);
      }

      const { data, error } = await q;

      if (error) throw error;

      return (data as unknown as AdData[]).map((ad) => {
        // Extract image from snapshot (Meta structure varies, handle gracefully)
        // creative_snapshot can be:
        // 1. { thumbnail_url: "..." }
        // 2. { image_url: "..." }
        // 3. { url: "..." }
        // 4. Sometimes it might be nested
        const snapshot = ad.creative_snapshot || {};
        const image =
          snapshot.thumbnail_url ||
          snapshot.image_url ||
          snapshot.url ||
          "/placeholder.png"; // Fallback

        return {
          id: ad.id,
          name: ad.name,
          campaignName: ad.campaigns?.name || "Unknown Campaign",
          image: image,
          spend: (ad.spend_cents || 0) / 100,
          clicks: ad.clicks || 0,
          impressions: ad.impressions || 0,
          ctr: Number(ad.ctr) || 0, // Ensure it's a number
        };
      });
    },
  });
}
