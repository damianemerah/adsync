"use client";

import { use, useState, useEffect } from "react";
import { generateAdCreative, saveCreativeToLibrary } from "@/actions/ai-images";
import {
  PromptInput,
  AspectRatio,
} from "@/components/creatives/studio/prompt-input";
import { CreativeFormat } from "@/lib/ai/prompts";
import { GenerationView } from "@/components/creatives/studio/generation-view";
import { Sparks } from "iconoir-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCreativeHistory } from "@/hooks/use-creatives";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { type CampaignContext } from "@/lib/ai/context-compiler";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "next/navigation";
import { useCampaignStore } from "@/stores/campaign-store";
import { useBeforeLeave } from "@/hooks/use-before-leave";

interface EditCreativePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditCreativePage({ params }: EditCreativePageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { updateDraft } = useCampaignStore();
  // Campaign wizard return-flow
  const returnTo = searchParams.get("returnTo");
  const returnStep = searchParams.get("returnStep");
  const [isLoading, setIsLoading] = useState(true);
  const [creative, setCreative] = useState<{
    id: string;
    original_url: string;
    generation_prompt: string | null;
    campaign_id: string | null;
    width: number | null;
    height: number | null;
  } | null>(null);

  // Track the ACTIVE creative ID
  const [activeCreativeId, setActiveCreativeId] = useState<string>(id);

  // State
  const [viewMode, setViewMode] = useState<"input" | "result">("result");
  const [prompt, setPrompt] = useState("");
  const [isEnhanced, setIsEnhanced] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [creativeFormat, setCreativeFormat] = useState<CreativeFormat>("auto");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [generationHistory, setGenerationHistory] = useState<string[]>([]);
  const [lastUsedFullPrompt, setLastUsedFullPrompt] = useState<string | null>(
    null,
  );
  const [campaignContext, setCampaignContext] =
    useState<CampaignContext | null>(null);
  const [campaignName, setCampaignName] = useState<string | null>(null);

  // True once the user has actually generated at least one new variation.
  // Used to skip redundant re-saves when returning to campaign without editing.
  const [hasEdited, setHasEdited] = useState(false);

  // Warn if user tries to close the tab after making unsaved edits
  useBeforeLeave(hasEdited, "You have unsaved edits. Leave anyway?");

  // Use Hook for History
  const { data: historyData, isLoading: isHistoryLoading } =
    useCreativeHistory(activeCreativeId);

  // Load creative data
  useEffect(() => {
    async function loadCreative() {
      try {
        setIsLoading(true);
        const supabase = createClient();

        const { data, error } = await supabase
          .from("creatives")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          toast.error("Failed to load creative");
          router.push("/creations/studio");
          return;
        }

        setCreative(data);
        setGeneratedImage(data.original_url);
        setPrompt(data.generation_prompt || "");

        // Try to infer aspect ratio from dimensions
        if (data.width && data.height) {
          const ratio = data.width / data.height;
          if (Math.abs(ratio - 1) < 0.1) setAspectRatio("1:1");
          else if (Math.abs(ratio - 4 / 5) < 0.1) setAspectRatio("4:5");
          else if (Math.abs(ratio - 9 / 16) < 0.1) setAspectRatio("9:16");
          else if (Math.abs(ratio - 16 / 9) < 0.1) setAspectRatio("16:9");
        }

        // Load campaign context if available
        if (data.campaign_id) {
          const { data: campaignData } = await supabase
            .from("campaigns")
            .select("ai_context, name")
            .eq("id", data.campaign_id)
            .single();

          if (campaignData?.ai_context) {
            setCampaignContext(
              campaignData.ai_context as unknown as CampaignContext,
            );
            setCampaignName(campaignData.name);
          }
        }
      } catch (err) {
        console.error("Error loading creative:", err);
        toast.error("Something went wrong");
        router.push("/creations/studio");
      } finally {
        setIsLoading(false);
      }
    }

    loadCreative();
  }, [id, router]);

  // Sync hook history data into local state
  useEffect(() => {
    if (historyData) {
      if (historyData.prompt) setLastUsedFullPrompt(historyData.prompt);
      if (historyData.seed !== undefined) setSeed(historyData.seed);
      if (historyData.history && historyData.history.length > 0) {
        setGenerationHistory(historyData.history.map((h) => h.imageUrl));
      }
    }
  }, [historyData]);

  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    router.push("/creations/studio");
  };

  // Use in Campaign.
  // If no edits have been made the image URL is already permanent (loaded from DB),
  // so we skip the re-save entirely. If edits were made, save the new variation first.
  const handleUseInCampaign = async (imageUrl: string) => {
    let finalUrl = imageUrl;

    if (hasEdited) {
      // New variation — promote to permanent library
      try {
        const result = await saveCreativeToLibrary({
          imageUrl,
          prompt: lastUsedFullPrompt || prompt,
          aspectRatio,
          parentCreativeId: activeCreativeId,
        });
        finalUrl = result.publicUrl;
        queryClient.invalidateQueries({ queryKey: ["creatives"] });
      } catch {
        // Non-fatal — use whatever URL we have
      }
    }
    // If !hasEdited, imageUrl is already the permanent DB URL — no save needed.

    // Clear the pending image flag now that it's been accepted into the campaign
    updateDraft({ selectedCreatives: [finalUrl], pendingGeneratedImage: null });

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

  const handleRefine = async (
    refinePrompt: string,
    currentImage: string,
    refineSeed?: number,
    additionalImages?: string[],
  ): Promise<string> => {
    // Context Continuity: Prepend previous technical anchors if available
    const promptWithContinuity = lastUsedFullPrompt
      ? `Maintain technical settings of @image1: ${lastUsedFullPrompt}. CHANGE: ${refinePrompt}`
      : refinePrompt;

    // Merge current image with new reference images
    const allInputImages = [currentImage, ...(additionalImages || [])];

    try {
      const result = await generateAdCreative({
        prompt: promptWithContinuity,
        mode: "refine",
        imageInputs: allInputImages,
        aspectRatio,
        seed: refineSeed || seed,
        imageIntent: "edit",
        parentCreativeId: activeCreativeId,
        campaignContext: campaignContext || undefined,
      });

      if (result.seed && !seed) {
        setSeed(result.seed);
      }

      if (result.usedPrompt) {
        setLastUsedFullPrompt(result.usedPrompt);
      }

      // Mark as edited — we now have a new unsaved variation
      setHasEdited(true);

      return result.imageUrl;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Refinement failed";
      toast.error("Refinement Failed", { description: msg });
      throw error;
    }
  };

  // Save the current image to the permanent library.
  // If no edits were made the image is already saved (it's a [id] page),
  // so saveCreativeToLibrary's dedup guard will return the existing record.
  const handleSave = async (imageUrl: string) => {
    const result = await saveCreativeToLibrary({
      imageUrl,
      prompt: lastUsedFullPrompt || prompt,
      aspectRatio,
      parentCreativeId: activeCreativeId,
    });

    setActiveCreativeId(result.creativeId);
    setHasEdited(false); // saved — no more unsaved warning
    queryClient.invalidateQueries({ queryKey: ["creatives"] });
    queryClient.invalidateQueries({
      queryKey: ["creative-history", result.creativeId],
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-muted">
        <div className="space-y-4 w-full max-w-2xl p-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  // Shared header
  const sharedHeader = (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-2 sm:px-4 lg:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-30">
      <div className="container max-w-7xl mx-auto flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">Edit Creative</h1>
          {campaignName && (
            <Badge className="ml-2 bg-primary/10 text-primary border-primary/20 gap-1.5">
              <Sparks className="h-3 w-3" />
              {campaignName.slice(0, 25)}
              {campaignName.length > 25 ? "..." : ""}
            </Badge>
          )}
        </div>
      </div>
    </header>
  );

  return (
    <div className="flex h-full w-full flex-col bg-muted/30">
      {sharedHeader}
      <div className="flex-1 min-h-0">
        <GenerationView
          initialImage={generatedImage || ""}
          initialPrompt={prompt}
          onBack={handleBack}
          onRefine={handleRefine}
          onSave={handleSave}
          aspectRatio={aspectRatio}
          seed={seed}
          history={generationHistory}
          onUseInCampaign={returnTo ? handleUseInCampaign : undefined}
        />
      </div>
    </div>
  );
}
