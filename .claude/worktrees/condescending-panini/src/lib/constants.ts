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

// ─────────────────────────────────────────────────────────────────────────────
// Platform fee configuration
// ─────────────────────────────────────────────────────────────────────────────
/** 5% platform processing fee on every ad budget top-up */
export const PLATFORM_FEE_RATE = 0.05;

// Monthly credit quotas per plan (must mirror plan_definitions DB table)
export const PLAN_CREDITS: Record<string, number> = {
  free_trial: 50,
  starter: 150,
  growth: 400,
  agency: 1200,
};

// Credits cost per AI action (mirrors credit_costs DB table)
// TEXT actions are FREE — cost is negligible (<₦1 per call)
// Image costs are tier-driven — see TIER_CONFIG below
export const CREDIT_COSTS = {
  IMAGE_GEN_PREMIUM: 8, // Nano Banana Pro (Agency only, Phase 3)
  IMAGE_GEN_PRO: 3, // FLUX 2 Pro (default for all tiers)
  IMAGE_EDIT_PRO: 2, // FLUX 2 Pro edit/refine
  TEXT_GEN: 0, // FREE — GPT copy / analysis
  VIDEO_KLING_5S: 35, // Kling v2 5s  (Phase 2)
  VIDEO_KLING_10S: 60, // Kling v2 10s (Phase 2)
  VIDEO_VEO3_5S: 42, // Veo 3.1 5s   (Phase 2)
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
    credits: { monthly: 150, imageCost: 3, premiumImageCost: null },
    limits: {
      maxOrganizations: 1,
      maxAdAccounts: 1,
      maxTeamMembers: 1,
      linkAnalyticsDays: 7,
      customLinkSlugs: false,
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
    credits: { monthly: 400, imageCost: 3, premiumImageCost: null },
    limits: {
      maxOrganizations: 3,
      maxAdAccounts: 3,
      maxTeamMembers: 3,
      linkAnalyticsDays: 30,
      customLinkSlugs: true,
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
    credits: { monthly: 1200, imageCost: 3, premiumImageCost: 8 },
    limits: {
      maxOrganizations: 999,
      maxAdAccounts: 999,
      maxTeamMembers: 10,
      linkAnalyticsDays: 36500, // "Lifetime"
      customLinkSlugs: true,
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
] as const;

export type AdSyncObjective = (typeof CAMPAIGN_OBJECTIVES)[number]["id"];

// 3. Meta Placement Options
export const META_PLACEMENTS = [
  {
    id: "automatic",
    label: "All Placements",
    description: "Meta AI decides — best ROI",
    badge: "Recommended",
    publisherPlatforms: null, // Omit = Advantage+
    positions: null,
  },
  {
    id: "instagram",
    label: "Instagram Only",
    description: "Feed, Stories & Reels",
    badge: null,
    publisherPlatforms: ["instagram"],
    positions: {
      instagram_positions: [
        "feed",
        "story",
        "reels",
        "instagram_explore",
        "shop",
      ],
    },
  },
  {
    id: "facebook",
    label: "Facebook Only",
    description: "Feed & Video Feeds",
    badge: null,
    publisherPlatforms: ["facebook"],
    positions: {
      facebook_positions: ["feed", "video_feeds", "instream_video"],
    },
  },
] as const;

export type MetaPlacement = (typeof META_PLACEMENTS)[number]["id"];

export const META_SUB_PLACEMENTS = {
  instagram: [
    { id: "feed", label: "Instagram Feed" },
    { id: "story", label: "Instagram Stories" },
    { id: "reels", label: "Instagram Reels" },
    { id: "instagram_explore", label: "Explore" },
    { id: "shop", label: "Shop" },
  ],
  facebook: [
    { id: "feed", label: "Facebook Feed" },
    { id: "video_feeds", label: "Video Feeds" },
    { id: "instream_video", label: "In-stream Video" },
  ],
} as const;

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
} as const;
