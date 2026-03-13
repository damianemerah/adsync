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
