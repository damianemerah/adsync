export const PLAN_IDS = {
  STARTER: "starter",
  GROWTH: "growth",
  AGENCY: "agency",
} as const;

export const PLAN_PRICES: Record<string, number> = {
  starter: 10000,
  growth: 25000,
  agency: 60000,
};

// Helper to get daily rate
export const getDailyRate = (planId: string) => {
  const price = PLAN_PRICES[planId] || 0;
  return price / 30; // Assuming 30 day cycle
};

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  TRIALING: "trialing",
  PAST_DUE: "past_due",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

export const ROLES = {
  OWNER: "owner",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export const AD_ACCOUNT_STATUS = {
  HEALTHY: "healthy",
  PAYMENT_ISSUE: "payment_issue",
  TOKEN_EXPIRED: "token_expired",
  DISABLED: "disabled",
} as const;

// Helper arrays for validation/dropdowns
export const PLANS = Object.values(PLAN_IDS);
export const ROLES_LIST = Object.values(ROLES);

// 1. The AdSync Objectives (What the User sees)
export const CAMPAIGN_OBJECTIVES = [
  {
    id: "whatsapp",
    label: "WhatsApp Messages",
    description: "Get customers to chat with you directly.",
    iconName: "Phone", // We'll map icons in the UI component
  },
  {
    id: "traffic",
    label: "Website Traffic",
    description: "Send people to your online store or landing page.",
    iconName: "Zap",
  },
  {
    id: "awareness",
    label: "Brand Awareness",
    description: "Show your ad to as many people as possible.",
    iconName: "Eye",
  },
  {
    id: "engagement",
    label: "Post Engagement",
    description: "Get more likes, comments, and shares.",
    iconName: "Heart",
  },
] as const;

export type AdSyncObjective = (typeof CAMPAIGN_OBJECTIVES)[number]["id"];

// 2. The Meta API Mapping (What we send to Facebook)
export const META_OBJECTIVE_MAP: Record<AdSyncObjective, string> = {
  whatsapp: "OUTCOME_TRAFFIC", // We use Traffic + wa.me link for MVP
  traffic: "OUTCOME_TRAFFIC",
  awareness: "OUTCOME_AWARENESS",
  engagement: "OUTCOME_ENGAGEMENT",
};
