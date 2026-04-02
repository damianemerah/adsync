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
