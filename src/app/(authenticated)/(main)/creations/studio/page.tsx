"use client";

import { useState } from "react";
import {
  generateAdCreative,
  getCreativeHistory,
  saveCreativeToLibrary,
} from "@/actions/ai-images";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  AspectRatio,
} from "@/components/creatives/studio/prompt-input"; // Updated Import
import { HelpCenterSheet } from "@/components/layout/help-center-sheet";
import { CreditsDisplay } from "@/components/layout/credits-display";
import { CreativeFormat } from "@/lib/ai/prompts"; // [NEW]
import { GenerationView } from "@/components/creatives/studio/generation-view";
import { Sparks, Link as LinkIcon, Plus } from "iconoir-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCreativeHistory } from "@/hooks/use-creatives";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { type CampaignContext } from "@/lib/ai/context-compiler";
import { Badge } from "@/components/ui/badge";
import { useCampaignStore } from "@/stores/campaign-store";
import { useBeforeLeave } from "@/hooks/use-before-leave";
import { isPermanentCreativeUrl } from "@/lib/creative-utils";
import { CREDIT_COSTS } from "@/lib/constants";

export default function StudioPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { updateDraft, metaPlacement, platform } =
    useCampaignStore();
  const initialImageParam = searchParams.get("image");
  const editId = searchParams.get("edit");
  const campaignId = searchParams.get("campaign_id");
  // ── Campaign wizard return-flow ──────────────────────────────────────────
  const returnTo = searchParams.get("returnTo"); // e.g. "/campaigns/new"
  const returnStep = searchParams.get("returnStep"); // e.g. "3"

  // REDIRECT: Support old query param format → new dedicated routes
  useEffect(() => {
    if (editId) {
      // Preserve campaign_id if present
      const params = new URLSearchParams();
      if (campaignId) params.set("campaign_id", campaignId);
      const query = params.toString();
      router.replace(`/creations/studio/${editId}${query ? `?${query}` : ""}`);
    }
  }, [editId, campaignId, router]);

  // [NEW] Track the ACTIVE creative ID (starts with editId, updates on new generations)
  const [activeCreativeId, setActiveCreativeId] = useState<string | null>(
    editId || null,
  );

  // State: 'input' | 'result'
  const [viewMode, setViewMode] = useState<"input" | "result">("input");

  // Data State
  const [prompt, setPrompt] = useState("");
  const [isEnhanced, setIsEnhanced] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1"); // Default: Square
  const [creativeFormat, setCreativeFormat] = useState<CreativeFormat>("auto"); // [NEW] Default: Auto
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [creationMode, setCreationMode] = useState<"prompt" | "url">("prompt");
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [imageUrls, setImageUrls] = useState<string[]>([]); // [NEW]

  // History State for GenerationView
  const [generationHistory, setGenerationHistory] = useState<
    { imageUrl: string; id: string }[]
  >([]);

  // [NEW] Track the full enhanced prompt for continuity
  const [lastUsedFullPrompt, setLastUsedFullPrompt] = useState<string | null>(
    null,
  );

  // [NEW] Campaign context for auto-enrichment
  const [campaignContext, setCampaignContext] =
    useState<CampaignContext | null>(null);
  const [campaignName, setCampaignName] = useState<string | null>(null);

  // Warn on page close/refresh when an image has been generated but not saved
  useBeforeLeave(
    viewMode === "result" && !!generatedImage,
    "You have a generated image that hasn't been saved to your library yet. Leave anyway?",
  );

  // Use Hook for History
  const { data: historyData, isLoading: isHistoryLoading } =
    useCreativeHistory(activeCreativeId);

  // Handle initial image from campaign chat ("Edit in Studio" button)
  useEffect(() => {
    if (initialImageParam) {
      setGeneratedImage(initialImageParam);
      setViewMode("result");

      const promptParam = searchParams.get("prompt");
      if (promptParam) {
        setPrompt(promptParam);
        setLastUsedFullPrompt(promptParam);
      }

      // Restore the aspect ratio that was used when the image was generated.
      // Without this, Studio defaults to 1:1 and all refinements produce the wrong size.
      const ratioParam = searchParams.get("aspectRatio") as AspectRatio | null;
      const validRatios: AspectRatio[] = ["1:1", "9:16", "4:5", "16:9"];
      if (ratioParam && validRatios.includes(ratioParam)) {
        setAspectRatio(ratioParam);
      }
    }
  }, [initialImageParam, searchParams]);

  // [NEW] Load Campaign Context from URL
  useEffect(() => {
    async function loadCampaignContext() {
      if (!campaignId) {
        setCampaignContext(null);
        setCampaignName(null);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("campaigns")
          .select("ai_context, name")
          .eq("id", campaignId)
          .single();

        if (error) throw error;

        if (data?.ai_context) {
          setCampaignContext(data.ai_context as unknown as CampaignContext);
          setCampaignName(data.name);
          console.log("✅ Loaded campaign context:", data.name);
        } else {
          console.warn("⚠️ Campaign found but no AI context available");
        }
      } catch (error) {
        console.error("Failed to load campaign context:", error);
        toast.error("Could not load campaign context");
      }
    }

    loadCampaignContext();
  }, [campaignId]);

  // Aspect Ratio Auto-Selection from Placement
  // Uses metaPlacement (automatic/instagram/facebook) to pick the best default ratio.
  // Sub-placements were removed — Meta's Andromeda ML decides within a platform.
  useEffect(() => {
    // Only apply smart default if we are creating a new creative (not editing an existing one)
    if (editId || initialImageParam) return;

    // Determine placement source: campaign context from DB, or live draft store
    const placement = campaignContext?.platform === "meta"
      ? (campaignContext?.objective ? metaPlacement : "automatic")
      : metaPlacement;

    const isAutomatic = platform === "meta" && placement === "automatic";

    if (isAutomatic || !platform || platform !== "meta") {
      setAspectRatio("1:1"); // Default for automatic or non-Meta
      return;
    }

    // Platform-specific smart defaults:
    // Instagram: 4:5 is the recommended ratio (covers Feed + Explore best)
    // Facebook: 1:1 is the standard for Feed
    switch (placement) {
      case "instagram":
        setAspectRatio("4:5");
        break;
      case "facebook":
        setAspectRatio("1:1");
        break;
      default:
        setAspectRatio("1:1");
    }
  }, [
    campaignContext,
    metaPlacement,
    platform,
    editId,
    initialImageParam,
  ]);

  // [NEW] Sync Hook Data to Local State
  useEffect(() => {
    if (historyData) {
      console.log("🪝 Hook: Loaded History", historyData);
      setLastUsedFullPrompt(historyData.prompt);
      setSeed(historyData.seed);

      if (historyData.history) {
        setGenerationHistory(historyData.history);
      }
    }
  }, [historyData]);

  // [UPDATED] Load Edit Context (Image/Metadata only, History handled by Hook)
  useEffect(() => {
    async function loadEditContext() {
      if (!editId) return;

      try {
        // 1. Fetch the creative URL from Supabase (Client Side for speed/auth)
        const supabase = createClient();
        const { data: creative } = await supabase
          .from("creatives")
          .select("*")
          .eq("id", editId)
          .single();

        if (creative) {
          setGeneratedImage(creative.original_url);
          setViewMode("result");
          if (!activeCreativeId) setActiveCreativeId(creative.id); // Set ID if not set

          // Set Aspect Ratio based on dimensions
          if (creative.width && creative.height) {
            const ratio = creative.width / creative.height;
            // Tolerance for float inaccuracies
            if (Math.abs(ratio - 1) < 0.05) setAspectRatio("1:1");
            else if (Math.abs(ratio - 9 / 16) < 0.05) setAspectRatio("9:16");
            else if (Math.abs(ratio - 16 / 9) < 0.05) setAspectRatio("16:9");
            else if (Math.abs(ratio - 4 / 5) < 0.05) setAspectRatio("4:5");
            else setAspectRatio("1:1"); // Fallback
          }
        }
      } catch (e) {
        console.error("Failed to load edit context", e);
        toast.error("Could not load creative statistics");
      }
    }

    loadEditContext();
  }, [editId]); // removed activeCreativeId dependency to avoid circles

  const handleGenerate = async () => {
    if (!prompt) {
      toast.error("Please enter a prompt description");
      return;
    }

    setIsGenerating(true);

    // Root Seed Logic: Ensure every session starts with a fixed seed
    // If we have a seed, keep it. If not, generate one.
    const sessionSeed = seed ?? Math.floor(Math.random() * 1000000);

    // Optimistically set seed if it wasn't set
    if (seed === undefined) {
      setSeed(sessionSeed);
    }

    try {
      // ✅ LOGIC UPDATE: Switch mode based on toggle
      const mode = isEnhanced ? "smart" : "raw";

      const result = await generateAdCreative({
        prompt: prompt,
        mode: mode,
        imageInputs: imageUrls.length > 0 ? imageUrls : undefined,
        aspectRatio: aspectRatio, // Pass selected ratio
        seed: sessionSeed, // Force the session seed
        currentCreativeId: activeCreativeId || undefined, // Only pass if we exist
        parentCreativeId: activeCreativeId || undefined, // [NEW] Link new generation to this parent
        imageIntent: imageUrls.length > 0 ? "reference" : undefined, // [NEW] Explicit Intent
        creativeFormat: creativeFormat, // [NEW]
        campaignContext: campaignContext || undefined, // [NEW] Pass campaign context for auto-enrichment
      });

      if (result.imageUrl) {
        setGeneratedImage(result.imageUrl);
        setPrompt(result.usedPrompt); // Update prompt to the one actually used by AI
        setSeed(result.seed); // Update seed so future refinements use this new base
        // Update History UI
        setGenerationHistory((prev) => [
          ...prev,
          { imageUrl: result.imageUrl, id: "temp-" + Date.now() },
        ]);

        if (result.seed) setSeed(result.seed);
        // Capture the enhanced prompt for future refinements
        if (result.usedPrompt) setLastUsedFullPrompt(result.usedPrompt);

        setViewMode("result");
        toast.dismiss();
      }
    } catch (error: any) {
      toast.error("Generation Failed", { description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (
    refinePrompt: string,
    currentImage: string,
    refineSeed?: number,
    additionalImages?: string[], // [NEW] Accept additional images
  ) => {
    try {
      // [NEW] Context Continuity: Prepend previous technical anchors if available
      const promptWithContinuity = lastUsedFullPrompt
        ? `Maintain technical settings of @image1: ${lastUsedFullPrompt}. CHANGE: ${refinePrompt}`
        : refinePrompt;

      // Merge current image (base to edit) with new reference images
      // If we are editing "currentImage", it should be the first one to align with @image1 usually.
      const allInputImages = [currentImage, ...(additionalImages || [])];

      const result = await generateAdCreative({
        prompt: promptWithContinuity, // Use the context-aware prompt
        mode: "refine",
        imageInputs: allInputImages, // [UPDATED] Pass all images
        aspectRatio: aspectRatio,
        seed: refineSeed || seed, // [NEW] Use passed seed or stored seed
        imageIntent: "edit", // [NEW] Refine is ALWAYS "edit" intent
        parentCreativeId: activeCreativeId || undefined, // [FIX] Link to current active parent
      } as any); // Cast as any to bypass strict checks if type inference is lagging

      // [NEW] Capture seed if we don't have one (e.g. from URL import) so subsequent edits range consistent
      if (result.seed && !seed) {
        setSeed(result.seed);
      }

      // [NEW] Invalidate History
      if (activeCreativeId) {
        queryClient.invalidateQueries({
          queryKey: ["creative-history", activeCreativeId],
        });
      }

      return result.imageUrl;
    } catch (error: any) {
      toast.error("Refinement Failed", { description: error.message });
      throw error;
    }
  };

  // Save to permanent library — skips upload if already saved (dedup guard in action)
  const handleSave = async (imageUrl: string) => {
    const result = await saveCreativeToLibrary({
      imageUrl,
      prompt: lastUsedFullPrompt || prompt,
      aspectRatio,
      parentCreativeId: activeCreativeId || undefined,
    });

    // Update active ID + URL so further edits link to this saved creative
    setActiveCreativeId(result.creativeId);
    window.history.replaceState(null, "", `?edit=${result.creativeId}`);

    queryClient.invalidateQueries({ queryKey: ["creatives"] });
    queryClient.invalidateQueries({
      queryKey: ["creative-history", result.creativeId],
    });
  };

  const handleBack = () => {
    // If we came from campaign wizard, go back there
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    setViewMode("input");
    router.push("/creations");
    setPrompt("");
    setActiveCreativeId(null);
    setImageUrls([]);
    setGeneratedImage(null);
    setSeed(undefined);
    setLastUsedFullPrompt(null);
    setGenerationHistory([]);
    setAspectRatio("1:1");
    setCreativeFormat("auto");
    setIsEnhanced(true);
    setCreationMode("prompt");
  };

  // ── Use in Campaign: save image to campaign store then navigate back ──────
  const handleUseInCampaign = async (imageUrl: string) => {
    let finalImageUrl = imageUrl;

    try {
      // Persist the image to the creatives library first so it has a permanent URL
      const result = await saveCreativeToLibrary({
        imageUrl,
        prompt: lastUsedFullPrompt || prompt,
        aspectRatio,
        parentCreativeId: activeCreativeId || undefined,
      });
      finalImageUrl = result.publicUrl;
      queryClient.invalidateQueries({ queryKey: ["creatives"] });
    } catch {
      // Non-fatal — we'll still add the URL to the campaign even if save fails
    }

    // Write the image URL into the campaign draft and clear the pending flag.
    // Clearing pendingGeneratedImage stops the "unsaved image" warning in the
    // campaign wizard now that the image has been accepted into the campaign.
    updateDraft({
      selectedCreatives: [finalImageUrl],
      pendingGeneratedImage: null,
    });

    toast.success("Creative added to your campaign!", {
      description:
        "You're back in the campaign wizard — ready to set your budget.",
    });

    // Return to campaign wizard
    // Ensure we keep the draftId if it was passed to us
    const draftId = searchParams.get("draftId");
    let target = returnTo || "/campaigns/new";

    if (draftId && !target.includes("draftId=")) {
      target += target.includes("?")
        ? `&draftId=${draftId}`
        : `?draftId=${draftId}`;
    }

    // Ensure resume flag is present
    if (!target.includes("resume=true")) {
      target += target.includes("?") ? "&resume=true" : "?resume=true";
    }

    router.push(target);
  };

  // --- DYNAMIC GREETING based on time of day ---
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Shared header rendered for both input and result views
  const sharedHeader = (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-2 sm:px-4 lg:px-6 bg-background/80 backdrop-blur-md sticky top-0 z-30">
      <div className="container max-w-7xl mx-auto flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">AI Studio</h1>
          {campaignContext && (
            <Badge className="ml-2 bg-primary/10 text-primary border-primary/20 gap-1.5">
              <Sparks className="h-3 w-3" />
              {campaignName?.slice(0, 25)}
              {campaignName && campaignName.length > 25 ? "..." : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <CreditsDisplay />
          <HelpCenterSheet />
        </div>
      </div>
    </header>
  );

  // --- VIEW: RESULT / EDITING — header rendered once here, not inside GenerationView ---
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

  // --- VIEW: CREATION (INPUT) ---
  return (
    <div className="flex h-full w-full flex-col bg-muted/30">
      {sharedHeader}

      {/* Main Content Center */}
      <main className="flex flex-1 flex-col items-center justify-center p-2 md:p-4 lg:p-6 bg-muted/30">
        <div className="w-full max-w-3xl space-y-10 text-center">
          {/* Dynamic Greeting */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
              AI Creative Studio
            </h2>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              {getGreeting()},{" "}
              {user?.user_metadata?.full_name?.split(" ")[0] || "Creator"}.
              <br />
              <span className="text-subtle-foreground">
                What can I create for you?
              </span>
            </h1>
          </div>

          {/* Mode Tabs */}
          <div className="mx-auto flex w-fit gap-2 rounded-xl bg-muted p-1.5 border border-border/60 shadow-inner">
            <button
              onClick={() => setCreationMode("prompt")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-300 ease-in-out",
                creationMode === "prompt"
                  ? "bg-background text-foreground shadow-soft ring-1 ring-border/50 scale-100"
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
                  ? "bg-background text-foreground shadow-soft ring-1 ring-border/50 scale-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50 scale-95 opacity-70 hover:opacity-100",
              )}
            >
              <LinkIcon className="h-4 w-4" /> Create from URL
              {/* Coming soon pill */}
              <span className="ml-1 text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                Soon
              </span>
            </button>
          </div>

          {/* URL mode placeholder — shown instead of prompt input */}
          {creationMode === "url" ? (
            <div className="mx-auto w-full max-w-2xl">
              <div className="rounded-2xl border-2 border-dashed border-border bg-card/50 p-10 flex flex-col items-center gap-4 text-center">
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
                  className="rounded-xl"
                  onClick={() => setCreationMode("prompt")}
                >
                  Switch to Prompt Mode
                </Button>
              </div>
            </div>
          ) : (
            /* Prompt Input Area */
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
                className="w-full h-14 mt-6 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-bold shadow-soft hover:shadow-lg transition-all rounded-xl"
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
