import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AspectRatio } from "@/components/creatives/studio/prompt-input";
import type { CreativeFormat } from "@/lib/ai/prompts";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GenerationEntry {
  imageUrl: string;
  id: string;
}

interface ExtractedBrand {
  brandName: string;
  businessDescription: string;
  imageOptions: string[];
}

interface StudioState {
  // Current session
  prompt: string;
  aspectRatio: AspectRatio;
  creativeFormat: CreativeFormat;
  isEnhanced: boolean;
  creationMode: "prompt" | "url";

  // URL mode
  urlInput: string;
  extractedBrand: ExtractedBrand | null;
  isExtracting: boolean;
  selectedImageUrl: string | null;

  // Generation result
  generatedImage: string | null;
  imageUrls: string[]; // reference images for editing
  generationHistory: GenerationEntry[];
  lastUsedFullPrompt: string | null;
  seed: number | undefined;

  // Active creative being edited
  activeCreativeId: string | null;

  // View mode
  viewMode: "input" | "result";

  // Actions
  setPrompt: (prompt: string) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setCreativeFormat: (format: CreativeFormat) => void;
  setIsEnhanced: (enhanced: boolean) => void;
  setCreationMode: (mode: "prompt" | "url") => void;
  setUrlInput: (url: string) => void;
  setExtractedBrand: (brand: ExtractedBrand | null) => void;
  setIsExtracting: (val: boolean) => void;
  setSelectedImageUrl: (url: string | null) => void;
  setGeneratedImage: (url: string | null) => void;
  setImageUrls: (urls: string[]) => void;
  appendGenerationHistory: (entry: GenerationEntry) => void;
  setLastUsedFullPrompt: (prompt: string | null) => void;
  setSeed: (seed: number | undefined) => void;
  setActiveCreativeId: (id: string | null) => void;
  setViewMode: (mode: "input" | "result") => void;
  resetSession: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_DEFAULTS = {
  prompt: "",
  aspectRatio: "1:1" as AspectRatio,
  creativeFormat: "auto" as CreativeFormat,
  isEnhanced: true,
  creationMode: "prompt" as const,
  urlInput: "",
  extractedBrand: null,
  isExtracting: false,
  selectedImageUrl: null,
  generatedImage: null,
  imageUrls: [],
  generationHistory: [],
  lastUsedFullPrompt: null,
  seed: undefined,
  activeCreativeId: null,
  viewMode: "input" as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      ...SESSION_DEFAULTS,

      setPrompt: (prompt) => set({ prompt }),
      setAspectRatio: (aspectRatio) => set({ aspectRatio }),
      setCreativeFormat: (creativeFormat) => set({ creativeFormat }),
      setIsEnhanced: (isEnhanced) => set({ isEnhanced }),
      setCreationMode: (creationMode) => set({ creationMode }),
      setUrlInput: (urlInput) => set({ urlInput }),
      setExtractedBrand: (extractedBrand) => set({ extractedBrand }),
      setIsExtracting: (isExtracting) => set({ isExtracting }),
      setSelectedImageUrl: (selectedImageUrl) => set({ selectedImageUrl }),
      setGeneratedImage: (generatedImage) => set({ generatedImage }),
      setImageUrls: (imageUrls) => set({ imageUrls }),
      appendGenerationHistory: (entry) =>
        set((s) => ({
          generationHistory: [...s.generationHistory, entry],
        })),
      setLastUsedFullPrompt: (lastUsedFullPrompt) =>
        set({ lastUsedFullPrompt }),
      setSeed: (seed) => set({ seed }),
      setActiveCreativeId: (activeCreativeId) => set({ activeCreativeId }),
      setViewMode: (viewMode) => set({ viewMode }),
      resetSession: () => set(SESSION_DEFAULTS),
    }),
    {
      name: "Tenzu-studio-session",
      // Don't persist the generated image URL itself — these can be temporary
      // Persist only settings and prompt so user can resume where they left off
      partialize: (state) => ({
        prompt: state.prompt,
        aspectRatio: state.aspectRatio,
        creativeFormat: state.creativeFormat,
        isEnhanced: state.isEnhanced,
        creationMode: state.creationMode,
        urlInput: state.urlInput,
        lastUsedFullPrompt: state.lastUsedFullPrompt,
        seed: state.seed,
        activeCreativeId: state.activeCreativeId,
      }),
    },
  ),
);
