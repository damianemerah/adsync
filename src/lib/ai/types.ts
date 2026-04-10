// Meta classification from Step 0 in the system prompt
export interface AIStrategyMeta {
  input_type:
    | "TYPE_A"
    | "TYPE_B"
    | "TYPE_C"
    | "TYPE_D"
    | "TYPE_E"
    | "TYPE_F"
    | "TYPE_G";
  needs_clarification: boolean;
  clarification_question: string | null;
  clarification_options: Array<{
    label: string;
    /** "send" → binary/intent, fires immediately. "prefill" → data-carrying, populates input for user to verify. */
    mode: "send" | "prefill";
  }> | null;
  is_question: boolean;
  question_answer: string | null;
  price_signal: "low" | "mid" | "high" | "unknown";
  detected_business_type:
    | "fashion"
    | "beauty"
    | "food"
    | "electronics"
    | "events"
    | "b2b"
    | "general"
    | "unknown";
  confidence: number; // 0.0 – 1.0
  /** What the AI assumed when input was incomplete (shown to user for transparency) */
  inferred_assumptions?: string[];
  /** The single refinement question the AI asks after generating a full strategy */
  refinement_question?: string | null;
  /** For TYPE_G: short summary of what the AI will generate based on org profile */
  proposed_plan?: string | null;
  /** For TYPE_G: user must confirm before full generation runs */
  needs_confirmation?: boolean;
  /** Perplexity-style improvement suggestions shown after copy — non-blocking ↳ text links */
  follow_ups?: Array<{ label: string; instruction: string }> | null;
}

export interface AIStrategyResult {
  // Always present
  interests: string[];
  behaviors: string[];
  lifeEvents?: string[];
  workPositions?: string[];
  industries?: string[];
  targeting_mode?: "b2b" | "b2c" | "broad";
  demographics: {
    age_min: number;
    age_max: number;
    gender: "all" | "male" | "female";
  };
  suggestedLocations: string[];
  geo_strategy: {
    /** broad = region/country-level for awareness. cities = precise conversion targeting. */
    type: "broad" | "cities";
  } | null;
  estimatedReach: number;
  copy: string[];
  headline: string[];
  ctaIntent:
    | "start_whatsapp_chat"
    | "buy_now"
    | "learn_more"
    | "book_appointment"
    | "get_quote"
    | "sign_up"
    | "download";
  whatsappMessage?: string | null; // Only present when ctaIntent === "start_whatsapp_chat"
  suggestedLeadForm?: {
    fields: Array<{
      type: string;       // MetaStandardFieldType or "CUSTOM" or "USER_CHOICE"
      label?: string;     // For CUSTOM/USER_CHOICE fields
      choices?: string[]; // For USER_CHOICE fields
    }>;
    thankYouMessage: string;
  } | null;
  reasoning?: string;
  /**
   * One plain-English sentence that leads the chat response.
   * e.g. "Targeting women 18–35 in Lagos who follow beauty and hair content."
   */
  plain_english_summary?: string | null;

  // Classification metadata — always present in new responses
  meta: AIStrategyMeta;

  /** Routing hint added by the API route — tells the frontend how to render the response */
  responseKind?: string;

  // Optional usage statistics
  usage?: any;
}

export interface AIInput {
  businessDescription: string;
  location?: string;
  // New Context Fields
  industry?: string | null;
  sellingMethod?: string | null;
  priceTier?: string | null;
  customerGender?: string | null;
  // Goal Awareness
  objective?: string; // e.g. "Sales"
  objectiveContext?: {
    tone: string;
    targetingBias: string;
    ctaBias: string;
  };
  /** Existing copy passed during refinement so the AI knows what it's editing */
  currentCopy?: {
    headline: string;
    primary: string;
  };
  /** ISO country code of the org — drives AI persona (default: 'NG') */
  orgCountryCode?: string;
  /** Org-level business description from onboarding profile — used by triage for TYPE_G proposals */
  orgBusinessDescription?: string | null;
  /** Org-level WhatsApp number — pre-fills WhatsApp CTA context */
  orgWhatsappNumber?: string | null;
  /** Org-level website URL — used as fallback site context for TYPE_G */
  orgWebsite?: string | null;
  /** Scraped text content from a URL the user pasted — injected as <site> context */
  siteContext?: string | null;
  /** URL detected in the user's message when site scraping returned null — signals triage that a URL was provided but couldn't be fetched */
  detectedUrl?: string | null;
}
