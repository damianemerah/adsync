"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// Define the shape of the data returned by the Supabase query
interface AdData {
  id: string;
  name: string;
  status: string;
  creative_snapshot: any; // We'll type check this manually or use a more specific type if available
  campaigns: {
    name: string;
  } | null; // Join returns an object or null
  clicks: number | null;
  impressions: number | null;
  spend_cents: number | null;
  ctr: number | null;
}

export function useAdAnalysis() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["ad-analysis"],
    queryFn: async () => {
      // Fetch Ads with metrics
      // Note: We need to cast the result because Supabase types might not be fully up to date with the new migration yet
      const { data, error } = await supabase
        .from("ads")
        .select(
          `
          id,
          name,
          status,
          creative_snapshot,
          campaigns(name),
          clicks,
          impressions,
          spend_cents,
          ctr
        `,
        )
        .order("spend_cents", { ascending: false });

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
