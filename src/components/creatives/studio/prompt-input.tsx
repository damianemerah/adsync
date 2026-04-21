"use client";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type CreativeFormat } from "@/lib/ai/prompts";
import { ReferenceImageManager, ReferenceImageControls, useReferenceImageUpload } from "./reference-image-manager";
import { PromptInputControls } from "./prompt-input-controls";

// Define the aspect ratio type
export type AspectRatio = "1:1" | "9:16" | "4:5" | "16:9";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  className?: string;
  placeholder?: string;
  compact?: boolean;
  isEnhanced?: boolean;
  onEnhancedChange?: (val: boolean) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (val: AspectRatio) => void;
  hideControls?: boolean;
  imageUrls?: string[];
  onImageUrlsChange?: (urls: string[]) => void;
  format?: CreativeFormat;
  onFormatChange?: (val: CreativeFormat) => void;
}

export function PromptInput({
  value,
  onChange,
  onGenerate,
  isGenerating,
  className,
  placeholder = "Describe what you want to create...",
  compact = false,
  isEnhanced = true,
  onEnhancedChange,
  aspectRatio,
  onAspectRatioChange,
  hideControls = false,
  imageUrls = [],
  onImageUrlsChange,
  format = "auto",
  onFormatChange,
}: PromptInputProps) {
  // Character count helpers
  const charCount = value.length;
  // "Sweet spot" for Flux logic: ~20 to ~300 characters is usually good.
  const isPromptLengthGood = charCount > 20 && charCount < 300;

  const { isUploading, uploadFiles, handlePaste } = useReferenceImageUpload({
    imageUrls,
    onImageUrlsChange,
  });

  return (
    <ReferenceImageManager
      imageUrls={imageUrls}
      onImageUrlsChange={onImageUrlsChange}
      className={className}
    >
      <div className="relative w-full">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onGenerate();
            }
          }}
          onPaste={handlePaste}
          placeholder={placeholder}
          className={cn(
            "w-full resize-none border-none bg-transparent p-4 text-base focus-visible:ring-0 placeholder:text-muted-foreground min-h-[100px]",
            compact && "min-h-[80px]",
          )}
        />

        {/* Prompt Length Indicator */}
        <div className="absolute bottom-2 right-4 text-[10px] pointer-events-none transition-colors duration-300">
          <span
            className={cn(
              "font-medium tabular-nums",
              charCount === 0
                ? "text-muted-foreground"
                : isPromptLengthGood
                  ? "text-green-500"
                  : charCount > 300
                    ? "text-orange-500"
                    : "text-muted-foreground",
            )}
          >
            {charCount} chars
          </span>
          {charCount > 0 && isPromptLengthGood && (
            <span className="text-subtle-foreground ml-1">✓</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border p-2 bg-muted/30 rounded-b-2xl flex-wrap">
        <div className="flex items-center gap-3">
          <ReferenceImageControls
            imageUrls={imageUrls}
            onImageUrlsChange={onImageUrlsChange}
            isUploading={isUploading}
            uploadFiles={uploadFiles}
          />
        </div>

        <PromptInputControls
          aspectRatio={aspectRatio}
          onAspectRatioChange={onAspectRatioChange}
          format={format}
          onFormatChange={onFormatChange}
          isEnhanced={isEnhanced}
          onEnhancedChange={onEnhancedChange}
          hideControls={hideControls}
        />
      </div>
    </ReferenceImageManager>
  );
}
