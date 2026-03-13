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
 *
 * Last validated: 2026-03-05 via validate-meta-behaviors.ts + meta-behaviors-audit.json
 */

export interface MetaBehaviorSeed {
  /** Exact name as it appears in Meta Ads Manager */
  name: string;
  /** Confirmed Meta numeric ID — populated by validate-meta-behaviors.ts. Skips API lookup when present. */
  metaId?: string;
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
    metaId: "6071631541183", // confirmed 2026-03-05
    path: "Purchase behavior > Engaged shoppers",
    aliases: [
      "engaged shopper",
      "active shoppers",
      "active buyers",
      "purchase intent",
      "shop now clickers",
      "high intent buyers",
      "premium shoppers",
      "online buyers",
      "online buyer",
      "online shoppers",
      "e-commerce buyers",
      "digital buyers",
    ],
  },
  // ── Mobile ────────────────────────────────────────────────────────────────
  {
    name: "Facebook access (mobile): all mobile devices",
    metaId: "6004382299972", // confirmed 2026-03-05
    path: "Mobile device user > All mobile devices",
    aliases: [
      "mobile device users",
      "mobile users",
      "smartphone users",
      "mobile shoppers",
      "mobile phone users",
      "all mobile users",
    ],
  },
  {
    name: "Facebook access (mobile): Android devices",
    metaId: "6004386044572", // confirmed 2026-03-05
    path: "Mobile device user > Android devices",
    aliases: ["android device users", "android users", "android phone users"],
  },
  {
    name: "Facebook access (mobile): Samsung Android mobile devices",
    metaId: "6004386010572", // confirmed 2026-03-05 (from audit rawResults)
    path: "Mobile device user > Android devices > Samsung",
    aliases: [
      "samsung users",
      "samsung android users",
      "samsung smartphone users",
      "galaxy users",
    ],
  },
  {
    name: "Facebook access (mobile): Apple (iOS) devices",
    metaId: "6004384041172", // confirmed 2026-03-05
    path: "Mobile device user > Apple (iOS) devices",
    aliases: [
      "ios device users",
      "iphone users",
      "apple users",
      "ios users",
      "ipad users",
      "apple device users",
      "premium phone users",
      "high income mobile",
      "affluent mobile users",
    ],
  },
  {
    name: "Facebook access (mobile): smartphones and tablets",
    metaId: "6004383049972", // confirmed 2026-03-05 (from audit rawResults)
    path: "Mobile device user > Smartphones and tablets",
    aliases: [
      "smartphone and tablet users",
      "mobile and tablet users",
      "all device users",
    ],
  },
  {
    name: "Facebook Lite app users",
    metaId: "6356471865383", // confirmed 2026-03-05 (from audit rawResults)
    path: "Digital activities > Facebook Lite app users",
    aliases: [
      "facebook lite users",
      "lite app users",
      "budget phone users",
      "low data users",
      "entry level smartphone users",
    ],
  },
  // ── Travel ────────────────────────────────────────────────────────────────
  {
    name: "Frequent international travelers",
    metaId: "6022788483583", // confirmed 2026-03-05
    path: "Travel > Frequent international travelers",
    aliases: [
      "international travelers",
      "frequent travelers",
      "frequent flyers",
      "luxury travelers",
      "high income travelers",
      "affluent travelers",
    ],
  },
  {
    name: "Frequent Travelers",
    metaId: "6002714895372", // confirmed 2026-03-05
    path: "Travel > Frequent travelers",
    aliases: [
      "business travelers",
      "business travel",
      "corporate travelers",
      "frequent business trips",
    ],
  },
  {
    name: "Returned from travels 1 week ago",
    metaId: "6008261969983", // confirmed 2026-03-05 (from audit rawResults)
    path: "Travel > Returned from travels 1 week ago",
    aliases: [
      "recent travelers",
      "just returned from trip",
      "back from vacation",
      "vacation returnees",
    ],
  },
  // ── Small Business / B2B ──────────────────────────────────────────────────
  {
    name: "Small business owners",
    metaId: "6002714898572", // confirmed 2026-03-05
    path: "Business to business > Small business owners",
    aliases: [
      "small business owner",
      "entrepreneurs",
      "sme owners",
      "startup founders",
      "business owners",
    ],
  },
  {
    name: "Business page admins",
    metaId: "6020530281783", // confirmed 2026-03-05 (from audit rawResults)
    path: "Business to business > Business page admins",
    aliases: [
      "facebook page admins",
      "page owners",
      "business page owners",
      "brand page managers",
    ],
  },
  {
    name: "Instagram Business Profile Admins",
    metaId: "6297846662583", // confirmed 2026-03-05 (from audit rawResults)
    path: "Business to business > Instagram Business Profile Admins",
    aliases: [
      "instagram business owners",
      "instagram page admins",
      "instagram sellers",
      "ig business admins",
    ],
  },
  {
    name: "Business Decision Makers",
    metaId: "6262428231783", // confirmed 2026-03-05 (from audit rawResults)
    path: "Business to business > Business Decision Makers",
    aliases: [
      "c-suite",
      "executives",
      "corporate users",
      "professionals",
      "decision makers",
      "corporate decision makers",
      "business leaders",
    ],
  },
  {
    name: "New Active Business (< 12 months)",
    metaId: "6273196847983", // confirmed 2026-03-05
    path: "Business > New active business < 12 months",
    aliases: [
      "new business owners",
      "recently opened business",
      "new startup",
      "brand new business",
      "just launched business",
    ],
  },
  {
    name: "New Active Business (< 24 months)",
    metaId: "6273108107383", // confirmed 2026-03-05 (from audit rawResults)
    path: "Business > New active business < 24 months",
    aliases: [
      "growing business owners",
      "young businesses",
      "businesses under 2 years",
      "early stage businesses",
    ],
  },
  {
    name: "New Active Business (< 6 months)",
    metaId: "6273108079183", // confirmed 2026-03-05 (from audit rawResults)
    path: "Business > New active business < 6 months",
    aliases: [
      "fresh business owners",
      "newly launched business",
      "brand new startup",
      "just started business",
      "new entrepreneurs",
    ],
  },
  // ── New Consumers ─────────────────────────────────────────────────────────
  {
    name: "New smartphone and tablet users",
    metaId: "6007078565383", // confirmed 2026-03-05
    path: "Digital activities > New smartphone and tablet users",
    aliases: [
      "financially active users",
      "new device users",
      "new smartphone users",
      "recently upgraded phone",
    ],
  },
  // ── Media / Entertainment ──────────────────────────────────────────────────
  // NOTE: "Video (HD) streamer" returned no_match in the 2026-03-05 audit.
  // The behavior may no longer be active in Meta's API text-search index.
  // Keeping it here for historical reference but without a metaId so it
  // falls through to an API lookup (which will also fail gracefully).
  {
    name: "Video (HD) streamer",
    // metaId intentionally omitted — no_match on 2026-03-05 audit
    path: "Digital activities > Video (HD) streamer",
    aliases: [
      "heavy video viewers",
      "video watchers",
      "video streamers",
      "youtube watchers",
      "content consumers",
    ],
  },
  // ── Events / Birthdays ────────────────────────────────────────────────────
  {
    name: "Friends of people with birthdays in a month",
    metaId: "6203620854183", // confirmed 2026-03-05
    path: "Social > Friends of people with birthdays in a month",
    aliases: [
      "event planning enthusiasts",
      "event planners",
      "event organizers",
      "party planners",
    ],
  },
  {
    name: "Friends of people with birthdays in a week",
    metaId: "6203621218383", // confirmed 2026-03-05 (from audit rawResults)
    path: "Social > Friends of people with birthdays in a week",
    aliases: [
      "upcoming birthday friends",
      "friends birthday soon",
      "gift shoppers for friends",
      "short term gift buyers",
    ],
  },
  {
    name: "Friends of Women with a Birthday in 0-7 days",
    metaId: "6203621325983", // confirmed 2026-03-05 (from audit rawResults)
    path: "Social > Friends of Women with a Birthday in 0-7 days",
    aliases: [
      "friends buying gifts for women",
      "female birthday purchase",
      "women birthday gift shoppers",
    ],
  },
  {
    name: "Friends of Men with a Birthday in 0-7 days",
    metaId: "6203621472783", // confirmed 2026-03-05 (from audit rawResults)
    path: "Social > Friends of Men with a Birthday in 0-7 days",
    aliases: [
      "friends buying gifts for men",
      "male birthday purchase",
      "men birthday gift shoppers",
    ],
  },
  {
    name: "Friends of Women with a Birthday in 7-30 days",
    metaId: "6203621025983", // confirmed 2026-03-05 (from audit rawResults)
    path: "Social > Friends of Women with a Birthday in 7-30 days",
    aliases: ["upcoming women birthday gifts", "female birthday upcoming"],
  },
  {
    name: "Friends of Men with a Birthday in 7-30 days",
    metaId: "6203621119983", // confirmed 2026-03-05 (from audit rawResults)
    path: "Social > Friends of Men with a Birthday in 7-30 days",
    aliases: ["upcoming men birthday gifts", "male birthday upcoming"],
  },
  // ── Gaming ────────────────────────────────────────────────────────────────
  {
    name: "Console gamers",
    metaId: "6007847947183", // confirmed 2026-03-05
    path: "Digital activities > Gaming > Console gamers",
    aliases: [
      "gamers (mobile)",
      "mobile gamers",
      "casual gamers",
      "game players",
      "gamers",
    ],
  },
  // ── Delivery / Food ───────────────────────────────────────────────────────
  {
    name: "Food and Restaurants",
    metaId: "6012903127583", // confirmed 2026-03-05
    path: "Interests > Food and drink",
    aliases: [
      "food delivery app users",
      "food delivery users",
      "delivery app users",
      "bolt food users",
      "glovo users",
      "chowdeck users",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LIFE EVENTS — Time-sensitive targeting (separate from behaviors in Meta API)
// These go into the `life_events` field, not `behaviors`.
// Source: Meta Ads Manager → Detailed Targeting → Browse → Life Events
// Last validated: 2026-03-05 via validate-meta-behaviors.ts + meta-behaviors-audit.json
// ─────────────────────────────────────────────────────────────────────────────

export interface MetaLifeEventSeed {
  /** Exact name as it appears in Meta Ads Manager */
  name: string;
  /** Confirmed Meta numeric ID — populated by validate-meta-behaviors.ts. Skips API lookup when present. */
  metaId?: string;
  /** Category path in Meta's UI (informational) */
  path: string;
  /**
   * Business categories or product types this life event is most relevant for.
   * Used by the AI to auto-suggest life events based on what the seller is selling.
   */
  relevantFor: string[];
  /** Common aliases the LLM might generate */
  aliases: string[];
}

export const META_LIFE_EVENT_SEEDS: MetaLifeEventSeed[] = [
  // ── Relationships ─────────────────────────────────────────────────────────
  {
    name: "New relationship",
    metaId: "6005232221572", // confirmed 2026-03-05
    path: "Life events > Relationship > New relationship",
    relevantFor: [
      "fashion",
      "beauty",
      "skincare",
      "gifts",
      "perfume",
      "accessories",
      "jewellery",
    ],
    aliases: [
      "new relationship (6 months)",
      "new relationship",
      "new couples",
      "dating",
      "new romance",
    ],
  },
  {
    name: "Newly engaged (1 year)",
    metaId: "6003050210972", // confirmed 2026-03-05
    path: "Life events > Relationship > Newly engaged (1 year)",
    relevantFor: [
      "wedding",
      "bridal",
      "gown",
      "asoebi",
      "aso-ebi",
      "lace",
      "jewellery",
      "photography",
      "catering",
      "event planning",
      "cake",
    ],
    aliases: [
      "newly engaged",
      "engaged couples",
      "engaged women",
      "bride to be",
      "bride-to-be",
      "getting married",
      "just got engaged",
    ],
  },
  {
    name: "Newly-engaged (6 months)",
    metaId: "6002714398772", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Relationship > Newly-engaged (6 months)",
    relevantFor: [
      "wedding",
      "bridal",
      "asoebi",
      "jewellery",
      "event planning",
      "photography",
    ],
    aliases: [
      "engaged (6 months)",
      "recently engaged",
      "engaged 6 months",
      "short term engagement",
    ],
  },
  {
    name: "Newly engaged (3 months)",
    metaId: "6012631862383", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Relationship > Newly engaged (3 months)",
    relevantFor: ["wedding", "bridal", "asoebi", "rings", "jewellery"],
    aliases: [
      "engaged (3 months)",
      "just got engaged recent",
      "fresh engagement",
    ],
  },
  {
    name: "Long-distance relationship",
    metaId: "6003053984972", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Relationship > Long-distance relationship",
    relevantFor: [
      "gifts",
      "delivery",
      "online shopping",
      "flowers",
      "accessories",
    ],
    aliases: [
      "long distance couple",
      "long-distance partner",
      "distant relationship",
      "remote couple",
    ],
  },
  {
    name: "Newlywed (1 year)",
    metaId: "6002714398172", // confirmed 2026-03-05
    path: "Life events > Relationship > Newlywed (1 year)",
    relevantFor: [
      "home",
      "interior design",
      "furniture",
      "kitchen",
      "appliances",
      "honeymoon",
      "travel",
      "gifts",
    ],
    aliases: [
      "newly married (1 year)",
      "newly married",
      "newlywed",
      "new couples",
      "recently married",
      "just married",
    ],
  },
  {
    name: "Newlywed (6 months)",
    metaId: "6003050226972", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Relationship > Newlywed (6 months)",
    relevantFor: ["home", "furniture", "kitchen", "appliances", "gifts"],
    aliases: [
      "newly married 6 months",
      "newlywed 6 months",
      "recently married 6 months",
    ],
  },
  {
    name: "Newlywed (3 months)",
    metaId: "6013133420583", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Relationship > Newlywed (3 months)",
    relevantFor: ["home", "furniture", "kitchen", "appliances", "gifts"],
    aliases: [
      "newly married 3 months",
      "newlywed 3 months",
      "recently married 3 months",
      "fresh marriage",
    ],
  },
  // ── Anniversaries ─────────────────────────────────────────────────────────
  {
    name: "Anniversary within 30 days",
    metaId: "6017476616183", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Relationships > Anniversary within 30 days",
    relevantFor: [
      "gifts",
      "celebration",
      "fashion",
      "accessories",
      "flowers",
      "dining",
    ],
    aliases: [
      "upcoming anniversary",
      "anniversary soon",
      "anniversary gift buyers",
      "anniversary shoppers",
    ],
  },
  {
    name: "Anniversary within 31-60 Days",
    metaId: "6018399723983", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Relationships > Anniversary within 31-60 days",
    relevantFor: ["gifts", "celebration", "fashion", "accessories"],
    aliases: [
      "anniversary next month",
      "2 month anniversary",
      "upcoming celebration",
    ],
  },
  {
    name: "Anniversary (within 61-90 days)",
    metaId: "6018413514983", // confirmed 2026-03-05
    path: "Life events > Relationships > Anniversary within 61-90 days",
    relevantFor: ["gifts", "celebration", "fashion", "accessories"],
    aliases: [
      "job anniversary (1 year)",
      "work anniversary",
      "job anniversary",
      "work milestone",
      "3 month anniversary",
    ],
  },
  // ── Family & Children ─────────────────────────────────────────────────────
  {
    name: "Parents (All)",
    metaId: "6002714398372", // confirmed 2026-03-05
    path: "Life events > Family > Parents",
    relevantFor: [
      "baby",
      "maternity",
      "antenatal",
      "pregnancy",
      "baby clothes",
      "baby shower",
      "nursing",
      "baby food",
      "diapers",
      "baby accessories",
      "childcare",
      "toys",
    ],
    aliases: ["all parents", "parents with children", "mothers", "fathers"],
  },
  {
    name: "Parents (up to 12 months)",
    metaId: "6023005372383", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Family > Parents (up to 12 months)",
    relevantFor: [
      "baby",
      "baby clothes",
      "diapers",
      "nursing",
      "baby food",
      "baby accessories",
      "maternity",
    ],
    aliases: [
      "new parents (1 year)",
      "new parents",
      "new moms",
      "new mothers",
      "new dads",
      "parents of newborns",
      "expecting parents",
      "expecting mothers",
      "pregnant women",
      "mothers to be",
    ],
  },
  {
    name: "Parents with toddlers (01-02 years)",
    metaId: "6023005458383", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Family > Parents with toddlers (01-02 years)",
    relevantFor: [
      "baby clothes",
      "baby shoes",
      "toys",
      "learning materials",
      "childcare",
    ],
    aliases: [
      "parents of toddlers",
      "toddler parents",
      "parents with 1 year old",
      "parents with 2 year old",
    ],
  },
  {
    name: "Parents with preschoolers (03-05 years)",
    metaId: "6023005529383", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Family > Parents with preschoolers (03-05 years)",
    relevantFor: [
      "kids clothes",
      "toys",
      "educational materials",
      "school supplies",
      "childcare",
    ],
    aliases: [
      "parents of preschoolers",
      "preschool parents",
      "parents with young kids",
    ],
  },
  {
    name: "Parents with early school-age children (06-08 years)",
    metaId: "6023005570783", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Family > Parents with early school-age children (06-08 years)",
    relevantFor: [
      "school supplies",
      "kids uniforms",
      "stationery",
      "educational materials",
      "extracurricular",
    ],
    aliases: [
      "primary school parents",
      "parents with school children",
      "parents of 6-8 year olds",
    ],
  },
  {
    name: "Parents with preteens (09-12 years)",
    metaId: "6023080302983", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Family > Parents with preteens (09-12 years)",
    relevantFor: [
      "school supplies",
      "electronics",
      "sports",
      "fashion",
      "games",
    ],
    aliases: ["parents of preteens", "preteen parents", "parents with tweens"],
  },
  {
    name: "Parents with teenagers (13-17 years)",
    metaId: "6023005681983", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Family > Parents with teenagers (13-17 years)",
    relevantFor: [
      "fashion",
      "electronics",
      "gadgets",
      "games",
      "sports",
      "education",
      "school uniforms",
    ],
    aliases: ["parents of teenagers", "teen parents", "parents with teens"],
  },
  {
    name: "Parents with adult children (18-26 years)",
    metaId: "6023005718983", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Family > Parents with adult children (18-26 years)",
    relevantFor: ["education", "university", "fashion", "gadgets", "gifts"],
    aliases: [
      "parents of young adults",
      "parents with adult kids",
      "parents with university students",
    ],
  },
  // ── Home ──────────────────────────────────────────────────────────────────
  {
    name: "Likely to move",
    // metaId intentionally omitted — no_match on 2026-03-05 audit
    // (search returned "Recently moved" as the closest match — use that instead)
    path: "Life events > Home > Likely to move",
    relevantFor: [
      "furniture",
      "interior design",
      "home decor",
      "appliances",
      "kitchen",
      "bedding",
      "curtains",
      "real estate",
      "cleaning",
    ],
    aliases: [
      "likely to move",
      "planning to move",
      "looking for apartment",
      "house hunting",
    ],
  },
  {
    name: "Recently moved",
    metaId: "6003054185372", // confirmed 2026-03-05
    path: "Life events > Home > Recently moved",
    relevantFor: [
      "furniture",
      "home decor",
      "moving services",
      "cleaning services",
      "appliances",
      "interior design",
    ],
    aliases: [
      "recently moved (6 months)",
      "recently moved",
      "just moved",
      "new apartment",
      "new flat",
      "relocated",
      "new homeowner (1 year)",
      "new homeowner",
      "homeowners",
      "new home",
      "moved into new house",
      "bought a house",
      "homeowner",
    ],
  },
  {
    name: "Friends of Recently Moved",
    metaId: "6203619820983", // confirmed 2026-03-05 (from audit rawResults)
    path: "Life events > Home > Friends of Recently Moved",
    relevantFor: ["housewarming gifts", "home decor", "furniture", "kitchen"],
    aliases: [
      "friends of new homeowners",
      "housewarming shoppers",
      "gift buyers for movers",
    ],
  },
  // ── Work & Career ─────────────────────────────────────────────────────────
  {
    name: "New job",
    metaId: "6005149512172", // confirmed 2026-03-05
    path: "Life events > Work > New job",
    relevantFor: [
      "fashion",
      "corporate wear",
      "suits",
      "shoes",
      "bags",
      "grooming",
      "skincare",
      "perfume",
      "laptop bags",
      "accessories",
    ],
    aliases: [
      "new job (6 months)",
      "new job",
      "started new job",
      "new employment",
      "just got a job",
      "new hire",
      "new career",
    ],
  },
];

/**
 * Resolve an AI-generated life event name to the best known Meta life event.
 *
 * Priority:
 *   1. Exact name match (case-insensitive)
 *   2. Alias match (case-insensitive substring)
 *   3. null → caller should fall back to API search
 */
export function resolveLocalLifeEvent(
  aiName: string,
): MetaLifeEventSeed | null {
  const normalized = aiName.toLowerCase().trim();

  const exact = META_LIFE_EVENT_SEEDS.find(
    (e) => e.name.toLowerCase() === normalized,
  );
  if (exact) return exact;

  const alias = META_LIFE_EVENT_SEEDS.find((e) =>
    e.aliases.some(
      (a) =>
        a === normalized || normalized.includes(a) || a.includes(normalized),
    ),
  );
  return alias ?? null;
}

/**
 * Suggest relevant life events for a given business description or category.
 * Used by the AI prompt layer to auto-inject life events when they are a strong signal.
 */
export function suggestLifeEventsForCategory(
  category: string,
): MetaLifeEventSeed[] {
  const normalized = category.toLowerCase();
  return META_LIFE_EVENT_SEEDS.filter((e) =>
    e.relevantFor.some((r) => normalized.includes(r) || r.includes(normalized)),
  );
}

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
      (a) =>
        a === normalized || normalized.includes(a) || a.includes(normalized),
    ),
  );
  return alias ?? null;
}

// ─── Catalog Serializers (for prompt injection) ───────────────────────────────

/**
 * All valid behavior names as a pipe-separated string for AI prompt injection.
 * Call this once at module load and embed in BASE_INSTRUCTION / ADS_SYSTEM_PROMPT.
 * If META_BEHAVIOR_SEEDS grows, this automatically stays in sync.
 */
export function buildBehaviorCatalogPrompt(): string {
  return META_BEHAVIOR_SEEDS.map((b) => b.name).join(" | ");
}

/**
 * All valid life event names as a pipe-separated string for AI prompt injection.
 */
export function buildLifeEventCatalogPrompt(): string {
  return META_LIFE_EVENT_SEEDS.map((e) => e.name).join(" | ");
}
