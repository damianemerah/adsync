"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CampaignROI {
  campaignId: string;
  spendNgn: number;
  spendCents: number;
  whatsappClicks: number;
  websiteClicks: number;
  totalClicks: number;
  salesCount: number;
  revenueNgn: number;
  costPerClickNgn: number;
  costPerSaleNgn: number;
  roiPercent: number;
}

export function useCampaignROI(campaignId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["campaign-roi", campaignId],
    queryFn: async (): Promise<CampaignROI | null> => {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select(
          `
          id,
          spend_cents,
          whatsapp_clicks,
          website_clicks,
          total_link_clicks,
          daily_budget_cents,
          sales_count,
          revenue_ngn
        `,
        )
        .eq("id", campaignId)
        .single();

      if (!campaign) return null;

      const spendNgn = (campaign.spend_cents || 0) / 100;
      const whatsappClicks = campaign.whatsapp_clicks || 0;
      const websiteClicks = campaign.website_clicks || 0;
      const totalClicks = campaign.total_link_clicks || 0;

      const sales = campaign.sales_count || 0;
      const revenue = campaign.revenue_ngn || 0;

      return {
        campaignId,
        spendNgn,
        spendCents: campaign.spend_cents || 0,
        whatsappClicks,
        websiteClicks,
        totalClicks,
        salesCount: sales,
        revenueNgn: revenue,
        costPerClickNgn:
          totalClicks > 0 ? Math.round(spendNgn / totalClicks) : 0,
        costPerSaleNgn: sales > 0 ? Math.round(spendNgn / sales) : 0,
        roiPercent:
          spendNgn > 0
            ? Math.round(((revenue - spendNgn) / spendNgn) * 100)
            : 0,
      };
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!campaignId,
  });
}
