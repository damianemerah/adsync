import { create } from "zustand";
import { AdSyncObjective, MetaPlacement } from "@/lib/constants";
import type { CTAData } from "@/types/cta-types";

// NEW: Meta Targeting Types
export interface LocationOption {
  id: string; // Meta key
  name: string; // "Lagos"
  type: string; // city | region | country
  country: string; // Nigeria
}

export interface TargetingOption {
  id: string;
  name: string;
  resolved?: boolean;
}

export interface CopyVariation {
  headline: string;
  primary: string;
}

export interface Message {
  id: string;
  role: "ai" | "user";
  content: string;
  type?:
    | "text"
    | "suggestion"
    | "summary"
    | "copy_suggestion"
    | "clarification_choice"
    | "outcome_preview"
    | "recovery"
    | "network_error";
  data?: {
    interests?: any[];
    locations?: any[];
    adCopy?: { headline: string; primary: string };
    adCopyVariations?: CopyVariation[];
    clarificationOptions?: string[];
    inferredAssumptions?: string[];
    refinementQuestion?: string;
    // Outcome preview data
    outcomeLabel?: string;
    outcomeRange?: string;
    budget?: number;
    // Error recovery
    originalInput?: string;
    isMismatchPrompt?: boolean;
  };
}

export interface CampaignState {
  // Wizard Data
  currentStep: number;
  platform: "meta" | "tiktok" | null;
  objective: AdSyncObjective | null;
  metaPlacement: MetaPlacement; // Which Meta surfaces to show the ad on

  // NEW: Store Name & Interests here to survive refresh
  campaignName: string;
  targetInterests: TargetingOption[];

  // Optional fields for specific stages
  adSetName?: string;
  platformCampaignId?: string; // Set after launch
  pageId?: string; // Meta specific Page ID
  platformAccountId?: string; // Ad account ID being used

  // Objective-specific fields
  leadGenFormId: string | null; // leads objective: Meta Lead Gen Form ID
  appStoreUrl: string; // app_promotion: Play Store / App Store URL
  metaApplicationId: string; // app_promotion: Meta App ID from App Dashboard
  targetBehaviors: TargetingOption[]; // NEW
  ageRange: { min: number; max: number }; // NEW
  gender: "all" | "male" | "female"; // NEW
  targetLanguages: number[]; // Meta locale IDs e.g. [6] = English
  exclusionAudienceIds: string[]; // Meta custom audience IDs to exclude
  targetLifeEvents: TargetingOption[]; // Meta life_events field e.g. Newly Engaged, New Parents
  targetWorkPositions: TargetingOption[]; // Meta work_positions field e.g. Manager, Director
  targetIndustries: TargetingOption[]; // Meta industries field e.g. Management, Healthcare
  destinationValue: string;

  // AI & Targeting
  aiPrompt: string;
  /** Scraped/extracted website content when user provided a URL as business context. Used for image generation businessDescription. */
  resolvedSiteContext: string | null;
  latestAiSummary: string | null; // NEW: Persist the "I found X interests" text
  lastGeneratedObjective: AdSyncObjective | null; // NEW: Track consistency
  locations: LocationOption[];
  locationInput: string;
  customInterest: string;

  // Creative & Budget
  budget: number;
  selectedCreatives: string[];
  adCopy: {
    primary: string;
    headline: string;
    cta: CTAData;
  };

  // Carousel Support (2-10 cards)
  carouselCards: Array<{
    imageUrl: string; // Supabase public URL
    headline: string;
    description?: string;
    link?: string; // Optional per-card link (defaults to main destinationValue)
  }>;

  // NEW: Template Prediction
  selectedTemplate: string | null; // "nollywood" | "bet9ja" | "afrobeat" | "jumia"

  /**
   * Image generated in the chat bubble that hasn't been accepted yet.
   * Stored with a permanent Supabase URL (not ephemeral fal.ai CDN) so it
   * survives step navigation and page reloads.
   * Cleared when the user clicks "Use This" or dismisses explicitly.
   */
  pendingGeneratedImage: {
    url: string; // permanent Supabase Storage URL
    prompt: string; // prompt used to generate it
    aspectRatio: string; // "1:1" | "4:5" | "9:16" | "16:9"
    savedAt: number; // unix ms — for staleness checks
  } | null;

  /** Number of copy refinements done this session. Used to enforce Starter tier limit (max 3). */
  refinementCount: number;

  /** True while Phase 2 targeting resolution (background Meta API search + mini selection) is in progress. */
  isResolvingTargeting: boolean;
  /** True if Phase 2 targeting resolution failed (timeout or API error). */
  targetingResolutionError: boolean;

  /** AI-suggested lead form fields for leads objective. Populated by AI strategy result or local defaults. */
  suggestedLeadForm: {
    fields: Array<{
      type: string;
      label?: string;
      choices?: string[];
    }>;
    thankYouMessage: string;
  } | null;

  /** All copy variations returned by AI, sliced by tier limit. Index 0 mirrors adCopy. */
  adCopyVariations: CopyVariation[];

  /** Index of the variation the user pinned as their preferred copy (default 0). */
  selectedCopyIdx: number;

  messages: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;

  userId: string | null;

  // Actions
  setStep: (step: number) => void;
  updateDraft: (data: Partial<CampaignState>) => void;
  setDestinationValue: (val: string) => void;
  /** Pick a copy variation by index — updates adCopy to that variation. */
  selectCopyVariation: (idx: number) => void;
  resetDraft: () => void;
  hydrate: (data: Partial<CampaignState>) => void;
  applyTemplate: (templateId: string) => void;
  incrementRefinementCount: () => void;
}

