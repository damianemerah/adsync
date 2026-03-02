import { create } from "zustand";
import { persist } from "zustand/middleware";
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
}

interface SavedAudience {
  id: string;
  prompt: string;
  timestamp: number;
  interests: TargetingOption[];
  locations: LocationOption[];
}

export interface CopyVariation {
  headline: string;
  primary: string;
}

export interface CampaignState {
  // Wizard Data
  currentStep: number;
  platform: "meta" | "tiktok" | null;
  objective: AdSyncObjective | null;
  metaPlacement: MetaPlacement; // Which Meta surfaces to show the ad on
  metaSubPlacements: Record<string, string[]>; // e.g. { instagram: ["feed", "story"] }

  // NEW: Store Name & Interests here to survive refresh
  campaignName: string;
  targetInterests: TargetingOption[];
  targetBehaviors: TargetingOption[]; // NEW
  ageRange: { min: number; max: number }; // NEW
  gender: "all" | "male" | "female"; // NEW
  targetLanguages: number[]; // Meta locale IDs e.g. [6] = English
  exclusionAudienceIds: string[]; // Meta custom audience IDs to exclude
  targetLifeEvents: TargetingOption[]; // Meta life_events field e.g. Newly Engaged, New Parents
  destinationValue: string;

  // AI & Targeting
  aiPrompt: string;
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

  // NEW: Template & ROAS Prediction
  selectedTemplate: string | null; // "nollywood" | "bet9ja" | "afrobeat" | "jumia"
  predictedROAS: { value: number; confidence: number } | null;
  roasHistory: Array<{ timestamp: number; value: number }>; // Track changes over time

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

  /** All copy variations returned by AI, sliced by tier limit. Index 0 mirrors adCopy. */
  adCopyVariations: CopyVariation[];

  // History
  // Phase 2: savedAudiences will power a "Saved Audiences" panel in the audience step UI.
  // Currently populated by saveAudience() but not yet displayed anywhere.
  savedAudiences: SavedAudience[];

  // User Scoping
  userId: string | null;

