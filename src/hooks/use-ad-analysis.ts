"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

interface AdData {
  id: string;
  name: string;
  status: string;
  creative_snapshot: any;
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
      let q = supabase
        .from("ads")
        .select(
          `id, name, status, creative_snapshot, clicks, impressions, spend_cents, ctr, campaigns!inner(name, organization_id)`,
        )
        .not("creative_snapshot", "is", null)
        .order("spend_cents", { ascending: false });

      if (activeOrgId) {
        q = q.eq("campaigns.organization_id", activeOrgId);
      }

      const { data, error } = await q;

      if (error) throw error;

      return (
        data as unknown as (AdData & {
          campaigns: { name: string; organization_id: string };
        })[]
      ).map((ad) => {
        const snapshot = ad.creative_snapshot || {};
        // creative_snapshot on ads (Meta sync) stores { thumbnail_url, image_url, url }
        const image =
          snapshot.thumbnail_url ||
          snapshot.image_url ||
          snapshot.url ||
          "/placeholder.png";

        return {
          id: ad.id,
          name: ad.name,
          campaignName: ad.campaigns?.name || ad.name,
          image,
          spend: (ad.spend_cents || 0) / 100,
          clicks: ad.clicks || 0,
          impressions: ad.impressions || 0,
          ctr: Number(ad.ctr) || 0,
        };
      });
    },
  });
}
