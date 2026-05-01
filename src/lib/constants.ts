export const PLAN_IDS = {
  STARTER: "starter",
  GROWTH: "growth",
  AGENCY: "agency",
} as const;

export const PLAN_PRICES: Record<string, number> = {
  starter: 9900,
  growth: 24900,
  agency: 59900,
};

// Paystack plan codes — created in Paystack dashboard, stored in env
// Each plan code maps to a recurring monthly plan that Paystack manages
export const PAYSTACK_PLAN_CODES: Record<string, string | undefined> = {
  starter: process.env.NEXT_PUBLIC_PAYSTACK_PLAN_STARTER,
  growth: process.env.NEXT_PUBLIC_PAYSTACK_PLAN_GROWTH,
  agency: process.env.NEXT_PUBLIC_PAYSTACK_PLAN_AGENCY,
};

// ─────────────────────────────────────────────────────────────────────────────
// Platform fee configuration
// ─────────────────────────────────────────────────────────────────────────────
/** 5% platform processing fee on every ad budget top-up */
export const PLATFORM_FEE_RATE = 0.05;

export const TRIAL_DAYS = 7;

// Monthly credit quotas per plan (must mirror plan_definitions DB table)
export const PLAN_CREDITS: Record<string, number> = {
  free_trial: 50,
  starter: 50,
  growth: 150,
  agency: 250,
};

// Credits cost per AI action (mirrors credit_costs DB table)
// TEXT actions are FREE — cost is negligible (<₦1 per call)
// Image costs are tier-driven — see TIER_CONFIG below
export const CREDIT_COSTS = {
  IMAGE_GEN_PREMIUM: 8, // Nano Banana Pro (Agency only, Phase 3)
  IMAGE_GEN_PRO: 5, // FLUX 2 Pro (default for all tiers)
  IMAGE_EDIT_PRO: 3, // FLUX 2 Pro edit/refine
  TEXT_GEN: 0, // FREE — GPT copy / analysis
  CHAT_OVERAGE: 1, // 1 credit per chat message after monthly quota is exhausted
  VIDEO_KLING_5S: 40, // Kling v2 5s  (Phase 2)
  VIDEO_KLING_10S: 70, // Kling v2 10s (Phase 2)
  VIDEO_VEO3_5S: 50, // Veo 3.1 5s   (Phase 2)
} as const;

// ─── Tier Configuration ──────────────────────────────────────────────────────
// Single source of truth for all tier-specific AI models, credits, and limits.
// Starter: gpt-5.2 WITHOUT Skills (inline prompt only)
// Growth/Agency: gpt-5.2 WITH Skills (industry-specific .md files auto-loaded)
// All tiers use FLUX 2 Pro for images. Agency gets Nano Banana Pro option (Phase 3).
export const TIER_CONFIG = {
  starter: {
    ai: {
      strategyModel: "gpt-5.2" as const,
      refinementModel: "gpt-5-mini" as const,
      imageModel: "fal-ai/flux-2-pro" as const,
      premiumImageModel: null,
      useSkills: false, // No Skills — inline system prompt only
      maxCopyVariations: 2,
      maxRefinementsPerCampaign: 3,
    },
    credits: { monthly: 50, imageCost: 5, premiumImageCost: null },
    limits: {
      maxOrganizations: 1,
      maxAdAccounts: 1,
      maxTeamMembers: 1,
      linkAnalyticsDays: 7,
      customLinkSlugs: false,
      maxMonthlyChats: 50,
      adSpendCeilingKobo: 10_000_000,  // ₦100,000
      anomalyBufferKobo: 2_000_000,    // ₦20,000
    },
  },
  growth: {
    ai: {
      strategyModel: "gpt-5.2" as const,
      refinementModel: "gpt-5-mini" as const,
      imageModel: "fal-ai/flux-2-pro" as const,
      premiumImageModel: null,
      useSkills: true, // Full Skills loaded from .md files
      maxCopyVariations: 3,
      maxRefinementsPerCampaign: Infinity,
    },
    credits: { monthly: 150, imageCost: 5, premiumImageCost: null },
    limits: {
      maxOrganizations: 3,
      maxAdAccounts: 3,
      maxTeamMembers: 3,
      linkAnalyticsDays: 30,
      customLinkSlugs: true,
      maxMonthlyChats: 200,
      adSpendCeilingKobo: 30_000_000,  // ₦300,000
      anomalyBufferKobo: 5_000_000,    // ₦50,000
    },
  },
  agency: {
    ai: {
      strategyModel: "gpt-5.2" as const,
      refinementModel: "gpt-5-mini" as const,
      imageModel: "fal-ai/flux-2-pro" as const,
      premiumImageModel: "fal-ai/nano-banana-pro" as const, // Phase 3
      useSkills: true,
      maxCopyVariations: 5,
      maxRefinementsPerCampaign: Infinity,
    },
    credits: { monthly: 250, imageCost: 5, premiumImageCost: 8 },
    limits: {
      maxOrganizations: 999,
      maxAdAccounts: 999,
      maxTeamMembers: 10,
      linkAnalyticsDays: 36500, // "Lifetime"
      customLinkSlugs: true,
      maxMonthlyChats: 2000, // Above this, chat dips into credit pool at 1 cr/msg
      adSpendCeilingKobo: null,         // Unlimited
      anomalyBufferKobo: null,
    },
  },
} as const;

