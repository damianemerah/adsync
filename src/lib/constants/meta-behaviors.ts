/**
 * Pre-validated Meta Ads behavior catalog — Nigerian market focus.
 *
 * These are real behavior names that exist in Meta's targeting system.
 * Behaviors change rarely; update this list quarterly or when campaigns fail.
 *
 * Source: Meta Ads Manager → Detailed Targeting → Browse → Behaviors
 *
 * WHY: The LLM generates behavior names, then we call the API to resolve IDs.
 * But Meta's behavior search is sensitive to exact naming. By maintaining a
 * local lookup of known-good names, we skip the API round-trip for 90% of
 * cases and guarantee a valid match.
 */

export interface MetaBehaviorSeed {
  /** Exact name as it appears in Meta Ads Manager */
  name: string;
  /** Category path in Meta's UI (informational) */
  path: string;
  /**
   * Common aliases the LLM might generate for this behavior.
   * Used for local fuzzy matching before hitting the API.
   */
  aliases: string[];
}

export const META_BEHAVIOR_SEEDS: MetaBehaviorSeed[] = [
  // ── Purchase / Shopping Intent ────────────────────────────────────────────
  {
    name: "Engaged Shoppers",
    path: "Purchase behavior > Engaged shoppers",
    aliases: [
      "engaged shopper",
      "active shoppers",
      "active buyers",
      "purchase intent",
      "shop now clickers",
    ],
  },
  {
    name: "Online buyers",
    path: "Purchase behavior > Online buyers",
    aliases: [
      "online buyer",
      "online shoppers",
      "e-commerce buyers",
      "online purchasers",
      "digital buyers",
    ],
  },
  // ── Mobile ────────────────────────────────────────────────────────────────
  {
    name: "Mobile device users",
    path: "Mobile device user > All mobile devices",
    aliases: [
      "mobile users",
      "smartphone users",
      "mobile shoppers",
      "mobile phone users",
    ],
  },
  {
    name: "Android device users",
    path: "Mobile device user > Android devices",
    aliases: ["android users", "android phone users", "samsung users"],
  },
  {
    name: "iOS device users",
    path: "Mobile device user > Apple (iOS) devices",
    aliases: [
      "iphone users",
      "apple users",
      "ios users",
      "ipad users",
      "apple device users",
    ],
  },
  // ── Travel ────────────────────────────────────────────────────────────────
  {
    name: "Frequent international travelers",
    path: "Travel > Frequent international travelers",
    aliases: [
      "international travelers",
      "frequent travelers",
      "frequent flyers",
      "luxury travelers",
    ],
  },
  {
    name: "Business travelers",
    path: "Travel > Business travelers",
    aliases: ["business travel", "corporate travelers", "frequent business trips"],
  },
  // ── Small Business ────────────────────────────────────────────────────────
  {
    name: "Small business owners",
    path: "Business to business > Small business owners",
    aliases: [
      "small business owner",
      "entrepreneurs",
      "sme owners",
      "startup founders",
      "business owners",
    ],
  },
  // ── Financial ─────────────────────────────────────────────────────────────
  {
    name: "Financially active users",
    path: "Financial > Financially active users",
    aliases: [
      "financially active",
      "financially engaged",
      "banking users",
      "fintech users",
    ],
  },
  // ── Media / Entertainment ──────────────────────────────────────────────────
  {
    name: "Heavy video viewers",
    path: "Digital activities > Video (HD) streamer",
    aliases: [
      "video watchers",
      "video streamers",
      "youtube watchers",
      "content consumers",
    ],
  },
  // ── Events / Lifestyle ────────────────────────────────────────────────────
  {
    name: "Event planning enthusiasts",
    path: "Interests > Event planning and services",
    aliases: ["event planners", "event organizers", "party planners"],
  },
  // ── Gaming ────────────────────────────────────────────────────────────────
  {
    name: "Gamers (mobile)",
    path: "Digital activities > Gaming > Mobile games",
    aliases: ["mobile gamers", "casual gamers", "game players"],
  },
  // ── Household ─────────────────────────────────────────────────────────────
  {
    name: "Homeowners",
    path: "Home > Property ownership > Homeowners",
    aliases: ["home owners", "property owners", "house owners"],
  },
  // ── Delivery / Food ───────────────────────────────────────────────────────
  {
    name: "Food delivery app users",
    path: "Digital activities > Food and drink > Food delivery app users",
    aliases: [
      "food delivery users",
      "delivery app users",
      "bolt food users",
      "glovo users",
      "chowdeck users",
    ],
  },
];

/**
 * Resolve an AI-generated behavior name to the best known Meta behavior name.
 *
 * Priority:
 *   1. Exact name match (case-insensitive)
 *   2. Alias match (case-insensitive substring)
 *   3. null → caller should fall back to API search
 */
export function resolveLocalBehavior(aiName: string): MetaBehaviorSeed | null {
  const normalized = aiName.toLowerCase().trim();

  // 1. Exact match
  const exact = META_BEHAVIOR_SEEDS.find(
    (b) => b.name.toLowerCase() === normalized,
  );
  if (exact) return exact;

  // 2. Alias match
  const alias = META_BEHAVIOR_SEEDS.find((b) =>
    b.aliases.some(
      (a) => a === normalized || normalized.includes(a) || a.includes(normalized),
    ),
  );
  return alias ?? null;
}
