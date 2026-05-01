"use client";

import { useState, useMemo } from "react";
import {
  generateAdCreative,
  autoSaveCreative,
} from "@/actions/ai-images";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  type AspectRatio,
} from "@/components/creatives/studio/prompt-input";
import { PageHeader } from "@/components/layout/page-header";
import { GenerationView } from "@/components/creatives/studio/generation-view";
import { Sparks, Link as LinkIcon, ArrowRight, WarningTriangle, CheckCircle, RefreshDouble } from "iconoir-react";
import { extractBrandFromUrl } from "@/actions/url-creative";
import { extractUrlFromMessage } from "@/lib/ai/url-scraper";
import NextImage from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useCampaignStore } from "@/stores/campaign-store";
import { useStudioStore } from "@/store/studio-store";
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
    urlInput,
    extractedBrand,
    isExtracting,
    selectedImageUrl,
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
    setUrlInput,
    setExtractedBrand,
    setIsExtracting,
    setSelectedImageUrl,
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
  const [hasAttempted, setHasAttempted] = useState(false);
  const [rootCreativeId, setRootCreativeId] = useState<string | null>(
    historyData?.history?.find((h: any) => h.isRoot)?.id ?? null,
  );

  const handleExtractUrl = async () => {
    const raw = urlInput.trim();
    if (!raw) return;

    // Normalize bare domains: "paystack.com" → "https://paystack.com"
    const normalized = extractUrlFromMessage(raw) ?? (raw.startsWith("http") ? raw : `https://${raw}`);
    setUrlInput(normalized);

    setIsExtracting(true);
    setHasAttempted(true);
    setExtractedBrand(null);
    try {
      const result = await extractBrandFromUrl(normalized);
      if (!result) {
        toast.error("Couldn't read that website", {
          description: "Try a different URL or switch to prompt mode.",
        });
        return;
      }
      setExtractedBrand({
        brandName: result.brandName,
        businessDescription: result.businessDescription,
        imageOptions: result.imageOptions,
      });
      setPrompt(result.suggestedPrompt);
      setSelectedImageUrl(null);
      setImageUrls([]);
    } catch {
      toast.error("Extraction failed", { description: "Please try again." });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImageSelect = (imgUrl: string) => {
    if (selectedImageUrl === imgUrl) {
      // Deselect
      setSelectedImageUrl(null);
      setImageUrls([]);
    } else {
      setSelectedImageUrl(imgUrl);
      setImageUrls([imgUrl]);
    }
  };

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
        if (result.seed) setSeed(result.seed);
        if (result.usedPrompt) setLastUsedFullPrompt(result.usedPrompt);
        setPrompt(result.usedPrompt);

        const saved = await autoSaveCreative({
          falUrl: result.imageUrl,
          prompt: result.usedPrompt ?? prompt,
          aspectRatio,
          parentCreativeId: activeCreativeId || null,
        });

        setGeneratedImage(saved.publicUrl);
        setActiveCreativeId(saved.creativeId);
        appendGenerationHistory({ imageUrl: saved.publicUrl, id: saved.creativeId });
        window.history.replaceState(null, "", `?edit=${saved.creativeId}`);
        // Track the root for "Set as Primary" — only set once (first generation)
        if (!rootCreativeId) setRootCreativeId(saved.creativeId);
        queryClient.invalidateQueries({ queryKey: ["creatives"] });

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

      if (!result?.imageUrl) {
        throw new Error("Generation returned no image.");
      }

      const saved = await autoSaveCreative({
        falUrl: result.imageUrl,
        prompt: result.usedPrompt ?? lastUsedFullPrompt ?? prompt,
        aspectRatio,
        parentCreativeId: activeCreativeId || null,
      });

      setActiveCreativeId(saved.creativeId);
      window.history.replaceState(null, "", `?edit=${saved.creativeId}`);
      queryClient.invalidateQueries({ queryKey: ["creatives"] });
      queryClient.invalidateQueries({
        queryKey: ["creative-history", saved.creativeId],
      });

      return saved.publicUrl;
    } catch (error: any) {
      if (error?.message?.includes("Body exceeded 5 MB limit") || error?.message?.includes("limit")) {
        toast.error("Image Too Large", { description: "The uploaded reference image is too large. Please use an image under 5MB." });
      } else {
        toast.error("Refinement Failed", { description: error.message });
      }
      throw error;
    }
  };

  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    setViewMode("input");
    router.push("/ai-creative");
    resetSession();
  };

  const handleUseInCampaign = async (imageUrl: string) => {
    // Image is already auto-saved — just add to campaign draft.
    updateDraft({
      selectedCreatives: [imageUrl],
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
            history={generationHistory.map((h) => ({ id: h.id, imageUrl: h.imageUrl }))}
            aspectRatio={aspectRatio}
            seed={seed}
            onUseInCampaign={returnTo ? handleUseInCampaign : undefined}
            rootId={rootCreativeId}
            selectedVariantId={null}
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
            </button>
          </div>

          {creationMode === "url" ? (
            <div className="mx-auto w-full max-w-2xl space-y-4">
              {/* State: extracting */}
              {isExtracting && (
                <div className="rounded-lg border border-border bg-card/50 p-10 flex flex-col items-center gap-3 text-center">
                  <Sparks className="h-6 w-6 text-primary animate-spin" />
                  <p className="text-sm font-medium text-foreground">Analyzing your website...</p>
                </div>
              )}

              {/* State: failed */}
              {!isExtracting && hasAttempted && !extractedBrand && (
                <div className="rounded-lg border border-border bg-card/50 p-8 flex flex-col items-center gap-3 text-center">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <WarningTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Could not read that website</p>
                    <p className="text-xs text-muted-foreground mt-1">Some sites block automated access. Try a different URL or describe your brand manually.</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-md mt-1" onClick={() => setCreationMode("prompt")}>
                    Describe your brand manually
                  </Button>
                </div>
              )}

              {/* State: URL input (always visible unless extracting) */}
              {!isExtracting && !extractedBrand && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase text-subtle-foreground ml-1">
                    Website URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleExtractUrl()}
                      placeholder="https://yourbrand.com"
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <Button
                      onClick={handleExtractUrl}
                      disabled={!urlInput.trim()}
                      className="rounded-md px-4"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground ml-1">
                    We&apos;ll extract your brand and build a ready-to-use creative prompt.
                  </p>
                </div>
              )}

              {/* State: success — brand card + prompt */}
              {!isExtracting && extractedBrand && (
                <div className="space-y-4">
                  {/* Brand card */}
                  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-xs font-semibold uppercase text-subtle-foreground">Brand extracted</span>
                      </div>
                      <button
                        onClick={() => {
                          setExtractedBrand(null);
                          setHasAttempted(false);
                          setSelectedImageUrl(null);
                          setImageUrls([]);
                        }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RefreshDouble className="h-3 w-3" /> Try again
                      </button>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground">{extractedBrand.brandName}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{extractedBrand.businessDescription}</p>
                    </div>

                    {/* Image picker — tap to select as reference */}
                    {extractedBrand.imageOptions.length > 0 && (
                      <div className="pt-1 border-t border-border space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Tap an image to use as a reference <span className="text-muted-foreground/60">(optional)</span>
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {extractedBrand.imageOptions.map((imgUrl) => (
                            <button
                              key={imgUrl}
                              onClick={() => handleImageSelect(imgUrl)}
                              className={cn(
                                "relative h-16 w-16 rounded-md overflow-hidden border-2 shrink-0 bg-muted transition-all",
                                selectedImageUrl === imgUrl
                                  ? "border-primary ring-2 ring-primary/30"
                                  : "border-border hover:border-primary/50",
                              )}
                            >
                              <NextImage
                                src={imgUrl}
                                alt="Brand image option"
                                fill
                                className="object-cover"
                              />
                              {selectedImageUrl === imgUrl && (
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                  <CheckCircle className="h-5 w-5 text-primary" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Prompt input (reused from prompt mode) */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-subtle-foreground ml-1">
                      Creative Prompt <span className="normal-case font-normal text-muted-foreground">(edit freely)</span>
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
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt}
                    className="w-full h-14 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-bold shadow-sm hover:shadow-sm border border-border transition-all rounded-md"
                  >
                    {isGenerating ? (
                      <>
                        <Sparks className="mr-2 h-5 w-5 animate-spin" /> Generating...
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