export type TierConfig = typeof TIER_CONFIG;
export type TierId = keyof TierConfig;

// Credit pack top-ups (one-off purchases)
export const CREDIT_PACKS = [
  { id: "small", name: "Small Pack", credits: 50, price: 3000 },
  { id: "medium", name: "Medium Pack", credits: 120, price: 6500 },
  { id: "large", name: "Large Pack", credits: 300, price: 15000 },
] as const;

// ₦ value of 1 credit (for display purposes)
export const CREDIT_NGN_VALUE = 50;

// Helper to get daily rate
export const getDailyRate = (planId: string) => {
  const price = PLAN_PRICES[planId] || 0;
  return price / 30; // Assuming 30 day cycle
};

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  TRIALING: "trialing",
  INCOMPLETE: "incomplete", // org created but Meta not yet connected; trial not started
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

// Full plan data for billing UI — single source of truth consumed by billing-content, subscription-gate, and payment-dialog
export const BILLING_PLANS = [
  {
    id: PLAN_IDS.STARTER,
    name: "Starter",
    price: PLAN_PRICES.starter,
    credits: PLAN_CREDITS.starter,
    tagline: "Perfect for solo SMEs",
    features: [
      `${PLAN_CREDITS.starter} AI credits / month`,
      `${TIER_CONFIG.starter.limits.maxAdAccounts} Meta Ad Account${TIER_CONFIG.starter.limits.maxAdAccounts > 1 ? "s" : ""}`,
      `${TIER_CONFIG.starter.limits.maxTeamMembers} Team Member${TIER_CONFIG.starter.limits.maxTeamMembers > 1 ? "s" : ""}`,
      `${TIER_CONFIG.starter.limits.maxMonthlyChats} AI chat sessions / month`,
      "AI Ad Copy (Free) + Image Generation",
      "Campaign Analytics",
    ],
    highlight: false,
  },
  {
    id: PLAN_IDS.GROWTH,
    name: "Growth",
    price: PLAN_PRICES.growth,
    credits: PLAN_CREDITS.growth,
    tagline: "For scaling businesses",
    features: [
      `${PLAN_CREDITS.growth} AI credits / month`,
      `Up to ${TIER_CONFIG.growth.limits.maxAdAccounts} Ad Accounts`,
      `Up to ${TIER_CONFIG.growth.limits.maxTeamMembers} Team Members`,
      `${TIER_CONFIG.growth.limits.maxMonthlyChats} AI chat sessions / month`,
      "AI Copy (Free) + Pro Image Generation",
      "Advanced Analytics + Rollover Credits",
    ],
    highlight: true,
  },
  {
    id: PLAN_IDS.AGENCY,
    name: "Agency",
    price: PLAN_PRICES.agency,
    credits: PLAN_CREDITS.agency,
    tagline: "Built for agencies managing multiple clients",
    features: [
      `${PLAN_CREDITS.agency} AI credits / month`,
      "Unlimited Accounts",
      `Up to ${TIER_CONFIG.agency.limits.maxTeamMembers} Team Members`,
      "Unlimited AI chat sessions",
      "All AI features + Video (Phase 2)",
      "Priority Support + Credit Rollover",
    ],
    highlight: false,
  },
] as const;
export const ROLES_LIST = Object.values(ROLES);

