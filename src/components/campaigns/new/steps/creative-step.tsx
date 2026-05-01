"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import { useState, useEffect } from "react";
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
import { MediaImage, ArrowRight, Sparks, Phone } from "iconoir-react";
import { saveDraft } from "@/actions/drafts";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { CarouselEditor } from "./creative/carousel-editor";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  } = useCampaignStore();

  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [adFormat, setAdFormat] = useState<"single" | "carousel">("single");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);

  const {
    isGeneratingAI,
    handleGenerateWithAI,
    handleAcceptImage,
    handleEditInStudio,
  } = useCreativeActions({
    onUpgradeDialog: () => setUpgradeDialogOpen(true),
  });

  // Auto-populate carousel cards when user selects 2+ images
  useEffect(() => {
    if (selectedCreatives.length >= 2 && carouselCards.length === 0) {
      // Initialize carousel cards from selected images
      const initialCards = selectedCreatives.map((url, idx) => ({
        imageUrl: url,
        headline: `Card ${idx + 1}`,
        description: "",
        link: "",
      }));
      updateDraft({ carouselCards: initialCards });
      setAdFormat("carousel");
    } else if (selectedCreatives.length < 2 && adFormat === "carousel") {
      // Switch back to single if user deselects images
      setAdFormat("single");
    }
  }, [selectedCreatives.length, carouselCards.length, adFormat, selectedCreatives, updateDraft]);

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
            <Card className="rounded-lg shadow-sm border border-border overflow-hidden bg-card">
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
                  referenceImageUrls={referenceUrls}
                  onReferenceImagesChange={setReferenceUrls}
                />
              </CardContent>
            </Card>

            {/* Carousel Card Editor - shown when 2+ images selected */}
            {selectedCreatives.length >= 2 && (
              <Card className="rounded-lg shadow-sm border border-border overflow-hidden bg-card">
                <CardHeader className="pb-3 border-b border-border bg-muted/20">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <MediaImage className="h-4 w-4 text-primary" /> Carousel{" "}
                    Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Tabs
                    value={adFormat}
                    onValueChange={(v) =>
                      setAdFormat(v as "single" | "carousel")
                    }
                  >
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="single">Single Image</TabsTrigger>
                      <TabsTrigger value="carousel">
                        Carousel ({selectedCreatives.length} cards)
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="single" className="mt-0">
                      <div className="text-sm text-subtle-foreground py-4 text-center">
                        Using first selected image only. Switch to Carousel to
                        use all {selectedCreatives.length} images.
                      </div>
                    </TabsContent>

                    <TabsContent value="carousel" className="mt-0">
                      <CarouselEditor
                        cards={carouselCards}
                        onChange={(cards) =>
                          updateDraft({ carouselCards: cards })
                        }
                        availableImages={selectedCreatives}
                        mainDestinationUrl={destinationValue}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Copy Editor */}
            <Card className="rounded-lg shadow-sm border border-border overflow-hidden bg-card">
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
                className="w-full h-14 bg-primary hover:bg-primary/90 font-bold text-primary-foreground rounded-lg shadow-sm border border-border text-lg"
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