  // Actions
  setStep: (step: number) => void;
  updateDraft: (data: Partial<CampaignState>) => void;
  setDestinationValue: (val: string) => void;
  resetDraft: () => void;
  saveAudience: (audience: Omit<SavedAudience, "id" | "timestamp">) => void;
  hydrate: (data: Partial<CampaignState>) => void;
  applyTemplate: (templateId: string) => void; // NEW
  updateROAS: (prediction: { value: number; confidence: number }) => void; // NEW
  incrementRefinementCount: () => void;
}

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set, get) => ({
      // Initial Values
      currentStep: 1,
      platform: null,
      objective: null,

      metaPlacement: "automatic" as MetaPlacement,
      metaSubPlacements: {
        instagram: ["feed", "story", "reels", "instagram_explore", "shop"],
        facebook: ["feed", "video_feeds", "instream_video"],
      },
      campaignName: "", // Default empty, we will auto-set or let user type
      targetInterests: [], // Important!
      targetBehaviors: [],
      ageRange: { min: 18, max: 65 },
      gender: "all",
      targetLanguages: [],
      exclusionAudienceIds: [],
      targetLifeEvents: [],
      destinationValue: "",

      aiPrompt: "",
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
      selectedTemplate: null,
      predictedROAS: null,
      roasHistory: [],
      pendingGeneratedImage: null,
      refinementCount: 0,
      adCopyVariations: [],
      savedAudiences: [],
      userId: null,

      // Actions
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

      incrementRefinementCount: () =>
        set((state) => ({ refinementCount: state.refinementCount + 1 })),

      hydrate: (data) => set((state) => ({ ...state, ...data })),

      resetDraft: () =>
        set({
          currentStep: 1,
          platform: null,
          objective: null,
          metaPlacement: "automatic" as MetaPlacement,
          metaSubPlacements: {
            instagram: ["feed", "story", "reels", "instagram_explore", "shop"],
            facebook: ["feed", "video_feeds", "instream_video"],
          },
          campaignName: "",
          targetInterests: [],
          targetBehaviors: [],
          ageRange: { min: 18, max: 65 },
          gender: "all",
          targetLanguages: [],
          exclusionAudienceIds: [],
          targetLifeEvents: [],
          destinationValue: "",
          aiPrompt: "",
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
          selectedTemplate: null,
          predictedROAS: null,
          roasHistory: [],
          pendingGeneratedImage: null,
          adCopyVariations: [],
          // refinementCount: 0, // Now persisted
        }),

      applyTemplate: (templateId: string) => {
        // Phase 2: Applying a template will pre-fill adCopy, targeting interests,
        // and budget based on industry vertical (e.g. fashion, food, beauty).
        // For now, just persists the selection so it can be read when templates ship.
        set({ selectedTemplate: templateId });
      },

      updateROAS: (prediction: { value: number; confidence: number }) =>
        set((state) => ({
          predictedROAS: prediction,
          roasHistory: [
            ...state.roasHistory,
            { timestamp: Date.now(), value: prediction.value },
          ].slice(-10), // Keep last 10 predictions
        })),

      saveAudience: (audience) =>
        set((state) => {
          const exists = state.savedAudiences.find(
            (a) => a.prompt === audience.prompt,
          );
          if (exists) return state;

          if (!audience.interests) {
            // Ensure interests are always present

            console.warn("Attempted to save audience without interests.");

            return state;
          }

          const newAudience = {
            ...audience,
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now(),
          };

          return {
            savedAudiences: [newAudience, ...state.savedAudiences].slice(0, 5),
          };
        }),
    }),
    {
      name: "adsync-campaign-draft",
      version: 10, // Bumped for adCopyVariations
      migrate: (persistedState: any, version) => {
        if (version < 2) {
          return {
            currentStep: 1,
            targetInterests: [],
            targetBehaviors: [],
            locations: [],
            // Reset other critical fields to safe defaults
            platform: null,
            objective: null,
            campaignName: "",
            ageRange: { min: 18, max: 65 },
            gender: "all",
            destinationValue: "",
            aiPrompt: "",
            locationInput: "",
            customInterest: "",
            budget: 5000,
            selectedCreatives: [],
            adCopy: { primary: "", headline: "", cta: "Shop Now" },
            savedAudiences: [],
            userId: null,
          } as unknown as CampaignState;
        }

        // Version 3 migration: Convert old string CTA to CTAData object
        if (version < 3) {
          const state = persistedState as any;

          // Check if adCopy.cta is a string (old format)
          if (state.adCopy && typeof state.adCopy.cta === "string") {
            const oldCTA = state.adCopy.cta;

            // Map common old CTA strings to new structure
            let newCTA: CTAData;

            if (
              oldCTA.toLowerCase().includes("message") ||
              oldCTA.toLowerCase().includes("whatsapp")
            ) {
              newCTA = {
                intent: "start_whatsapp_chat",
                platformCode: "SEND_MESSAGE",
                displayLabel: "Send message",
              };
            } else if (oldCTA.toLowerCase().includes("shop")) {
              newCTA = {
                intent: "buy_now",
                platformCode: "SHOP_NOW",
                displayLabel: "Shop now",
              };
            } else if (oldCTA.toLowerCase().includes("learn")) {
              newCTA = {
                intent: "learn_more",
                platformCode: "LEARN_MORE",
                displayLabel: "Learn more",
              };
            } else {
              // Default fallback
              newCTA = {
                intent: "buy_now",
                platformCode: "SHOP_NOW",
                displayLabel: "Shop now",
              };
            }

            return {
              ...state,
              adCopy: {
                ...state.adCopy,
                cta: newCTA,
              },
            } as CampaignState;
          }
        }

        // Version 4 migration: Add metaPlacement field
        if (version < 4) {
          return {
            ...(persistedState as any),
            metaPlacement: "automatic" as MetaPlacement,
          } as CampaignState;
        }

        // Version 5 migration: Add pendingGeneratedImage field
        if (version < 5) {
          return {
            ...(persistedState as any),
            pendingGeneratedImage: null,
          } as CampaignState;
        }

        // Version 6 migration: Add metaSubPlacements field
        if (version < 6) {
          return {
            ...(persistedState as any),
            metaSubPlacements: {
              instagram: [
                "feed",
                "story",
                "reels",
                "instagram_explore",
                "shop",
              ],
              facebook: ["feed", "video_feeds", "instream_video"],
            },
          } as CampaignState;
        }

        // Version 7 migration: Add refinementCount field
        if (version < 7) {
          return {
            ...(persistedState as any),
            refinementCount: 0,
          } as CampaignState;
        }

        // Version 8 migration: Add targetLanguages and exclusionAudienceIds
        if (version < 8) {
          return {
            ...(persistedState as any),
            targetLanguages: [],
            exclusionAudienceIds: [],
          } as CampaignState;
        }

        // Version 9 migration: Add targetLifeEvents
        if (version < 9) {
          return {
            ...(persistedState as any),
            targetLifeEvents: [],
          } as CampaignState;
        }

        // Version 10 migration: Add adCopyVariations
        if (version < 10) {
          return {
            ...(persistedState as any),
            adCopyVariations: [],
          } as CampaignState;
        }

        return persistedState as CampaignState;
      },
      partialize: (state) => ({ ...state }),
    },
  ),
);
