"use client";

import { useState } from "react";
import {
  generateAdCreative,
  saveCreativeToLibrary,
} from "@/actions/ai-images";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  type AspectRatio,
} from "@/components/creatives/studio/prompt-input";
import { PageHeader } from "@/components/layout/page-header";
import { GenerationView } from "@/components/creatives/studio/generation-view";
import { Sparks, Link as LinkIcon } from "iconoir-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useCampaignStore } from "@/stores/campaign-store";
import { useStudioStore } from "@/store/studio-store";
import { useBeforeLeave } from "@/hooks/use-before-leave";
import { CREDIT_COSTS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { useStudioSessionSync } from "@/hooks/use-studio-session-sync";
import { type CampaignContext } from "@/lib/ai/context-compiler";
import { useRouter } from "next/navigation";
import { useCreativeHistory } from "@/hooks/use-creatives";

interface StudioClientProps {
  userFirstName: string;
  campaignContext: CampaignContext | null;
  campaignName: string | null;
  editCreative: any | null;
  historyData: any | null;
  initialParams: {
    image: string | null;
    prompt: string | null;
    aspectRatio: AspectRatio | null;
    editId: string | null;
    returnTo: string | null;
    draftId: string | null;
  };
}

export function StudioClient({
  userFirstName,
  campaignContext,
  campaignName,
  editCreative,
  historyData,
  initialParams,
}: StudioClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { updateDraft, metaPlacement, platform } = useCampaignStore();

  const { returnTo, draftId, editId } = initialParams;

  // ── Studio store (persisted session) ──────────────────────────────────────
  const {
    prompt,
    aspectRatio,
    creativeFormat,
    isEnhanced,
    creationMode,
    generatedImage,
    imageUrls,
    generationHistory,
    lastUsedFullPrompt,
    seed,
    activeCreativeId,
    viewMode,
    setPrompt,
    setAspectRatio,
    setCreativeFormat,
    setIsEnhanced,
    setCreationMode,
    setGeneratedImage,
    setImageUrls,
    appendGenerationHistory,
    setLastUsedFullPrompt,
    setSeed,
    setActiveCreativeId,
    setViewMode,
    resetSession,
  } = useStudioStore();

  console.log("LastUsedPrompt: ", lastUsedFullPrompt);


  const [isGenerating, setIsGenerating] = useState(false);

  // Warn on page close/refresh when an image has been generated but not saved
  useBeforeLeave(
    viewMode === "result" && !!generatedImage,
    "You have a generated image that hasn't been saved to your library yet. Leave anyway?",
  );

  // Sync server data to client session
  const { data: clientHistoryData } = useCreativeHistory(activeCreativeId);

  useStudioSessionSync({
    editCreative,
    historyData: historyData || clientHistoryData,
    initialImageParam: initialParams.image,
    promptParam: initialParams.prompt,
    aspectRatioParam: initialParams.aspectRatio,
    campaignContext,
    metaPlacement,
    platform,
    editId,
  });

  const handleGenerate = async () => {
    if (!prompt) {
      toast.error("Please enter a prompt description");
      return;
    }

    setIsGenerating(true);

    const sessionSeed = seed ?? Math.floor(Math.random() * 1000000);

    if (seed === undefined) {
      setSeed(sessionSeed);
    }

    try {
      const mode = isEnhanced ? "smart" : "raw";

      const result = await generateAdCreative({
        prompt: prompt,
        mode: mode,
        imageInputs: imageUrls.length > 0 ? imageUrls : undefined,
        aspectRatio: aspectRatio,
        seed: sessionSeed,
        currentCreativeId: activeCreativeId || undefined,
        parentCreativeId: activeCreativeId || undefined,
        imageIntent: imageUrls.length > 0 ? "reference" : undefined,
        creativeFormat: creativeFormat,
        campaignContext: campaignContext || undefined,
      });

      if (result?.imageUrl) {
        setGeneratedImage(result.imageUrl);
        setPrompt(result.usedPrompt);
        setSeed(result.seed);
        
        appendGenerationHistory({ imageUrl: result.imageUrl, id: "temp-" + Date.now() });

        if (result.seed) setSeed(result.seed);
        if (result.usedPrompt) setLastUsedFullPrompt(result.usedPrompt);

        setViewMode("result");
        toast.dismiss();
      }
    } catch (error: any) {
      if (error?.message?.includes("Body exceeded 5 MB limit") || error?.message?.includes("limit")) {
        toast.error("Image Too Large", { description: "The uploaded reference image is too large. Please use an image under 5MB." });
      } else {
        toast.error("Generation Failed", { description: error.message });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (
    refinePrompt: string,
    currentImage: string,
    refineSeed?: number,
    additionalImages?: string[],
  ) => {
    try {
      const promptWithContinuity = lastUsedFullPrompt
        ? `Maintain technical settings of @image1: ${lastUsedFullPrompt}. CHANGE: ${refinePrompt}`
        : refinePrompt;

      const allInputImages = [currentImage, ...(additionalImages || [])];

      const result = await generateAdCreative({
        prompt: promptWithContinuity,
        mode: "refine",
        imageInputs: allInputImages,
        aspectRatio: aspectRatio,
        seed: refineSeed || seed,
        imageIntent: "edit",
        parentCreativeId: activeCreativeId || undefined,
      } as any);

      if (result?.seed && !seed) {
        setSeed(result.seed);
      }

      if (activeCreativeId) {
        queryClient.invalidateQueries({
          queryKey: ["creative-history", activeCreativeId],
        });
      }

      return result?.imageUrl;
    } catch (error: any) {
      if (error?.message?.includes("Body exceeded 5 MB limit") || error?.message?.includes("limit")) {
        toast.error("Image Too Large", { description: "The uploaded reference image is too large. Please use an image under 5MB." });
      } else {
        toast.error("Refinement Failed", { description: error.message });
      }
      throw error;
    }
  };

  const handleSave = async (imageUrl: string) => {
    const result = await saveCreativeToLibrary({
      imageUrl,
      prompt: lastUsedFullPrompt || prompt,
      aspectRatio,
      parentCreativeId: activeCreativeId || undefined,
    });

    setActiveCreativeId(result.creativeId);
    window.history.replaceState(null, "", `?edit=${result.creativeId}`);

    queryClient.invalidateQueries({ queryKey: ["creatives"] });
    queryClient.invalidateQueries({
      queryKey: ["creative-history", result.creativeId],
    });
  };

  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    setViewMode("input");
    router.push("/creations");
    resetSession();
  };

  const handleUseInCampaign = async (imageUrl: string) => {
    let finalImageUrl = imageUrl;

    try {
      const result = await saveCreativeToLibrary({
        imageUrl,
        prompt: lastUsedFullPrompt || prompt,
        aspectRatio,
        parentCreativeId: activeCreativeId || undefined,
      });
      finalImageUrl = result.publicUrl;
      queryClient.invalidateQueries({ queryKey: ["creatives"] });
    } catch {
      // Ignore
    }

    updateDraft({
      selectedCreatives: [finalImageUrl],
      pendingGeneratedImage: null,
    });

    toast.success("Creative added to your campaign!", {
      description: "You're back in the campaign wizard — ready to set your budget.",
    });

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const sharedHeader = (
    <PageHeader
      title="AI Studio"
      showCredits
      leftContent={
        campaignContext && (
          <Badge className="ml-2 bg-primary/10 text-primary border-primary/20 gap-1.5">
            <Sparks className="h-3 w-3" />
            {campaignName?.slice(0, 25)}
            {campaignName && campaignName.length > 25 ? "..." : ""}
          </Badge>
        )
      }
    />
  );

  if (viewMode === "result" && generatedImage) {
    return (
      <div className="flex h-full w-full flex-col bg-muted/30">
        {sharedHeader}
        <div className="flex-1 min-h-0">
          <GenerationView
            initialImage={generatedImage}
            initialPrompt={prompt}
            onBack={handleBack}
            onRefine={handleRefine}
            onSave={handleSave}
            history={generationHistory.map((h) => h.imageUrl)}
            aspectRatio={aspectRatio}
            seed={seed}
            onUseInCampaign={returnTo ? handleUseInCampaign : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-muted/30">
      {sharedHeader}
      <main className="flex flex-1 flex-col items-center justify-center p-2 md:p-4 lg:p-6 bg-muted/30">
        <div className="w-full max-w-3xl space-y-10 text-center">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
              AI Creative Studio
            </h2>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              {getGreeting()}, {userFirstName || "Creator"}.
              <br />
              <span className="text-subtle-foreground">
                What can I create for you?
              </span>
            </h1>
          </div>

          <div className="mx-auto flex w-fit gap-2 rounded-md bg-muted p-1.5 border border-border/60 shadow-inner">
            <button
              onClick={() => setCreationMode("prompt")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-300 ease-in-out",
                creationMode === "prompt"
                  ? "bg-background text-foreground shadow-sm border border-border ring-1 ring-border/50 scale-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50 scale-95 opacity-70 hover:opacity-100",
              )}
            >
              <Sparks className="h-4 w-4" /> Create with Prompt
            </button>
            <button
              onClick={() => setCreationMode("url")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-300 ease-in-out",
                creationMode === "url"
                  ? "bg-background text-foreground shadow-sm border border-border ring-1 ring-border/50 scale-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50 scale-95 opacity-70 hover:opacity-100",
              )}
            >
              <LinkIcon className="h-4 w-4" /> Create from URL
              <span className="ml-1 text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                Soon
              </span>
            </button>
          </div>

          {creationMode === "url" ? (
            <div className="mx-auto w-full max-w-2xl">
              <div className="rounded-lg border-2 border-dashed border-border bg-card/50 p-10 flex flex-col items-center gap-4 text-center">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <LinkIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground">
                    URL-to-Ad is coming soon
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Paste your website URL and we'll automatically extract your
                    brand, products, and generate a ready-to-launch ad creative.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-md"
                  onClick={() => setCreationMode("prompt")}
                >
                  Switch to Prompt Mode
                </Button>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-2xl text-left space-y-2">
              <label className="text-xs font-semibold uppercase text-subtle-foreground ml-1">
                Creative Prompt
              </label>

              <PromptInput
                value={prompt}
                onChange={setPrompt}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                isEnhanced={isEnhanced}
                onEnhancedChange={setIsEnhanced}
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                imageUrls={imageUrls}
                onImageUrlsChange={setImageUrls}
                format={creativeFormat}
                onFormatChange={setCreativeFormat}
              />

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className="w-full h-14 mt-6 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-bold shadow-sm hover:shadow-sm border border-border transition-all rounded-md"
              >
                {isGenerating ? (
                  <>
                    <Sparks className="mr-2 h-5 w-5 animate-spin" />{" "}
                    Generating...
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="flex items-center gap-2">
                      <Sparks className="h-5 w-5" /> Generate Creative
                    </span>
                    <span className="text-xs opacity-75 mt-0.5 font-medium tracking-wide">
                      (Costs {CREDIT_COSTS.IMAGE_GEN_PRO} Credits)
                    </span>
                  </div>
                )}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
