"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparks, Check, Heart, Download } from "iconoir-react";
import { PromptInput } from "./prompt-input";
import { cn } from "@/lib/utils";
import { CREDIT_COSTS } from "@/lib/constants";
import { type AspectRatio } from "./prompt-input";

interface StudioSidebarProps {
  onBack: () => void;
  onUseInCampaign?: (imageUrl: string) => Promise<void>;
  isUsingInCampaign: boolean;
  currentImage: string;
  prompt: string;
  onPromptChange: (value: string) => void;
  aspectRatio: AspectRatio;
  refineImageUrls: string[];
  onRefineImageUrlsChange: (urls: string[]) => void;
  isGenerating: boolean;
  onRefine: () => void;
  isSaving: boolean;
  isCurrentSaved: boolean;
  isDownloading: boolean;
  onSave: () => void;
  onDownload: () => void;
}

export function StudioSidebar({
  onBack,
  onUseInCampaign,
  isUsingInCampaign,
  currentImage,
  prompt,
  onPromptChange,
  aspectRatio,
  refineImageUrls,
  onRefineImageUrlsChange,
  isGenerating,
  onRefine,
  isSaving,
  isCurrentSaved,
  isDownloading,
  onSave,
  onDownload,
}: StudioSidebarProps) {
  return (
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

      {/* Use in Campaign CTA */}
      {onUseInCampaign && (
        <div className="p-3 border-b border-border bg-primary/5">
          <Button
            onClick={async () => {
              await onUseInCampaign(currentImage);
            }}
            disabled={isUsingInCampaign}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-md border border-border text-sm gap-2"
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
          <p className="text-[10px] text-subtle-foreground text-center mt-1.5">
            Saves to library &amp; returns you to the campaign wizard
          </p>
        </div>
      )}

      {/* Prompt section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-subtle-foreground">
            Refine this image
          </h3>
          <PromptInput
            value={prompt}
            onChange={onPromptChange}
            onGenerate={onRefine}
            isGenerating={isGenerating}
            compact={true}
            placeholder="Describe what you want to change..."
            aspectRatio={aspectRatio}
            onAspectRatioChange={() => {}}
            hideControls={true}
            imageUrls={refineImageUrls}
            onImageUrlsChange={onRefineImageUrlsChange}
          />
        </div>
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-border bg-card space-y-3">
        <Button
          onClick={onRefine}
          disabled={isGenerating || !prompt}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground border border-border rounded-lg font-bold transition-all"
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

        <Button
          variant={isCurrentSaved ? "default" : "outline"}
          onClick={onSave}
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

        <Button
          variant="outline"
          onClick={onDownload}
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
  );
}
