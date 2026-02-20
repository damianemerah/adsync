// Meta classification from Step 0 in the system prompt
export interface AIStrategyMeta {
  input_type: "TYPE_A" | "TYPE_B" | "TYPE_C" | "TYPE_D";
  needs_clarification: boolean;
  clarification_question: string | null;
  clarification_options: string[] | null;
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
  /** Human-readable plain English summary — shown as first line in chat */
  plain_english_summary?: string | null;
}

export interface AIStrategyResult {
  // Always present
  interests: string[];
  behaviors: string[];
  demographics: {
    age_min: number;
    age_max: number;
    gender: "all" | "male" | "female";
  };
  suggestedLocations: string[];
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
  whatsappMessage?: string; // Only present when ctaIntent === "start_whatsapp_chat"
  reasoning: string;
  /**
   * One plain-English sentence that leads the chat response.
   * e.g. "Targeting women 18–35 in Lagos who follow beauty and hair content."
   */
  plain_english_summary?: string | null;

  // Classification metadata — always present in new responses
  meta: AIStrategyMeta;
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
}
