"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  Sparks,
  Check,
  Heart,
  ArrowRight,
} from "iconoir-react";
import { PromptInput } from "./prompt-input";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CREDIT_COSTS } from "@/lib/constants";

import { type AspectRatio } from "./prompt-input";

interface GenerationViewProps {
  initialImage: string;
  initialPrompt: string;
  onBack: () => void;
  onRefine: (
    prompt: string,
    image: string,
    seed?: number,
    additionalImages?: string[],
  ) => Promise<string>;
  onSave: (imageUrl: string) => Promise<void>;
  aspectRatio: AspectRatio;
  seed?: number;
  history?: string[];
  /** When provided, shows a "Use in Campaign" CTA that saves the image and returns to the wizard */
  onUseInCampaign?: (imageUrl: string) => Promise<void>;
}

// Maps aspect ratios to their actual pixel dimensions from fal.ai
const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { w: number; h: number }> = {
  "1:1": { w: 1024, h: 1024 },
  "16:9": { w: 1344, h: 768 },
  "9:16": { w: 768, h: 1344 },
  "4:5": { w: 1024, h: 1280 },
};

export function GenerationView({
  initialImage,
  initialPrompt,
  onBack,
  onRefine,
  onSave,
  aspectRatio,
  seed,
  history: initialHistory = [],
  onUseInCampaign,
}: GenerationViewProps) {
  const [currentImage, setCurrentImage] = useState(initialImage);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Track which images have been saved (by URL)
  const [savedImages, setSavedImages] = useState<Set<string>>(new Set());
  const [isUsingInCampaign, setIsUsingInCampaign] = useState(false);

  // History is append-only (chronological: oldest left, newest right)
  const [history, setHistory] = useState<string[]>(
    initialHistory.length > 0 ? initialHistory : [initialImage],
  );

  // Auto-scroll history strip to the right (latest) when a new image is added
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialHistory.length > 0) {
      setHistory(initialHistory);
    }
  }, [initialHistory]);

  const isCurrentSaved = savedImages.has(currentImage);

  const handleSave = async () => {
    if (isCurrentSaved || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(currentImage);
      setSavedImages((prev) => new Set(prev).add(currentImage));
      toast.success("Saved to your library", {
        description: "Find it in Creations → Media Library.",
        duration: 4000,
      });
    } catch (error: any) {
      toast.error("Save failed", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Scroll history strip to the end whenever history grows
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollLeft = historyRef.current.scrollWidth;
    }
  }, [history]);

  const [refineImageUrls, setRefineImageUrls] = useState<string[]>([]);

  const handleRefine = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const newImage = await onRefine(
        prompt,
        currentImage,
        seed,
        refineImageUrls,
      );
      setCurrentImage(newImage);
      // Append to end (chronological order)
      setHistory((prev) => [...prev, newImage]);
      setPrompt("");
      setRefineImageUrls([]);
    } catch (error) {
      console.error("Refinement failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download the current image by fetching as blob and triggering a save
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(currentImage);
      if (!response.ok) throw new Error("Failed to fetch image");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `adsync-creative-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Downloaded successfully");
    } catch (err) {
      toast.error("Download failed. Try right-clicking the image to save.");
    } finally {
      setIsDownloading(false);
    }
  };

  const ratioClasses: Record<AspectRatio, string> = {
    "1:1": "aspect-square h-[50vh] w-auto",
    "16:9": "aspect-video h-[50vh] w-auto",
    "9:16": "aspect-[9/16] h-[50vh] w-auto",
    "4:5": "aspect-[4/5] h-[50vh] w-auto",
  };

  const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio];

  return (
    <div className="flex h-full w-full bg-muted/30">
      {/* ---- LEFT SIDEBAR (Controls) ---- */}
      <div className="w-[360px] shrink-0 border-r border-border bg-card flex flex-col h-full z-10">
        {/* Back button */}
        <div className="p-3 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="w-full justify-start gap-2 text-subtle-foreground hover:text-foreground hover:bg-muted h-9"
          >
            <ArrowLeft className="h-4 w-4" />
            {onUseInCampaign ? "← Back to Campaign" : "Back to Create"}
          </Button>
        </div>

        {/* ── Use in Campaign CTA (only when editing from campaign wizard) ── */}
        {onUseInCampaign && (
          <div className="p-3 border-b border-border bg-primary/5">
            <Button
              onClick={async () => {
                setIsUsingInCampaign(true);
                try {
                  await onUseInCampaign(currentImage);
                } finally {
                  setIsUsingInCampaign(false);
                }
              }}
              disabled={isUsingInCampaign}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-md shadow-sm border border-border text-sm gap-2"
            >
              {isUsingInCampaign ? (
                <>
                  <Sparks className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Use in Campaign
                </>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              Saves to library &amp; returns you to the campaign wizard
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">
              Refine this image
            </h3>
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              onGenerate={handleRefine}
              isGenerating={isGenerating}
              compact={true}
              placeholder="Describe what you want to change..."
              aspectRatio={aspectRatio}
              onAspectRatioChange={() => {}}
              hideControls={true}
              imageUrls={refineImageUrls}
              onImageUrlsChange={setRefineImageUrls}
            />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t border-border bg-card space-y-3">
          <Button
            onClick={handleRefine}
            disabled={isGenerating || !prompt}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm border border-border rounded-lg font-bold transition-all"
          >
            {isGenerating ? (
              <>
                <Sparks className="mr-2 h-4 w-4 animate-spin" /> Redesigning...
              </>
            ) : (
              <div className="flex flex-col items-center pb-1">
                <span className="flex items-center gap-1.5 mt-1">
                  <Sparks className="h-4 w-4" /> Redesign Now
                </span>
                <span className="text-[10px] opacity-80 mt-0 tracking-wide font-medium">
                  (Costs {CREDIT_COSTS.IMAGE_EDIT_PRO} Credits)
                </span>
              </div>
            )}
          </Button>

          {/* Save to Library */}
          <Button
            variant={isCurrentSaved ? "default" : "outline"}
            onClick={handleSave}
            disabled={isSaving || isCurrentSaved}
            className={cn(
              "w-full h-10 rounded-md font-medium transition-all",
              isCurrentSaved
                ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 cursor-default"
                : "border-border text-foreground hover:bg-muted",
            )}
          >
            {isSaving ? (
              <>
                <Sparks className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : isCurrentSaved ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Saved to Library
              </>
            ) : (
              <>
                <Heart className="mr-2 h-4 w-4" /> Save to Library
              </>
            )}
          </Button>

          {/* Download — wired up */}
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full h-10 rounded-md border-border font-medium text-foreground hover:bg-muted transition-all"
          >
            {isDownloading ? (
              <>
                <Sparks className="mr-2 h-4 w-4 animate-spin" /> Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> Download Image
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ---- MAIN CANVAS ---- */}
      <div className="flex-1 flex flex-col h-full bg-muted/10 relative">
        {/* Canvas toolbar */}
        <div className="h-14 px-6 flex items-center justify-between z-10 shrink-0 border-b border-border/50">
          <div className="flex items-center gap-2 text-xs font-medium text-subtle-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Generated with AdSync
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-subtle-foreground">
              {new Date().toLocaleDateString()}
            </span>
            <Button
              variant={isCurrentSaved ? "default" : "outline"}
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isCurrentSaved}
              className={cn(
                "h-8 px-3 text-xs shadow-sm border border-border rounded-lg",
                isCurrentSaved
                  ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10"
                  : "bg-background hover:bg-muted border-border text-foreground",
              )}
            >
              {isSaving ? (
                <Sparks className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : isCurrentSaved ? (
                <Check className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <Heart className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isSaving ? "Saving..." : isCurrentSaved ? "Saved" : "Save"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="h-8 px-3 text-xs bg-background hover:bg-muted border-border text-foreground shadow-sm border border-border rounded-lg"
            >
              {isDownloading ? (
                <Sparks className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isDownloading ? "Downloading..." : "Download"}
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-0 relative z-0">
          <div
            className={cn(
              "relative shadow-sm border border-border rounded-lg overflow-hidden bg-card ring-1 ring-border group",
              ratioClasses[aspectRatio] || "h-[50vh] aspect-square",
            )}
          >
            <Image
              src={currentImage}
              alt="Generated Creative"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Dimensions label — now using real values */}
          <div className="mt-4 px-4 py-1.5 bg-card border border-border rounded-full text-xs font-medium text-subtle-foreground shadow-sm border border-border">
            {dims.w} × {dims.h} px
          </div>
        </div>

        {/* Version History Strip — chronological (oldest left → newest right) */}
        {history.length > 1 && (
          <div className="shrink-0 border border-border p-4 rounded-lg m-3 bg-card shadow-sm border border-border z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-subtle-foreground mb-3">
              Version History
            </p>
            <div
              ref={historyRef}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar"
            >
              {history.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImage(img)}
                  className={cn(
                    "relative h-16 w-16 shrink-0 rounded-md overflow-hidden border-2 transition-all hover:scale-105",
                    currentImage === img
                      ? "border-primary ring-2 ring-primary/20 ring-offset-2"
                      : "border-border hover:border-muted-foreground/30 opacity-70 hover:opacity-100",
                  )}
                  title={`Version ${idx + 1}`}
                >
                  <Image
                    src={img}
                    alt={`Version ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                  {/* Version number badge */}
                  <div className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-white bg-black/50 rounded px-1 leading-4">
                    v{idx + 1}
                  </div>
                  {/* Checkmark on active */}
                  {currentImage === img && (
                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary drop-shadow-md" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
