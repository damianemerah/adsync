"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PhoneMockupPanel } from "../phone-mockup-panel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MediaImage, ArrowRight, Sparks, Phone, WarningTriangle } from "iconoir-react";
import { saveDraft } from "@/actions/drafts";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { CarouselEditor } from "./creative/carousel-editor";
import { DynamicCreativeEditor } from "./creative/dynamic-creative-editor";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Extracted modules
import { useCreativeActions } from "./creative/use-creative-actions";
import { CreativeMediaSelector } from "./creative/creative-media-selector";
import { CreativeAiPreview } from "./creative/creative-ai-preview";
import { CreativeCopyEditor } from "./creative/creative-copy-editor";

export function CreativeStep({
  persistedDraftId,
  onDraftSaved,
}: {
  persistedDraftId: string | null;
  onDraftSaved: (id: string) => void;
}) {
  const {
    selectedCreatives,
    setStep,
    updateDraft,
    carouselCards,
    destinationValue,
    adFormatType,
    adCopyVariations,
    campaignName,
    advantagePlusCreative,
  } = useCampaignStore();

  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  // Track if user explicitly chose a format so auto-switch doesn't override it
  const userChoseFormat = useRef(false);

  const {
    isGeneratingAI,
    handleGenerateWithAI,
    handleGenerateFromTemplate,
    handleAcceptImage,
    handleEditInStudio,
  } = useCreativeActions({
    onUpgradeDialog: () => setUpgradeDialogOpen(true),
  });

  // Auto-populate carousel cards when user selects 2+ images and carousel is active
  useEffect(() => {
    if (adFormatType === "carousel" && selectedCreatives.length >= 2 && carouselCards.length === 0) {
      const initialCards = selectedCreatives.map((url, idx) => ({
        imageUrl: url,
        headline: `${campaignName || "Campaign"} · ${idx + 1}`,
        description: "",
        link: "",
      }));
      updateDraft({ carouselCards: initialCards });
    }
  }, [adFormatType, selectedCreatives.length, carouselCards.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-switch format based on image count (only when user hasn't explicitly chosen)
  useEffect(() => {
    if (userChoseFormat.current) return;
    if (selectedCreatives.length >= 2 && adFormatType === "single") {
      updateDraft({ adFormatType: "dynamic_creative" });
    } else if (selectedCreatives.length < 2 && adFormatType !== "single") {
      updateDraft({ adFormatType: "single" });
    }
  }, [selectedCreatives.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft on debounced creatives change
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
  }, [selectedCreatives, persistedDraftId, onDraftSaved]);

  return (
    <>
      {/* Mobile: floating Preview button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="h-14 px-5 rounded-lg border border-border bg-primary text-primary-foreground font-bold gap-2"
            >
              <Phone className="h-5 w-5" />
              Preview
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] rounded-t-3xl overflow-y-auto"
          >
            <SheetHeader className="mb-4">
              <SheetTitle className="font-heading flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" /> Ad Preview
              </SheetTitle>
            </SheetHeader>
            <PhoneMockupPanel />
          </SheetContent>
        </Sheet>
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-[calc(100vh-12rem)] animate-in fade-in slide-in-from-bottom-4"
      >
        {/* Main Content Panel */}
        <ResizablePanel defaultSize={75} minSize={60} maxSize={90}>
          <div className="space-y-8 lg:pr-6">
            <div>
              <h1 className="text-3xl font-heading text-foreground">
                Ad Content
              </h1>
              <p className="text-subtle-foreground mt-2">
                Choose your visual and write compelling copy.
              </p>
            </div>

            {/* Media Selection */}
            <Card className="rounded-lg border border-border overflow-hidden bg-card">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <MediaImage className="h-4 w-4 text-primary" /> Visuals
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-4">
                <CreativeAiPreview
                  isGeneratingAI={isGeneratingAI}
                  onGenerateWithAI={(prompt) => handleGenerateWithAI(prompt, referenceUrls)}
                  onAcceptImage={handleAcceptImage}
                  onEditInStudio={handleEditInStudio}
                  referenceImageUrls={referenceUrls}
                />
                <CreativeMediaSelector
                  isGeneratingAI={isGeneratingAI}
                  onGenerateWithAI={(prompt) => handleGenerateWithAI(prompt, referenceUrls)}
                  onGenerateFromTemplate={handleGenerateFromTemplate}
                  onUpgradeDialog={() => setUpgradeDialogOpen(true)}
                  referenceImageUrls={referenceUrls}
                  onReferenceImagesChange={setReferenceUrls}
                />
              </CardContent>
            </Card>

            {/* Ad Format Picker — always visible */}
            <Card className="rounded-lg border border-border overflow-hidden bg-card">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Sparks className="h-4 w-4 text-primary" /> Ad Format
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* 3-way picker */}
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      {
                        value: "single" as const,
                        icon: "📷",
                        label: "Single",
                        desc: "1 image or video",
                      },
                      {
                        value: "carousel" as const,
                        icon: "🎠",
                        label: "Carousel",
                        desc: "Swipeable cards",
                        disabled: selectedCreatives.length < 2,
                      },
                      {
                        value: "dynamic_creative" as const,
                        icon: "✨",
                        label: "Dynamic",
                        desc: "Meta optimizes asset combinations",
                        badge: "AI Optimized",
                        disabled: selectedCreatives.length < 2,
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        userChoseFormat.current = true;
                        updateDraft({ adFormatType: opt.value });
                        if (opt.value === "carousel" && selectedCreatives.length >= 2 && carouselCards.length === 0) {
                          const initialCards = selectedCreatives.map((url, idx) => ({
                            imageUrl: url,
                            headline: `${campaignName || "Campaign"} · ${idx + 1}`,
                            description: "",
                            link: "",
                          }));
                          updateDraft({ carouselCards: initialCards });
                        }
                      }}
                      disabled={"disabled" in opt && opt.disabled}
                      className={cn(
                        "flex flex-col items-start p-3 rounded-lg border text-left transition-all gap-1 disabled:opacity-40 disabled:cursor-not-allowed",
                        adFormatType === opt.value
                          ? "border-2 border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/40",
                      )}
                    >
                      <span className="text-base leading-none">{opt.icon}</span>
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                        {opt.label}
                        {"badge" in opt && opt.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-ai/10 text-ai">
                            {opt.badge}
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight">
                        {opt.desc}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Dynamic Creative: warn if < 2 images */}
                {adFormatType === "dynamic_creative" && selectedCreatives.length < 2 && (
                  <p className="text-xs text-status-warning flex items-center gap-1.5">
                    <WarningTriangle className="h-3.5 w-3.5 shrink-0" />
                    Upload at least 2 images for Meta to A/B test
                  </p>
                )}

                {/* Dynamic Creative Editor */}
                {adFormatType === "dynamic_creative" && (
                  <DynamicCreativeEditor
                    images={selectedCreatives}
                    variations={adCopyVariations}
                  />
                )}

                {/* Carousel Editor */}
                {adFormatType === "carousel" && (
                  <>
                    {selectedCreatives.length < 2 ? (
                      <p className="text-xs text-status-warning flex items-center gap-1.5">
                        <WarningTriangle className="h-3.5 w-3.5 shrink-0" />
                        Upload at least 2 images to use Carousel
                      </p>
                    ) : (
                      <CarouselEditor
                        cards={carouselCards}
                        onChange={(cards) => updateDraft({ carouselCards: cards })}
                        availableImages={selectedCreatives}
                        mainDestinationUrl={destinationValue}
                      />
                    )}
                  </>
                )}

                {/* Single: info text */}
                {adFormatType === "single" && selectedCreatives.length >= 2 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    Using first selected image only. Switch to Dynamic or Carousel to use all {selectedCreatives.length} images.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Advantage+ Creative Toggle */}
            <Card className="rounded-lg border border-border overflow-hidden bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <Label
                      htmlFor="advantage-plus-creative"
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Let Meta auto-enhance this ad
                    </Label>
                    <p className="text-xs text-subtle-foreground leading-relaxed">
                      Meta may adjust brightness, add music to videos, tweak headlines, or crop your creative to fit each placement. Often improves performance, but you give up exact control over what runs.
                    </p>
                  </div>
                  <Switch
                    id="advantage-plus-creative"
                    checked={advantagePlusCreative}
                    onCheckedChange={(checked) =>
                      updateDraft({ advantagePlusCreative: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Copy Editor */}
            <Card className="rounded-lg border border-border overflow-hidden bg-card">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Sparks className="h-4 w-4 text-primary" /> Copywriting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <CreativeCopyEditor />
              </CardContent>
            </Card>

            <div className="pt-4 border-t border-border">
              <Button
                onClick={() => setStep(4)}
                className="w-full h-14 bg-primary hover:bg-primary/90 font-bold text-primary-foreground rounded-lg border border-border text-lg"
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

      <PaymentDialog
        planId="growth"
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
      />
    </>
  );
}
