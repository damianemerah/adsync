"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import { useCreatives } from "@/hooks/use-creatives";
import { CreativeUploadDialog } from "@/components/creatives/creative-upload-dialog";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneMockupPanel } from "../phone-mockup-panel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  SystemRestart,
  MediaImage,
  Check,
  ArrowRight,
  Sparks,
  Play,
} from "iconoir-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  generateAdCreative,
  stashGeneratedImage,
  saveCreativeToLibrary,
} from "@/actions/ai-images";
import { saveDraft } from "@/actions/drafts";
import { useRouter } from "next/navigation";
import { CREDIT_COSTS } from "@/lib/constants";
import { useCreditBalance } from "@/hooks/use-subscription";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { toast } from "sonner";
import { Refresh, EditPencil } from "iconoir-react";

export function CreativeStep({
  persistedDraftId,
  onDraftSaved,
}: {
  persistedDraftId: string | null;
  onDraftSaved: (id: string) => void;
}) {
  const {
    currentStep: step,
    objective,
    selectedCreatives,
    adCopy,
    aiPrompt,
    targetInterests,
    targetBehaviors,
    locations,
    ageRange,
    gender,
    platform,
    setStep,
    updateDraft,
    pendingGeneratedImage,
  } = useCampaignStore();

  const { creatives, isLoading: isLoadingCreatives } = useCreatives();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const { balance } = useCreditBalance();
  const router = useRouter();

  useEffect(() => {
    if (selectedCreatives.length === 0) return;
    const t = setTimeout(async () => {
      try {
        const state = useCampaignStore.getState();
        const id = await saveDraft(state, persistedDraftId ?? undefined);
        if (id && id !== persistedDraftId) onDraftSaved(id);
      } catch {
        // Silent
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [selectedCreatives]);

  const toggleCreative = (url: string) => {
    if (selectedCreatives.includes(url)) {
      updateDraft({
        selectedCreatives: selectedCreatives.filter((u) => u !== url),
      });
    } else {
      updateDraft({ selectedCreatives: [...selectedCreatives, url] });
    }
  };

  // ── AI Creative Generation ────────────────────────────────────────────────

  const handleGenerateWithAI = async (overridePrompt?: string) => {
    if (isGeneratingAI) return;
    if (balance < CREDIT_COSTS.IMAGE_GEN_PRO) {
      toast.error(
        `Not enough credits. You need ${CREDIT_COSTS.IMAGE_GEN_PRO} credits to generate an image.`,
      );
      setUpgradeDialogOpen(true);
      return;
    }

    setIsGeneratingAI(true);
    const toastId = "ai-creative-gen";
    toast.loading("Designing your ad creative with AI...", { id: toastId });

    try {
      const campaignContext = {
        businessDescription: aiPrompt || adCopy.headline || "Product",
        targeting: {
          interests: (targetInterests || []).map((i: any) => i.name),
          behaviors: (targetBehaviors || []).map((b: any) => b.name),
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

      // Pick aspect ratio based on platform & objective
      const aspectRatio: "1:1" | "9:16" | "4:5" =
        platform === "tiktok"
          ? "9:16"
          : objective?.toString().includes("awareness")
            ? "9:16"
            : objective?.toString().includes("sale")
              ? "4:5"
              : "1:1";

      const promptToUse =
        typeof overridePrompt === "string" ? overridePrompt : customPrompt;
      const composedPrompt = promptToUse
        ? `${adCopy.headline || "product shot"}. Additional instructions: ${promptToUse}`
        : adCopy.headline || aiPrompt || "product shot";

      const result = await generateAdCreative({
        prompt: composedPrompt,
        mode: "smart",
        aspectRatio,
        creativeFormat: "social_ad",
        campaignContext,
      });

      if (result.imageUrl) {
        toast.loading("Preparing your image...", { id: toastId });
        let stashedUrl = result.imageUrl;
        try {
          stashedUrl = await stashGeneratedImage(result.imageUrl);
        } catch (err) {
          console.warn("Could not stash image", err);
        }
        updateDraft({
          pendingGeneratedImage: {
            url: stashedUrl,
            prompt: result.usedPrompt ?? "",
            aspectRatio,
            savedAt: Date.now(),
          },
        });
        setCustomPrompt("");
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
    let finalUrl = imageUrl;
    const toastId = toast.loading("Saving to your library...");
    try {
      const aspectRatio =
        platform === "tiktok"
          ? "9:16"
          : objective?.toString().includes("awareness")
            ? "9:16"
            : objective?.toString().includes("sale")
              ? "4:5"
              : "1:1";
      const saved = await saveCreativeToLibrary({
        imageUrl,
        prompt: pendingGeneratedImage?.prompt ?? adCopy.headline ?? "",
        aspectRatio: (pendingGeneratedImage?.aspectRatio as any) ?? aspectRatio,
      });
      finalUrl = saved.publicUrl;
      toast.dismiss(toastId);
      toast.success("Saved seamlessly!");
    } catch (err) {
      toast.dismiss(toastId);
    }
    updateDraft({ selectedCreatives: [finalUrl], pendingGeneratedImage: null });
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
    }
    const ratio =
      pendingGeneratedImage?.aspectRatio ||
      (platform === "tiktok"
        ? "9:16"
        : objective?.toString().includes("awareness")
          ? "9:16"
          : "1:1");
    const params = new URLSearchParams({
      image: imageUrl,
      prompt: imagePrompt,
      aspectRatio: ratio,
      returnTo: `/campaigns/new?resume=true${savedId ? `&draftId=${savedId}` : ""}`,
      returnStep: "3",
    });
    router.push(`/creations/studio?${params.toString()}`);
  };

  return (
    <>
      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-[calc(100vh-12rem)] animate-in fade-in slide-in-from-bottom-4"
      >
        {/* Main Content Panel */}
        <ResizablePanel defaultSize={75} minSize={60} maxSize={90}>
          <div className="space-y-8 pr-6">
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">
                Ad Content
              </h1>
              <p className="text-subtle-foreground mt-2">
                Choose your visual and write compelling copy.
              </p>
            </div>

            {/* Media Selection */}
            <Card className="rounded-3xl shadow-soft border-border overflow-hidden bg-card">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <MediaImage className="h-4 w-4 text-primary" /> Visuals
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-4">
                {/* ── Pending Generated Image ─────────────────────────────── */}
                {pendingGeneratedImage && (
                  <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-4">
                      <img
                        src={pendingGeneratedImage.url}
                        alt="AI Generated"
                        className="h-32 w-auto object-cover rounded-xl shadow-soft"
                      />
                      <div className="flex flex-col gap-2 flex-1 justify-center">
                        <h4 className="text-sm font-bold text-primary flex items-center gap-1.5">
                          <Sparks className="h-4 w-4" /> AI Generation Ready
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Review your image. You can refine it with a prompt,
                          edit it manually, or accept it for your campaign.
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Input
                            className="flex-1 h-9 text-xs"
                            placeholder="e.g. no text, make it brighter..."
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleGenerateWithAI(customPrompt);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateWithAI(customPrompt)}
                            disabled={isGeneratingAI}
                            className="h-9 w-9 p-0 shrink-0"
                          >
                            <Refresh
                              className={cn(
                                "h-4 w-4 text-primary",
                                isGeneratingAI && "animate-spin",
                              )}
                            />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-9 text-xs"
                            onClick={() =>
                              handleEditInStudio(
                                pendingGeneratedImage.url,
                                pendingGeneratedImage.prompt,
                              )
                            }
                          >
                            <EditPencil className="h-3.5 w-3.5 mr-1" /> Edit in
                            Studio
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={() =>
                              handleAcceptImage(pendingGeneratedImage.url)
                            }
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Accept Image
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Media Controls ─────────────────────────────── */}
                <div className="flex items-center gap-2 justify-between">
                  <p className="text-xs text-muted-foreground">
                    Select creatives for this campaign:
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateWithAI()}
                    disabled={isGeneratingAI || !!pendingGeneratedImage}
                    className={cn(
                      "h-8 px-3 rounded-xl border-primary/30 text-primary hover:bg-primary/5 hover:border-primary text-xs font-semibold gap-1.5 transition-all",
                      (isGeneratingAI || !!pendingGeneratedImage) &&
                        "opacity-60 cursor-not-allowed",
                    )}
                  >
                    {isGeneratingAI && !pendingGeneratedImage ? (
                      <>
                        <SystemRestart className="h-3.5 w-3.5 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparks className="h-3.5 w-3.5" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
                {isLoadingCreatives ? (
                  <div className="flex justify-center p-8">
                    <SystemRestart className="animate-spin text-primary w-8 h-8" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                    {/* Upload Placeholder */}
                    <div
                      onClick={() => setUploadModalOpen(true)}
                      className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-subtle-foreground hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-colors group"
                    >
                      <MediaImage className="h-6 w-6 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] font-bold mt-1 group-hover:text-primary transition-colors">
                        Upload New
                      </span>
                    </div>

                    {/* AI-generating placeholder */}
                    {isGeneratingAI && !pendingGeneratedImage && (
                      <div className="aspect-square rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-2">
                        <SystemRestart className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-[10px] font-semibold text-primary">
                          AI working…
                        </span>
                      </div>
                    )}

                    {/* Real Creatives */}
                    {creatives?.map((item: any) => (
                      <div
                        key={item.id}
                        onClick={() => toggleCreative(item.original_url)}
                        className={cn(
                          "aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer relative transition-all",
                          selectedCreatives.includes(item.original_url)
                            ? "border-primary ring-2 ring-primary/20 ring-offset-1"
                            : "border-transparent ring-1 ring-border hover:ring-primary/50",
                        )}
                      >
                        <img
                          src={item.thumbnail_url || item.original_url}
                          className="w-full h-full object-cover"
                          alt="creative"
                        />
                        {item.media_type === "video" && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/40 backdrop-blur-md rounded-full p-1.5">
                              <Play className="h-5 w-5 text-white" />
                            </div>
                          </div>
                        )}
                        {selectedCreatives.includes(item.original_url) && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg">
                              <Check className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Helper hint when no creatives and not loading */}
                {!isLoadingCreatives &&
                  !isGeneratingAI &&
                  (creatives?.length ?? 0) === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4 flex items-center justify-center gap-1.5">
                      <Sparks className="h-4 w-4 text-primary" />
                      No creatives yet — upload one or use{" "}
                      <span className="text-primary font-semibold">
                        Generate with AI
                      </span>
                      .
                    </p>
                  )}
              </CardContent>
            </Card>

            {/* Copy Editor */}
            <Card className="rounded-3xl shadow-soft border-border overflow-hidden bg-card">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Sparks className="h-4 w-4 text-primary" /> Copywriting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
                    Headline
                  </label>
                  <Input
                    value={adCopy.headline}
                    onChange={(e) =>
                      updateDraft({
                        adCopy: { ...adCopy, headline: e.target.value },
                      })
                    }
                    placeholder="e.g. Limited Time Offer!"
                    className="h-12 font-bold border-border bg-muted/30 focus-visible:ring-primary/20 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
                    Primary Text
                  </label>
                  <Textarea
                    value={adCopy.primary}
                    onChange={(e) =>
                      updateDraft({
                        adCopy: { ...adCopy, primary: e.target.value },
                      })
                    }
                    rows={5}
                    placeholder="Tell people what your ad is about..."
                    className="border-border bg-muted/30 focus-visible:ring-primary/20 resize-none rounded-xl text-base"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
                    {objective === "whatsapp"
                      ? "WhatsApp Number"
                      : "Website URL"}
                  </label>
                  <Input
                    value={useCampaignStore((state) => state.destinationValue)}
                    onChange={(e) =>
                      updateDraft({ destinationValue: e.target.value })
                    }
                    placeholder={
                      objective === "whatsapp"
                        ? "080 1234 5678"
                        : "www.yoursite.com"
                    }
                    className="h-12 font-bold border-border bg-muted/30 focus-visible:ring-primary/20 rounded-xl"
                  />
                  {objective === "whatsapp" && (
                    <p className="text-[10px] text-subtle-foreground flex items-center gap-1">
                      <Sparks className="h-3 w-3 text-primary" />
                      We will auto-format this to a "Click to Chat" link.
                    </p>
                  )}
                </div>

                {/* WhatsApp pre-fill message — only shown for whatsapp objective */}
                {objective === "whatsapp" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
                      WhatsApp Message (pre-filled)
                    </label>
                    <Textarea
                      value={adCopy.cta?.whatsappMessage ?? ""}
                      onChange={(e) =>
                        updateDraft({
                          adCopy: {
                            ...adCopy,
                            cta: {
                              ...adCopy.cta,
                              whatsappMessage: e.target.value,
                            },
                          },
                        })
                      }
                      rows={3}
                      placeholder="e.g. Hi! I saw your ad and I'm interested. What's available?"
                      className="border-border bg-muted/30 focus-visible:ring-primary/20 resize-none rounded-xl text-sm"
                    />
                    <p className="text-[10px] text-subtle-foreground flex items-center gap-1">
                      <Sparks className="h-3 w-3 text-primary" />
                      This is the message contacts send when they tap your ad.
                      Edit it to match your tone.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="pt-4 border-t border-border">
              <Button
                onClick={() => setStep(4)}
                className="w-full h-14 bg-primary hover:bg-primary/90 font-bold text-primary-foreground rounded-2xl shadow-soft text-lg"
                disabled={selectedCreatives.length === 0}
              >
                Set Budget &amp; Launch <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </ResizablePanel>

        {/* Resizable Handle */}
        <ResizableHandle className="hidden lg:flex w-[1.5px] bg-border hover:bg-accent data-[panel-group-direction=horizontal]:hover:w-1 transition-all data-[resize-handle-state=drag]:bg-primary/20 data-[resize-handle-state=hover]:bg-primary/10" />

        {/* Preview Panel */}
        <ResizablePanel
          defaultSize={25}
          minSize={10}
          maxSize={40}
          className="hidden lg:block"
        >
          <PhoneMockupPanel />
        </ResizablePanel>
      </ResizablePanelGroup>

      <CreativeUploadDialog
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadComplete={(creative) => {
          toggleCreative(creative.original_url);
          setUploadModalOpen(false);
        }}
      />
      <PaymentDialog
        planId="growth"
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
      />
    </>
  );
}
