/**
 * Pre-validated Meta Ads interest catalog — Nigerian market focus.
 *
 * These are real interest names that exist in Meta's targeting system.
 * Meta has thousands of valid interests, so this catalog covers the most
 * common ones for Nigerian SME verticals. The AI may use names outside
 * this list — they'll fall through to API search.
 *
 * Source: Meta Ads Manager → Detailed Targeting → Browse → Interests
 *
 * WHY: The LLM generates interest names, then we call the API to resolve IDs.
 * By maintaining a local lookup of known-good names, we skip the API round-trip
 * for the most common cases and guarantee a valid match.
 *
 * Last validated: (not yet — run validate-meta-interests.ts)
 */

export interface MetaInterestSeed {
  /** Exact name as it appears in Meta Ads Manager */
  name: string;
  /** Confirmed Meta numeric ID — populated by validate-meta-interests.ts. Skips API lookup when present. */
  metaId?: string;
  /** Category path in Meta's UI (informational) */
  path: string;
  /** Common aliases the LLM might generate for this interest. */
  aliases: string[];
  /**
   * Business categories or product types this interest is most relevant for.
   * Used by suggestInterestsForCategory() to auto-suggest interests.
   */
  relevantFor: string[];
}

export const META_INTEREST_SEEDS: MetaInterestSeed[] = [
  // ── Fashion ──────────────────────────────────────────────────────────────────
  {
    name: "Fashion",
    path: "Interests > Shopping and fashion > Fashion",
    aliases: ["fashion lovers", "fashion enthusiasts", "style lovers"],
    relevantFor: ["fashion", "clothing", "apparel", "style"],
  },
  {
    name: "Clothing",
    path: "Interests > Shopping and fashion > Clothing",
    aliases: ["clothes", "apparel", "garments", "outfits"],
    relevantFor: ["fashion", "clothing", "apparel"],
  },
  {
    name: "Shopping",
    path: "Interests > Shopping and fashion > Shopping",
    aliases: ["shoppers", "retail", "buying"],
    relevantFor: ["fashion", "retail", "e-commerce", "online shopping"],
  },
  {
    name: "Online shopping",
    path: "Interests > Shopping and fashion > Online shopping",
    aliases: ["e-commerce shoppers", "internet shoppers", "online buyers"],
    relevantFor: ["e-commerce", "online shopping", "retail"],
  },
  {
    name: "Shoes",
    path: "Interests > Shopping and fashion > Shoes",
    aliases: ["footwear", "sneakers", "heels"],
    relevantFor: ["shoes", "footwear", "fashion", "sneakers"],
  },
  {
    name: "Handbags",
    path: "Interests > Shopping and fashion > Handbags",
    aliases: ["bags", "purses", "clutch bags", "tote bags"],
    relevantFor: ["bags", "handbags", "fashion", "accessories"],
  },
  {
    name: "Jewellery",
    path: "Interests > Shopping and fashion > Jewellery",
    aliases: ["jewelry", "accessories", "rings", "necklaces", "bracelets", "earrings"],
    relevantFor: ["jewellery", "jewelry", "accessories", "fashion"],
  },
  {
    name: "Watches",
    path: "Interests > Shopping and fashion > Watches",
    aliases: ["wristwatches", "luxury watches", "timepieces"],
    relevantFor: ["watches", "accessories", "fashion", "luxury"],
  },
  {
    name: "Sunglasses",
    path: "Interests > Shopping and fashion > Sunglasses",
    aliases: ["shades", "eyewear"],
    relevantFor: ["sunglasses", "eyewear", "fashion", "accessories"],
  },
  {
    name: "Luxury goods",
    path: "Interests > Shopping and fashion > Luxury goods",
    aliases: ["luxury", "premium", "high-end", "designer"],
    relevantFor: ["luxury", "premium", "designer", "high-end"],
  },
  // ── Beauty ───────────────────────────────────────────────────────────────────
  {
    name: "Hair care",
    path: "Interests > Beauty > Hair care",
    aliases: ["hair products", "hair treatment", "hair styling"],
    relevantFor: ["hair", "hair care", "beauty", "salon"],
  },
  {
    name: "Natural hair",
    path: "Interests > Beauty > Natural hair",
    aliases: ["natural hair care", "afro hair", "kinky hair", "curly hair"],
    relevantFor: ["natural hair", "hair care", "beauty"],
  },
  {
    name: "Skin care",
    path: "Interests > Beauty > Skin care",
    aliases: ["skincare", "skin treatment", "skin products", "face care"],
    relevantFor: ["skincare", "skin care", "beauty", "cosmetics"],
  },
  {
    name: "Beauty",
    path: "Interests > Beauty",
    aliases: ["beauty products", "beauty care"],
    relevantFor: ["beauty", "cosmetics", "skincare", "makeup"],
  },
  {
    name: "Cosmetics",
    path: "Interests > Beauty > Cosmetics",
    aliases: ["beauty products", "makeup products"],
    relevantFor: ["cosmetics", "beauty", "makeup"],
  },
  {
    name: "Makeup",
    path: "Interests > Beauty > Makeup",
    aliases: ["make-up", "makeup artist", "mua"],
    relevantFor: ["makeup", "beauty", "cosmetics"],
  },
  {
    name: "Wigs",
    path: "Interests > Beauty > Wigs",
    aliases: ["wigs and weaves", "lace wigs", "human hair wigs", "weave"],
    relevantFor: ["wigs", "hair", "beauty", "weave"],
  },
  {
    name: "Perfume",
    path: "Interests > Beauty > Perfume",
    aliases: ["fragrance", "cologne", "scent", "perfumes"],
    relevantFor: ["perfume", "fragrance", "beauty"],
  },
  {
    name: "Nail art",
    path: "Interests > Beauty > Nail art",
    aliases: ["nail care", "manicure", "nails", "nail polish"],
    relevantFor: ["nails", "nail art", "beauty", "salon"],
  },
  {
    name: "Spa",
    path: "Interests > Beauty > Spa",
    aliases: ["spa treatment", "wellness", "relaxation", "massage"],
    relevantFor: ["spa", "wellness", "beauty", "massage"],
  },
  // ── Food & Drink ─────────────────────────────────────────────────────────────
  {
    name: "Food",
    path: "Interests > Food and drink > Food",
    aliases: ["food lovers", "foodie"],
    relevantFor: ["food", "restaurant", "catering", "cooking"],
  },
  {
    name: "Restaurants",
    path: "Interests > Food and drink > Restaurants",
    aliases: ["dining out", "eating out", "restaurant goers"],
    relevantFor: ["restaurant", "dining", "food"],
  },
  {
    name: "Cooking",
    path: "Interests > Food and drink > Cooking",
    aliases: ["home cooking", "recipes", "chef"],
    relevantFor: ["cooking", "food", "kitchen", "recipes"],
  },
  {
    name: "Fast food",
    path: "Interests > Food and drink > Fast food",
    aliases: ["quick service", "takeout", "fast food restaurants"],
    relevantFor: ["fast food", "restaurant", "food"],
  },
  {
    name: "Baking",
    path: "Interests > Food and drink > Baking",
    aliases: ["baker", "cakes", "pastries", "pastry"],
    relevantFor: ["baking", "cakes", "pastry", "food"],
  },
  {
    name: "Coffee",
    path: "Interests > Food and drink > Coffee",
    aliases: ["coffee lovers", "cafe", "espresso"],
    relevantFor: ["coffee", "cafe", "beverages"],
  },
  {
    name: "Catering",
    path: "Interests > Food and drink > Catering",
    aliases: ["event catering", "food catering", "catering services"],
    relevantFor: ["catering", "events", "food"],
  },
  {
    name: "Organic food",
    path: "Interests > Food and drink > Organic food",
    aliases: ["organic", "health food", "clean eating"],
    relevantFor: ["organic", "health food", "food"],
  },
  // ── Electronics & Technology ─────────────────────────────────────────────────
  {
    name: "Technology",
    path: "Interests > Technology",
    aliases: ["tech", "tech lovers", "tech enthusiasts"],
    relevantFor: ["technology", "tech", "gadgets", "electronics"],
  },
  {
    name: "Consumer electronics",
    path: "Interests > Technology > Consumer electronics",
    aliases: ["electronics", "gadgets", "devices"],
    relevantFor: ["electronics", "gadgets", "technology"],
  },
  {
    name: "Mobile phones",
    path: "Interests > Technology > Mobile phones",
    aliases: ["smartphones", "cell phones", "phones", "mobile devices"],
    relevantFor: ["phones", "mobile", "smartphones", "technology"],
  },
  {
    name: "Laptop computers",
    path: "Interests > Technology > Laptop computers",
    aliases: ["laptops", "notebook computers", "computers"],
    relevantFor: ["laptops", "computers", "technology"],
  },
  {
    name: "Tablet computers",
    path: "Interests > Technology > Tablet computers",
    aliases: ["tablets", "ipads"],
    relevantFor: ["tablets", "technology", "gadgets"],
  },
  {
    name: "Photography",
    path: "Interests > Hobbies and activities > Photography",
    aliases: ["photographer", "photos", "camera"],
    relevantFor: ["photography", "camera", "creative"],
  },
  {
    name: "Video games",
    path: "Interests > Technology > Video games",
    aliases: ["gaming", "gamers", "games"],
    relevantFor: ["gaming", "video games", "entertainment"],
  },
  {
    name: "Software",
    path: "Interests > Technology > Software",
    aliases: ["apps", "applications", "software development"],
    relevantFor: ["software", "technology", "apps"],
  },
  // ── Events & Celebrations ────────────────────────────────────────────────────
  {
    name: "Event planning",
    path: "Interests > Hobbies and activities > Event planning",
    aliases: ["event organizer", "event management", "party planner"],
    relevantFor: ["events", "event planning", "weddings", "parties"],
  },
  {
    name: "Weddings",
    path: "Interests > Family and relationships > Weddings",
    aliases: ["wedding planning", "bridal", "marriage"],
    relevantFor: ["wedding", "bridal", "asoebi", "events"],
  },
  {
    name: "Entertainment",
    path: "Interests > Entertainment",
    aliases: ["shows", "events", "concerts"],
    relevantFor: ["entertainment", "events", "nightlife"],
  },
  {
    name: "Nightlife",
    path: "Interests > Entertainment > Nightlife",
    aliases: ["clubbing", "nightclub", "bars", "parties"],
    relevantFor: ["nightlife", "entertainment", "events", "parties"],
  },
  // ── B2B / Business ───────────────────────────────────────────────────────────
  {
    name: "Entrepreneurship",
    path: "Interests > Business and industry > Entrepreneurship",
    aliases: ["entrepreneur", "startup", "business startup"],
    relevantFor: ["business", "entrepreneurship", "startup", "b2b"],
  },
  {
    name: "Digital marketing",
    path: "Interests > Business and industry > Digital marketing",
    aliases: ["online marketing", "social media marketing", "internet marketing"],
    relevantFor: ["marketing", "digital marketing", "b2b", "advertising"],
  },
  {
    name: "Small business",
    path: "Interests > Business and industry > Small business",
    aliases: ["sme", "small and medium enterprise", "small business owner"],
    relevantFor: ["small business", "sme", "b2b", "entrepreneurship"],
  },
  {
    name: "Online advertising",
    path: "Interests > Business and industry > Online advertising",
    aliases: ["digital advertising", "ads", "paid ads"],
    relevantFor: ["advertising", "marketing", "b2b"],
  },
  {
    name: "E-commerce",
    path: "Interests > Business and industry > E-commerce",
    aliases: ["ecommerce", "online store", "online selling"],
    relevantFor: ["e-commerce", "online shopping", "retail", "b2b"],
  },
  {
    name: "Real estate",
    path: "Interests > Business and industry > Real estate",
    aliases: ["property", "housing", "land", "real estate agent"],
    relevantFor: ["real estate", "property", "housing"],
  },
  {
    name: "Investment",
    path: "Interests > Business and industry > Investment",
    aliases: ["investing", "stocks", "finance", "financial investment"],
    relevantFor: ["investment", "finance", "b2b"],
  },
  {
    name: "Freelancing",
    path: "Interests > Business and industry > Freelancing",
    aliases: ["freelancer", "gig economy", "remote work"],
    relevantFor: ["freelancing", "remote work", "b2b"],
  },
  // ── Home & Living ────────────────────────────────────────────────────────────
  {
    name: "Interior design",
    path: "Interests > Home and garden > Interior design",
    aliases: ["home design", "interior decor", "home styling"],
    relevantFor: ["interior design", "home decor", "furniture"],
  },
  {
    name: "Furniture",
    path: "Interests > Home and garden > Furniture",
    aliases: ["home furniture", "office furniture"],
    relevantFor: ["furniture", "home", "interior design"],
  },
  {
    name: "Home improvement",
    path: "Interests > Home and garden > Home improvement",
    aliases: ["home renovation", "diy", "renovation"],
    relevantFor: ["home improvement", "renovation", "home"],
  },
  {
    name: "Gardening",
    path: "Interests > Home and garden > Gardening",
    aliases: ["garden", "plants", "landscaping"],
    relevantFor: ["gardening", "plants", "home"],
  },
  {
    name: "Home appliances",
    path: "Interests > Home and garden > Home appliances",
    aliases: ["appliances", "kitchen appliances", "household appliances"],
    relevantFor: ["appliances", "home", "kitchen"],
  },
  // ── Fitness & Health ─────────────────────────────────────────────────────────
  {
    name: "Physical fitness",
    path: "Interests > Fitness and wellness > Physical fitness",
    aliases: ["fitness", "workout", "exercise", "gym"],
    relevantFor: ["fitness", "gym", "health", "workout"],
  },
  {
    name: "Weight loss",
    path: "Interests > Fitness and wellness > Weight loss",
    aliases: ["weight management", "dieting", "losing weight", "slim"],
    relevantFor: ["weight loss", "fitness", "health", "diet"],
  },
  {
    name: "Yoga",
    path: "Interests > Fitness and wellness > Yoga",
    aliases: ["yoga practice", "meditation", "mindfulness"],
    relevantFor: ["yoga", "fitness", "wellness", "meditation"],
  },
  {
    name: "Running",
    path: "Interests > Fitness and wellness > Running",
    aliases: ["jogging", "marathons", "runners"],
    relevantFor: ["running", "fitness", "sports"],
  },
  {
    name: "Nutrition",
    path: "Interests > Fitness and wellness > Nutrition",
    aliases: ["healthy eating", "diet", "supplements"],
    relevantFor: ["nutrition", "health", "diet", "supplements"],
  },
  // ── General / Lifestyle ──────────────────────────────────────────────────────
  {
    name: "Parenting",
    path: "Interests > Family and relationships > Parenting",
    aliases: ["parents", "motherhood", "fatherhood", "child care"],
    relevantFor: ["parenting", "baby", "children", "family"],
  },
  {
    name: "Education",
    path: "Interests > Education",
    aliases: ["learning", "school", "university", "academic"],
    relevantFor: ["education", "school", "university", "learning"],
  },
  {
    name: "Travel",
    path: "Interests > Travel",
    aliases: ["travelling", "vacation", "holiday", "tourism"],
    relevantFor: ["travel", "tourism", "vacation", "holiday"],
  },
  {
    name: "Automobiles",
    path: "Interests > Hobbies and activities > Automobiles",
    aliases: ["cars", "automotive", "vehicles", "car lovers"],
    relevantFor: ["automotive", "cars", "vehicles"],
  },
  {
    name: "Pets",
    path: "Interests > Hobbies and activities > Pets",
    aliases: ["pet owners", "dogs", "cats", "pet care"],
    relevantFor: ["pets", "animals", "pet care"],
  },
];

