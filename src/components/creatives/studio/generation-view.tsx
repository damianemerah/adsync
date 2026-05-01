"use client";

import { useState, useEffect } from "react";
import { StudioSidebar } from "./studio-sidebar";
import { StudioCanvas } from "./studio-canvas";
import { StudioHistoryStrip, type HistoryItem } from "./studio-history-strip";
import { type AspectRatio } from "./prompt-input";
import { toast } from "sonner";

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
  aspectRatio: AspectRatio;
  seed?: number;
  history?: HistoryItem[];
  onUseInCampaign?: (imageUrl: string) => Promise<void>;
  rootId?: string | null;
  selectedVariantId?: string | null;
}

export function GenerationView({
  initialImage,
  initialPrompt,
  onBack,
  onRefine,
  aspectRatio,
  seed,
  history: initialHistory = [],
  onUseInCampaign,
  rootId,
  selectedVariantId,
}: GenerationViewProps) {
  const [currentImage, setCurrentImage] = useState(initialImage);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUsingInCampaign, setIsUsingInCampaign] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(
    initialHistory.length > 0
      ? initialHistory
      : [{ id: "initial", imageUrl: initialImage }],
  );
  const [refineImageUrls, setRefineImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (initialHistory.length > 0) {
      setHistory(initialHistory);
    }
  }, [initialHistory]);

  const handleRefine = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const newImageUrl = await onRefine(prompt, currentImage, seed, refineImageUrls);
      setCurrentImage(newImageUrl);
      setHistory((prev) => [...prev, { id: `temp-${Date.now()}`, imageUrl: newImageUrl }]);
      setPrompt("");
      setRefineImageUrls([]);
    } catch (error) {
      console.error("Refinement failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

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
    } catch {
      toast.error("Download failed. Try right-clicking the image to save.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-muted/30">
      <StudioSidebar
        onBack={onBack}
        onUseInCampaign={
          onUseInCampaign
            ? async (img) => {
                setIsUsingInCampaign(true);
                try {
                  await onUseInCampaign(img);
                } finally {
                  setIsUsingInCampaign(false);
                }
              }
            : undefined
        }
        isUsingInCampaign={isUsingInCampaign}
        currentImage={currentImage}
        prompt={prompt}
        onPromptChange={setPrompt}
        aspectRatio={aspectRatio}
        refineImageUrls={refineImageUrls}
        onRefineImageUrlsChange={setRefineImageUrls}
        isGenerating={isGenerating}
        onRefine={handleRefine}
        isDownloading={isDownloading}
        onDownload={handleDownload}
      />
      <StudioCanvas
        currentImage={currentImage}
        aspectRatio={aspectRatio}
        isDownloading={isDownloading}
        onDownload={handleDownload}
      >
        <StudioHistoryStrip
          history={history}
          currentImage={currentImage}
          onSelect={setCurrentImage}
          rootId={rootId}
          selectedVariantId={selectedVariantId}
        />
      </StudioCanvas>
    </div>
  );
}
