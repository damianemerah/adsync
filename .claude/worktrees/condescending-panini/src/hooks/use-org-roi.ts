"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

export interface OrgROI {
  hasPreviousCampaigns: boolean;
  /** Average ROI % across completed campaigns with real revenue data. Null if no data. */
  avgROIPercent: number | null;
  campaignCount: number;
}

export function useOrgROI(): OrgROI {
  const supabase = createClient();
  const { activeOrgId } = useActiveOrgContext();

  const { data } = useQuery({
    queryKey: ["org-roi", activeOrgId],
    queryFn: async (): Promise<OrgROI> => {
      let q = supabase
        .from("campaigns")
        .select("spend_cents, revenue_ngn")
        .gt("spend_cents", 0) // only campaigns that actually ran
        .not("status", "eq", "draft");

      if (activeOrgId) {
        q = q.eq("organization_id", activeOrgId);
      }

      const { data: campaigns } = await q;

      if (!campaigns || campaigns.length === 0) {
        return {
          hasPreviousCampaigns: false,
          avgROIPercent: null,
          campaignCount: 0,
        };
      }

      // Only use campaigns where revenue data exists for the ROI calc
      const withRevenue = campaigns.filter(
        (c): c is typeof c & { revenue_ngn: number; spend_cents: number } =>
          c.revenue_ngn != null &&
          c.revenue_ngn > 0 &&
          c.spend_cents != null &&
          c.spend_cents > 0,
      );

      let avgROIPercent: number | null = null;
      if (withRevenue.length > 0) {
        const FX_RATE = Number(process.env.NEXT_PUBLIC_USD_NGN_RATE) || 1_600;
        const roiValues = withRevenue.map((c) => {
          const spendNgn = (c.spend_cents / 100) * FX_RATE;
          return ((c.revenue_ngn - spendNgn) / spendNgn) * 100;
        });
        avgROIPercent = roiValues.reduce((a, b) => a + b, 0) / roiValues.length;
      }

      return {
        hasPreviousCampaigns: true,
        avgROIPercent,
        campaignCount: campaigns.length,
      };
    },
    staleTime: 1000 * 60 * 10, // 10 min — ROI history doesn't change per page visit
  });

  return (
    data ?? {
      hasPreviousCampaigns: false,
      avgROIPercent: null,
      campaignCount: 0,
    }
  );
}
