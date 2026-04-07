/**
 * Pre-validated Meta Ads life event catalog — Nigerian market focus.
 *
 * Life events are time-sensitive targeting signals (relationship milestones,
 * moving, new job, parenting stages) and go into the `life_events` field,
 * NOT the `behaviors` field in the Meta API.
 *
 * Source: Meta Ads Manager → Detailed Targeting → Browse → Life Events
 *
 * WHY: The LLM generates life event names, then we call the API to resolve IDs.
 * By maintaining a local lookup of known-good names, we skip the API round-trip
 * for 90% of cases and guarantee a valid match.
 *
 * Last validated: 2026-03-05 via validate-meta-behaviors.ts + meta-behaviors-audit.json
 */

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
      "friends of recently moved",
      "housewarming gift buyers",
    ],
  },
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

  // ── Discovered via browse API (2026-03-31) ────────────────────────────────
  {
    name: "Away from family",
    metaId: "6003053857372", // discovered 2026-03-31
    path: "Demographics > Life events",
    relevantFor: [],
    aliases: [],
  },
  {
    name: "Away from hometown",
    metaId: "6003053860372", // discovered 2026-03-31
    path: "Demographics > Life events",
    relevantFor: [],
    aliases: [],
  },
  {
    name: "Birthday in April",
    metaId: "6048026275783", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    relevantFor: [],
    aliases: [],
  },
  {
    name: "Birthday in August",
    metaId: "6048810966183", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    relevantFor: [],
    aliases: [],
  },
  {
    name: "Birthday in December",
    metaId: "6048810914583", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    relevantFor: [],
    aliases: [],
  },
  {
    name: "Birthday in February",
    metaId: "6049083267183", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    relevantFor: [],
    aliases: [],
  },
  {
    name: "Birthday in January",
    metaId: "6048267235783", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    relevantFor: [],
    aliases: [],
  },
  {
    name: "Birthday in July",
    metaId: "6048808449583", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    relevantFor: [],
    aliases: [],
  },
  {
    name: "Birthday in June",
    metaId: "6048026229983", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    relevantFor: [],
    aliases: [],
  },
  {
    name: "Birthday in March",
    metaId: "6048026294583", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    relevantFor: ["events", "gifts", "party planning", "food", "fashion"],
    aliases: [],
  },
  {
    name: "Birthday in May",
    metaId: "6048026061783", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    relevantFor: ["events", "gifts", "party planning", "food", "fashion"],
    aliases: ["may birthday", "birthday may", "may bday"],
  },
  {
    name: "Birthday in November",
    metaId: "6048810938183", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    relevantFor: ["events", "gifts", "party planning", "food", "fashion"],
    aliases: ["november birthday", "birthday nov", "nov bday"],
  },
  {
    name: "Birthday in October",
    metaId: "6048810950583", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    relevantFor: ["events", "gifts", "party planning", "food", "fashion"],
    aliases: ["october birthday", "birthday oct", "oct bday"],
  },
  {
    name: "Birthday in September",
    metaId: "6048810961183", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday >  Birthday Month",
    relevantFor: ["events", "gifts", "party planning", "food", "fashion"],
    aliases: ["september birthday", "birthday sep", "sep bday"],
  },
  {
    name: "Upcoming birthday",
    metaId: "6002737124172", // discovered 2026-03-31
    path: "Demographics > Life events > Birthday",
    relevantFor: ["events", "gifts", "party planning", "food", "fashion"],
    aliases: ["upcoming bday", "next birthday", "birthday soon"],
  },
  {
    name: "Friends of Men with a Birthday in 0-7 days",
    metaId: "6203621472783", // confirmed 2026-03-05 (from audit rawResults)
    path: "Demographics > Life events > Friends of",
    relevantFor: ["gifts", "fashion", "electronics", "accessories", "events"],
    aliases: [
      "friends of men bday soon",
      "men bday friends 0-7",
      "male bday friends",
      "friends buying gifts for men",
      "male birthday purchase",
      "men birthday gift shoppers",
    ],
  },
  {
    name: "Friends of Men with a Birthday in 7-30 days",
    metaId: "6203621119983", // confirmed 2026-03-05 (from audit rawResults)
    path: "Demographics > Life events > Friends of",
    relevantFor: ["gifts", "fashion", "electronics", "accessories", "events"],
    aliases: [
      "friends of men bday later",
      "men bday friends 7-30",
      "male bday friends later",
      "upcoming men birthday gifts",
      "male birthday upcoming",
    ],
  },
  {
    name: "Friends of Women with a Birthday in 0-7 days",
    metaId: "6203621325983", // confirmed 2026-03-05 (from audit rawResults)
    path: "Demographics > Life events > Friends of",
    relevantFor: ["gifts", "fashion", "beauty", "accessories", "jewellery", "events"],
    aliases: [
      "friends of women bday soon",
      "women bday friends 0-7",
      "female bday friends",
      "friends buying gifts for women",
      "female birthday purchase",
      "women birthday gift shoppers",
    ],
  },
  {
    name: "Friends of Women with a Birthday in 7-30 days",
    metaId: "6203621025983", // confirmed 2026-03-05 (from audit rawResults)
    path: "Demographics > Life events > Friends of",
    relevantFor: ["gifts", "fashion", "beauty", "accessories", "events"],
    aliases: [
      "friends of women bday later",
      "women bday friends 7-30",
      "female bday friends later",
      "upcoming women birthday gifts",
      "female birthday upcoming",
    ],
  },
  {
    name: "Friends of people with birthdays in a month",
    metaId: "6203620854183", // confirmed 2026-03-05
    path: "Demographics > Life events > Friends of",
    relevantFor: ["gifts", "fashion", "events", "accessories", "flowers"],
    aliases: [
      "friends of people bday",
      "friends of bday month",
      "bday month friends",
      "event planning enthusiasts",
      "event planners",
      "event organizers",
      "party planners",
    ],
  },
  {
    name: "Friends of people with birthdays in a week",
    metaId: "6203621218383", // confirmed 2026-03-05 (from audit rawResults)
    path: "Demographics > Life events > Friends of",
    relevantFor: ["gifts", "fashion", "events", "accessories"],
    aliases: [
      "upcoming birthday friends",
      "friends birthday soon",
      "gift shoppers for friends",
      "short term gift buyers",
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

