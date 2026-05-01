import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useCampaignStore, TargetingOption } from "@/stores/campaign-store";
import { deriveAspectRatio } from "./utils";
import {
  generateAdCreative,
  autoSaveCreative,
} from "@/actions/ai-images";
import { saveDraft } from "@/actions/drafts";
import { CREDIT_COSTS } from "@/lib/constants";
import { useCreditBalance } from "@/hooks/use-subscription";

interface UseCreativeActionsProps {
  onUpgradeDialog: () => void;
}

export function useCreativeActions({ onUpgradeDialog }: UseCreativeActionsProps) {
  const router = useRouter();
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const { balance } = useCreditBalance();
  
  const { 
    objective, 
    adCopy, 
    aiPrompt,
    targetInterests, 
    targetBehaviors, 
    locations, 
    ageRange, 
    gender, 
    platform,
    updateDraft,
    pendingGeneratedImage,
    resolvedSiteContext
  } = useCampaignStore();

  const handleGenerateWithAI = async (overridePrompt?: string, referenceImageUrls?: string[]) => {
    if (isGeneratingAI) return;
    if (balance < CREDIT_COSTS.IMAGE_GEN_PRO) {
      toast.error(
        `Not enough credits. You need ${CREDIT_COSTS.IMAGE_GEN_PRO} credits to generate an image.`
      );
      onUpgradeDialog();
      return;
    }

    setIsGeneratingAI(true);
    const toastId = "ai-creative-gen";
    toast.loading("Designing your ad creative with AI...", { id: toastId });

    try {
      const campaignContext = {
        businessDescription:
          resolvedSiteContext ||
          aiPrompt.replace(/https?:\/\/\S+/g, "").trim() ||
          adCopy.primary.split("\n")[0] ||
          adCopy.headline ||
          "Product",
        targeting: {
          interests: (targetInterests || []).map((i: TargetingOption) => i.name),
          behaviors: (targetBehaviors || []).map((b: TargetingOption) => b.name),
          locations:
            locations.length > 0
              ? locations.map((l) => l.name)
              : ["Lagos, Nigeria"],
          demographics: {
            age_min: ageRange?.min ?? 18,
            age_max: ageRange?.max ?? 65,
            gender: gender ?? "all",
          },
        },
        copy: {
          headline: adCopy.headline || "Premium Product",
          bodyCopy: adCopy.primary || "",
        },
        platform: platform || "meta",
        objective: objective?.toString().includes("awareness")
          ? "awareness"
          : objective?.toString().includes("lead")
            ? "leads"
            : "sales",
      } as const;

      const aspectRatio = deriveAspectRatio(platform, objective);

      const composedPrompt = overridePrompt
        ? `${adCopy.headline || "product shot"}. Additional instructions: ${overridePrompt}`
        : adCopy.headline || aiPrompt || "product shot";

      const result = await generateAdCreative({
        prompt: composedPrompt,
        mode: "smart",
        aspectRatio,
        creativeFormat: "social_ad",
        campaignContext,
        imageInputs: referenceImageUrls?.length ? referenceImageUrls : undefined,
        imageIntent: referenceImageUrls?.length ? "reference" : undefined,
      });

      if (result?.imageUrl) {
        toast.loading("Saving your creative...", { id: toastId });
        const saved = await autoSaveCreative({
          falUrl: result.imageUrl,
          prompt: result.usedPrompt ?? "",
          aspectRatio,
        });
        updateDraft({
          pendingGeneratedImage: {
            url: saved.publicUrl,
            prompt: result?.usedPrompt ?? "",
            aspectRatio,
            savedAt: Date.now(),
          },
        });
        toast.success("AI creative ready to review!", { id: toastId });
      } else {
        throw new Error("No image URL returned");
      }
    } catch {
      toast.error(
        "Couldn't generate image. Please try again or upload your own.",
        { id: toastId },
      );
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAcceptImage = async (imageUrl: string) => {
    // Image was already auto-saved when generated — just accept it.
    updateDraft({ selectedCreatives: [imageUrl], pendingGeneratedImage: null });
  };

  const handleEditInStudio = async (imageUrl: string, imagePrompt: string) => {
    const toastId = toast.loading("Saving campaign progress...");
    let savedId = null;
    try {
      const state = useCampaignStore.getState();
      savedId = await saveDraft(state);
      toast.dismiss(toastId);
    } catch (e) {
      toast.error("Could not save campaign draft");
      toast.dismiss(toastId);
    }
    const ratio =
      pendingGeneratedImage?.aspectRatio || deriveAspectRatio(platform, objective);
    const params = new URLSearchParams({
      image: imageUrl,
      prompt: imagePrompt,
      aspectRatio: ratio,
      returnTo: `/campaigns/new?resume=true${savedId ? `&draftId=${savedId}` : ""}`,
      returnStep: "3",
    });
    router.push(`/ai-creative/studio?${params.toString()}`);
  };

  return {
    isGeneratingAI,
    handleGenerateWithAI,
    handleAcceptImage,
    handleEditInStudio
  };
}
