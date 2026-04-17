"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { StudioSidebar } from "./studio-sidebar";
import { StudioCanvas } from "./studio-canvas";
import { StudioHistoryStrip } from "./studio-history-strip";
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
  onUseInCampaign?: (imageUrl: string) => Promise<void>;
}

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
  const [savedImages, setSavedImages] = useState<Set<string>>(new Set());
  const [isUsingInCampaign, setIsUsingInCampaign] = useState(false);
  const [history, setHistory] = useState<string[]>(
    initialHistory.length > 0 ? initialHistory : [initialImage],
  );
  const [refineImageUrls, setRefineImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (initialHistory.length > 0) {
      setHistory(initialHistory);
    }
  }, [initialHistory]);

  const isCurrentSaved = savedImages.has(currentImage);

  const handleRefine = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const newImage = await onRefine(prompt, currentImage, seed, refineImageUrls);
      setCurrentImage(newImage);
      setHistory((prev) => [...prev, newImage]);
      setPrompt("");
      setRefineImageUrls([]);
    } catch (error) {
      console.error("Refinement failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

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
        isSaving={isSaving}
        isCurrentSaved={isCurrentSaved}
        isDownloading={isDownloading}
        onSave={handleSave}
        onDownload={handleDownload}
      />
      <StudioCanvas
        currentImage={currentImage}
        aspectRatio={aspectRatio}
        isSaving={isSaving}
        isCurrentSaved={isCurrentSaved}
        isDownloading={isDownloading}
        onSave={handleSave}
        onDownload={handleDownload}
      >
        <StudioHistoryStrip
          history={history}
          currentImage={currentImage}
          onSelect={setCurrentImage}
        />
      </StudioCanvas>
    </div>
  );
}
