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
 *
 * See also: meta-life-events.ts — life event targeting (separate Meta API field)
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
  /**
   * Business categories or product types this behavior is most relevant for.
   * Used for category-scoped prompt injection.
   */
  relevantFor: string[];
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
    relevantFor: ["fashion", "beauty", "e-commerce", "retail", "electronics", "general"],
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
    relevantFor: ["general"],
  },
  {
    name: "Facebook access (mobile): Android devices",
    metaId: "6004386044572", // confirmed 2026-03-05
    path: "Mobile device user > Android devices",
    aliases: ["android device users", "android users", "android phone users"],
    relevantFor: ["general"],
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
    relevantFor: ["general", "electronics"],
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
    relevantFor: ["luxury", "fashion", "beauty", "electronics"],
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
    relevantFor: ["general"],
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
    relevantFor: ["general"],
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
    relevantFor: ["travel", "luxury", "fashion", "accessories"],
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
    relevantFor: ["travel", "b2b", "luxury"],
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
    relevantFor: ["travel", "fashion", "gifts"],
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
    relevantFor: ["b2b", "entrepreneurship", "digital marketing", "e-commerce"],
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
    relevantFor: ["b2b", "digital marketing", "e-commerce"],
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
    relevantFor: ["b2b", "digital marketing", "fashion", "beauty"],
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
    relevantFor: ["b2b", "luxury", "real estate", "finance"],
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
    relevantFor: ["b2b", "entrepreneurship", "e-commerce"],
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
    relevantFor: ["b2b", "entrepreneurship", "e-commerce"],
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
    relevantFor: ["b2b", "entrepreneurship", "e-commerce"],
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
    relevantFor: ["electronics", "general"],
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
    relevantFor: ["entertainment", "electronics", "general"],
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
    relevantFor: ["gaming", "electronics", "entertainment"],
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
    relevantFor: ["food", "restaurants", "catering", "delivery"],
  },


  // ── Discovered via browse API (2026-03-31) ────────────────────────────────
  {
    name: "Anniversary within 30 days",
    metaId: "6017476616183", // discovered 2026-03-31
    path: "Demographics > Life events > Anniversary",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Anniversary within 31-60 Days",
    metaId: "6018399723983", // discovered 2026-03-31
    path: "Demographics > Life events > Anniversary",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Away from family",
    metaId: "6003053857372", // discovered 2026-03-31
    path: "Demographics > Life events",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Away from hometown",
    metaId: "6003053860372", // discovered 2026-03-31
    path: "Demographics > Life events",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Birthday in April",
    metaId: "6048026275783", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Birthday in August",
    metaId: "6048810966183", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Birthday in December",
    metaId: "6048810914583", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Birthday in February",
    metaId: "6049083267183", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Birthday in January",
    metaId: "6048267235783", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Birthday in July",
    metaId: "6048808449583", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Birthday in June",
    metaId: "6048026229983", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Birthday in March",
    metaId: "6048026294583", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Birthday in May",
    metaId: "6048026061783", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Birthday in November",
    metaId: "6048810938183", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Birthday in October",
    metaId: "6048810950583", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Birthday in September",
    metaId: "6048810961183", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Upcoming birthday",
    metaId: "6002737124172", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Long-distance relationship",
    metaId: "6003053984972", // discovered 2026-03-31
    path: "Demographics > Life events",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "New job",
    metaId: "6005149512172", // discovered 2026-03-31
    path: "Demographics > Life events",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "New relationship",
    metaId: "6005232221572", // discovered 2026-03-31
    path: "Demographics > Life events",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Newly engaged (1 year)",
    metaId: "6003050210972", // discovered 2026-03-31
    path: "Demographics > Life events",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Newly engaged (3 months)",
    metaId: "6012631862383", // discovered 2026-03-31
    path: "Demographics > Life events",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Newly-engaged (6 months)",
    metaId: "6002714398772", // discovered 2026-03-31
    path: "Demographics > Life events",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Newlywed (1 year)",
    metaId: "6002714398172", // discovered 2026-03-31
    path: "Demographics > Life events",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Newlywed (3 months)",
    metaId: "6013133420583", // discovered 2026-03-31
    path: "Demographics > Life events",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Newlywed (6 months)",
    metaId: "6003050226972", // discovered 2026-03-31
    path: "Demographics > Life events",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Recently moved",
    metaId: "6003054185372", // discovered 2026-03-31
    path: "Demographics > Life events",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Parents (All)",
    metaId: "6002714398372", // discovered 2026-03-31
    path: "Demographics > Parents > All parents",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Parents (up to 12 months)",
    metaId: "6023005372383", // discovered 2026-03-31
    path: "Demographics > Parents > All parents",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Parents with adult children (18-26 years) ",
    metaId: "6023005718983", // discovered 2026-03-31
    path: "Demographics > Parents > All parents",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Parents with early school-age children (06-08 years) ",
    metaId: "6023005570783", // discovered 2026-03-31
    path: "Demographics > Parents > All parents",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Parents with preschoolers (03-05 years) ",
    metaId: "6023005529383", // discovered 2026-03-31
    path: "Demographics > Parents > All parents",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Parents with preteens (09-12 years)",
    metaId: "6023080302983", // discovered 2026-03-31
    path: "Demographics > Parents > All parents",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Parents with teenagers (13-17 years)",
    metaId: "6023005681983", // discovered 2026-03-31
    path: "Demographics > Parents > All parents",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Parents with toddlers (01-02 years) ",
    metaId: "6023005458383", // discovered 2026-03-31
    path: "Demographics > Parents > All parents",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Civil Union",
    metaId: "7", // discovered 2026-03-31
    path: "Demographics > Relationship > Relationship status",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Complicated",
    metaId: "10", // discovered 2026-03-31
    path: "Demographics > Relationship > Relationship status",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Divorced",
    metaId: "12", // discovered 2026-03-31
    path: "Demographics > Relationship > Relationship status",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Domestic Partnership",
    metaId: "8", // discovered 2026-03-31
    path: "Demographics > Relationship > Relationship status",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Engaged",
    metaId: "4", // discovered 2026-03-31
    path: "Demographics > Relationship > Relationship status",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "In a relationship",
    metaId: "2", // discovered 2026-03-31
    path: "Demographics > Relationship > Relationship status",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Married",
    metaId: "3", // discovered 2026-03-31
    path: "Demographics > Relationship > Relationship status",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Open Relationship",
    metaId: "9", // discovered 2026-03-31
    path: "Demographics > Relationship > Relationship status",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Separated",
    metaId: "11", // discovered 2026-03-31
    path: "Demographics > Relationship > Relationship status",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Single",
    metaId: "1", // discovered 2026-03-31
    path: "Demographics > Relationship > Relationship status",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Unspecified",
    metaId: "6", // discovered 2026-03-31
    path: "Demographics > Relationship > Relationship status",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Widowed",
    metaId: "13", // discovered 2026-03-31
    path: "Demographics > Relationship > Relationship status",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Advertising (marketing)",
    metaId: "6003584163107", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Agriculture (industry)",
    metaId: "6003840140052", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Architecture (architecture)",
    metaId: "6004140335706", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Aviation (air travel)",
    metaId: "6002963523717", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Investment banking (banking)",
    metaId: "6003063638807", // discovered 2026-03-31
    path: "Interests > Business and industry > Banking (finance)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Online banking (banking)",
    metaId: "6003466585319", // discovered 2026-03-31
    path: "Interests > Business and industry > Banking (finance)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Retail banking (banking)",
    metaId: "6003062205328", // discovered 2026-03-31
    path: "Interests > Business and industry > Banking (finance)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Business (business & finance)",
    metaId: "6003402305839", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Construction (industry)",
    metaId: "6003395414271", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Fashion design (design)",
    metaId: "6003266266843", // discovered 2026-03-31
    path: "Interests > Business and industry > Design (design)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Graphic design (visual art)",
    metaId: "6003096002658", // discovered 2026-03-31
    path: "Interests > Business and industry > Design (design)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Interior design (design)",
    metaId: "6002920953955", // discovered 2026-03-31
    path: "Interests > Business and industry > Design (design)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Economics (economics)",
    metaId: "6003656112304", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Engineering (science)",
    metaId: "6003252179711", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Entrepreneurship (business & finance)",
    metaId: "6003371567474", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Higher education (education)",
    metaId: "6003270811593", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Management (business & finance)",
    metaId: "6004037932409", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Marketing (business & finance)",
    metaId: "6003279598823", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Digital marketing (marketing)",
    metaId: "6003127206524", // discovered 2026-03-31
    path: "Interests > Business and industry > Online (computing)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Email marketing (marketing)",
    metaId: "6003076016339", // discovered 2026-03-31
    path: "Interests > Business and industry > Online (computing)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Online advertising (marketing)",
    metaId: "6003526234370", // discovered 2026-03-31
    path: "Interests > Business and industry > Online (computing)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Search engine optimization (software)",
    metaId: "6003370636074", // discovered 2026-03-31
    path: "Interests > Business and industry > Online (computing)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Social media (online media)",
    metaId: "6004030160948", // discovered 2026-03-31
    path: "Interests > Business and industry > Online (computing)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Social media marketing (marketing)",
    metaId: "6003389760112", // discovered 2026-03-31
    path: "Interests > Business and industry > Online (computing)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Web design (websites)",
    metaId: "6003402518839", // discovered 2026-03-31
    path: "Interests > Business and industry > Online (computing)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Web development (websites)",
    metaId: "6003290005325", // discovered 2026-03-31
    path: "Interests > Business and industry > Online (computing)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Web hosting (computing)",
    metaId: "6003387418453", // discovered 2026-03-31
    path: "Interests > Business and industry > Online (computing)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Credit cards (credit & lending)",
    metaId: "6003369782940", // discovered 2026-03-31
    path: "Interests > Business and industry > Personal finance (banking)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Insurance (business & finance)",
    metaId: "6003217093576", // discovered 2026-03-31
    path: "Interests > Business and industry > Personal finance (banking)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Investment (business & finance)",
    metaId: "6003388314512", // discovered 2026-03-31
    path: "Interests > Business and industry > Personal finance (banking)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Mortgage loans (banking)",
    metaId: "6003141785766", // discovered 2026-03-31
    path: "Interests > Business and industry > Personal finance (banking)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Real estate (industry)",
    metaId: "6003578086487", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Retail (industry)",
    metaId: "6003778400853", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Sales (business & finance)",
    metaId: "6003074954515", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Science (science)",
    metaId: "6002866718622", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Small business (business & finance)",
    metaId: "6002884511422", // discovered 2026-03-31
    path: "Interests > Business and industry",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Action games (video games)",
    metaId: "6002971095994", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Board games (games)",
    metaId: "6003342470823", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Browser games (video games)",
    metaId: "6003434373937", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Card games (games)",
    metaId: "6003647522546", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Casino games (gambling)",
    metaId: "6003248338072", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "First-person shooter games (video games)",
    metaId: "6003059733932", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: [],
    relevantFor: ["entertainment", "gaming", "events", "b2b"],
  },
  {
    name: "Gambling (gambling)",
    metaId: "6003012317397", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: ["betting", "wagering", "gamble", "casino", "luck"],
    relevantFor: ["gaming", "entertainment", "events"],
  },
  {
    name: "Massively multiplayer online games (video games)",
    metaId: "6003176101552", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: ["mmo games", "multiplayer games", "online gaming", "virtual worlds", "team games"],
    relevantFor: ["gaming", "entertainment", "events"],
  },
  {
    name: "Massively multiplayer online role-playing games (video games)",
    metaId: "6003198370967", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: ["mmorpg", "role-play games", "fantasy games", "character games", "adventure games"],
    relevantFor: ["gaming", "entertainment", "events"],
  },
  {
    name: "Online games (video games)",
    metaId: "6003153672865", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: ["web games", "internet games", "play online", "digital games", "virtual games"],
    relevantFor: ["entertainment", "gaming", "events", "b2b"],
  },
  {
    name: "Online poker (gambling)",
    metaId: "6003030519207", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: ["online betting", "poker games", "card games", "poker", "gamble online"],
    relevantFor: ["gaming", "entertainment", "education"],
  },
  {
    name: "Puzzle video games (video games)",
    metaId: "6003668975718", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: ["puzzle games", "brain games", "logic games", "mind games", "challenge games"],
    relevantFor: ["gaming", "entertainment", "events"],
  },
  {
    name: "Racing games (video game)",
    metaId: "6003385141743", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: ["racing video games", "car games", "speed games", "driving games", "track games"],
    relevantFor: ["gaming", "entertainment", "events"],
  },
  {
    name: "Role-playing games (video games)",
    metaId: "6003380576181", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: ["rpg games", "character play", "story games", "fantasy role-play", "adventure role-play"],
    relevantFor: ["gaming", "entertainment", "education"],
  },
  {
    name: "Simulation games (video games)",
    metaId: "6003246168013", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: ["sim games", "simulation play", "virtual life games", "life simulation", "role simulation"],
    relevantFor: ["gaming", "entertainment", "events"],
  },
  {
    name: "Sports games (video games)",
    metaId: "6003540150873", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: ["sports video games", "athletic games", "team sports games", "competition games", "sports simulation"],
    relevantFor: [],
  },
  {
    name: "Strategy games (games)",
    metaId: "6003582500438", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Video games (gaming)",
    metaId: "6003940339466", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Word games (games)",
    metaId: "6002964500317", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Games (leisure)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Ballet (dance)",
    metaId: "6003247127613", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Live events (entertainment)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Bars (bars, clubs & nightlife)",
    metaId: "6003156321008", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Live events (entertainment)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Concerts (music event)",
    metaId: "6002970406974", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Live events (entertainment)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Dancehalls (music)",
    metaId: "6003247890613", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Live events (entertainment)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Music festivals (events)",
    metaId: "6003108826384", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Live events (entertainment)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Nightclubs (bars, clubs & nightlife)",
    metaId: "6003361714600", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Live events (entertainment)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Parties (event)",
    metaId: "6003147868152", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Live events (entertainment)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Plays (performing arts)",
    metaId: "6003417378239", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Live events (entertainment)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Theatre (performing arts)",
    metaId: "6002957026250", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Live events (entertainment)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Action movies (movies)",
    metaId: "6003243604899", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Movies (entertainment & media)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Animated movies (movies)",
    metaId: "6003129926917", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Movies (entertainment & media)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Anime movies (movies)",
    metaId: "6003605717820", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Movies (entertainment & media)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Bollywood movies (movies)",
    metaId: "6003157824284", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Movies (entertainment & media)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Comedy movies (movies)",
    metaId: "6003161475030", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Movies (entertainment & media)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Documentary movies (movies)",
    metaId: "6003373175581", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Movies (entertainment & media)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Drama movies (movies)",
    metaId: "6003375422677", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Movies (entertainment & media)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Horror movies (movies)",
    metaId: "6003656922020", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Movies (entertainment & media)",
    aliases: [],
    relevantFor: ["events", "entertainment", "performing arts"],
  },
  {
    name: "Musical theatre (performing arts)",
    metaId: "6003351312828", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Movies (entertainment & media)",
    aliases: ["musical theatre", "stage performance", "theatre arts"],
    relevantFor: ["entertainment", "movies", "media"],
  },
  {
    name: "Science fiction movies (movies)",
    metaId: "6003206308286", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Movies (entertainment & media)",
    aliases: ["sci-fi movies", "science fiction films", "futuristic movies"],
    relevantFor: ["entertainment", "movies", "media"],
  },
  {
    name: "Thriller movies (movies)",
    metaId: "6003225325061", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Movies (entertainment & media)",
    aliases: ["thriller films", "suspense movies", "action thrillers"],
    relevantFor: ["music", "entertainment", "events"],
  },
  {
    name: "Blues music (music)",
    metaId: "6003257757682", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Music (entertainment & media)",
    aliases: ["blues", "blues genre", "blues music lovers"],
    relevantFor: ["music", "events", "entertainment"],
  },
  {
    name: "Classical music (music)",
    metaId: "6002951587955", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Music (entertainment & media)",
    aliases: ["classical", "orchestral music", "classical genre"],
    relevantFor: ["music", "entertainment", "events"],
  },
  {
    name: "Country music (music)",
    metaId: "6003493980595", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Music (entertainment & media)",
    aliases: ["country", "country genre", "country music fans"],
    relevantFor: ["music", "events", "entertainment"],
  },
  {
    name: "Dance music (music)",
    metaId: "6003179515414", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Music (entertainment & media)",
    aliases: ["dance", "dance tracks", "party music"],
    relevantFor: ["music", "events", "entertainment"],
  },
  {
    name: "Electronic music (music)",
    metaId: "6003902397066", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Music (entertainment & media)",
    aliases: ["electronic", "electronic beats", "edm"],
    relevantFor: ["music", "entertainment", "events"],
  },
  {
    name: "Heavy metal music (music)",
    metaId: "6003633122583", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Music (entertainment & media)",
    aliases: ["heavy metal", "metal music", "metal genre"],
    relevantFor: ["music", "entertainment", "events"],
  },
  {
    name: "Hip hop music (music)",
    metaId: "6003225556345", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Music (entertainment & media)",
    aliases: ["hip hop", "rap music", "hip hop genre"],
    relevantFor: [],
  },
  {
    name: "Jazz music (music)",
    metaId: "6003146442552", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Music (entertainment & media)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Music videos (entertainment & media)",
    metaId: "6003332483177", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Music (entertainment & media)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Pop music (music)",
    metaId: "6003341579196", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Music (entertainment & media)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Rhythm and blues music (music)",
    metaId: "6003195554098", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Music (entertainment & media)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Rock music (music)",
    metaId: "6003582732907", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Music (entertainment & media)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Soul music (music)",
    metaId: "6003107699532", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Music (entertainment & media)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Books (publications)",
    metaId: "6003462707303", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Reading (communication)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Comics (comics & cartoons)",
    metaId: "6003126215349", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Reading (communication)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "E-books (publications)",
    metaId: "6003074487739", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Reading (communication)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Fiction books (publications)",
    metaId: "6003274262708", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Reading (communication)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Literature (publications)",
    metaId: "6003247790075", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Reading (communication)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Magazines (publications)",
    metaId: "6003206216430", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Reading (communication)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Manga (anime & manga)",
    metaId: "6003083357650", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Reading (communication)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Mystery fiction (entertainment & media)",
    metaId: "6002986104968", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Reading (communication)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Newspapers (publications)",
    metaId: "6004043913548", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Reading (communication)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Non-fiction books (publications)",
    metaId: "6003420644631", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Reading (communication)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Romance novels (publications)",
    metaId: "6003210799924", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > Reading (communication)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "TV game shows (television show)",
    metaId: "6003126358188", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > TV (movies & television)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "TV reality shows (movies & television)",
    metaId: "6003268182136", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > TV (movies & television)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "TV talkshows (television show)",
    metaId: "6003172448161", // discovered 2026-03-31
    path: "Interests > Entertainment (leisure) > TV (movies & television)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Family (social concept)",
    metaId: "6003476182657", // discovered 2026-03-31
    path: "Interests > Family and relationships",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Fatherhood (children & parenting)",
    metaId: "6003101323797", // discovered 2026-03-31
    path: "Interests > Family and relationships",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Friendship (relationships)",
    metaId: "6004100985609", // discovered 2026-03-31
    path: "Interests > Family and relationships",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Marriage (weddings)",
    metaId: "6003445506042", // discovered 2026-03-31
    path: "Interests > Family and relationships",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Motherhood (children & parenting)",
    metaId: "6002991239659", // discovered 2026-03-31
    path: "Interests > Family and relationships",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Parenting (children & parenting)",
    metaId: "6003232518610", // discovered 2026-03-31
    path: "Interests > Family and relationships",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Weddings (weddings)",
    metaId: "6003409392877", // discovered 2026-03-31
    path: "Interests > Family and relationships",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Bodybuilding (sport)",
    metaId: "6003648059946", // discovered 2026-03-31
    path: "Interests > Fitness and wellness (fitness)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Physical exercise (fitness)",
    metaId: "6004115167424", // discovered 2026-03-31
    path: "Interests > Fitness and wellness (fitness)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Physical fitness (fitness)",
    metaId: "6003277229371", // discovered 2026-03-31
    path: "Interests > Fitness and wellness (fitness)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Running (sport)",
    metaId: "6003397496347", // discovered 2026-03-31
    path: "Interests > Fitness and wellness (fitness)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Weight training (weightlifting)",
    metaId: "6003473077165", // discovered 2026-03-31
    path: "Interests > Fitness and wellness (fitness)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Yoga (fitness)",
    metaId: "6003306084421", // discovered 2026-03-31
    path: "Interests > Fitness and wellness (fitness)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Beer (alcoholic drinks)",
    metaId: "6003012461997", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Alcoholic beverages (food & drink)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Distilled beverage (liquor)",
    metaId: "6003146729229", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Alcoholic beverages (food & drink)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Wine (alcoholic drinks)",
    metaId: "6003148544265", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Alcoholic beverages (food & drink)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Coffee (food & drink)",
    metaId: "6003626773307", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Beverages (food & drink)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Energy drinks (nonalcoholic beverage)",
    metaId: "6003392512725", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Beverages (food & drink)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Juice (nonalcoholic beverage)",
    metaId: "6003703931713", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Beverages (food & drink)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Soft drinks (nonalcoholic beverage)",
    metaId: "6002936693259", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Beverages (food & drink)",
    aliases: [],
    relevantFor: ["food", "beverages", "health"],
  },
  {
    name: "Tea (nonalcoholic beverage)",
    metaId: "6003491283786", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Beverages (food & drink)",
    aliases: ["tea", "nonalcoholic drink", "herbal drink"],
    relevantFor: ["food", "cooking", "events"],
  },
  {
    name: "Baking (cooking)",
    metaId: "6003134986700", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cooking (food & drink)",
    aliases: ["baking", "cake making", "pastry"],
    relevantFor: ["food", "cooking", "events"],
  },
  {
    name: "Recipes (food & drink)",
    metaId: "6003385609165", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cooking (food & drink)",
    aliases: ["cooking recipes", "food ideas", "meal prep"],
    relevantFor: ["food", "cuisine", "restaurants"],
  },
  {
    name: "Chinese cuisine (food & drink)",
    metaId: "6003030029655", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["chinese food", "asian cuisine", "chinese dishes"],
    relevantFor: ["food", "cuisine", "restaurants"],
  },
  {
    name: "French cuisine (food & drink)",
    metaId: "6003420024431", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["french food", "french dishes", "cuisine francaise"],
    relevantFor: ["food", "cuisine", "restaurants"],
  },
  {
    name: "German cuisine (food & drink)",
    metaId: "6004094205989", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["german food", "german dishes", "deutsche küche"],
    relevantFor: ["food", "cuisine", "restaurants"],
  },
  {
    name: "Greek cuisine (food & drink)",
    metaId: "6003306415421", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["greek food", "greek dishes", "hellenic cuisine"],
    relevantFor: ["food", "cuisine", "restaurants"],
  },
  {
    name: "Indian cuisine (food & drink)",
    metaId: "6003494675627", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["indian food", "indian dishes", "curry"],
    relevantFor: ["food", "cuisine", "restaurants"],
  },
  {
    name: "Italian cuisine (food & drink)",
    metaId: "6003102729234", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["italian food", "italian dishes", "pasta"],
    relevantFor: ["food", "cuisine", "restaurants"],
  },
  {
    name: "Japanese cuisine (food & drink)",
    metaId: "6002998123892", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["japanese food", "sushi", "japanese dishes"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Korean cuisine (food & drink)",
    metaId: "6003343485089", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["korean food", "korean dishes", "korean meals"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Latin American cuisine (food & drink)",
    metaId: "6003102988840", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["latin food", "latino cuisine", "latin dishes"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Mexican cuisine (food & drink)",
    metaId: "6002964239317", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["mexican food", "mexican dishes", "tacos"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Middle Eastern cuisine (food & drink)",
    metaId: "6003200340482", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["middle eastern food", "arabic cuisine", "middle eastern dishes"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Spanish cuisine (food & drink)",
    metaId: "6003108649035", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["spanish food", "spanish dishes", "tapas"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Thai cuisine (food & drink)",
    metaId: "6003283801502", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["thai food", "thai dishes", "thai meals"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Vietnamese cuisine (food & drink)",
    metaId: "6003346311730", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Cuisine (food & drink)",
    aliases: ["vietnamese food", "vietnamese dishes", "pho"],
    relevantFor: ["food", "catering", "events"],
  },
  {
    name: "Barbecue (cooking)",
    metaId: "6003435096731", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Food (food & drink)",
    aliases: ["bbq", "barbecue", "grilling"],
    relevantFor: ["food", "confectionery", "events"],
  },
  {
    name: "Chocolate (food & drink)",
    metaId: "6003133978408", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Food (food & drink)",
    aliases: ["chocolate treats", "chocolate desserts", "chocolate snacks"],
    relevantFor: ["food", "bakeries", "events"],
  },
  {
    name: "Desserts (food & drink)",
    metaId: "6003125948045", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Food (food & drink)",
    aliases: ["sweets", "dessert items", "dessert dishes"],
    relevantFor: [],
  },
  {
    name: "Fast food (food & drink)",
    metaId: "6004037400009", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Food (food & drink)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Organic food (food & drink)",
    metaId: "6002868910910", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Food (food & drink)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Pizza (food & drink)",
    metaId: "6003668857118", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Food (food & drink)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Seafood (food & drink)",
    metaId: "6003240742699", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Food (food & drink)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Veganism (diets)",
    metaId: "6003641846820", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Food (food & drink)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Vegetarianism (diets)",
    metaId: "6003155333705", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Food (food & drink)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Coffeehouses (coffee)",
    metaId: "6003120620858", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Restaurants (dining)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Diners (restaurant)",
    metaId: "6003243058188", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Restaurants (dining)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Fast casual restaurants (restaurant)",
    metaId: "6003398056603", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Restaurants (dining)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Fast food restaurants (dining)",
    metaId: "6003372667195", // discovered 2026-03-31
    path: "Interests > Food and drink (consumables) > Restaurants (dining)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Acting (performing arts)",
    metaId: "6002925538921", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Arts and music (art)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Crafts (hobbies)",
    metaId: "6003105618835", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Arts and music (art)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Dance (art)",
    metaId: "6003423342191", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Arts and music (art)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Drawing (visual art)",
    metaId: "6003780025252", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Arts and music (art)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Drums (instruments)",
    metaId: "6003387633593", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Arts and music (art)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Fine art (visual art)",
    metaId: "6003194056672", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Arts and music (art)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Guitar (instruments)",
    metaId: "6003302121228", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Arts and music (art)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Painting (visual art)",
    metaId: "6003142974961", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Arts and music (art)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Performing arts (performing arts)",
    metaId: "6003154043305", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Arts and music (art)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Photography (visual art)",
    metaId: "6003899195666", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Arts and music (art)",
    aliases: [],
    relevantFor: ["art", "home", "events"],
  },
  {
    name: "Sculpture (art)",
    metaId: "6003717247746", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Arts and music (art)",
    aliases: ["art sculpture", "sculpting", "artistic sculpture"],
    relevantFor: ["music", "events", "general"],
  },
  {
    name: "Singing (music)",
    metaId: "6002997799844", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Arts and music (art)",
    aliases: ["music singing", "vocal performance", "singing talent"],
    relevantFor: ["writing", "education", "general"],
  },
  {
    name: "Writing (communication)",
    metaId: "6003586608473", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Arts and music (art)",
    aliases: ["creative writing", "writing skills", "storytelling"],
    relevantFor: ["media", "education", "general"],
  },
  {
    name: "Current events (politics)",
    metaId: "6003290811111", // discovered 2026-03-31
    path: "Interests > Hobbies and activities",
    aliases: ["politics news", "current affairs", "news updates"],
    relevantFor: ["home", "crafts", "events"],
  },
  {
    name: "Do it yourself (DIY)",
    metaId: "6003470511564", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Home and garden",
    aliases: ["diy projects", "home crafts", "handmade"],
    relevantFor: ["home", "furniture", "interior design"],
  },
  {
    name: "Furniture (home furnishings)",
    metaId: "6003132926214", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Home and garden",
    aliases: ["home furniture", "furnishings", "interior decor"],
    relevantFor: ["home", "gardening", "lifestyle"],
  },
  {
    name: "Gardening (outdoor activities)",
    metaId: "6003053056644", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Home and garden",
    aliases: ["gardening tips", "plant care", "outdoor gardening"],
    relevantFor: ["home", "electronics", "consumer goods"],
  },
  {
    name: "Home Appliances (consumer electronics)",
    metaId: "6003343997689", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Home and garden",
    aliases: ["home appliances", "kitchen gadgets", "electronics"],
    relevantFor: ["home", "construction", "interior design"],
  },
  {
    name: "Home improvement (home & garden)",
    metaId: "6003234413249", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Home and garden",
    aliases: ["home renovation", "improvement projects", "remodeling"],
    relevantFor: ["pets", "animals", "hobbies"],
  },
  {
    name: "Birds (animals)",
    metaId: "6003286289697", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Pets (animals)",
    aliases: ["pet birds", "bird care", "avian pets"],
    relevantFor: [],
  },
  {
    name: "Cats (animals)",
    metaId: "6003159378782", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Pets (animals)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Dogs (animals)",
    metaId: "6003332344237", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Pets (animals)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Fish (animals)",
    metaId: "6003159413034", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Pets (animals)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Horses (animals)",
    metaId: "6003416777039", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Pets (animals)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Pet food (pet supplies)",
    metaId: "6003461162225", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Pets (animals)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Rabbits (animals)",
    metaId: "6003108411433", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Pets (animals)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Reptiles (animals)",
    metaId: "6003382151137", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Pets (animals)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Adventure travel (travel & tourism)",
    metaId: "6002868021822", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Travel (travel & tourism)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Air travel (transportation)",
    metaId: "6003211401886", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Travel (travel & tourism)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Beaches (places)",
    metaId: "6003431201869", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Travel (travel & tourism)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Car rentals (transportation)",
    metaId: "6003090714101", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Travel (travel & tourism)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Cruises (travel & tourism business)",
    metaId: "6003225930699", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Travel (travel & tourism)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Ecotourism (travel & tourism)",
    metaId: "6003059385128", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Travel (travel & tourism)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Hotels (lodging)",
    metaId: "6003572379887", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Travel (travel & tourism)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lakes (body of water)",
    metaId: "6003430600057", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Travel (travel & tourism)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Mountains (places)",
    metaId: "6003064649070", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Travel (travel & tourism)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Nature (science)",
    metaId: "6003359996821", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Travel (travel & tourism)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Theme parks (leisure)",
    metaId: "6003902462066", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Travel (travel & tourism)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Tourism (industry)",
    metaId: "6003430696269", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Travel (travel & tourism)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Vacations (social concept)",
    metaId: "6002926108721", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Travel (travel & tourism)",
    aliases: [],
    relevantFor: ["automotive", "transportation", "b2b", "events"],
  },
  {
    name: "Automobiles (vehicles)",
    metaId: "6003176678152", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Vehicles (transportation)",
    aliases: ["cars", "autos", "vehicles", "motors", "wheels"],
    relevantFor: ["recreation", "travel", "events", "b2b"],
  },
  {
    name: "Boats (watercraft)",
    metaId: "6004037107009", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Vehicles (transportation)",
    aliases: ["yachts", "ships", "watercraft", "boats", "marine"],
    relevantFor: ["automotive", "technology", "sustainability", "b2b"],
  },
  {
    name: "Electric vehicle (vehicle)",
    metaId: "6003125064949", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Vehicles (transportation)",
    aliases: ["evs", "electric cars", "green vehicles", "eco cars", "sustainable transport"],
    relevantFor: ["automotive", "technology", "sustainability", "b2b"],
  },
  {
    name: "Hybrids (vehicle)",
    metaId: "6003717914546", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Vehicles (transportation)",
    aliases: ["hybrid cars", "eco-friendly vehicles", "dual fuel", "green cars", "sustainable vehicles"],
    relevantFor: ["automotive", "family", "transportation", "events"],
  },
  {
    name: "Minivans (vehicle)",
    metaId: "6003207605030", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Vehicles (transportation)",
    aliases: ["family vans", "people carriers", "minibuses", "family vehicles", "vans"],
    relevantFor: ["automotive", "recreation", "transportation", "events"],
  },
  {
    name: "Motorcycles (vehicles)",
    metaId: "6003353550130", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Vehicles (transportation)",
    aliases: ["bikes", "motorbikes", "two-wheelers", "scooters", "cycles"],
    relevantFor: ["recreation", "travel", "events", "b2b"],
  },
  {
    name: "RVs (vehicle)",
    metaId: "6003394580331", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Vehicles (transportation)",
    aliases: ["campers", "caravans", "mobile homes", "travel trailers", "road trips"],
    relevantFor: ["automotive", "recreation", "transportation", "events"],
  },
  {
    name: "SUVs (vehicles)",
    metaId: "6003304473660", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Vehicles (transportation)",
    aliases: ["sport utility vehicles", "4x4s", "off-road vehicles", "suvs", "crossovers"],
    relevantFor: ["automotive", "recreation", "transportation", "events"],
  },
  {
    name: "Scooters (vehicle)",
    metaId: "6003446055283", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Vehicles (transportation)",
    aliases: ["mopeds", "electric scooters", "two-wheelers", "scooters", "light vehicles"],
    relevantFor: ["automotive", "b2b", "transportation", "logistics"],
  },
  {
    name: "Trucks (vehicles)",
    metaId: "6003092882217", // discovered 2026-03-31
    path: "Interests > Hobbies and activities > Vehicles (transportation)",
    aliases: ["lorries", "heavy vehicles", "trucks", "freight vehicles", "commercial vehicles"],
    relevantFor: [],
  },
  {
    name: "Beauty salons (cosmetics)",
    metaId: "6003088846792", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Beauty (social concept)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Cosmetics (personal care)",
    metaId: "6002839660079", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Beauty (social concept)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Fragrances (cosmetics)",
    metaId: "6003443805331", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Beauty (social concept)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Hair products (hair care)",
    metaId: "6003456330903", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Beauty (social concept)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Spas (personal care)",
    metaId: "6003254590688", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Beauty (social concept)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Tattoos (body art)",
    metaId: "6003025268985", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Beauty (social concept)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Children's clothing (apparel)",
    metaId: "6003415393053", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Clothing (apparel)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Men's clothing (apparel)",
    metaId: "6011994253127", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Clothing (apparel)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Shoes (footwear)",
    metaId: "6003348453981", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Clothing (apparel)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Women's clothing (apparel)",
    metaId: "6011366104268", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Clothing (apparel)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Dresses (apparel)",
    metaId: "6003188355978", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Fashion accessories (accessories)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Handbags (accessories)",
    metaId: "6003198476967", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Fashion accessories (accessories)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Jewelry (apparel)",
    metaId: "6003266225248", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Fashion accessories (accessories)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Sunglasses (eyewear)",
    metaId: "6003255640088", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Fashion accessories (accessories)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Boutiques (retailers)",
    metaId: "6003103108917", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Shopping (retail)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Coupons (coupons & discounts)",
    metaId: "6003054884732", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Shopping (retail)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Discount stores (retail)",
    metaId: "6003220634758", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Shopping (retail)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Luxury goods (retail)",
    metaId: "6007828099136", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Shopping (retail)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Online shopping (retail)",
    metaId: "6003346592981", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Shopping (retail)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Shopping malls (retail)",
    metaId: "6003390752144", // discovered 2026-03-31
    path: "Interests > Shopping and fashion > Shopping (retail)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Toys (toys)",
    metaId: "6003070122382", // discovered 2026-03-31
    path: "Interests > Shopping and fashion",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Boating (outdoors activities)",
    metaId: "6003122958658", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Outdoor recreation (outdoors activities)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Camping (outdoors activities)",
    metaId: "6003348662930", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Outdoor recreation (outdoors activities)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Fishing (outdoors activities)",
    metaId: "6002979499920", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Outdoor recreation (outdoors activities)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Horseback riding (horse sport)",
    metaId: "6003779859852", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Outdoor recreation (outdoors activities)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Hunting (sport)",
    metaId: "6003106813190", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Outdoor recreation (outdoors activities)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Mountain biking (cycling)",
    metaId: "6003092330156", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Outdoor recreation (outdoors activities)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Surfing (water sport)",
    metaId: "6002984573619", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Outdoor recreation (outdoors activities)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "American football (sport)",
    metaId: "6003376089674", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Association football (Soccer)",
    metaId: "6003107902433", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Auto racing (motor sports)",
    metaId: "6003146718552", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Baseball (sport)",
    metaId: "6003087413192", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Basketball (sport)",
    metaId: "6003369240775", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "College football (college sports)",
    metaId: "6003162931434", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Golf (sport)",
    metaId: "6003510075864", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Marathons (running event)",
    metaId: "6003424404140", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Skiing (skiing & snowboarding)",
    metaId: "6003324287371", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Snowboarding (skiing & snowboarding)",
    metaId: "6003512053894", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Swimming (water sport)",
    metaId: "6003166397215", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Tennis (sport)",
    metaId: "6003397425735", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: [],
    relevantFor: ["fitness", "events", "sports"],
  },
  {
    name: "Triathlons (athletics)",
    metaId: "6003351764757", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: ["triathlon", "athletic events", "endurance sports"],
    relevantFor: ["fitness", "events", "sports"],
  },
  {
    name: "Volleyball (sport)",
    metaId: "6002929380259", // discovered 2026-03-31
    path: "Interests > Sports and outdoors > Sports (sports)",
    aliases: ["volley", "beach volleyball", "court sport"],
    relevantFor: ["electronics", "technology", "b2b"],
  },
  {
    name: "Computer memory (computer hardware)",
    metaId: "6003349175527", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Computers (computers & electronics)",
    aliases: ["ram", "memory chips", "computer memory"],
    relevantFor: ["electronics", "technology", "b2b"],
  },
  {
    name: "Computer monitors (computer hardware)",
    metaId: "6003116038942", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Computers (computers & electronics)",
    aliases: ["monitors", "displays", "screen"],
    relevantFor: ["electronics", "technology", "b2b"],
  },
  {
    name: "Computer processors (computer hardware)",
    metaId: "6003142705949", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Computers (computers & electronics)",
    aliases: ["cpus", "processors", "computer chips"],
    relevantFor: ["electronics", "technology", "b2b"],
  },
  {
    name: "Computer servers (computing)",
    metaId: "6003151951349", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Computers (computers & electronics)",
    aliases: ["servers", "data servers", "server hardware"],
    relevantFor: ["electronics", "technology", "b2b"],
  },
  {
    name: "Desktop computers (consumer electronics)",
    metaId: "6003115804542", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Computers (computers & electronics)",
    aliases: ["desktops", "pc", "personal computers"],
    relevantFor: ["technology", "software", "b2b"],
  },
  {
    name: "Free software (software)",
    metaId: "6003423416540", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Computers (computers & electronics)",
    aliases: ["open source", "free apps", "free tools"],
    relevantFor: ["electronics", "technology", "b2b"],
  },
  {
    name: "Hard drives (computer hardware)",
    metaId: "6003629266583", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Computers (computers & electronics)",
    aliases: ["storage drives", "data storage", "disk drives"],
    relevantFor: ["electronics", "technology", "b2b"],
  },
  {
    name: "Network storage (computers & electronics)",
    metaId: "6003656296104", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Computers (computers & electronics)",
    aliases: ["network drives", "storage solutions", "data storage"],
    relevantFor: ["b2b", "electronics", "software", "education", "general"],
  },
  {
    name: "Software (computers & electronics)",
    metaId: "6005609368513", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Computers (computers & electronics)",
    aliases: ["software", "computers", "tech", "electronics", "it"],
    relevantFor: ["electronics", "education", "b2b", "general", "technology"],
  },
  {
    name: "Tablet computers (computers & electronics)",
    metaId: "6002960574320", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Computers (computers & electronics)",
    aliases: ["tablets", "tablet pcs", "mobile tablets", "electronics", "gadgets"],
    relevantFor: ["music", "electronics", "events", "general", "entertainment"],
  },
  {
    name: "Audio equipment (electronics)",
    metaId: "6003729124262", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Consumer electronics (computers & electronics)",
    aliases: ["audio gear", "sound equipment", "speakers", "headphones", "music gear"],
    relevantFor: ["events", "media", "electronics", "photography", "general"],
  },
  {
    name: "Camcorders (consumer electronics)",
    metaId: "6002998517244", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Consumer electronics (computers & electronics)",
    aliases: ["video cameras", "camcorders", "filming equipment", "recorders", "video gear"],
    relevantFor: ["photography", "electronics", "events", "media", "general"],
  },
  {
    name: "Cameras (photography)",
    metaId: "6003325186571", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Consumer electronics (computers & electronics)",
    aliases: ["cameras", "photo gear", "dslr", "photography", "camera equipment"],
    relevantFor: ["education", "electronics", "b2b", "general", "technology"],
  },
  {
    name: "E-book readers (consumer electronics)",
    metaId: "6008832464480", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Consumer electronics (computers & electronics)",
    aliases: ["e-readers", "ebook devices", "digital readers", "reading gadgets", "ebooks"],
    relevantFor: ["travel", "electronics", "transportation", "general", "technology"],
  },
  {
    name: "GPS devices (consumer electronics)",
    metaId: "6003280676501", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Consumer electronics (computers & electronics)",
    aliases: ["gps", "navigation devices", "location trackers", "gps gadgets", "mapping devices"],
    relevantFor: ["electronics", "b2b", "general", "communication", "technology"],
  },
  {
    name: "Mobile phones (smart phone)",
    metaId: "6002971085794", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Consumer electronics (computers & electronics)",
    aliases: ["smartphones", "mobile devices", "cell phones", "phones", "mobile gadgets"],
    relevantFor: ["music", "electronics", "entertainment", "events", "general"],
  },
  {
    name: "Portable media players (audio equipment)",
    metaId: "6003381994165", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Consumer electronics (computers & electronics)",
    aliases: ["media players", "portable players", "mp3 players", "audio devices", "music players"],
    relevantFor: ["events", "education", "b2b", "electronics", "general"],
  },
  {
    name: "Projectors (consumer electronics)",
    metaId: "6003288647527", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Consumer electronics (computers & electronics)",
    aliases: ["projectors", "video projectors", "presentation tools", "display devices", "projecting equipment"],
    relevantFor: [],
  },
  {
    name: "Smartphones (consumer electronics)",
    metaId: "6003289911338", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Consumer electronics (computers & electronics)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Televisions (consumer electronics)",
    metaId: "6003224441249", // discovered 2026-03-31
    path: "Interests > Technology (computers & electronics) > Consumer electronics (computers & electronics)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Anniversary (within 61-90 days)",
    metaId: "6018413514983", // discovered 2026-03-31
    path: "Behaviors > Anniversary",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Recently Detected Devices",
    metaId: "6320095608983", // discovered 2026-03-31
    path: "Behaviors >  Mobile Device User >   All Mobile Devices by Operating System >   Facebook access (mobile)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Recently Detected Iphone 14 Devices",
    metaId: "6320095650783", // discovered 2026-03-31
    path: "Behaviors >  Mobile Device User >   All Mobile Devices by Operating System >  Facebook access (mobile)",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People who prefer high-value goods in Argentina",
    metaId: "6086326072983", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Argentina",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People who prefer mid and high-value goods in Argentina",
    metaId: "6086326078383", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Argentina",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People in Brazil who prefer mid and high-value goods",
    metaId: "6110813675983", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Brazil",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People who prefer high-value goods in Brazil",
    metaId: "6046096201583", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Brazil",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People who prefer high-value goods in Chile",
    metaId: "6086326043983", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Chile",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People who prefer mid and high-value goods in Chile",
    metaId: "6086326068183", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Chile",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People who prefer mid and high-value goods in India",
    metaId: "6028974351183", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > India",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People who prefer high-value goods in India",
    metaId: "6028974370383", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > India",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People  in Indonesia who prefer mid and high-value goods",
    metaId: "6110446593183", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Indonesia",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People who prefer high-value goods in Indonesia",
    metaId: "6092145447383", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Indonesia",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People who prefer high-value goods in Kingdom of Saudi Arabia",
    metaId: "6082317392983", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Kingdom of Saudi Arabia",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People who prefer mid and high-value goods in Kingdom of Saudi Arabia",
    metaId: "6082317405583", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Kingdom of Saudi Arabia",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People who prefer high-value goods in Malaysia",
    metaId: "6100407132383", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Malaysia",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People who prefer mid and high-value goods in Malaysia",
    metaId: "6100407234583", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Malaysia",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "People who prefer high-value goods in Mexico",
    metaId: "6085888747383", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Mexico",
    aliases: [],
    relevantFor: ["fashion", "electronics", "luxury goods", "home", "automotive"],
  },
  {
    name: "People who prefer mid and high-value goods in Mexico",
    metaId: "6085888777383", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Mexico",
    aliases: ["mid-high buyers", "value shoppers", "premium consumers"],
    relevantFor: ["fashion", "electronics", "luxury goods", "travel", "real estate"],
  },
  {
    name: "People who prefer high-value goods in Pakistan",
    metaId: "6100406737783", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Pakistan",
    aliases: ["high-value shoppers", "premium buyers", "luxury consumers"],
    relevantFor: ["fashion", "electronics", "luxury goods", "home", "automotive"],
  },
  {
    name: "People who prefer mid and high-value goods in Pakistan",
    metaId: "6100407062383", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Pakistan",
    aliases: ["mid-high value shoppers", "value-conscious buyers", "premium goods lovers"],
    relevantFor: ["fashion", "electronics", "luxury goods", "travel", "real estate"],
  },
  {
    name: "People who prefer high-value goods in Philippines",
    metaId: "6110633547383", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Philippines",
    aliases: ["high-value consumers", "premium shoppers", "luxury buyers"],
    relevantFor: ["fashion", "electronics", "luxury goods", "home", "automotive"],
  },
  {
    name: "People who prefer mid and high-value goods in Philippines",
    metaId: "6110636171983", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Philippines",
    aliases: ["mid-high value consumers", "value shoppers", "premium buyers"],
    relevantFor: ["fashion", "electronics", "luxury goods", "travel", "real estate"],
  },
  {
    name: "People who prefer high-value goods in South Africa",
    metaId: "6046095968983", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > South Africa",
    aliases: ["high-value buyers", "premium shoppers", "luxury consumers"],
    relevantFor: ["fashion", "electronics", "luxury goods", "home", "automotive"],
  },
  {
    name: "People who prefer mid and high-value goods in South Africa",
    metaId: "6046096047583", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > South Africa",
    aliases: ["mid-high value buyers", "value-conscious consumers", "premium goods shoppers"],
    relevantFor: ["fashion", "electronics", "luxury goods", "travel", "real estate"],
  },
  {
    name: "People who prefer high-value goods in Turkey",
    metaId: "6089632523783", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Turkey",
    aliases: ["high-value shoppers", "premium consumers", "luxury buyers"],
    relevantFor: ["fashion", "electronics", "luxury goods", "home", "automotive"],
  },
  {
    name: "People who prefer mid and high-value goods in Turkey",
    metaId: "6089632452783", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > Turkey",
    aliases: ["mid-high value consumers", "value shoppers", "premium buyers"],
    relevantFor: ["fashion", "electronics", "luxury goods", "travel", "real estate"],
  },
  {
    name: "People who prefer high-value goods in UAE",
    metaId: "6082317210583", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > UAE",
    aliases: ["high-value buyers", "premium shoppers", "luxury consumers"],
    relevantFor: ["fashion", "electronics", "jewelry", "automotive", "real estate"],
  },
  {
    name: "People who prefer mid and high-value goods in UAE",
    metaId: "6082317378383", // discovered 2026-03-31
    path: "Behaviors > Consumer Classification > UAE",
    aliases: ["high spenders", "premium buyers", "luxury shoppers"],
    relevantFor: ["retail", "e-commerce", "b2b", "services"],
  },
  {
    name: "Shops admins",
    metaId: "6377178995383", // discovered 2026-03-31
    path: "Behaviors > Digital Activities",
    aliases: ["store managers", "shop owners", "retail admins"],
    relevantFor: ["software", "gaming", "technology", "education"],
  },
  {
    name: "Facebook access (OS): Windows 10",
    metaId: "6029587661983", // discovered 2026-03-31
    path: "Behaviors > Digital activities >  Operating System Used",
    aliases: ["windows users", "pc users", "desktop access"],
    relevantFor: ["entertainment", "media", "fashion", "beauty"],
  },
  {
    name: "All creators",
    metaId: "6378518542983", // discovered 2026-03-31
    path: "Behaviors > Digital activities",
    aliases: ["content creators", "influencers", "digital artists"],
    relevantFor: ["gaming", "entertainment", "technology"],
  },
  {
    name: "Played Canvas games (last 14 days)",
    metaId: "6019221046583", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Canvas Gaming",
    aliases: ["recent gamers", "canvas players", "active gamers"],
    relevantFor: ["gaming", "entertainment", "technology"],
  },
  {
    name: "Played Canvas games (last 3 days)",
    metaId: "6019246164583", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Canvas Gaming",
    aliases: ["daily gamers", "frequent players", "active canvas users"],
    relevantFor: ["gaming", "entertainment", "technology"],
  },
  {
    name: "Played Canvas games (last 7 days)",
    metaId: "6019221038183", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Canvas Gaming",
    aliases: ["weekly gamers", "canvas enthusiasts", "active players"],
    relevantFor: ["gaming", "entertainment", "technology"],
  },
  {
    name: "Played Canvas games (yesterday)",
    metaId: "6019221024783", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Canvas Gaming",
    aliases: ["yesterday's players", "recent canvas gamers", "active yesterday"],
    relevantFor: ["e-commerce", "services", "technology"],
  },
  {
    name: "Facebook Payments users (30 days)",
    metaId: "6004948896972", // discovered 2026-03-31
    path: "Behaviors > Digital activities",
    aliases: ["recent payers", "payment users", "facebook buyers"],
    relevantFor: ["e-commerce", "services", "technology"],
  },
  {
    name: "Facebook Payments users (90 days)",
    metaId: "6002764392172", // discovered 2026-03-31
    path: "Behaviors > Digital activities",
    aliases: ["long-term payers", "frequent users", "loyal customers"],
    relevantFor: ["general", "b2b", "electronics"],
  },
  {
    name: "Facebook access: older devices and OS",
    metaId: "6004854404172", // discovered 2026-03-31
    path: "Behaviors > Digital activities",
    aliases: ["old devices", "legacy os", "outdated tech"],
    relevantFor: ["events", "general", "community"],
  },
  {
    name: "Community & Club page admins",
    metaId: "6020530280983", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Facebook page admins",
    aliases: ["club admins", "community leaders", "group managers"],
    relevantFor: ["general", "b2b", "events"],
  },
  {
    name: "Facebook Page admins",
    metaId: "6015683810783", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Facebook page admins",
    aliases: ["page managers", "facebook admins", "social media managers"],
    relevantFor: ["food", "restaurants", "events"],
  },
  {
    name: "Food & Restaurant page admins",
    metaId: "6020530269183", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Facebook page admins",
    aliases: ["restaurant admins", "food page managers", "dining page admins"],
    relevantFor: ["beauty", "health", "general"],
  },
  {
    name: "Health & Beauty page admins ",
    metaId: "6020568271383", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Facebook page admins",
    aliases: ["beauty page admins", "health page managers", "cosmetics admins"],
    relevantFor: ["general", "b2b", "events"],
  },
  {
    name: "New Page Admins",
    metaId: "6041891177783", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Facebook page admins",
    aliases: ["new admins", "fresh page managers", "beginner admins"],
    relevantFor: ["retail", "fashion", "general"],
  },
  {
    name: "Retail page admins",
    metaId: "6020530250383", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Facebook page admins",
    aliases: ["retail admins", "store page managers", "shop admins"],
    relevantFor: ["sports", "events", "fitness"],
  },
  {
    name: "Sports page admins",
    metaId: "6020530156983", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Facebook page admins",
    aliases: ["sports admins", "athletics page managers", "fitness page admins"],
    relevantFor: ["travel", "tourism", "events"],
  },
  {
    name: "Travel & Tourism page admins",
    metaId: "6020530139383", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Facebook page admins",
    aliases: ["travel admins", "tourism page managers", "vacation page admins"],
    relevantFor: ["food", "events", "general"],
  },
  {
    name: "Food and drink creators",
    metaId: "6377407066783", // discovered 2026-03-31
    path: "Behaviors > Digital activities",
    aliases: ["food creators", "drink influencers", "culinary creators"],
    relevantFor: ["health", "fitness", "beauty", "lifestyle"],
  },
  {
    name: "Health and wellness creators",
    metaId: "6377407134383", // discovered 2026-03-31
    path: "Behaviors > Digital activities",
    aliases: ["health creators", "wellness influencers", "fitness creators"],
    relevantFor: ["technology", "b2b", "education", "general"],
  },
  {
    name: "Facebook access (browser): Chrome",
    metaId: "6015547900583", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Internet Browser Used",
    aliases: ["chrome users", "chrome access", "using chrome"],
    relevantFor: ["technology", "b2b", "education", "general"],
  },
  {
    name: "Facebook access (browser): Firefox",
    metaId: "6015547847583", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Internet Browser Used",
    aliases: ["firefox users", "firefox access", "using firefox"],
    relevantFor: ["technology", "b2b", "education", "general"],
  },
  {
    name: "Facebook access (browser): Internet Explorer",
    metaId: "6015593776783", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Internet Browser Used",
    aliases: ["ie users", "internet explorer access", "using ie"],
    relevantFor: ["technology", "b2b", "education", "general"],
  },
  {
    name: "Facebook access (browser): Microsoft Edge",
    metaId: "6055133998183", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Internet Browser Used",
    aliases: ["edge users", "microsoft edge access", "using edge"],
    relevantFor: ["technology", "b2b", "education", "general"],
  },
  {
    name: "Facebook access (browser): Opera",
    metaId: "6015593652183", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Internet Browser Used",
    aliases: ["opera users", "opera access", "using opera"],
    relevantFor: ["technology", "b2b", "education", "general"],
  },
  {
    name: "Facebook access (browser): Safari",
    metaId: "6015593608983", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Internet Browser Used",
    aliases: ["safari users", "safari access", "using safari"],
    relevantFor: ["entertainment", "lifestyle", "fashion", "beauty"],
  },
  {
    name: "Internet personality creators",
    metaId: "6378552460983", // discovered 2026-03-31
    path: "Behaviors > Digital activities",
    aliases: ["internet personalities", "online creators", "digital influencers"],
    relevantFor: ["technology", "b2b", "education", "general"],
  },
  {
    name: "Facebook access (OS): Mac OS X",
    metaId: "6003966451572", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Operating System Used",
    aliases: ["mac users", "mac access", "using mac"],
    relevantFor: ["technology", "b2b", "education", "general"],
  },
  {
    name: "Facebook access (OS): Mac Sierra",
    metaId: "6063268655983", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Operating System Used",
    aliases: ["mac sierra users", "mac sierra access", "using mac sierra"],
    relevantFor: ["technology", "b2b", "education"],
  },
  {
    name: "Facebook access (OS): Windows 7",
    metaId: "6003986707172", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Operating System Used",
    aliases: ["windows 7 users", "win 7 access", "fb on win 7"],
    relevantFor: ["technology", "b2b", "education"],
  },
  {
    name: "Facebook access (OS): Windows 8",
    metaId: "6006298077772", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Operating System Used",
    aliases: ["windows 8 users", "win 8 access", "fb on win 8"],
    relevantFor: ["technology", "b2b", "education"],
  },
  {
    name: "Facebook access (OS): Windows Vista",
    metaId: "6003966450972", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Operating System Used",
    aliases: ["windows vista users", "win vista access", "fb on vista"],
    relevantFor: ["technology", "b2b", "education"],
  },
  {
    name: "Facebook access (OS): Windows XP",
    metaId: "6003966466972", // discovered 2026-03-31
    path: "Behaviors > Digital activities > Operating System Used",
    aliases: ["windows xp users", "win xp access", "fb on xp"],
    relevantFor: ["gaming", "entertainment", "events"],
  },
  {
    name: "People who have visited Facebook Gaming",
    metaId: "6202657388783", // discovered 2026-03-31
    path: "Behaviors > Digital activities",
    aliases: ["gaming enthusiasts", "fb gaming visitors", "gaming fans"],
    relevantFor: ["technology", "electronics", "b2b"],
  },
  {
    name: "Technology early adopters",
    metaId: "6003808923172", // discovered 2026-03-31
    path: "Behaviors > Digital activities",
    aliases: ["tech trendsetters", "early tech adopters", "tech innovators"],
    relevantFor: ["travel", "lifestyle", "events"],
  },
  {
    name: "Travel and outdoors creators",
    metaId: "6377406843183", // discovered 2026-03-31
    path: "Behaviors > Digital activities",
    aliases: ["travel creators", "outdoors influencers", "travel bloggers"],
    relevantFor: ["music", "entertainment", "events"],
  },
  {
    name: "Music creators",
    metaId: "6378532690183", // discovered 2026-03-31
    path: "Behaviors > Digital activitiesTeam",
    aliases: ["music influencers", "music creators", "musicians"],
    relevantFor: ["travel", "lifestyle", "b2b"],
  },
  {
    name: " Lived in Brazil (Formerly Expats - Brazil)",
    metaId: "6019564340583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["brazil expats", "former brazil residents", "brazilian expats"],
    relevantFor: ["travel", "lifestyle", "b2b"],
  },
  {
    name: "Family of those who live abroad",
    metaId: "6025753961783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["families abroad", "relatives of expats", "expat families"],
    relevantFor: ["travel", "education", "b2b"],
  },
  {
    name: "Friends of those who live abroad",
    metaId: "6203619967383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["friends abroad", "expat friends", "foreign pals"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Algeria (Formerly Expats - Algeria)",
    metaId: "6071248932383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["algerian expats", "algeria residents", "algeria returnees"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Argentina (Formerly Expats - Argentina)",
    metaId: "6025000826583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["argentinian expats", "argentina residents", "argentina returnees"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Australia (Formerly Expats - Australia)",
    metaId: "6021354857783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["australian expats", "australia residents", "australia returnees"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Austria (Formerly Expats - Austria)",
    metaId: "6023675997383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["austrian expats", "austria residents", "austria returnees"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Bangladesh (Formerly Expats - Bangladesh)",
    metaId: "6023356562783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["bangladeshi expats", "bangladesh residents", "bangladesh returnees"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Belgium (Formerly Expats - Belgium)",
    metaId: "6043702804583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["belgian expats", "belgium residents", "belgium returnees"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Cameroon (Formerly Expats - Cameroon)",
    metaId: "6018797036783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["cameroonian expats", "cameroon residents", "cameroon returnees"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Canada (Formerly Expats - Canada)",
    metaId: "6019396764183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["canadian expats", "canada residents", "canada returnees"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Chile (Formerly Expats - Chile)",
    metaId: "6025054896983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["chilean expats", "chile residents", "chile returnees"],
    relevantFor: ["travel", "education", "b2b"],
  },
  {
    name: "Lived in China (Formerly Expats - China)",
    metaId: "6019452369983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["china expats", "expats in china", "chinese expats"],
    relevantFor: ["travel", "education", "b2b"],
  },
  {
    name: "Lived in Colombia (Formerly Expats - Colombia)",
    metaId: "6019673525983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["colombia expats", "expats in colombia", "colombian expats"],
    relevantFor: ["travel", "education", "b2b"],
  },
  {
    name: "Lived in Congo DRC (Formerly Expats - Congo DRC)",
    metaId: "6023516373983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["congo expats", "expats in congo", "congolese expats"],
    relevantFor: ["travel", "education", "b2b"],
  },
  {
    name: "Lived in Cuba (Formerly Expats - Cuba)",
    metaId: "6018797127383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["cuba expats", "expats in cuba", "cuban expats"],
    relevantFor: ["travel", "education", "b2b"],
  },
  {
    name: "Lived in Cyprus (Formerly Expats - Cyprus)",
    metaId: "6023676002183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["cyprus expats", "expats in cyprus", "cypriot expats"],
    relevantFor: ["travel", "education", "b2b"],
  },
  {
    name: "Lived in Czech Republic (Formerly Expats - Czech Republic)",
    metaId: "6023287438783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["czech expats", "expats in czech", "czech expats"],
    relevantFor: ["travel", "education", "b2b"],
  },
  {
    name: "Lived in Denmark (Formerly Expats - Denmark)",
    metaId: "6023287455983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["denmark expats", "expats in denmark", "danish expats"],
    relevantFor: ["travel", "education", "b2b"],
  },
  {
    name: "Lived in Dominican Republic (Formerly Expats - Dominican Republic)",
    metaId: "6019673762183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["dominican expats", "expats in dominican", "dominican expats"],
    relevantFor: ["travel", "education", "b2b"],
  },
  {
    name: "Lived in El Salvador (Formerly Expats - El Salvador)",
    metaId: "6019673777983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["el salvador expats", "expats in el salvador", "salvadoran expats"],
    relevantFor: ["travel", "education", "b2b"],
  },
  {
    name: "Lived in Estonia (Formerly Expats - Estonia)",
    metaId: "6023287351383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["estonia expats", "expats in estonia", "estonian expats"],
    relevantFor: [],
  },
  {
    name: "Lived in Ethiopia (Formerly Expats - Ethiopia)",
    metaId: "6018797165983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in Finland (Formerly Expats - Finland)",
    metaId: "6068209522983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in France (Formerly Expats - France)",
    metaId: "6019367014383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in Germany (Formerly Expats - Germany)",
    metaId: "6019367052983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in Ghana (Formerly Expats - Ghana)",
    metaId: "6019673448383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in Greece (Formerly Expats - Greece)",
    metaId: "6023676017583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in Guatemala (Formerly Expats - Guatemala)",
    metaId: "6019673808383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in Haiti (Formerly Expats - Haiti)",
    metaId: "6018797373783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in Honduras (Formerly Expats - Honduras)",
    metaId: "6059793664583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in Hong Kong (Formerly Expats - Hong Kong)",
    metaId: "6023676022783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Hungary (Formerly Expats - Hungary)",
    metaId: "6019396638383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["hungary expats", "hungarian residents", "expats in hungary"],
    relevantFor: ["food", "fashion", "education"],
  },
  {
    name: "Lived in India (Formerly Expats - India)",
    metaId: "6016916298983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["india expats", "indian residents", "expats in india"],
    relevantFor: ["travel", "events", "b2b"],
  },
  {
    name: "Lived in Indonesia (Formerly Expats - Indonesia)",
    metaId: "6019564344583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["indonesia expats", "indonesian residents", "expats in indonesia"],
    relevantFor: ["real estate", "travel", "education"],
  },
  {
    name: "Lived in Ireland (Formerly Expats - Ireland)",
    metaId: "6019396650783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["ireland expats", "irish residents", "expats in ireland"],
    relevantFor: ["technology", "b2b", "events"],
  },
  {
    name: "Lived in Israel (Formerly Expats - Israel)",
    metaId: "6025000823583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["israel expats", "israeli residents", "expats in israel"],
    relevantFor: ["fashion", "travel", "food"],
  },
  {
    name: "Lived in Italy (Formerly Expats - Italy)",
    metaId: "6019396654583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["italy expats", "italian residents", "expats in italy"],
    relevantFor: ["food", "events", "b2b"],
  },
  {
    name: "Lived in Ivory Coast (Formerly Expats - Ivory Coast)",
    metaId: "6023422105983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["ivory coast expats", "ivory coast residents", "expats in ivory coast"],
    relevantFor: ["travel", "music", "events"],
  },
  {
    name: "Lived in Jamaica (Formerly Expats - Jamaica)",
    metaId: "6023356956983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["jamaica expats", "jamaican residents", "expats in jamaica"],
    relevantFor: ["technology", "fashion", "food"],
  },
  {
    name: "Lived in Japan (Formerly Expats - Japan)",
    metaId: "6023676028783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["japan expats", "japanese residents", "expats in japan"],
    relevantFor: ["travel", "events", "b2b"],
  },
  {
    name: "Lived in Jordan (Formerly Expats - Jordan)",
    metaId: "6068843912183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["jordan expats", "jordanian residents", "expats in jordan"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Kenya (Formerly Expats - Kenya)",
    metaId: "6018796980983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["kenya expats", "kenya residents", "kenya movers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Kuwait (Formerly Expats - Kuwait)",
    metaId: "6071248981583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["kuwait expats", "kuwait residents", "kuwait movers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Latvia (Formerly Expats - Latvia)",
    metaId: "6068613839383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["latvia expats", "latvia residents", "latvia movers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Lebanon (Formerly Expats - Lebanon)",
    metaId: "6068844014183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["lebanon expats", "lebanon residents", "lebanon movers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Lithuania (Formerly Expats - Lithuania)",
    metaId: "6023676039183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["lithuania expats", "lithuania residents", "lithuania movers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Luxembourg (Formerly Expats - Luxembourg)",
    metaId: "6023676044383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["luxembourg expats", "luxembourg residents", "luxembourg movers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Malaysia (Formerly Expats - Malaysia)",
    metaId: "6027147160983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["malaysia expats", "malaysia residents", "malaysia movers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Malta (Formerly Expats - Malta)",
    metaId: "6023676045583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["malta expats", "malta residents", "malta movers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Mexico (Formerly Expats - Mexico)",
    metaId: "6023676072183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["mexico expats", "mexico residents", "mexico movers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Monaco (Formerly Expats - Monaco)",
    metaId: "6023676048183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["monaco expats", "monaco residents", "monaco movers"],
    relevantFor: ["travel", "real estate", "cultural exchange", "food", "events"],
  },
  {
    name: "Lived in Morocco (Formerly Expats - Morocco)",
    metaId: "6023516338783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["morocco expats", "morocco residents", "morocco locals"],
    relevantFor: ["travel", "real estate", "cultural exchange", "food", "events"],
  },
  {
    name: "Lived in Nepal (Formerly Expats - Nepal)",
    metaId: "6023356955383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["nepal expats", "nepal residents", "nepal locals"],
    relevantFor: ["travel", "real estate", "cultural exchange", "food", "events"],
  },
  {
    name: "Lived in Netherlands (Formerly Expats - Netherlands)",
    metaId: "6023287393783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["netherlands expats", "netherlands residents", "netherlands locals"],
    relevantFor: ["travel", "real estate", "cultural exchange", "food", "events"],
  },
  {
    name: "Lived in New Zealand (Formerly Expats - New Zealand)",
    metaId: "6023516368383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["new zealand expats", "new zealand residents", "new zealand locals"],
    relevantFor: ["travel", "real estate", "cultural exchange", "food", "events"],
  },
  {
    name: "Lived in Nicaragua (Formerly Expats - Nicaragua)",
    metaId: "6071248894383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["nicaragua expats", "nicaragua residents", "nicaragua locals"],
    relevantFor: ["travel", "real estate", "cultural exchange", "food", "events"],
  },
  {
    name: "Lived in Nigeria (Formerly Expats - Nigeria)",
    metaId: "6018797004183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["nigeria expats", "nigeria residents", "nigeria locals"],
    relevantFor: ["travel", "real estate", "cultural exchange", "food", "events"],
  },
  {
    name: "Lived in Norway (Formerly Expats - Norway)",
    metaId: "6023287459983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["norway expats", "norway residents", "norway locals"],
    relevantFor: ["travel", "real estate", "cultural exchange", "food", "events"],
  },
  {
    name: "Lived in Peru (Formerly Expats - Peru)",
    metaId: "6027149008183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["peru expats", "peru residents", "peru locals"],
    relevantFor: ["travel", "real estate", "cultural exchange", "food", "events"],
  },
  {
    name: "Lived in Philippines (Formerly Expats - Philippines)",
    metaId: "6018797091183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["philippines expats", "philippines residents", "philippines locals"],
    relevantFor: ["travel", "real estate", "cultural exchange", "food", "events"],
  },
  {
    name: "Lived in Poland (Formerly Expats - Poland)",
    metaId: "6019396657183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["poland expats", "poland residents", "poland locals"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Portugal (Formerly Expats - Portugal)",
    metaId: "6021354882783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["portugal expats", "portugal residents", "portugal dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Puerto Rico (Formerly Expats - Puerto Rico)",
    metaId: "6019520122583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["puerto rico expats", "puerto rico residents", "puerto rico dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Qatar (Formerly Expats - Qatar)",
    metaId: "6071249058983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["qatar expats", "qatar residents", "qatar dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Romania (Formerly Expats - Romania)",
    metaId: "6027148962983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["romania expats", "romania residents", "romania dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Russia (Formerly Expats - Russia)",
    metaId: "6025000815983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["russia expats", "russia residents", "russia dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Rwanda (Formerly Expats - Rwanda)",
    metaId: "6025670492783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["rwanda expats", "rwanda residents", "rwanda dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Saudi Arabia (Formerly Expats - Saudi Arabia)",
    metaId: "6025000813183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["saudi arabia expats", "saudi arabia residents", "saudi arabia dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Senegal (Formerly Expats - Senegal)",
    metaId: "6023357000583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["senegal expats", "senegal residents", "senegal dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Serbia (Formerly Expats - Serbia)",
    metaId: "6027149004983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["serbia expats", "serbia residents", "serbia dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Sierra Leone (Formerly Expats - Sierra Leone)",
    metaId: "6023356986383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["sierra leone expats", "sierra leone residents", "sierra leone dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Singapore (Formerly Expats - Singapore)",
    metaId: "6023516403783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["singapore expats", "singaporean residents", "singapore dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Slovakia (Formerly Expats - Slovakia)",
    metaId: "6023676055383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["slovakia expats", "slovak residents", "slovak dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Slovenia (Formerly Expats - Slovenia)",
    metaId: "6023676060183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["slovenia expats", "slovenian residents", "slovenian dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in South Africa (Formerly Expats - South Africa)",
    metaId: "6019564383383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["south africa expats", "south african residents", "south african dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in South Korea (Formerly Expats - South Korea)",
    metaId: "6027148973583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["south korea expats", "south korean residents", "korean dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Spain (Formerly Expats - Spain)",
    metaId: "6019366943583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["spain expats", "spanish residents", "spanish dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Sri Lanka (Formerly Expats - Sri Lanka)",
    metaId: "6023516315983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["sri lanka expats", "sri lankan residents", "sri lankan dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Sweden (Formerly Expats - Sweden)",
    metaId: "6023287397383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["sweden expats", "swedish residents", "swedish dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Switzerland (Formerly Expats - Switzerland)",
    metaId: "6019377644783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["switzerland expats", "swiss residents", "swiss dwellers"],
    relevantFor: ["travel", "real estate", "b2b"],
  },
  {
    name: "Lived in Tanzania (Formerly Expats - Tanzania)",
    metaId: "6023356926183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: ["tanzania expats", "tanzanian residents", "tanzanian dwellers"],
    relevantFor: [],
  },
  {
    name: "Lived in Thailand (Formerly Expats - Thailand)",
    metaId: "6023356966183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in UAE (Formerly Expats - UAE)",
    metaId: "6023516430783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in UK (Formerly Expats - UK)",
    metaId: "6021354152983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in Uganda (Formerly Expats - Uganda)",
    metaId: "6019673501783", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in United States (Formerly Expats - United States)",
    metaId: "6019396649183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in Venezuela (Formerly Expats - Venezuela)",
    metaId: "6026404871583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in Vietnam (Formerly Expats - Vietnam)",
    metaId: "6027149006383", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in Zambia (Formerly Expats - Zambia)",
    metaId: "6047219032183", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Lived in Zimbabwe (Formerly Expats - Zimbabwe)",
    metaId: "6019673233983", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: ["books", "education", "electronics"],
  },
  {
    name: "Lives abroad",
    metaId: "6015559470583", // discovered 2026-03-31
    path: "Behaviors > Expats",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Kindle Fire",
    metaId: "6008868254383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Amazon",
    aliases: ["kindle user", "kindle owner", "fire tablet user"],
    relevantFor: ["technology", "education", "entertainment"],
  },
  {
    name: "Facebook access (mobile): iPad 1",
    metaId: "6004383767972", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["ipad 1 user", "ipad 1 owner", "apple tablet user"],
    relevantFor: ["technology", "education", "entertainment"],
  },
  {
    name: "Facebook access (mobile): iPad 2",
    metaId: "6004383808772", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["ipad 2 user", "ipad 2 owner", "apple tablet user"],
    relevantFor: ["technology", "education", "entertainment"],
  },
  {
    name: "Facebook access (mobile): iPad 3",
    metaId: "6004383806772", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["ipad 3 user", "ipad 3 owner", "apple tablet user"],
    relevantFor: ["technology", "fashion", "lifestyle"],
  },
  {
    name: "Facebook access (mobile): iPhone 4",
    metaId: "6004383941372", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone 4 user", "iphone 4 owner", "apple phone user"],
    relevantFor: ["technology", "fashion", "lifestyle"],
  },
  {
    name: "Facebook access (mobile): iPhone 4S",
    metaId: "6004386303972", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone 4s user", "iphone 4s owner", "apple phone user"],
    relevantFor: ["technology", "fashion", "lifestyle"],
  },
  {
    name: "Facebook access (mobile): iPhone 5",
    metaId: "6004883585572", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone 5 user", "iphone 5 owner", "apple phone user"],
    relevantFor: ["technology", "fashion", "lifestyle"],
  },
  {
    name: "Facebook access (mobile): iPhone 5C",
    metaId: "6010095794383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone 5c user", "iphone 5c owner", "apple phone user"],
    relevantFor: ["technology", "fashion", "lifestyle"],
  },
  {
    name: "Facebook access (mobile): iPhone 5S",
    metaId: "6010095777183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone 5s user", "iphone 5s owner", "apple phone user"],
    relevantFor: ["technology", "fashion", "lifestyle"],
  },
  {
    name: "Facebook access (mobile): iPhone 8",
    metaId: "6092512412783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone 8 user", "iphone 8 owner", "apple phone user"],
    relevantFor: ["electronics", "mobile accessories", "apps", "gaming", "b2b"],
  },
  {
    name: "Facebook access (mobile): iPhone 8 Plus",
    metaId: "6092512424583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone 8 plus", "iphone8+", "iphone8p", "apple 8 plus", "iphone8"],
    relevantFor: ["electronics", "mobile accessories", "apps", "gaming", "b2b"],
  },
  {
    name: "Facebook access (mobile): iPhone X",
    metaId: "6092512462983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone x", "iphonex", "apple x", "iphone10", "iphone-x"],
    relevantFor: ["electronics", "mobile accessories", "apps", "gaming", "b2b"],
  },
  {
    name: "Facebook access (mobile): iPhone XR",
    metaId: "6120699725783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone xr", "iphonexr", "apple xr", "iphone-xr", "xr"],
    relevantFor: ["electronics", "mobile accessories", "apps", "gaming", "b2b"],
  },
  {
    name: "Facebook access (mobile): iPhone XS",
    metaId: "6120699687383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone xs", "iphonexs", "apple xs", "iphone-xs", "xs"],
    relevantFor: ["electronics", "mobile accessories", "apps", "gaming", "b2b"],
  },
  {
    name: "Facebook access (mobile): iPhone XS Max",
    metaId: "6120699721983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone xs max", "iphonexsmax", "apple xs max", "iphone-xs-max", "xsmax"],
    relevantFor: ["electronics", "music", "apps", "gaming", "b2b"],
  },
  {
    name: "Facebook access (mobile): iPod Touch",
    metaId: "6004383890572", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["ipod touch", "ipod", "apple touch", "ipod-t", "touch"],
    relevantFor: ["electronics", "education", "apps", "b2b", "home"],
  },
  {
    name: "Owns: iPad 4",
    metaId: "6011191254383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["ipad 4", "ipad4", "apple ipad 4", "ipad-four", "ipad4th"],
    relevantFor: ["electronics", "education", "apps", "b2b", "home"],
  },
  {
    name: "Owns: iPad Air",
    metaId: "6011244513583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["ipad air", "ipadair", "apple ipad air", "ipad-air", "air"],
    relevantFor: ["electronics", "education", "apps", "b2b", "home"],
  },
  {
    name: "Owns: iPad Air 2",
    metaId: "6018995113183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["ipad air 2", "ipadair2", "apple ipad air 2", "ipad-air-2", "air2"],
    relevantFor: ["electronics", "education", "apps", "b2b", "home"],
  },
  {
    name: "Owns: iPad Mini 1",
    metaId: "6011191259183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["ipad mini 1", "ipadmini1", "apple ipad mini 1", "ipad-mini-1", "mini1"],
    relevantFor: ["electronics", "education", "general"],
  },
  {
    name: "Owns: iPad Mini 2",
    metaId: "6011244510983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["ipad mini 2", "mini 2", "apple mini 2"],
    relevantFor: ["electronics", "education", "general"],
  },
  {
    name: "Owns: iPad Mini 3",
    metaId: "6019098117583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["ipad mini 3", "mini 3", "apple mini 3"],
    relevantFor: ["electronics", "mobile accessories", "general"],
  },
  {
    name: "Owns: iPhone 6",
    metaId: "6017831572183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone 6", "apple 6", "6 series"],
    relevantFor: ["electronics", "mobile accessories", "general"],
  },
  {
    name: "Owns: iPhone 6 Plus",
    metaId: "6017831560783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone 6 plus", "apple 6 plus", "6 plus"],
    relevantFor: ["electronics", "mobile accessories", "general"],
  },
  {
    name: "Owns: iPhone 6S",
    metaId: "6031259562783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone 6s", "apple 6s", "6s series"],
    relevantFor: ["electronics", "mobile accessories", "general"],
  },
  {
    name: "Owns: iPhone 6S Plus",
    metaId: "6031259590183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone 6s plus", "apple 6s plus", "6s plus"],
    relevantFor: ["electronics", "mobile accessories", "general"],
  },
  {
    name: "Owns: iPhone 7",
    metaId: "6060616578383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone 7", "apple 7", "7 series"],
    relevantFor: ["electronics", "mobile accessories", "general"],
  },
  {
    name: "Owns: iPhone 7 Plus",
    metaId: "6060616598183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone 7 plus", "apple 7 plus", "7 plus"],
    relevantFor: ["electronics", "mobile accessories", "general"],
  },
  {
    name: "Owns: iPhone SE",
    metaId: "6054947014783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Apple",
    aliases: ["iphone se", "apple se", "se series"],
    relevantFor: ["electronics", "mobile accessories", "general"],
  },
  {
    name: "Facebook access (mobile): HTC Android mobile devices",
    metaId: "6004385886572", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: ["htc android", "htc mobile", "htc devices"],
    relevantFor: ["electronics", "mobile accessories", "telecommunications"],
  },
  {
    name: "Facebook access (mobile): Motorola Android mobile devices",
    metaId: "6004385879572", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: ["motorola", "moto", "android motorola", "motorola devices"],
    relevantFor: ["electronics", "mobile accessories", "telecommunications"],
  },
  {
    name: "Facebook access (mobile): Sony Android mobile devices",
    metaId: "6004385865172", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: ["sony", "android sony", "sony devices", "sony mobile"],
    relevantFor: ["electronics", "mobile accessories", "telecommunications"],
  },
  {
    name: "Facebook access(mobile): LG Android mobile devices",
    metaId: "6004385868372", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: ["lg", "android lg", "lg devices", "lg mobile"],
    relevantFor: ["electronics", "mobile accessories", "telecommunications"],
  },
  {
    name: "Owns: Google Pixel",
    metaId: "6061668174383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Google",
    aliases: ["google pixel", "pixel", "google phone", "google devices"],
    relevantFor: ["electronics", "mobile accessories", "telecommunications"],
  },
  {
    name: "Owns: Nexus 5",
    metaId: "6014809400783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Google",
    aliases: ["nexus 5", "google nexus", "nexus devices", "nexus phone"],
    relevantFor: ["electronics", "mobile accessories", "telecommunications"],
  },
  {
    name: "Owns: HTC One",
    metaId: "6014809859183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > HTC",
    aliases: ["htc one", "htc", "htc devices", "htc mobile"],
    relevantFor: ["electronics", "mobile accessories", "telecommunications"],
  },
  {
    name: "Owns: LG G2 devices",
    metaId: "6010231666183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > LG",
    aliases: ["lg g2", "g2", "lg devices", "lg mobile"],
    relevantFor: ["electronics", "mobile accessories", "telecommunications"],
  },
  {
    name: "Owns: LG G3",
    metaId: "6017535283383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > LG",
    aliases: ["lg g3", "g3", "lg devices", "lg mobile"],
    relevantFor: ["electronics", "mobile accessories", "telecommunications"],
  },
  {
    name: "Owns: LG V10",
    metaId: "6043341245183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > LG",
    aliases: ["lg v10", "v10", "lg devices", "lg mobile"],
    relevantFor: ["electronics", "mobile accessories", "telecommunications"],
  },
  {
    name: "Owns: Alcatel",
    metaId: "6023460563383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: ["alcatel", "alcatel devices", "alcatel mobile", "alcatel phone"],
    relevantFor: [],
  },
  {
    name: "Owns: Cherry Mobile",
    metaId: "6023460590583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Gionee",
    metaId: "6071590219583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Huawei",
    metaId: "6011390261383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Karbonn",
    metaId: "6019164544783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Micromax",
    metaId: "6019164586183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Oppo",
    metaId: "6056265200983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Tecno",
    metaId: "6023460579583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: VIVO devices",
    metaId: "6056265212183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Xiaomi",
    metaId: "6019164630583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: ZTE",
    metaId: "6023460572383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand",
    aliases: [],
    relevantFor: ["electronics", "mobile accessories", "tech services"],
  },
  {
    name: "Galaxy Note II",
    metaId: "6013017235183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: ["galaxy note ii", "note ii", "samsung note ii"],
    relevantFor: ["electronics", "tablets", "education"],
  },
  {
    name: "Galaxy Tab",
    metaId: "6016925667383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: ["galaxy tab", "samsung tab", "tab series"],
    relevantFor: ["electronics", "mobile accessories", "tech services"],
  },
  {
    name: "Owns: Galaxy Grand",
    metaId: "6013017236583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: ["galaxy grand", "samsung grand", "grand series"],
    relevantFor: ["electronics", "mobile accessories", "tech services"],
  },
  {
    name: "Owns: Galaxy Grand 2",
    metaId: "6015441244983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: ["galaxy grand 2", "samsung grand 2", "grand 2 series"],
    relevantFor: ["electronics", "mobile accessories", "tech services"],
  },
  {
    name: "Owns: Galaxy Note 3",
    metaId: "6013279353983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: ["galaxy note 3", "note 3", "samsung note 3"],
    relevantFor: ["electronics", "mobile accessories", "tech services"],
  },
  {
    name: "Owns: Galaxy Note 4",
    metaId: "6019098214783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: ["galaxy note 4", "note 4", "samsung note 4"],
    relevantFor: ["electronics", "mobile accessories", "tech services"],
  },
  {
    name: "Owns: Galaxy Note 5",
    metaId: "6042330550783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: ["galaxy note 5", "note 5", "samsung note 5"],
    relevantFor: ["electronics", "mobile accessories", "tech services"],
  },
  {
    name: "Owns: Galaxy Note 7",
    metaId: "6058034528983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: ["galaxy note 7", "note 7", "samsung note 7"],
    relevantFor: ["electronics", "mobile accessories", "tech services"],
  },
  {
    name: "Owns: Galaxy Note 8",
    metaId: "6083036245383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: ["galaxy note 8", "note 8", "samsung note 8"],
    relevantFor: ["electronics", "mobile accessories", "tech services"],
  },
  {
    name: "Owns: Galaxy S 4 Mini",
    metaId: "6013017308783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: ["galaxy s 4 mini", "s4 mini", "samsung s4 mini"],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy S III Mini",
    metaId: "6013017211983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy S III devices",
    metaId: "6007481031783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy S4",
    metaId: "6013016790183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy S5",
    metaId: "6014808618583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy S6",
    metaId: "6026660740983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy S7",
    metaId: "6043523344783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy S7 Edge",
    metaId: "6043522870783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy S8",
    metaId: "6075237200983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy S8+",
    metaId: "6075237226583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy S9",
    metaId: "6106223987983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy S9+",
    metaId: "6106224431383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy Tab 2",
    metaId: "6016925657183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy Tab 3",
    metaId: "6016925643983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy Tab 4",
    metaId: "6016925404783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy Tab Pro",
    metaId: "6016925394583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy Tab S",
    metaId: "6016925328983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Galaxy Y devices",
    metaId: "6015852294783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Samsung",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Xperia M",
    metaId: "6016926254583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Sony",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Xperia SL",
    metaId: "6016926310383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Sony",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Xperia Z",
    metaId: "6016926528983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Sony",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Xperia Z Ultra",
    metaId: "6016926651383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Sony",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: Xperia Z3",
    metaId: "6022430911783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Sony",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Xperia T",
    metaId: "6016926471583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Brand > Sony",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Facebook access (mobile): Windows phones",
    metaId: "6004385895772", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > All Mobile Devices by Operating System",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Android: 360 degree media not supported",
    metaId: "6065048233383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Android: 360 degree media supported",
    metaId: "6063136545383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Facebook access (mobile): feature phones",
    metaId: "6004383149972", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Facebook access (mobile): tablets",
    metaId: "6016286626383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Facebook access (network type): 2G",
    metaId: "6017253486583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > Network Connection",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Facebook access (network type): 3G",
    metaId: "6017253511583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > Network Connection",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Facebook access (network type): 4G",
    metaId: "6017253531383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > Network Connection",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Facebook access (network type): WiFi ",
    metaId: "6015235495383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User > Network Connection",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Owns: OnePlus",
    metaId: "6106805412383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Uses a mobile device (1-3 months)",
    metaId: "6091658708183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User/Device Use Time",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Uses a mobile device (10-12 months)",
    metaId: "6091658540583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User/Device Use Time",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Uses a mobile device (13-18 months)",
    metaId: "6091658562383", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User/Device Use Time",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Uses a mobile device (19-24 months)",
    metaId: "6091658651583", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User/Device Use Time",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Uses a mobile device (25 months+)",
    metaId: "6091658683183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User/Device Use Time",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Uses a mobile device (4-6 months)",
    metaId: "6091658512983", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User/Device Use Time",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Uses a mobile device (7-9 months)",
    metaId: "6091658512183", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User/Device Use Time",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Uses a mobile device (less than 1 month)",
    metaId: "6091658707783", // discovered 2026-03-31
    path: "Behaviors > Mobile Device User/Device Use Time",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Commuters",
    metaId: "6013516370183", // discovered 2026-03-31
    path: "Behaviors > Travel",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Returned from travels 2 weeks ago",
    metaId: "6008297697383", // discovered 2026-03-31
    path: "Behaviors > Travel",
    aliases: [],
    relevantFor: [],
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
 * Suggest relevant behaviors for a given business description or category.
 */
export function suggestBehaviorsForCategory(
  category: string,
): MetaBehaviorSeed[] {
  const normalized = category.toLowerCase();
  return META_BEHAVIOR_SEEDS.filter((b) =>
    b.relevantFor.some(
      (r) => normalized.includes(r) || r.includes(normalized),
    ),
  );
}

/**
 * Category-scoped behavior catalog for prompt injection.
 * Returns relevant behaviors first, padded with universal entries up to `max`.
 */
export function buildScopedBehaviorCatalogPrompt(
  category?: string,
  max = 20,
): string {
  if (!category) return buildBehaviorCatalogPrompt();

  const relevant = suggestBehaviorsForCategory(category);
  if (relevant.length >= max) {
    return relevant
      .slice(0, max)
      .map((b) => b.name)
      .join(" | ");
  }

  // Pad with remaining entries sorted by universality (most relevantFor tags)
  const relevantIds = new Set(relevant.map((b) => b.name));
  const rest = META_BEHAVIOR_SEEDS.filter((b) => !relevantIds.has(b.name)).sort(
    (a, b) => b.relevantFor.length - a.relevantFor.length,
  );

  const combined = [...relevant, ...rest].slice(0, max);
  return combined.map((b) => b.name).join(" | ");
}
