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
  {
    name: "Fashion",
    metaId: "6003348604581", // confirmed 2026-03-30
    path: "Interests > Shopping and fashion > Fashion",
    aliases: ["fashion lovers", "fashion enthusiasts", "style lovers"],
    relevantFor: ["fashion", "clothing", "apparel", "style"],
  },
  {
    name: "Clothing",
    metaId: "6003456388203", // confirmed 2026-03-30
    path: "Interests > Shopping and fashion > Clothing",
    aliases: ["clothes", "apparel", "garments", "outfits"],
    relevantFor: ["fashion", "clothing", "apparel"],
  },
  {
    name: "Shopping",
    metaId: "6003263791114", // confirmed 2026-03-30
    path: "Interests > Shopping and fashion > Shopping",
    aliases: ["shoppers", "retail", "buying"],
    relevantFor: ["fashion", "retail", "e-commerce", "online shopping"],
  },
  {
    name: "Online shopping",
    metaId: "6003346592981", // confirmed 2026-03-30
    path: "Interests > Shopping and fashion > Online shopping",
    aliases: ["e-commerce shoppers", "internet shoppers", "online buyers"],
    relevantFor: ["e-commerce", "online shopping", "retail"],
  },
  {
    name: "Shoes",
    metaId: "6003348453981", // confirmed 2026-03-30
    path: "Interests > Shopping and fashion > Shoes",
    aliases: ["footwear", "sneakers", "heels"],
    relevantFor: ["shoes", "footwear", "fashion", "sneakers"],
  },
  {
    name: "Handbags",
    metaId: "6003198476967", // confirmed 2026-03-30
    path: "Interests > Shopping and fashion > Handbags",
    aliases: ["bags", "purses", "clutch bags", "tote bags"],
    relevantFor: ["bags", "handbags", "fashion", "accessories"],
  },
  {
    name: "Jewellery",
    metaId: "6003193633966", // confirmed 2026-03-30
    path: "Interests > Shopping and fashion > Jewellery",
    aliases: ["jewelry", "accessories", "rings", "necklaces", "bracelets", "earrings"],
    relevantFor: ["jewellery", "jewelry", "accessories", "fashion"],
  },
  {
    name: "Watches",
    metaId: "6002893385022", // confirmed 2026-03-30
    path: "Interests > Shopping and fashion > Watches",
    aliases: ["wristwatches", "luxury watches", "timepieces"],
    relevantFor: ["watches", "accessories", "fashion", "luxury"],
  },
  {
    name: "Sunglasses",
    metaId: "6003255640088", // confirmed 2026-03-30
    path: "Interests > Shopping and fashion > Sunglasses",
    aliases: ["shades", "eyewear"],
    relevantFor: ["sunglasses", "eyewear", "fashion", "accessories"],
  },
  {
    name: "Luxury goods",
    metaId: "6007828099136", // confirmed 2026-03-30
    path: "Interests > Shopping and fashion > Luxury goods",
    aliases: ["luxury", "premium", "high-end", "designer"],
    relevantFor: ["luxury", "premium", "designer", "high-end"],
  },
  {
    name: "Hair care",
    metaId: "6003423248519", // confirmed 2026-03-30
    path: "Interests > Beauty > Hair care",
    aliases: ["hair products", "hair treatment", "hair styling"],
    relevantFor: ["hair", "hair care", "beauty", "salon"],
  },
  {
    name: "Natural hair",
    metaId: "6015536188748", // confirmed 2026-03-30
    path: "Interests > Beauty > Natural hair",
    aliases: ["natural hair care", "afro hair", "kinky hair", "curly hair"],
    relevantFor: ["natural hair", "hair care", "beauty"],
  },
  {
    name: "Skin care",
    metaId: "664130153728886", // confirmed 2026-03-30
    path: "Interests > Beauty > Skin care",
    aliases: ["skincare", "skin treatment", "skin products", "face care"],
    relevantFor: ["skincare", "skin care", "beauty", "cosmetics"],
  },
  {
    name: "Beauty",
    metaId: "6002867432822", // confirmed 2026-03-30
    path: "Interests > Beauty",
    aliases: ["beauty products", "beauty care"],
    relevantFor: ["beauty", "cosmetics", "skincare", "makeup"],
  },
  {
    name: "Cosmetics",
    metaId: "6002839660079", // confirmed 2026-03-30
    path: "Interests > Beauty > Cosmetics",
    aliases: ["beauty products", "makeup products"],
    relevantFor: ["cosmetics", "beauty", "makeup"],
  },
  {
    name: "Makeup",
    metaId: "6003251990801", // confirmed 2026-03-30
    path: "Interests > Beauty > Makeup",
    aliases: ["make-up", "makeup artist", "mua"],
    relevantFor: ["makeup", "beauty", "cosmetics"],
  },
  {
    name: "Wigs",
    metaId: "6003190733801", // confirmed 2026-03-30
    path: "Interests > Beauty > Wigs",
    aliases: ["wigs and weaves", "lace wigs", "human hair wigs", "weave"],
    relevantFor: ["wigs", "hair", "beauty", "weave"],
  },
  {
    name: "Perfume",
    metaId: "6004588265733", // confirmed 2026-03-30
    path: "Interests > Beauty > Perfume",
    aliases: ["fragrance", "cologne", "scent", "perfumes"],
    relevantFor: ["perfume", "fragrance", "beauty"],
  },
  {
    name: "Nail art",
    metaId: "6017501817751", // confirmed 2026-03-30
    path: "Interests > Beauty > Nail art",
    aliases: ["nail care", "manicure", "nails", "nail polish"],
    relevantFor: ["nails", "nail art", "beauty", "salon"],
  },
  {
    name: "Spa",
    metaId: "6003254590688", // confirmed 2026-03-30
    path: "Interests > Beauty > Spa",
    aliases: ["spa treatment", "wellness", "relaxation", "massage"],
    relevantFor: ["spa", "wellness", "beauty", "massage"],
  },
  {
    name: "Food",
    metaId: "6003266061909", // confirmed 2026-03-30
    path: "Interests > Food and drink > Food",
    aliases: ["food lovers", "foodie"],
    relevantFor: ["food", "restaurant", "catering", "cooking"],
  },
  {
    name: "Restaurants",
    metaId: "6003436950375", // confirmed 2026-03-30
    path: "Interests > Food and drink > Restaurants",
    aliases: ["dining out", "eating out", "restaurant goers"],
    relevantFor: ["restaurant", "dining", "food"],
  },
  {
    name: "Cooking",
    metaId: "6003659420716", // confirmed 2026-03-30
    path: "Interests > Food and drink > Cooking",
    aliases: ["home cooking", "recipes", "chef"],
    relevantFor: ["cooking", "food", "kitchen", "recipes"],
  },
  {
    name: "Fast food",
    metaId: "6004037400009", // confirmed 2026-03-30
    path: "Interests > Food and drink > Fast food",
    aliases: ["quick service", "takeout", "fast food restaurants"],
    relevantFor: ["fast food", "restaurant", "food"],
  },
  {
    name: "Baking",
    metaId: "6003134986700", // confirmed 2026-03-30
    path: "Interests > Food and drink > Baking",
    aliases: ["baker", "cakes", "pastries", "pastry"],
    relevantFor: ["baking", "cakes", "pastry", "food"],
  },
  {
    name: "Coffee",
    metaId: "6003626773307", // confirmed 2026-03-30
    path: "Interests > Food and drink > Coffee",
    aliases: ["coffee lovers", "cafe", "espresso"],
    relevantFor: ["coffee", "cafe", "beverages"],
  },
  {
    name: "Catering",
    metaId: "6003195973898", // confirmed 2026-03-30
    path: "Interests > Food and drink > Catering",
    aliases: ["event catering", "food catering", "catering services"],
    relevantFor: ["catering", "events", "food"],
  },
  {
    name: "Organic food",
    metaId: "6002868910910", // confirmed 2026-03-30
    path: "Interests > Food and drink > Organic food",
    aliases: ["organic", "health food", "clean eating"],
    relevantFor: ["organic", "health food", "food"],
  },
  {
    name: "Technology",
    metaId: "6003985771306", // confirmed 2026-03-30
    path: "Interests > Technology",
    aliases: ["tech", "tech lovers", "tech enthusiasts"],
    relevantFor: ["technology", "tech", "gadgets", "electronics"],
  },
  {
    name: "Consumer electronics",
    metaId: "6003716669862", // confirmed 2026-03-30
    path: "Interests > Technology > Consumer electronics",
    aliases: ["electronics", "gadgets", "devices"],
    relevantFor: ["electronics", "gadgets", "technology"],
  },
  {
    name: "Mobile phones",
    metaId: "6002971085794", // confirmed 2026-03-30
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
    metaId: "6002960574320", // confirmed 2026-03-30
    path: "Interests > Technology > Tablet computers",
    aliases: ["tablets", "ipads"],
    relevantFor: ["tablets", "technology", "gadgets"],
  },
  {
    name: "Photography",
    metaId: "6003899195666", // confirmed 2026-03-30
    path: "Interests > Hobbies and activities > Photography",
    aliases: ["photographer", "photos", "camera"],
    relevantFor: ["photography", "camera", "creative"],
  },
  {
    name: "Video games",
    metaId: "6003940339466", // confirmed 2026-03-30
    path: "Interests > Technology > Video games",
    aliases: ["gaming", "gamers", "games"],
    relevantFor: ["gaming", "video games", "entertainment"],
  },
  {
    name: "Software",
    metaId: "6005609368513", // confirmed 2026-03-30
    path: "Interests > Technology > Software",
    aliases: ["apps", "applications", "software development"],
    relevantFor: ["software", "technology", "apps"],
  },
  {
    name: "Event planning",
    path: "Interests > Hobbies and activities > Event planning",
    aliases: ["event organizer", "event management", "party planner"],
    relevantFor: ["events", "event planning", "weddings", "parties"],
  },
  {
    name: "Weddings",
    metaId: "6003409392877", // confirmed 2026-03-30
    path: "Interests > Family and relationships > Weddings",
    aliases: ["wedding planning", "bridal", "marriage"],
    relevantFor: ["wedding", "bridal", "asoebi", "events"],
  },
  {
    name: "Entertainment",
    metaId: "6003349442621", // confirmed 2026-03-30
    path: "Interests > Entertainment",
    aliases: ["shows", "events", "concerts"],
    relevantFor: ["entertainment", "events", "nightlife"],
  },
  {
    name: "Nightlife",
    metaId: "6003375995381", // confirmed 2026-03-30
    path: "Interests > Entertainment > Nightlife",
    aliases: ["clubbing", "nightclub", "bars", "parties"],
    relevantFor: ["nightlife", "entertainment", "events", "parties"],
  },
  {
    name: "Entrepreneurship",
    metaId: "6003371567474", // confirmed 2026-03-30
    path: "Interests > Business and industry > Entrepreneurship",
    aliases: ["entrepreneur", "startup", "business startup"],
    relevantFor: ["business", "entrepreneurship", "startup", "b2b"],
  },
  {
    name: "Digital marketing",
    metaId: "6003127206524", // confirmed 2026-03-30
    path: "Interests > Business and industry > Digital marketing",
    aliases: ["online marketing", "social media marketing", "internet marketing"],
    relevantFor: ["marketing", "digital marketing", "b2b", "advertising"],
  },
  {
    name: "Small business",
    metaId: "6002884511422", // confirmed 2026-03-30
    path: "Interests > Business and industry > Small business",
    aliases: ["sme", "small and medium enterprise", "small business owner"],
    relevantFor: ["small business", "sme", "b2b", "entrepreneurship"],
  },
  {
    name: "Online advertising",
    metaId: "6003526234370", // confirmed 2026-03-30
    path: "Interests > Business and industry > Online advertising",
    aliases: ["digital advertising", "ads", "paid ads"],
    relevantFor: ["advertising", "marketing", "b2b"],
  },
  {
    name: "E-commerce",
    metaId: "6003221485467", // confirmed 2026-03-30
    path: "Interests > Business and industry > E-commerce",
    aliases: ["ecommerce", "online store", "online selling"],
    relevantFor: ["e-commerce", "online shopping", "retail", "b2b"],
  },
  {
    name: "Real estate",
    metaId: "6003578086487", // confirmed 2026-03-30
    path: "Interests > Business and industry > Real estate",
    aliases: ["property", "housing", "land", "real estate agent"],
    relevantFor: ["real estate", "property", "housing"],
  },
  {
    name: "Investment",
    metaId: "6003388314512", // confirmed 2026-03-30
    path: "Interests > Business and industry > Investment",
    aliases: ["investing", "stocks", "finance", "financial investment"],
    relevantFor: ["investment", "finance", "b2b"],
  },
  {
    name: "Freelancer",
    metaId: "6003374632277", // confirmed 2026-03-30
    path: "Interests > Business and industry > Freelancing",
    aliases: ["freelancer", "gig economy", "remote work"],
    relevantFor: ["freelancing", "remote work", "b2b"],
  },
  {
    name: "Interior design",
    metaId: "6002920953955", // confirmed 2026-03-30
    path: "Interests > Home and garden > Interior design",
    aliases: ["home design", "interior decor", "home styling"],
    relevantFor: ["interior design", "home decor", "furniture"],
  },
  {
    name: "Furniture",
    metaId: "6003132926214", // confirmed 2026-03-30
    path: "Interests > Home and garden > Furniture",
    aliases: ["home furniture", "office furniture"],
    relevantFor: ["furniture", "home", "interior design"],
  },
  {
    name: "Home improvement",
    metaId: "6003234413249", // confirmed 2026-03-30
    path: "Interests > Home and garden > Home improvement",
    aliases: ["home renovation", "diy", "renovation"],
    relevantFor: ["home improvement", "renovation", "home"],
  },
  {
    name: "Gardening",
    metaId: "6003053056644", // confirmed 2026-03-30
    path: "Interests > Home and garden > Gardening",
    aliases: ["garden", "plants", "landscaping"],
    relevantFor: ["gardening", "plants", "home"],
  },
  {
    name: "Home appliances",
    metaId: "6003343997689", // confirmed 2026-03-30
    path: "Interests > Home and garden > Home appliances",
    aliases: ["appliances", "kitchen appliances", "household appliances"],
    relevantFor: ["appliances", "home", "kitchen"],
  },
  {
    name: "Physical fitness",
    metaId: "6003277229371", // confirmed 2026-03-30
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
    metaId: "6003306084421", // confirmed 2026-03-30
    path: "Interests > Fitness and wellness > Yoga",
    aliases: ["yoga practice", "meditation", "mindfulness"],
    relevantFor: ["yoga", "fitness", "wellness", "meditation"],
  },
  {
    name: "Running",
    metaId: "6003397496347", // confirmed 2026-03-30
    path: "Interests > Fitness and wellness > Running",
    aliases: ["jogging", "marathons", "runners"],
    relevantFor: ["running", "fitness", "sports"],
  },
  {
    name: "Nutrition",
    metaId: "6003341288509", // confirmed 2026-03-30
    path: "Interests > Fitness and wellness > Nutrition",
    aliases: ["healthy eating", "diet", "supplements"],
    relevantFor: ["nutrition", "health", "diet", "supplements"],
  },
  {
    name: "Parenting",
    metaId: "6003232518610", // confirmed 2026-03-30
    path: "Interests > Family and relationships > Parenting",
    aliases: ["parents", "motherhood", "fatherhood", "child care"],
    relevantFor: ["parenting", "baby", "children", "family"],
  },
  {
    name: "Education",
    metaId: "6003327060545", // confirmed 2026-03-30
    path: "Interests > Education",
    aliases: ["learning", "school", "university", "academic"],
    relevantFor: ["education", "school", "university", "learning"],
  },
  {
    name: "Travel",
    metaId: "6004160395895", // confirmed 2026-03-30
    path: "Interests > Travel",
    aliases: ["travelling", "vacation", "holiday", "tourism"],
    relevantFor: ["travel", "tourism", "vacation", "holiday"],
  },
  {
    name: "Automobiles",
    metaId: "6003176678152", // confirmed 2026-03-30
    path: "Interests > Hobbies and activities > Automobiles",
    aliases: ["cars", "automotive", "vehicles", "car lovers"],
    relevantFor: ["automotive", "cars", "vehicles"],
  },
  {
    name: "Pets",
    metaId: "6004037726009", // confirmed 2026-03-30
    path: "Interests > Hobbies and activities > Pets",
    aliases: ["pet owners", "dogs", "cats", "pet care"],
    relevantFor: ["pets", "animals", "pet care"],
  },

  // ── Discovered via browse API (2026-03-30) ────────────────────────────────
  {
    name: "Simulation games",
    metaId: "6003246168013", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Simulation games",
    aliases: ["sim games", "simulation play", "virtual games", "simulator games"],
    relevantFor: ["gaming", "entertainment", "technology"],
  },
  {
    name: "Wearable technology",
    metaId: "6002896783422", // discovered 2026-03-30
    path: "Interests > Additional interests > Wearable technology",
    aliases: ["wearables", "tech gadgets", "smart devices", "fitness trackers"],
    relevantFor: ["technology", "fashion", "fitness", "health"],
  },
  {
    name: "Ballet",
    metaId: "6003247127613", // discovered 2026-03-30
    path: "Interests > Entertainment > Live events > Ballet",
    aliases: ["ballet dance", "ballet performance", "classical ballet", "dance shows"],
    relevantFor: ["entertainment", "events", "arts"],
  },
  {
    name: "TV reality shows",
    metaId: "6003268182136", // discovered 2026-03-30
    path: "Interests > Entertainment > TV > TV reality shows",
    aliases: ["reality tv", "reality shows", "tv shows", "entertainment shows"],
    relevantFor: ["entertainment", "media", "television"],
  },
  {
    name: "Drama movies",
    metaId: "6003375422677", // discovered 2026-03-30
    path: "Interests > Entertainment > Movies > Drama movies",
    aliases: ["drama films", "drama cinema", "dramatic movies", "film drama"],
    relevantFor: ["entertainment", "movies", "cinema"],
  },
  {
    name: "Food and drink",
    metaId: "6009248606271", // discovered 2026-03-30
    path: "Interests > Food and drink",
    aliases: ["food & drink", "cuisine", "meals", "dining"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Seafood",
    metaId: "6003240742699", // discovered 2026-03-30
    path: "Interests > Food and drink > Food > Seafood",
    aliases: ["sea food", "ocean food", "marine food", "fish dishes"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Fast food restaurants",
    metaId: "6003372667195", // discovered 2026-03-30
    path: "Interests > Food and drink > Restaurants > Fast food restaurants",
    aliases: ["fast food", "quick meals", "fast dining", "takeaway food"],
    relevantFor: ["food", "restaurants", "fast food"],
  },
  {
    name: "Cuisine",
    metaId: "6003195797498", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine",
    aliases: ["cooking styles", "food types", "cooking methods", "cuisine types"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Recipes",
    metaId: "6003385609165", // discovered 2026-03-30
    path: "Interests > Food and drink > Cooking > Recipes",
    aliases: ["cooking recipes", "meal ideas", "recipe ideas", "cooking tips"],
    relevantFor: ["food", "cooking", "culinary"],
  },
  {
    name: "Italian cuisine",
    metaId: "6003102729234", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > Italian cuisine",
    aliases: ["italian food", "pasta", "pizza", "italian dishes"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Documentary movies",
    metaId: "6003373175581", // discovered 2026-03-30
    path: "Interests > Entertainment > Movies > Documentary movies",
    aliases: ["docu films", "documentaries", "non-fiction movies"],
    relevantFor: ["entertainment", "media", "film production"],
  },
  {
    name: "Wine",
    metaId: "6003148544265", // discovered 2026-03-30
    path: "Interests > Food and drink > Alcoholic beverages > Wine",
    aliases: ["red wine", "white wine", "wine lovers"],
    relevantFor: ["food", "beverages", "events"],
  },
  {
    name: "Chinese cuisine",
    metaId: "6003030029655", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > Chinese cuisine",
    aliases: ["chinese food", "dim sum", "wok dishes"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Japanese cuisine",
    metaId: "6002998123892", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > Japanese cuisine",
    aliases: ["sushi", "ramen", "japanese food"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Mexican cuisine",
    metaId: "6002964239317", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > Mexican cuisine",
    aliases: ["tacos", "nachos", "mexican food"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Korean cuisine",
    metaId: "6003343485089", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > Korean cuisine",
    aliases: ["korean bbq", "kimchi", "korean food"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Indian cuisine",
    metaId: "6003494675627", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > Indian cuisine",
    aliases: ["curry", "naan", "indian food"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "French cuisine",
    metaId: "6003420024431", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > French cuisine",
    aliases: ["croissant", "baguette", "french food"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Thai cuisine",
    metaId: "6003283801502", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > Thai cuisine",
    aliases: ["pad thai", "green curry", "thai food"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Vietnamese cuisine",
    metaId: "6003346311730", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > Vietnamese cuisine",
    aliases: ["vietnamese food", "vietnam cuisine", "pho lovers"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Spanish cuisine",
    metaId: "6003108649035", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > Spanish cuisine",
    aliases: ["spanish food", "tapas lovers", "paella fans"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Greek cuisine",
    metaId: "6003306415421", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > Greek cuisine",
    aliases: ["greek food", "mediterranean cuisine", "gyros lovers"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "German cuisine",
    metaId: "6004094205989", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > German cuisine",
    aliases: ["german food", "wurst lovers", "schnitzel fans"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Middle Eastern cuisine",
    metaId: "6003200340482", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > Middle Eastern cuisine",
    aliases: ["middle eastern food", "arab cuisine", "kebab lovers"],
    relevantFor: ["food", "restaurants", "catering"],
  },
  {
    name: "Information technology",
    metaId: "6003164535634", // discovered 2026-03-30
    path: "Interests > Additional interests > Information technology",
    aliases: ["it", "tech", "information tech"],
    relevantFor: ["b2b", "technology", "consulting"],
  },
  {
    name: "Educational technology",
    metaId: "6003285403725", // discovered 2026-03-30
    path: "Interests > Additional interests > Educational technology",
    aliases: ["edtech", "educational tech", "learning technology"],
    relevantFor: ["education", "b2b", "technology"],
  },
  {
    name: "Creative Technology",
    metaId: "6003484902657", // discovered 2026-03-30
    path: "Interests > Additional interests > Creative Technology",
    aliases: ["creative tech", "innovation tech", "design technology"],
    relevantFor: ["technology", "b2b", "creative"],
  },
  {
    name: "Institute of technology",
    metaId: "6003274677708", // discovered 2026-03-30
    path: "Interests > Additional interests > Institute of technology",
    aliases: ["tech institute", "technology school", "tech academy"],
    relevantFor: ["education", "b2b", "technology"],
  },
  {
    name: "Bachelor of Technology",
    metaId: "6003328460097", // discovered 2026-03-30
    path: "Interests > Additional interests > Bachelor of Technology",
    aliases: ["btech", "bachelor tech", "tech degree"],
    relevantFor: ["education", "b2b", "technology"],
  },
  {
    name: "Kingston Technology",
    metaId: "6003785641878", // discovered 2026-03-30
    path: "Interests > Additional interests > Kingston Technology",
    aliases: ["kingston", "kingston tech", "kingston storage"],
    relevantFor: ["electronics", "b2b", "technology"],
  },
  {
    name: "Audio equipment",
    metaId: "6003729124262", // discovered 2026-03-30
    path: "Interests > Technology > Consumer electronics > Audio equipment",
    aliases: ["audio gear", "sound equipment", "audio tech"],
    relevantFor: ["music", "electronics", "events"],
  },
  {
    name: "Music technology",
    metaId: "6003232941285", // discovered 2026-03-30
    path: "Interests > Additional interests > Music technology",
    aliases: ["music tech", "music innovation", "audio technology"],
    relevantFor: ["music", "events", "technology"],
  },
  {
    name: "Environmental technology",
    metaId: "6003006343419", // discovered 2026-03-30
    path: "Interests > Additional interests > Environmental technology",
    aliases: ["enviro tech", "green technology", "sustainable tech"],
    relevantFor: ["environment", "b2b", "general"],
  },
  {
    name: "Information technology consulting",
    metaId: "6003142970561", // discovered 2026-03-30
    path: "Interests > Additional interests > Information technology consulting",
    aliases: ["it consulting", "tech consulting", "information tech"],
    relevantFor: ["b2b", "technology", "services"],
  },
  {
    name: "History of technology",
    metaId: "6811100008287", // discovered 2026-03-30
    path: "Interests > Additional interests > History of technology",
    aliases: ["tech history", "history of tech", "technology timeline"],
    relevantFor: ["education", "technology", "general"],
  },
  {
    name: "MIT Technology Review",
    metaId: "6003390650544", // discovered 2026-03-30
    path: "Interests > Additional interests > MIT Technology Review",
    aliases: ["mit review", "technology review", "mit tech"],
    relevantFor: ["education", "technology", "news"],
  },
  {
    name: "Clean technology",
    metaId: "6003377587796", // discovered 2026-03-30
    path: "Interests > Additional interests > Clean technology",
    aliases: ["clean tech", "sustainable technology", "eco tech"],
    relevantFor: ["environment", "b2b", "general"],
  },
  {
    name: "Technology Brands",
    metaId: "6875475826506", // discovered 2026-03-30
    path: "Interests > Additional interests > Technology Brands",
    aliases: ["tech brands", "technology companies", "tech firms"],
    relevantFor: ["b2b", "technology", "electronics"],
  },
  {
    name: "United States technology news",
    metaId: "6785743757421", // discovered 2026-03-30
    path: "Interests > Additional interests > United States technology news",
    aliases: ["us tech news", "american tech news", "us technology updates"],
    relevantFor: ["news", "technology", "general"],
  },
  {
    name: "Technology News",
    metaId: "6832283273521", // discovered 2026-03-30
    path: "Interests > Additional interests > Technology News",
    aliases: ["tech news", "tech updates", "gadget news"],
    relevantFor: ["electronics", "media", "b2b"],
  },
  {
    name: "Bachelor of Science in Information Technology",
    metaId: "6003440159537", // discovered 2026-03-30
    path: "Interests > Additional interests > Bachelor of Science in Information Technology",
    aliases: ["bsc it", "information tech degree", "it bachelor"],
    relevantFor: ["education", "b2b", "technology"],
  },
  {
    name: "Mobile technology",
    metaId: "6003372379828", // discovered 2026-03-30
    path: "Interests > Additional interests > Mobile technology",
    aliases: ["mobile tech", "smartphone tech", "mobile devices"],
    relevantFor: ["electronics", "telecommunications", "technology"],
  },
  {
    name: "Computer memory",
    metaId: "6003349175527", // discovered 2026-03-30
    path: "Interests > Technology > Computers > Computer memory",
    aliases: ["computer storage", "ram", "memory tech"],
    relevantFor: ["electronics", "technology", "b2b"],
  },
  {
    name: "Travel content and inspiration",
    metaId: "6790608003312", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel content and inspiration",
    aliases: ["travel ideas", "travel inspiration", "wanderlust content"],
    relevantFor: ["travel", "media", "lifestyle"],
  },
  {
    name: "Fitness and wellness",
    metaId: "6003384248805", // discovered 2026-03-30
    path: "Interests > Fitness and wellness",
    aliases: ["health and fitness", "wellness", "fitness lifestyle"],
    relevantFor: ["fitness", "health", "lifestyle"],
  },
  {
    name: "Physical exercise",
    metaId: "6004115167424", // discovered 2026-03-30
    path: "Interests > Fitness and wellness > Physical exercise",
    aliases: ["exercise", "workout", "physical fitness"],
    relevantFor: ["fitness", "health", "lifestyle"],
  },
  {
    name: "Sports games",
    metaId: "6003540150873", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Sports games",
    aliases: ["sports", "game tournaments", "competitive games"],
    relevantFor: ["entertainment", "sports", "events"],
  },
  {
    name: "Air travel",
    metaId: "6003211401886", // discovered 2026-03-30
    path: "Interests > Travel > Air travel",
    aliases: ["flights", "air travel", "aviation"],
    relevantFor: ["travel", "transportation", "lifestyle"],
  },
  {
    name: "Adventure travel",
    metaId: "6002868021822", // discovered 2026-03-30
    path: "Interests > Travel > Adventure travel",
    aliases: ["adventure trips", "exploration travel", "outdoor travel"],
    relevantFor: ["travel", "adventure", "lifestyle"],
  },
  {
    name: "Travel + Leisure",
    metaId: "6003121064322", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel + Leisure",
    aliases: ["travel", "vacation", "leisure", "exploration", "tourism"],
    relevantFor: ["travel", "hospitality", "events", "lifestyle", "adventure"],
  },
  {
    name: "First class travel",
    metaId: "6003076027139", // discovered 2026-03-30
    path: "Interests > Additional interests > First class travel",
    aliases: ["first class", "luxury flight", "premium travel", "elite travel", "exclusive travel"],
    relevantFor: ["travel", "luxury", "hospitality", "events", "b2b"],
  },
  {
    name: "Travel photography",
    metaId: "6003714264753", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel photography",
    aliases: ["photo travel", "travel pics", "travel photography", "wanderlust photography", "exploration photography"],
    relevantFor: ["photography", "travel", "lifestyle", "media", "events"],
  },
  {
    name: "Travel website",
    metaId: "6003136399408", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel website",
    aliases: ["travel site", "travel blog", "travel platform", "travel portal", "trip website"],
    relevantFor: ["travel", "technology", "media", "lifestyle", "b2b"],
  },
  {
    name: "Travel Adventures",
    metaId: "6003349868805", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel Adventures",
    aliases: ["adventure travel", "exploration trips", "travel experiences", "journey adventures", "travel escapades"],
    relevantFor: ["travel", "adventure", "events", "lifestyle", "hospitality"],
  },
  {
    name: "Backpacking (travel)",
    metaId: "6003523122770", // discovered 2026-03-30
    path: "Interests > Additional interests > Backpacking (travel)",
    aliases: ["backpacking", "budget travel", "adventure backpacking", "travel hiking", "explorer"],
    relevantFor: ["travel", "adventure", "lifestyle", "youth", "events"],
  },
  {
    name: "Luxury Travel",
    metaId: "6003011087019", // discovered 2026-03-30
    path: "Interests > Additional interests > Luxury Travel",
    aliases: ["luxury trips", "high-end travel", "exclusive vacations", "premium travel", "first class travel"],
    relevantFor: ["travel", "luxury", "hospitality", "events", "b2b"],
  },
  {
    name: "Travel literature",
    metaId: "6003181721612", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel literature",
    aliases: ["travel books", "travel stories", "journey literature", "exploration books", "wanderlust literature"],
    relevantFor: ["literature", "travel", "media", "education", "lifestyle"],
  },
  {
    name: "Travel Blogger",
    metaId: "6003271483551", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel Blogger",
    aliases: ["travel influencer", "travel content creator", "travel vlogger", "travel writer", "travel enthusiast"],
    relevantFor: ["travel", "media", "lifestyle", "events", "b2b"],
  },
  {
    name: "Business travel",
    metaId: "6003257861969", // discovered 2026-03-30
    path: "Interests > Additional interests > Business travel",
    aliases: ["corporate travel", "business trips", "professional travel", "work travel", "executive travel"],
    relevantFor: ["travel", "b2b", "hospitality", "events", "luxury"],
  },
  {
    name: "Travel insurance",
    metaId: "6002950471174", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel insurance",
    aliases: ["travel cover", "trip insurance", "insurance for travel"],
    relevantFor: ["travel", "insurance", "events"],
  },
  {
    name: "Traveloka",
    metaId: "6013282572781", // discovered 2026-03-30
    path: "Interests > Additional interests > Traveloka",
    aliases: ["traveloka app", "travel booking", "travel platform"],
    relevantFor: ["travel", "technology", "e-commerce"],
  },
  {
    name: "Condé Nast Traveler",
    metaId: "6003070150915", // discovered 2026-03-30
    path: "Interests > Additional interests > Condé Nast Traveler",
    aliases: ["conde nast", "travel magazine", "lifestyle publication"],
    relevantFor: ["travel", "media", "lifestyle"],
  },
  {
    name: "Travel Channel",
    metaId: "6003515206570", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel Channel",
    aliases: ["travel network", "travel shows", "travel entertainment"],
    relevantFor: ["travel", "media", "entertainment"],
  },
  {
    name: "National Geographic Traveler",
    metaId: "6003805168383", // discovered 2026-03-30
    path: "Interests > Additional interests > National Geographic Traveler",
    aliases: ["nat geo traveler", "national geographic", "travel documentary"],
    relevantFor: ["travel", "media", "education"],
  },
  {
    name: "Travelocity",
    metaId: "6003142327626", // discovered 2026-03-30
    path: "Interests > Additional interests > Travelocity",
    aliases: ["travelocity app", "online travel", "booking site"],
    relevantFor: ["travel", "technology", "e-commerce"],
  },
  {
    name: "Travelzoo",
    metaId: "6003153717233", // discovered 2026-03-30
    path: "Interests > Additional interests > Travelzoo",
    aliases: ["travelzoo deals", "travel offers", "discount travel"],
    relevantFor: ["travel", "e-commerce", "promotions"],
  },
  {
    name: "Travel trailer",
    metaId: "6003248633267", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel trailer",
    aliases: ["travel trailer", "caravan", "mobile home"],
    relevantFor: ["travel", "automotive", "outdoors"],
  },
  {
    name: "TUI Travel",
    metaId: "6003117429458", // discovered 2026-03-30
    path: "Interests > Additional interests > TUI Travel",
    aliases: ["tui holidays", "tui travel agency", "holiday packages"],
    relevantFor: ["travel", "hospitality", "events"],
  },
  {
    name: "Traveller (role-playing game)",
    metaId: "6002986041520", // discovered 2026-03-30
    path: "Interests > Additional interests > Traveller (role-playing game)",
    aliases: ["traveller game", "role-playing game", "rpg"],
    relevantFor: ["gaming", "entertainment", "hobbies"],
  },
  {
    name: "Travel the World",
    metaId: "6003395737402", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel the World",
    aliases: ["travel", "world travel", "explore", "wanderlust"],
    relevantFor: ["travel", "tourism", "hospitality", "events"],
  },
  {
    name: "BBC Travel",
    metaId: "6003445240283", // discovered 2026-03-30
    path: "Interests > Additional interests > BBC Travel",
    aliases: ["bbc travel", "bbc trips", "bbc adventures"],
    relevantFor: ["travel", "media", "entertainment", "events"],
  },
  {
    name: "Travel documentary",
    metaId: "6003362437387", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel documentary",
    aliases: ["travel docs", "travel films", "documentaries"],
    relevantFor: ["travel", "media", "entertainment", "education"],
  },
  {
    name: "STA Travel",
    metaId: "6004169669224", // discovered 2026-03-30
    path: "Interests > Additional interests > STA Travel",
    aliases: ["sta", "student travel agency", "sta trips"],
    relevantFor: ["travel", "education", "youth services", "events"],
  },
  {
    name: "TV Travel Channels",
    metaId: "6801677589256", // discovered 2026-03-30
    path: "Interests > Additional interests > TV Travel Channels",
    aliases: ["travel tv", "travel shows", "tv trips"],
    relevantFor: ["media", "entertainment", "travel", "events"],
  },
  {
    name: "Travel Agents and Booking",
    metaId: "6777460559594", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel Agents and Booking",
    aliases: ["travel agents", "booking agents", "travel booking"],
    relevantFor: ["travel", "hospitality", "b2b", "events"],
  },
  {
    name: "Travel services",
    metaId: "6748285195849", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel services",
    aliases: ["travel services", "travel support", "trip services"],
    relevantFor: ["travel", "hospitality", "b2b", "events"],
  },
  {
    name: "Travel attractions and activities",
    metaId: "6795812983902", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel attractions and activities",
    aliases: ["attractions", "travel activities", "sightseeing"],
    relevantFor: ["travel", "tourism", "events", "hospitality"],
  },
  {
    name: "Food and travel TV shows",
    metaId: "6825465329591", // discovered 2026-03-30
    path: "Interests > Additional interests > Food and travel TV shows",
    aliases: ["food travel shows", "culinary travel", "food and travel"],
    relevantFor: ["food", "media", "entertainment", "travel"],
  },
  {
    name: "Student travel",
    metaId: "6859250077531", // discovered 2026-03-30
    path: "Interests > Additional interests > Student travel",
    aliases: ["student trips", "youth travel", "student tourism"],
    relevantFor: ["education", "travel", "youth services", "events"],
  },
  {
    name: "Intrepid Travel",
    metaId: "6002990111594", // discovered 2026-03-30
    path: "Interests > Additional interests > Intrepid Travel",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Beach Travellers",
    metaId: "6014648415813", // discovered 2026-03-30
    path: "Interests > Additional interests > Beach Travellers",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "USA TODAY Travel",
    metaId: "6003271915580", // discovered 2026-03-30
    path: "Interests > Additional interests > USA TODAY Travel",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "The Travel Guide",
    metaId: "6003602445420", // discovered 2026-03-30
    path: "Interests > Additional interests > The Travel Guide",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Hotels",
    metaId: "6003572379887", // discovered 2026-03-30
    path: "Interests > Travel > Hotels",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Travel Leaders",
    metaId: "6003644697516", // discovered 2026-03-30
    path: "Interests > Additional interests > Travel Leaders",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Trip & Travel Blog",
    metaId: "6012763982289", // discovered 2026-03-30
    path: "Interests > Additional interests > Trip & Travel Blog",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "RV Travel",
    metaId: "6003278188454", // discovered 2026-03-30
    path: "Interests > Additional interests > RV Travel",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Budget Travel",
    metaId: "6003537112663", // discovered 2026-03-30
    path: "Interests > Additional interests > Budget Travel",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "National Parks Traveler",
    metaId: "6003112249068", // discovered 2026-03-30
    path: "Interests > Additional interests > National Parks Traveler",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Rock music",
    metaId: "6003582732907", // discovered 2026-03-30
    path: "Interests > Entertainment > Music > Rock music",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Friends Travel",
    metaId: "6012184755075", // discovered 2026-03-30
    path: "Interests > Additional interests > Friends Travel",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Luxury Travel Advisor",
    metaId: "6003516640664", // discovered 2026-03-30
    path: "Interests > Additional interests > Luxury Travel Advisor",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Solo Travel Society",
    metaId: "6002894968162", // discovered 2026-03-30
    path: "Interests > Additional interests > Solo Travel Society",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Holiday Travel",
    metaId: "6003438320940", // discovered 2026-03-30
    path: "Interests > Additional interests > Holiday Travel",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Tourism",
    metaId: "6003430696269", // discovered 2026-03-30
    path: "Interests > Travel > Tourism",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Educational entertainment",
    metaId: "6008931329140", // discovered 2026-03-30
    path: "Interests > Additional interests > Educational entertainment",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Comedy movies",
    metaId: "6003161475030", // discovered 2026-03-30
    path: "Interests > Entertainment > Movies > Comedy movies",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Musical theatre",
    metaId: "6003351312828", // discovered 2026-03-30
    path: "Interests > Entertainment > Movies > Musical theatre",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Zee Entertainment Enterprises",
    metaId: "6003396473977", // discovered 2026-03-30
    path: "Interests > Additional interests > Zee Entertainment Enterprises",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Sony Pictures Entertainment",
    metaId: "6002933324059", // discovered 2026-03-30
    path: "Interests > Additional interests > Sony Pictures Entertainment",
    aliases: ["sony pics", "sony films", "sony movies"],
    relevantFor: ["entertainment", "media", "events"],
  },
  {
    name: "Marvel Entertainment",
    metaId: "6003495261627", // discovered 2026-03-30
    path: "Interests > Additional interests > Marvel Entertainment",
    aliases: ["marvel", "marvel comics", "marvel movies"],
    relevantFor: ["entertainment", "media", "events", "toys"],
  },
  {
    name: "Sony Music Entertainment",
    metaId: "6002932510173", // discovered 2026-03-30
    path: "Interests > Additional interests > Sony Music Entertainment",
    aliases: ["sony music", "sony artists", "music label"],
    relevantFor: ["music", "entertainment", "events"],
  },
  {
    name: "Workpoint Entertainment",
    metaId: "6005174809719", // discovered 2026-03-30
    path: "Interests > Additional interests > Workpoint Entertainment",
    aliases: ["workpoint", "workpoint tv", "workpoint shows"],
    relevantFor: ["entertainment", "media", "events"],
  },
  {
    name: "Entertainment Tonight",
    metaId: "6003324039806", // discovered 2026-03-30
    path: "Interests > Additional interests > Entertainment Tonight",
    aliases: ["entertainment tonight", "et", "ent tonight"],
    relevantFor: ["entertainment", "media", "events"],
  },
  {
    name: "Entertainment Weekly",
    metaId: "6003127768817", // discovered 2026-03-30
    path: "Interests > Additional interests > Entertainment Weekly",
    aliases: ["ent weekly", "entertainment weekly", "ew"],
    relevantFor: ["entertainment", "media", "events"],
  },
  {
    name: "Entertainment News",
    metaId: "6002992430794", // discovered 2026-03-30
    path: "Interests > Additional interests > Entertainment News",
    aliases: ["ent news", "entertainment news", "showbiz news"],
    relevantFor: ["entertainment", "media", "news"],
  },
  {
    name: "Live Nation Entertainment",
    metaId: "6003277667171", // discovered 2026-03-30
    path: "Interests > Additional interests > Live Nation Entertainment",
    aliases: ["live nation", "live events", "concerts"],
    relevantFor: ["entertainment", "events", "music"],
  },
  {
    name: "YG Entertainment",
    metaId: "6003700407383", // discovered 2026-03-30
    path: "Interests > Additional interests > YG Entertainment",
    aliases: ["yg", "yg family", "yg artists"],
    relevantFor: ["music", "entertainment", "events"],
  },
  {
    name: "S.M. Entertainment",
    metaId: "6003136447208", // discovered 2026-03-30
    path: "Interests > Additional interests > S.M. Entertainment",
    aliases: ["sm entertainment", "sm artists", "sm music"],
    relevantFor: ["music", "entertainment", "events"],
  },
  {
    name: "Blizzard Entertainment",
    metaId: "6003414351791", // discovered 2026-03-30
    path: "Interests > Additional interests > Blizzard Entertainment",
    aliases: ["blizzard", "blizzard games", "blizzard ent", "gaming", "video games"],
    relevantFor: ["gaming", "entertainment", "technology", "events"],
  },
  {
    name: "Regal Entertainment",
    metaId: "6003052648845", // discovered 2026-03-30
    path: "Interests > Additional interests > Regal Entertainment",
    aliases: ["regal", "regal cinema", "regal films", "movies", "film"],
    relevantFor: ["entertainment", "events", "cinema", "media"],
  },
  {
    name: "BuzzFeed Entertainment",
    metaId: "6012823531124", // discovered 2026-03-30
    path: "Interests > Additional interests > BuzzFeed Entertainment",
    aliases: ["buzzfeed", "buzz", "buzz entertainment", "media", "content"],
    relevantFor: ["media", "entertainment", "digital marketing", "content creation"],
  },
  {
    name: "JYP Entertainment",
    metaId: "6003060007356", // discovered 2026-03-30
    path: "Interests > Additional interests > JYP Entertainment",
    aliases: ["jyp", "jyp ent", "kpop", "korean entertainment", "music"],
    relevantFor: ["music", "entertainment", "events", "media"],
  },
  {
    name: "Cineplex Entertainment",
    metaId: "6003387560041", // discovered 2026-03-30
    path: "Interests > Additional interests > Cineplex Entertainment",
    aliases: ["cineplex", "cineplex cinema", "movies", "film", "entertainment"],
    relevantFor: ["cinema", "entertainment", "events", "media"],
  },
  {
    name: "Bwin.Party Digital Entertainment",
    metaId: "6003181259014", // discovered 2026-03-30
    path: "Interests > Additional interests > Bwin.Party Digital Entertainment",
    aliases: ["bwin", "bwin party", "digital entertainment", "gaming", "online games"],
    relevantFor: ["gaming", "entertainment", "technology", "events"],
  },
  {
    name: "Electronic Entertainment Expo",
    metaId: "6003289670927", // discovered 2026-03-30
    path: "Interests > Additional interests > Electronic Entertainment Expo",
    aliases: ["e3", "expo", "electronic expo", "gaming expo", "entertainment expo"],
    relevantFor: ["gaming", "technology", "events", "entertainment"],
  },
  {
    name: "Lions Gate Entertainment",
    metaId: "6003299555101", // discovered 2026-03-30
    path: "Interests > Additional interests > Lions Gate Entertainment",
    aliases: ["lions gate", "lions gate films", "movies", "film", "entertainment"],
    relevantFor: ["entertainment", "cinema", "media", "events"],
  },
  {
    name: "Family entertainment center",
    metaId: "6003301879911", // discovered 2026-03-30
    path: "Interests > Additional interests > Family entertainment center",
    aliases: ["family fun", "family center", "family entertainment", "kids entertainment", "amusement"],
    relevantFor: ["family", "entertainment", "events", "leisure"],
  },
  {
    name: "20th Century Fox Home Entertainment",
    metaId: "6003299657211", // discovered 2026-03-30
    path: "Interests > Additional interests > 20th Century Fox Home Entertainment",
    aliases: ["20th century fox", "fox home", "fox films", "movies", "entertainment"],
    relevantFor: ["entertainment", "cinema", "media", "events"],
  },
  {
    name: "Obsidian Entertainment",
    metaId: "6003114781917", // discovered 2026-03-30
    path: "Interests > Additional interests > Obsidian Entertainment",
    aliases: ["obsidian", "obsidian games", "obsidian media"],
    relevantFor: ["entertainment", "gaming", "media"],
  },
  {
    name: "Caesars Entertainment Corporation",
    metaId: "6003661107516", // discovered 2026-03-30
    path: "Interests > Additional interests > Caesars Entertainment Corporation",
    aliases: ["caesars", "caesars entertainment", "caesars corp"],
    relevantFor: ["entertainment", "hospitality", "gaming"],
  },
  {
    name: "General Entertainment TV Channels",
    metaId: "6769105986741", // discovered 2026-03-30
    path: "Interests > Additional interests > General Entertainment TV Channels",
    aliases: ["general tv", "entertainment channels", "tv shows"],
    relevantFor: ["entertainment", "media", "broadcasting"],
  },
  {
    name: "US Entertainment channels",
    metaId: "6758894227681", // discovered 2026-03-30
    path: "Interests > Additional interests > US Entertainment channels",
    aliases: ["us tv", "us channels", "american entertainment"],
    relevantFor: ["entertainment", "media", "broadcasting"],
  },
  {
    name: "Online entertainment",
    metaId: "6741787152315", // discovered 2026-03-30
    path: "Interests > Additional interests > Online entertainment",
    aliases: ["online media", "digital entertainment", "streaming"],
    relevantFor: ["entertainment", "technology", "media"],
  },
  {
    name: "Entertainment Websites",
    metaId: "6826610163406", // discovered 2026-03-30
    path: "Interests > Additional interests > Entertainment Websites",
    aliases: ["entertainment sites", "media websites", "entertainment portals"],
    relevantFor: ["entertainment", "media", "digital marketing"],
  },
  {
    name: "Paramount Home Entertainment",
    metaId: "6003224206699", // discovered 2026-03-30
    path: "Interests > Additional interests > Paramount Home Entertainment",
    aliases: ["paramount", "paramount media", "paramount films"],
    relevantFor: ["entertainment", "film", "media"],
  },
  {
    name: "TV talkshows",
    metaId: "6003172448161", // discovered 2026-03-30
    path: "Interests > Entertainment > TV > TV talkshows",
    aliases: ["talkshows", "tv discussions", "talk shows"],
    relevantFor: ["entertainment", "media", "broadcasting"],
  },
  {
    name: "SeaWorld Entertainment",
    metaId: "6003095847732", // discovered 2026-03-30
    path: "Interests > Additional interests > SeaWorld Entertainment",
    aliases: ["seaworld", "seaworld parks", "seaworld attractions"],
    relevantFor: ["entertainment", "tourism", "leisure"],
  },
  {
    name: "Theme parks",
    metaId: "6003902462066", // discovered 2026-03-30
    path: "Interests > Travel > Theme parks",
    aliases: ["theme parks", "amusement parks", "fun parks"],
    relevantFor: ["travel", "entertainment", "tourism"],
  },
  {
    name: "Hip hop music",
    metaId: "6003225556345", // discovered 2026-03-30
    path: "Interests > Entertainment > Music > Hip hop music",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Racing games",
    metaId: "6003385141743", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Racing games",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Music",
    metaId: "6003020834693", // discovered 2026-03-30
    path: "Interests > Entertainment > Music",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Pop music",
    metaId: "6003341579196", // discovered 2026-03-30
    path: "Interests > Entertainment > Music > Pop music",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Music videos",
    metaId: "6003332483177", // discovered 2026-03-30
    path: "Interests > Entertainment > Music > Music videos",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Electronic music",
    metaId: "6003902397066", // discovered 2026-03-30
    path: "Interests > Entertainment > Music > Electronic music",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Rhythm and blues music",
    metaId: "6003195554098", // discovered 2026-03-30
    path: "Interests > Entertainment > Music > Rhythm and blues music",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Heavy metal music",
    metaId: "6003633122583", // discovered 2026-03-30
    path: "Interests > Entertainment > Music > Heavy metal music",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Country music",
    metaId: "6003493980595", // discovered 2026-03-30
    path: "Interests > Entertainment > Music > Country music",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Jazz music",
    metaId: "6003146442552", // discovered 2026-03-30
    path: "Interests > Entertainment > Music > Jazz music",
    aliases: [],
    relevantFor: [],
  },
  {
    name: "Soul music",
    metaId: "6003107699532", // discovered 2026-03-30
    path: "Interests > Entertainment > Music > Soul music",
    aliases: ["soul", "soulful tunes", "soul vibes", "soul genre"],
    relevantFor: ["music", "events", "entertainment"],
  },
  {
    name: "Blues music",
    metaId: "6003257757682", // discovered 2026-03-30
    path: "Interests > Entertainment > Music > Blues music",
    aliases: ["blues", "bluesy", "blues tunes", "blues genre"],
    relevantFor: ["music", "events", "entertainment"],
  },
  {
    name: "Classical music",
    metaId: "6002951587955", // discovered 2026-03-30
    path: "Interests > Entertainment > Music > Classical music",
    aliases: ["classical", "orchestral", "classical tunes", "classical genre"],
    relevantFor: ["music", "events", "education"],
  },
  {
    name: "Music festivals",
    metaId: "6003108826384", // discovered 2026-03-30
    path: "Interests > Entertainment > Live events > Music festivals",
    aliases: ["music fests", "festivals", "live music", "music events"],
    relevantFor: ["events", "entertainment", "music"],
  },
  {
    name: "Dance music",
    metaId: "6003179515414", // discovered 2026-03-30
    path: "Interests > Entertainment > Music > Dance music",
    aliases: ["dance", "dance tracks", "dance beats", "dance genre"],
    relevantFor: ["music", "events", "entertainment"],
  },
  {
    name: "Theatre",
    metaId: "6002957026250", // discovered 2026-03-30
    path: "Interests > Entertainment > Live events > Theatre",
    aliases: ["theater", "stage shows", "live theatre", "theatrical events"],
    relevantFor: ["events", "entertainment", "arts"],
  },
  {
    name: "Concerts",
    metaId: "6002970406974", // discovered 2026-03-30
    path: "Interests > Entertainment > Live events > Concerts",
    aliases: ["live concerts", "gigs", "music shows", "concert events"],
    relevantFor: ["events", "entertainment", "music"],
  },
  {
    name: "Dancehalls",
    metaId: "6003247890613", // discovered 2026-03-30
    path: "Interests > Entertainment > Live events > Dancehalls",
    aliases: ["dancehall", "dance events", "dance parties", "dance venues"],
    relevantFor: ["events", "entertainment", "music"],
  },
  {
    name: "Strategy games",
    metaId: "6003582500438", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Strategy games",
    aliases: ["strategy games", "tactical games", "strategy play", "board games"],
    relevantFor: ["gaming", "entertainment", "b2b"],
  },
  {
    name: "Cameras",
    metaId: "6003325186571", // discovered 2026-03-30
    path: "Interests > Technology > Consumer electronics > Cameras",
    aliases: ["cameras", "photo gear", "camera equipment", "photography gear"],
    relevantFor: ["electronics", "photography", "technology"],
  },
  {
    name: "Literature",
    metaId: "6003247790075", // discovered 2026-03-30
    path: "Interests > Entertainment > Reading > Literature",
    aliases: ["lit", "books", "novels", "reading", "literary"],
    relevantFor: ["education", "publishing", "events", "general"],
  },
  {
    name: "Beer",
    metaId: "6003012461997", // discovered 2026-03-30
    path: "Interests > Food and drink > Alcoholic beverages > Beer",
    aliases: ["brew", "lager", "ale", "pint", "drinks"],
    relevantFor: ["food", "events", "hospitality", "general"],
  },
  {
    name: "Puzzle video games",
    metaId: "6003668975718", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Puzzle video games",
    aliases: ["puzzle games", "brain games", "logic games", "video puzzles", "gaming"],
    relevantFor: ["entertainment", "gaming", "technology", "general"],
  },
  {
    name: "Games",
    metaId: "6003070856229", // discovered 2026-03-30
    path: "Interests > Entertainment > Games",
    aliases: ["gaming", "video games", "play", "entertainment", "games"],
    relevantFor: ["entertainment", "gaming", "technology", "general"],
  },
  {
    name: "Action movies",
    metaId: "6003243604899", // discovered 2026-03-30
    path: "Interests > Entertainment > Movies > Action movies",
    aliases: ["action films", "action flicks", "blockbusters", "thrillers", "movies"],
    relevantFor: ["entertainment", "film", "events", "general"],
  },
  {
    name: "Online games",
    metaId: "6003153672865", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Online games",
    aliases: ["online gaming", "web games", "browser games", "multiplayer games", "gaming"],
    relevantFor: ["entertainment", "gaming", "technology", "general"],
  },
  {
    name: "First-person shooter games",
    metaId: "6003059733932", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > First-person shooter games",
    aliases: ["fps games", "shooter games", "first-person games", "action shooters", "gaming"],
    relevantFor: ["entertainment", "gaming", "technology", "general"],
  },
  {
    name: "Thriller movies",
    metaId: "6003225325061", // discovered 2026-03-30
    path: "Interests > Entertainment > Movies > Thriller movies",
    aliases: ["thriller films", "suspense movies", "drama films", "intense movies", "movies"],
    relevantFor: ["entertainment", "film", "events", "general"],
  },
  {
    name: "Science fiction movies",
    metaId: "6003206308286", // discovered 2026-03-30
    path: "Interests > Entertainment > Movies > Science fiction movies",
    aliases: ["sci-fi films", "science fiction", "futuristic movies", "space movies", "movies"],
    relevantFor: ["entertainment", "film", "events", "general"],
  },
  {
    name: "Card games",
    metaId: "6003647522546", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Card games",
    aliases: ["card games", "deck games", "table games", "strategy games", "gaming"],
    relevantFor: ["entertainment", "gaming", "events", "general"],
  },
  {
    name: "Action games",
    metaId: "6002971095994", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Action games",
    aliases: ["action games", "shooters", "adventure games", "combat games"],
    relevantFor: ["entertainment", "gaming", "events"],
  },
  {
    name: "Role-playing games",
    metaId: "6003380576181", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Role-playing games",
    aliases: ["rpg games", "role play", "character games", "story games"],
    relevantFor: ["entertainment", "gaming", "events"],
  },
  {
    name: "Online poker",
    metaId: "6003030519207", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Online poker",
    aliases: ["online poker", "poker games", "card games", "gambling games"],
    relevantFor: ["entertainment", "gaming", "events", "b2b"],
  },
  {
    name: "Massively multiplayer online games",
    metaId: "6003176101552", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Massively multiplayer online games",
    aliases: ["mmos", "multiplayer games", "online multiplayer", "massive games"],
    relevantFor: ["entertainment", "gaming", "events"],
  },
  {
    name: "TV game shows",
    metaId: "6003126358188", // discovered 2026-03-30
    path: "Interests > Entertainment > TV > TV game shows",
    aliases: ["game shows", "tv quizzes", "contest shows", "reality games"],
    relevantFor: ["entertainment", "media", "events"],
  },
  {
    name: "Massively multiplayer online role-playing games",
    metaId: "6003198370967", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Massively multiplayer online role-playing games",
    aliases: ["mmorpg", "online rpg", "multiplayer role play", "fantasy games"],
    relevantFor: ["entertainment", "gaming", "events"],
  },
  {
    name: "Board games",
    metaId: "6003342470823", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Board games",
    aliases: ["table games", "classic games", "family games", "strategy games"],
    relevantFor: ["entertainment", "gaming", "events"],
  },
  {
    name: "Word games",
    metaId: "6002964500317", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Word games",
    aliases: ["word puzzles", "language games", "vocabulary games", "brain games"],
    relevantFor: ["entertainment", "education", "events"],
  },
  {
    name: "Browser games",
    metaId: "6003434373937", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Browser games",
    aliases: ["flash games", "online browser games", "web games", "casual games"],
    relevantFor: ["entertainment", "gaming", "events"],
  },
  {
    name: "Casino games",
    metaId: "6003248338072", // discovered 2026-03-30
    path: "Interests > Entertainment > Games > Casino games",
    aliases: ["casino games", "gambling games", "betting games", "table games"],
    relevantFor: ["entertainment", "gaming", "events", "b2b"],
  },
  {
    name: "A Luxury Travel Blog",
    metaId: "6003218161847", // discovered 2026-03-30
    path: "Interests > Additional interests > A Luxury Travel Blog",
    aliases: ["luxury travel", "posh trips", "high-end travel", "exclusive travel", "luxury getaway"],
    relevantFor: ["travel", "hospitality", "tourism", "lifestyle", "events"],
  },
  {
    name: "Luxury Escapes Travel",
    metaId: "1009636152401654", // discovered 2026-03-30
    path: "Interests > Additional interests > Luxury Escapes Travel",
    aliases: ["luxury escapes", "premium travel", "exclusive escapes", "high-end vacations", "luxury holidays"],
    relevantFor: ["travel", "hospitality", "tourism", "lifestyle", "events"],
  },
  {
    name: "Wedding anniversary",
    metaId: "6003358500600", // discovered 2026-03-30
    path: "Interests > Additional interests > Wedding anniversary",
    aliases: ["anniversary celebration", "wedding celebration", "love anniversary", "marriage anniversary", "couple's anniversary"],
    relevantFor: ["events", "weddings", "gifts", "hospitality", "lifestyle"],
  },
  {
    name: "Live events",
    metaId: "6010924093432", // discovered 2026-03-30
    path: "Interests > Entertainment > Live events",
    aliases: ["live shows", "events", "concerts", "performances", "live entertainment"],
    relevantFor: ["events", "entertainment", "music", "theater", "nightlife"],
  },
  {
    name: "Fast casual restaurants",
    metaId: "6003398056603", // discovered 2026-03-30
    path: "Interests > Food and drink > Restaurants > Fast casual restaurants",
    aliases: ["quick service restaurants", "fast food", "casual dining", "fast bites", "quick eats"],
    relevantFor: ["food", "restaurants", "hospitality", "catering", "lifestyle"],
  },
  {
    name: "Latin American cuisine",
    metaId: "6003102988840", // discovered 2026-03-30
    path: "Interests > Food and drink > Cuisine > Latin American cuisine",
    aliases: ["latin food", "south american cuisine", "hispanic cuisine", "latino food", "latin dishes"],
    relevantFor: ["food", "restaurants", "cuisine", "catering", "lifestyle"],
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
];

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

/**
 * Category-scoped interest catalog for prompt injection.
 * Returns relevant interests first, padded with universal entries up to `max`.
 */
export function buildScopedInterestCatalogPrompt(
  category?: string,
  max = 30,
): string {
  if (!category) return buildInterestCatalogPrompt();

  const relevant = suggestInterestsForCategory(category);
  if (relevant.length >= max) {
    return relevant
      .slice(0, max)
      .map((i) => i.name)
      .join(" | ");
  }

  // Pad with remaining entries sorted by universality (most relevantFor tags)
  const relevantIds = new Set(relevant.map((i) => i.name));
  const rest = META_INTEREST_SEEDS.filter(
    (i) => !relevantIds.has(i.name),
  ).sort((a, b) => b.relevantFor.length - a.relevantFor.length);

  const combined = [...relevant, ...rest].slice(0, max);
  return combined.map((i) => i.name).join(" | ");
}
