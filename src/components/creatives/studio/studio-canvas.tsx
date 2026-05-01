"use client";

import { Button } from "@/components/ui/button";
import { Sparks, Download } from "iconoir-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { type AspectRatio } from "./prompt-input";

const ASPECT_RATIO_DIMENSIONS: Record<AspectRatio, { w: number; h: number }> =
  {
    "1:1": { w: 1024, h: 1024 },
    "16:9": { w: 1344, h: 768 },
    "9:16": { w: 768, h: 1344 },
    "4:5": { w: 1024, h: 1280 },
  };

const RATIO_CLASSES: Record<AspectRatio, string> = {
  "1:1": "aspect-square h-[50vh] w-auto",
  "16:9": "aspect-video h-[50vh] w-auto",
  "9:16": "aspect-[9/16] h-[50vh] w-auto",
  "4:5": "aspect-[4/5] h-[50vh] w-auto",
};

interface StudioCanvasProps {
  currentImage: string;
  aspectRatio: AspectRatio;
  isDownloading: boolean;
  onDownload: () => void;
  children?: React.ReactNode;
}

export function StudioCanvas({
  currentImage,
  aspectRatio,
  isDownloading,
  onDownload,
  children,
}: StudioCanvasProps) {
  const dims = ASPECT_RATIO_DIMENSIONS[aspectRatio];

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/10 relative">
      {/* Toolbar */}
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
            variant="outline"
            size="sm"
            onClick={onDownload}
            disabled={isDownloading}
            className="h-8 px-3 text-xs bg-background hover:bg-muted border-border text-foreground rounded-lg"
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

      {/* Image area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-0 relative z-0">
        <div
          className={cn(
            "relative border border-border rounded-lg overflow-hidden bg-card ring-1 ring-border group",
            RATIO_CLASSES[aspectRatio] || "h-[50vh] aspect-square",
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
        <div className="mt-4 px-4 py-1.5 bg-card border border-border rounded-full text-xs font-medium text-subtle-foreground">
          {dims.w} × {dims.h} px
        </div>
      </div>

      {/* History strip slot */}
      {children}
    </div>
  );
}
