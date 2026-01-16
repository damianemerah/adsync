import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AdSyncObjective } from "@/lib/constants";

interface SavedAudience {
  id: string;
  prompt: string;
  timestamp: number;
  interests: string[];
  locations: string[];
}

interface CampaignState {
  // Wizard Data
  currentStep: number;
  platform: "meta" | "tiktok" | null;
  objective: AdSyncObjective | null;

  // NEW: Store Name & Interests here to survive refresh
  campaignName: string;
  targetInterests: string[];
  destinationValue: string;

  // AI & Targeting
  aiPrompt: string;
  locations: string[];
  locationInput: string;
  customInterest: string;

  // Creative & Budget
  budget: number;
  selectedCreatives: string[];
  adCopy: { primary: string; headline: string; cta: string };

  // History
  savedAudiences: SavedAudience[];

  // User Scoping
  userId: string | null;
  hydrateForUser: (userId: string) => void;

  // Actions
  setStep: (step: number) => void;
  updateDraft: (data: Partial<CampaignState>) => void;
  setDestinationValue: (val: string) => void;
  resetDraft: () => void;
  saveAudience: (audience: Omit<SavedAudience, "id" | "timestamp">) => void;
}

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set, get) => ({
      // Initial Values
      currentStep: 1,
      platform: null,
      objective: null,

      campaignName: "", // Default empty, we will auto-set or let user type
      targetInterests: [], // Important!
      destinationValue: "",

      aiPrompt: "",
      locations: ["Lagos, Nigeria"],
      locationInput: "",
      customInterest: "",
      budget: 5000,
      selectedCreatives: [],
      adCopy: { primary: "", headline: "", cta: "Shop Now" },
      savedAudiences: [],
      userId: null,

      // Actions
      setStep: (step) => set({ currentStep: step }),

      hydrateForUser: (userId) => {
        const state = get();
        if (state.userId !== userId) {
          console.log("🧹 New user detected. Wiping campaign draft.");
          state.resetDraft();
          set({ userId });
        }
      },

      updateDraft: (data) => set((state) => ({ ...state, ...data })),
      setDestinationValue: (val) => set({ destinationValue: val }),

      resetDraft: () =>
        set({
          currentStep: 1,
          platform: null,
          objective: null,
          campaignName: "",
          targetInterests: [],
          destinationValue: "",
          aiPrompt: "",
          locations: ["Lagos, Nigeria"],
          locationInput: "",
          customInterest: "",
          budget: 5000,
          selectedCreatives: [],
          adCopy: { primary: "", headline: "", cta: "Shop Now" },
        }),

      saveAudience: (audience) =>
        set((state) => {
          const exists = state.savedAudiences.find(
            (a) => a.prompt === audience.prompt
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
      partialize: (state) => ({ ...state }),
    }
  )
);