export const useCampaignStore = create<CampaignState>()((set, get) => ({
  // Initial Values
  currentStep: 1,
  platform: null,
  objective: null,

  metaPlacement: "automatic" as MetaPlacement,
  campaignName: "", // Default empty, we will auto-set or let user type
  targetInterests: [], // Important!
  targetBehaviors: [],
  ageRange: { min: 18, max: 65 },
  gender: "all",
  targetLanguages: [],
  exclusionAudienceIds: [],
  targetLifeEvents: [],
  targetWorkPositions: [],
  targetIndustries: [],
  destinationValue: "",
  leadGenFormId: null,
  appStoreUrl: "",
  metaApplicationId: "",

  aiPrompt: "",
  resolvedSiteContext: null,
  latestAiSummary: null, // NEW
  lastGeneratedObjective: null, // NEW
  locations: [], // Start empty, force user/AI to add valid objects
  locationInput: "",
  customInterest: "",
  budget: 7000, // Matches "Grow" recommended tier in budget-launch-step
  selectedCreatives: [],
  adCopy: {
    primary: "",
    headline: "",
    cta: {
      intent: "buy_now",
      platformCode: "SHOP_NOW",
      displayLabel: "Shop now",
    },
  },
  carouselCards: [],
  selectedTemplate: null,
  pendingGeneratedImage: null,
  suggestedLeadForm: null,
  refinementCount: 0,
  isResolvingTargeting: false,
  targetingResolutionError: false,
  adCopyVariations: [],
  selectedCopyIdx: 0,
  messages: [],
  userId: null,

  // Actions
  setMessages: (updater) =>
    set((state) => ({
      messages:
        typeof updater === "function" ? updater(state.messages) : updater,
    })),
  setStep: (step) => set({ currentStep: step }),

  updateDraft: (data) =>
    set((state) => {
      const next = { ...state, ...data };

      // Reactive CTA defaults: when objective changes, auto-set the most logical CTA.
      // This prevents e.g. a WhatsApp campaign launching with a SHOP_NOW button,
      // or an Awareness campaign with a SEND_MESSAGE button.
      if (data.objective && data.objective !== state.objective) {
        const ctaDefaults: Record<
          string,
          { intent: string; platformCode: string; displayLabel: string }
        > = {
          whatsapp: {
            intent: "start_whatsapp_chat",
            platformCode: "SEND_MESSAGE",
            displayLabel: "Send message",
          },
          traffic: {
            intent: "buy_now",
            platformCode: "SHOP_NOW",
            displayLabel: "Shop now",
          },
          awareness: {
            intent: "learn_more",
            platformCode: "LEARN_MORE",
            displayLabel: "Learn more",
          },
          engagement: {
            intent: "learn_more",
            platformCode: "LEARN_MORE",
            displayLabel: "Learn more",
          },
          leads: {
            intent: "sign_up",
            platformCode: "SIGN_UP",
            displayLabel: "Sign up",
          },
          sales: {
            intent: "buy_now",
            platformCode: "SHOP_NOW",
            displayLabel: "Shop now",
          },
          app_promotion: {
            intent: "download",
            platformCode: "DOWNLOAD",
            displayLabel: "Download",
          },
        };

        const defaultCTA = ctaDefaults[data.objective];
        if (defaultCTA) {
          next.adCopy = {
            ...next.adCopy,
            cta: defaultCTA as typeof state.adCopy.cta,
          };
        }
      }

      return next;
    }),
  setDestinationValue: (val) => set({ destinationValue: val }),

  selectCopyVariation: (idx) =>
    set((state) => {
      const variation = state.adCopyVariations[idx];
      if (!variation) return state;
      return {
        selectedCopyIdx: idx,
        adCopy: {
          ...state.adCopy,
          headline: variation.headline,
          primary: variation.primary,
        },
      };
    }),

  incrementRefinementCount: () =>
    set((state) => ({ refinementCount: state.refinementCount + 1 })),

  hydrate: (data) => set((state) => ({ ...state, ...data })),

  resetDraft: () =>
    set({
      currentStep: 1,
      platform: null,
      objective: null,
      metaPlacement: "automatic" as MetaPlacement,
      campaignName: "",
      targetInterests: [],
      targetBehaviors: [],
      ageRange: { min: 18, max: 65 },
      gender: "all",
      targetLanguages: [],
      exclusionAudienceIds: [],
      targetLifeEvents: [],
      targetWorkPositions: [],
      targetIndustries: [],
      destinationValue: "",
      leadGenFormId: null,
      appStoreUrl: "",
      metaApplicationId: "",
      aiPrompt: "",
      resolvedSiteContext: null,
      latestAiSummary: null,
      lastGeneratedObjective: null,
      locations: [],
      locationInput: "",
      customInterest: "",
      budget: 7000, // Matches "Grow" recommended tier
      selectedCreatives: [],
      adCopy: {
        primary: "",
        headline: "",
        cta: {
          intent: "buy_now",
          platformCode: "SHOP_NOW",
          displayLabel: "Shop now",
        },
      },
      carouselCards: [],
      selectedTemplate: null,
      pendingGeneratedImage: null,
      suggestedLeadForm: null,
      adCopyVariations: [],
      selectedCopyIdx: 0,
      isResolvingTargeting: false,
      targetingResolutionError: false,
      messages: [],
      // refinementCount: 0, // Now persisted
    }),

  applyTemplate: (templateId: string) => {
    // Phase 2: Applying a template will pre-fill adCopy, targeting interests,
    // and budget based on industry vertical (e.g. fashion, food, beauty).
    // For now, just persists the selection so it can be read when templates ship.
    set({ selectedTemplate: templateId });
  },
}));
