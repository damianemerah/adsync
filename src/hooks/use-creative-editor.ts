"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { generateAdCreative, autoSaveCreative } from "@/actions/ai-images";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";
import { useCampaignStore } from "@/stores/campaign-store";
import { useCreativeHistory } from "@/hooks/use-creatives";
import { type CampaignContext } from "@/lib/ai/context-compiler";
import { type AspectRatio } from "@/components/creatives/studio/prompt-input";

function inferAspectRatio(
  width: number | null,
  height: number | null,
): AspectRatio {
  if (!width || !height) return "1:1";
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.1) return "1:1";
  if (Math.abs(ratio - 4 / 5) < 0.1) return "4:5";
  if (Math.abs(ratio - 9 / 16) < 0.1) return "9:16";
  if (Math.abs(ratio - 16 / 9) < 0.1) return "16:9";
  return "1:1";
}

export function useCreativeEditor(id: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { activeOrgId } = useActiveOrgContext();
  const { updateDraft } = useCampaignStore();

  const returnTo = searchParams.get("returnTo");

  // Client-only state driven by AI generation
  const [activeCreativeId, setActiveCreativeId] = useState<string>(id);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [generationHistory, setGenerationHistory] = useState<{ id: string; imageUrl: string }[]>([]);
  const [lastUsedFullPrompt, setLastUsedFullPrompt] = useState<string | null>(
    null,
  );

  // Primary data query: creative + campaign context in one round-trip
  const { data, isLoading } = useQuery({
    queryKey: ["creative", id, activeOrgId],
    queryFn: async () => {
      const supabase = createClient();

      const { data: creativeData, error } = await supabase
        .from("creatives")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        toast.error("Failed to load creative");
        router.push("/ai-creative/studio");
        return null;
      }

      let campaignContext: CampaignContext | null = null;
      let campaignName: string | null = null;

      if (creativeData.campaign_id) {
        const { data: campaignData } = await supabase
          .from("campaigns")
          .select("ai_context, name")
          .eq("id", creativeData.campaign_id)
          .single();

        if (campaignData?.ai_context) {
          campaignContext =
            campaignData.ai_context as unknown as CampaignContext;
          campaignName = campaignData.name;
        }
      }

      return { creative: creativeData, campaignContext, campaignName };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Sync history from the history hook
  const { data: historyData } = useCreativeHistory(activeCreativeId);

  // Derive from history data (read-only — client state is authoritative after first
  // generation, but we seed it from DB on initial load via this hook)
  const dbSeed = historyData?.seed;
  const dbHistory =
    historyData?.history?.map((h: { id: string; imageUrl: string }) => ({
      id: h.id,
      imageUrl: h.imageUrl,
    })) ?? [];
  const dbLastPrompt = historyData?.prompt ?? null;

  const effectiveSeed = seed ?? dbSeed;
  const effectiveHistory = generationHistory.length > 0 ? generationHistory : dbHistory;
  const effectiveLastPrompt = lastUsedFullPrompt ?? dbLastPrompt;

  const creative = data?.creative ?? null;
  const campaignContext = data?.campaignContext ?? null;
  const campaignName = data?.campaignName ?? null;
  const generatedImage = creative?.original_url ?? null;
  const prompt = creative?.generation_prompt ?? "";
  const aspectRatio = inferAspectRatio(
    creative?.width ?? null,
    creative?.height ?? null,
  );

  // --- Handlers ---

  const handleRefine = async (
    refinePrompt: string,
    currentImage: string,
    refineSeed?: number,
    additionalImages?: string[],
  ): Promise<string> => {
    const promptWithContinuity = effectiveLastPrompt
      ? `Maintain technical settings of @image1: ${effectiveLastPrompt}. CHANGE: ${refinePrompt}`
      : refinePrompt;

    const allInputImages = [currentImage, ...(additionalImages || [])];

    try {
      const result = await generateAdCreative({
        prompt: promptWithContinuity,
        mode: "refine",
        imageInputs: allInputImages,
        aspectRatio,
        seed: refineSeed || effectiveSeed,
        imageIntent: "edit",
        parentCreativeId: activeCreativeId,
        campaignContext: campaignContext || undefined,
      });

      if (!result) {
        throw new Error("Failed to generate creative - no result returned");
      }

      if (result.seed && !seed) {
        setSeed(result.seed);
      }

      if (result.usedPrompt) {
        setLastUsedFullPrompt(result.usedPrompt);
      }

      // Auto-save immediately — no explicit Save step required
      const saved = await autoSaveCreative({
        falUrl: result.imageUrl,
        prompt: result.usedPrompt ?? "",
        aspectRatio,
        parentCreativeId: activeCreativeId,
      });

      setActiveCreativeId(saved.creativeId);
      setGenerationHistory((prev) => [
        ...prev,
        { id: saved.creativeId, imageUrl: saved.publicUrl },
      ]);
      queryClient.invalidateQueries({ queryKey: ["creatives", activeOrgId] });
      queryClient.invalidateQueries({
        queryKey: ["creative-history", saved.creativeId, activeOrgId],
      });

      return saved.publicUrl;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Refinement failed";
      toast.error("Refinement Failed", { description: msg });
      throw error;
    }
  };

  const handleUseInCampaign = async (imageUrl: string) => {
    // Image is already auto-saved — just add to campaign draft.
    updateDraft({ selectedCreatives: [imageUrl], pendingGeneratedImage: null });

    toast.success("Creative added to your campaign!", {
      description:
        "You're back in the campaign wizard — ready to set your budget.",
    });

    const draftId = searchParams.get("draftId");
    let target = returnTo || "/campaigns/new";
    if (draftId && !target.includes("draftId=")) {
      target += target.includes("?")
        ? `&draftId=${draftId}`
        : `?draftId=${draftId}`;
    }
    if (!target.includes("resume=true")) {
      target += target.includes("?") ? "&resume=true" : "?resume=true";
    }

    router.push(target);
  };

  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    router.push("/ai-creative/studio");
  };

  const rootId =
    historyData?.history?.find((h: any) => h.isRoot)?.id ?? null;

  return {
    isLoading,
    creative,
    campaignContext,
    campaignName,
    generatedImage,
    prompt,
    aspectRatio,
    seed: effectiveSeed,
    generationHistory: effectiveHistory,
    lastUsedFullPrompt: effectiveLastPrompt,
    rootId,
    handleRefine,
    handleUseInCampaign,
    handleBack,
  };
}
