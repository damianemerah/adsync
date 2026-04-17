/**
 * Common utility functions for calculating campaign performance metrics.
 * Centralizes logic to ensure consistency across Dashboard, Campaign List, and Details.
 */

export const CampaignMetrics = {
  /**
   * Calculate Return on Ad Spend (ROAS)
   * Formula: Revenue / Spend
   * @returns number (e.g. 2.5 means 250% ROAS)
   */
  calculateROAS: (revenue: number, spend: number): number => {
    if (!spend || spend <= 0) return 0;
    return revenue / spend;
  },

  /**
   * Calculate Profit
   * Formula: Revenue - Spend
   * @returns number (Currency value)
   */
  calculateProfit: (revenue: number, spend: number): number => {
    return revenue - spend;
  },

  /**
   * Calculate Conversion Rate
   * Formula: (Conversions / Clicks) * 100
   * @returns number (Percentage, e.g. 5.5)
   */
  calculateConversionRate: (conversions: number, clicks: number): number => {
    if (!clicks || clicks <= 0) return 0;
    return (conversions / clicks) * 100;
  },

  /**
   * Calculate Revenue Per Click (RPC)
   * Formula: Revenue / Clicks
   * @returns number (Currency value)
   */
  calculateRPC: (revenue: number, clicks: number): number => {
    if (!clicks || clicks <= 0) return 0;
    return revenue / clicks;
  },

  /**
   * Calculate Average Order Value (AOV)
   * Formula: Revenue / Sales
   * @returns number (Currency value)
   */
  calculateAOV: (revenue: number, sales: number): number => {
    if (!sales || sales <= 0) return 0;
    return revenue / sales;
  },

  /**
   * Calculate Cost Per Action (CPA) / Cost Per Sale
   * Formula: Spend / Sales
   * @returns number (Currency value)
   */
  calculateCPA: (spend: number, sales: number): number => {
    if (!sales || sales <= 0) return 0;
    return spend / sales;
  },

  /**
   * Determine ROAS Status Color
   * @returns string (Tailwind color class equivalent for logic)
   */
  getROASStatus: (roas: number): "profit" | "break-even" | "loss" => {
    if (roas >= 1.5) return "profit";
    if (roas >= 1.0) return "break-even";
    return "loss";
  },
};

// ---------------------------------------------------------------------------
// Channel Breakdown
// ---------------------------------------------------------------------------

export interface ChannelBreakdown {
  whatsappRevenue: number;
  websiteRevenue: number;
  whatsappSales: number;
  websiteSales: number;
}

export interface CampaignForBreakdown {
  revenue_ngn?: number | null;
  revenueNgn?: number | null;
  sales_count?: number | null;
  salesCount?: number | null;
  whatsapp_clicks?: number | null;
  whatsappClicks?: number | null;
  website_clicks?: number | null;
  websiteClicks?: number | null;
  [key: string]: unknown;
}

/**
 * Heuristic revenue attribution per channel.
 * If WhatsApp clicks >= Website clicks the revenue is credited to WhatsApp,
 * otherwise it is credited to Website.
 *
 * Note: this is an approximation for Phase 1. Phase 2+ should use CAPI events
 * to determine the exact conversion channel per sale.
 */
export function calculateChannelBreakdown(
  campaigns: CampaignForBreakdown[],
): ChannelBreakdown {
  return campaigns.reduce<ChannelBreakdown>(
    (acc, campaign) => {
      const rev = campaign.revenue_ngn ?? campaign.revenueNgn ?? 0;
      const sales = campaign.sales_count ?? campaign.salesCount ?? 0;
      const wa = campaign.whatsapp_clicks ?? campaign.whatsappClicks ?? 0;
      const web = campaign.website_clicks ?? campaign.websiteClicks ?? 0;

      if (wa >= web) {
        acc.whatsappRevenue += rev;
        acc.whatsappSales += sales;
      } else {
        acc.websiteRevenue += rev;
        acc.websiteSales += sales;
      }
      return acc;
    },
    {
      whatsappRevenue: 0,
      websiteRevenue: 0,
      whatsappSales: 0,
      websiteSales: 0,
    },
  );
}