// 1. The AdSync Objectives (Refactored for Revenue vs Growth)
// Internal IDs stand firm to avoid DB migration, but UI/Logic is revenue-first.
export const CAMPAIGN_OBJECTIVES = [
  {
    id: "whatsapp",
    label: "WhatsApp Sales",
    description: "Get customers to chat and convert via WhatsApp.",
    iconName: "Phone",
    category: "revenue",
    // OUTCOME_ENGAGEMENT is the only Meta objective that supports CONVERSATIONS optimization_goal.
    // OUTCOME_SALES + CONVERSATIONS = Meta API error 2490408 ("Performance goal isn't available")
    metaObjective: "OUTCOME_ENGAGEMENT",
    metaOptimizationGoal: "CONVERSATIONS",
    optimizationModel: "conversation", // Optimized for conversations
    revenueTracked: true,
  },
  {
    id: "traffic",
    label: "Website Sales",
    description: "Drive visitors to your website and track purchases.",
    iconName: "Zap",
    category: "revenue",
    // OUTCOME_SALES requires a Meta Pixel with purchase events to learn from — without it, the
    // algorithm has zero signal and wastes budget on cold random delivery.
    // OUTCOME_TRAFFIC + LANDING_PAGE_VIEWS is the correct Phase 1 combo:
    //   - Cheaper CPM than OUTCOME_SALES
    //   - Filters for real intent (page must actually load, not just a tap)
    //   - Warms the audience for Phase 2 pixel retargeting
    //   - Uses Meta's own in-app browser load as proxy signal — no pixel needed
    // Phase 2: swap to OUTCOME_SALES + PURCHASE once pixel is connected.
    metaObjective: "OUTCOME_TRAFFIC",
    metaOptimizationGoal: "LANDING_PAGE_VIEWS",
    optimizationModel: "click",
    revenueTracked: true,
  },
  {
    id: "awareness",
    label: "Brand Awareness",
    description: "Show your ad to as many people as possible.",
    iconName: "Eye",
    category: "growth",
    metaObjective: "OUTCOME_AWARENESS",
    metaOptimizationGoal: "REACH",
    optimizationModel: "reach",
    revenueTracked: false,
  },
  {
    id: "engagement",
    label: "Post Engagement",
    description: "Get more likes, comments, and shares.",
    iconName: "Heart",
    category: "growth",
    metaObjective: "OUTCOME_ENGAGEMENT",
    metaOptimizationGoal: "POST_ENGAGEMENT",
    optimizationModel: "engagement",
    revenueTracked: false,
  },
  {
    id: "leads",
    label: "Collect Leads",
    description: "Capture contact info via Meta's built-in lead forms.",
    iconName: "Mail",
    category: "revenue",
    // OUTCOME_LEADS + LEAD_GENERATION is the correct ODAX combo for lead-gen.
    // Meta's native instant forms keep users in-app — no pixel needed.
    metaObjective: "OUTCOME_LEADS",
    metaOptimizationGoal: "LEAD_GENERATION",
    optimizationModel: "lead",
    revenueTracked: true,
  },
  {
    id: "sales",
    label: "Direct Sales",
    description: "Drive purchases tracked by your Meta Pixel.",
    iconName: "ShoppingCart",
    category: "revenue",
    // OUTCOME_SALES + OFFSITE_CONVERSIONS requires a Pixel with Purchase events.
    // Best used once a Pixel is connected and has recorded at least 50 events.
    metaObjective: "OUTCOME_SALES",
    metaOptimizationGoal: "OFFSITE_CONVERSIONS",
    optimizationModel: "conversion",
    revenueTracked: true,
  },
  {
    id: "app_promotion",
    label: "App Installs",
    description: "Drive downloads and in-app actions for your mobile app.",
    iconName: "Download",
    category: "growth",
    // OUTCOME_APP_PROMOTION + APP_INSTALLS is the standard ODAX app objective.
    metaObjective: "OUTCOME_APP_PROMOTION",
    metaOptimizationGoal: "APP_INSTALLS",
    optimizationModel: "app_install",
    revenueTracked: false,
  },
] as const;