/**
 * Resolve an AI-generated interest name to the best known Meta interest.
 *
 * Priority:
 *   1. Exact name match (case-insensitive)
 *   2. Alias match (case-insensitive substring)
 *   3. null -> caller should fall back to API search
 */
export function resolveLocalInterest(
  aiName: string,
): MetaInterestSeed | null {
  const normalized = aiName.toLowerCase().trim();

  const exact = META_INTEREST_SEEDS.find(
    (i) => i.name.toLowerCase() === normalized,
  );
  if (exact) return exact;

  const alias = META_INTEREST_SEEDS.find((i) =>
    i.aliases.some(
      (a) =>
        a === normalized || normalized.includes(a) || a.includes(normalized),
    ),
  );
  return alias ?? null;
}

/**
 * All valid interest names as a pipe-separated string for AI prompt injection.
 */
export function buildInterestCatalogPrompt(): string {
  return META_INTEREST_SEEDS.map((i) => i.name).join(" | ");
}

/**
 * Suggest relevant interests for a given business description or category.
 * Used by the AI prompt layer to auto-inject interests when they are a strong signal.
 */
export function suggestInterestsForCategory(
  category: string,
): MetaInterestSeed[] {
  const normalized = category.toLowerCase();
  return META_INTEREST_SEEDS.filter((i) =>
    i.relevantFor.some((r) => normalized.includes(r) || r.includes(normalized)),
  );
}