export type AdSyncObjective = (typeof CAMPAIGN_OBJECTIVES)[number]["id"];

// 3. Meta Placement Options
// NOTE: Sub-placements (instagram_positions, facebook_positions) intentionally omitted.
// Meta's Andromeda ML delivers better ROI when given maximum placement freedom.
// We only restrict at the publisher_platforms level (instagram / facebook / automatic).
export const META_PLACEMENTS = [
  {
    id: "automatic",
    label: "All Placements",
    description: "Meta AI decides — best ROI",
    badge: "Recommended",
    publisherPlatforms: null, // Omit = Advantage+
  },
  {
    id: "instagram",
    label: "Instagram Only",
    description: "Feed, Stories & Reels",
    badge: null,
    publisherPlatforms: ["instagram"],
  },
  {
    id: "facebook",
    label: "Facebook Only",
    description: "Feed & Video Feeds",
    badge: null,
    publisherPlatforms: ["facebook"],
  },
] as const;

export type MetaPlacement = (typeof META_PLACEMENTS)[number]["id"];

// 3. Objective Intent Map (AI Context)
export const OBJECTIVE_INTENT_MAP = {
  whatsapp: {
    tone: "Direct, personal, conversational",
    targetingBias: "Broad + Interest intersections",
    ctaBias: "start_whatsapp_chat",
    ageModifier: { min: 0, max: 0 },
  },
  traffic: {
    tone: "Benefit-driven, click-focused, urgent",
    targetingBias: "High intent (Engaged Shoppers)",
    ctaBias: "buy_now",
    ageModifier: { min: 0, max: -5 }, // Slightly younger/tech-savvy bias
  },
  awareness: {
    tone: "Story-driven, memorable, soft-sell",
    targetingBias: "Broad Reach",
    ctaBias: "learn_more",
    ageModifier: { min: -2, max: 5 }, // Wider range
  },
  engagement: {
    tone: "Community-focused, interactive, question-based",
    targetingBias: "Interest-heavy",
    ctaBias: "learn_more",
    ageModifier: { min: 0, max: 0 },
  },
  leads: {
    tone: "Value-forward, trust-building, offer-driven",
    targetingBias: "Interest + Behaviour intersections",
    ctaBias: "sign_up",
    ageModifier: { min: 0, max: 0 },
  },
  sales: {
    tone: "Conversion-focused, urgency-driven, benefit-led",
    targetingBias: "High intent (Engaged Shoppers + Custom Audiences)",
    ctaBias: "shop_now",
    ageModifier: { min: 0, max: -5 }, // Buyer-age bias
  },
  app_promotion: {
    tone: "Feature-highlighting, action-oriented, download-focused",
    targetingBias: "Tech-savvy, mobile-heavy audience",
    ctaBias: "download",
    ageModifier: { min: -3, max: -5 }, // Younger, mobile-native bias
  },
} as const;
