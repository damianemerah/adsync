"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FluxTips } from "./flux-tips";
import {
  Plus,
  Sparks,
  MediaImage,
  Upload,
  Square,
  SmartphoneDevice,
  SelectWindow,
  PcCheck,
  Xmark,
  ViewGrid,
} from "iconoir-react";
import Image from "next/image";
import { useRef, useState, DragEvent } from "react";
import { uploadTempImage } from "@/actions/ai-images";
import { toast } from "sonner";
import { CreativeSelectorDialog } from "../creative-selector-dialog";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { CreativeFormat } from "@/lib/ai/prompts";

// Define the aspect ratio type
export type AspectRatio = "1:1" | "9:16" | "4:5" | "16:9";

const MAX_IMAGES = 4;

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
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Character count helpers
  const charCount = value.length;
  // "Sweet spot" for Flux logic: ~20 to ~300 characters is usually good.
  const isPromptLengthGood = charCount > 20 && charCount < 300;

  const handleUploadClick = () => {
    if (imageUrls.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} reference images allowed.`);
      return;
    }
    fileInputRef.current?.click();
  };

  // Upload files to ephemeral temp-uploads bucket
  const uploadFiles = async (files: File[]) => {
    if (!files.length || !onImageUrlsChange) return;

    // Check limit
    if (imageUrls.length + files.length > MAX_IMAGES) {
      toast.error(`You can only have up to ${MAX_IMAGES} reference images.`);
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return uploadTempImage(formData);
      });

      const results = await Promise.all(uploadPromises);
      const validUrls = results.filter(Boolean);

      if (validUrls.length > 0) {
        onImageUrlsChange([...imageUrls, ...validUrls]);
        toast.success(`Uploaded ${validUrls.length} image(s)`);
      }
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      setIsDragOver(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageFiles = items
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);

    if (imageFiles.length > 0) {
      e.preventDefault();
      await uploadFiles(imageFiles);
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onImageUrlsChange) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!onImageUrlsChange) return;

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const removeImage = (indexToRemove: number) => {
    if (onImageUrlsChange) {
      onImageUrlsChange(imageUrls.filter((_, idx) => idx !== indexToRemove));
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border bg-card shadow-soft transition-all focus-within:ring-2 focus-within:ring-primary/20",
        isDragOver && "ring-2 ring-primary border-primary bg-primary/5",
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
          <div className="text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Drop images here
            </p>
          </div>
        </div>
      )}

      <div className="relative w-full">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onGenerate();
            }
          }}
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
            <span className="text-muted-foreground ml-1">✓</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border p-2 bg-muted/30 rounded-b-2xl">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Add Image Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 text-subtle-foreground hover:text-foreground px-2"
                disabled={imageUrls.length >= MAX_IMAGES || isUploading}
                type="button"
              >
                {isUploading ? (
                  <Sparks className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span className="text-xs font-medium">
                  {isUploading
                    ? "Uploading..."
                    : imageUrls.length >= MAX_IMAGES
                      ? "Max Images"
                      : "Add Image"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={handleUploadClick}
              >
                <Upload className="w-4 h-4 text-muted-foreground" /> Upload from
                Computer
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => setLibraryOpen(true)}
              >
                <MediaImage className="w-4 h-4 text-muted-foreground" /> Select
                from Library
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Library Dialog */}
          <CreativeSelectorDialog
            open={libraryOpen}
            onOpenChange={setLibraryOpen}
            onSelect={(urls) => {
              if (onImageUrlsChange) {
                const remainingSlots = MAX_IMAGES - imageUrls.length;
                if (urls.length > remainingSlots) {
                  toast.warning(
                    `Only added ${remainingSlots} images to fit limit.`,
                  );
                  onImageUrlsChange([
                    ...imageUrls,
                    ...urls.slice(0, remainingSlots),
                  ]);
                } else {
                  onImageUrlsChange([...imageUrls, ...urls]);
                }
              }
            }}
          />

          {/* Hidden Input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/png, image/jpeg, image/jpg, image/webp, image/avif, image/gif, image/tiff"
            onChange={handleFileSelect}
            multiple
          />

          {/* Image Stack Preview */}
          {imageUrls.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="relative flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                  aria-label="View all images"
                >
                  <div className="flex -space-x-2">
                    {imageUrls.slice(0, 4).map((url, idx) => (
                      <div
                        key={idx}
                        className="relative w-8 h-8 rounded-md overflow-hidden border-2 border-background bg-card shadow-sm"
                      >
                        <Image
                          src={url}
                          alt={`Reference ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                    {imageUrls.length > 4 && (
                      <div className="w-8 h-8 rounded-md bg-foreground text-background text-[10px] font-bold flex items-center justify-center border-2 border-background shadow-sm z-10 relative">
                        +{imageUrls.length - 4}
                      </div>
                    )}
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <div className="p-4">
                  <h3 className="text-lg font-bold mb-4">Reference Images</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {imageUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-xl overflow-hidden border border-border group bg-muted/50"
                      >
                        <Image
                          src={url}
                          alt={`Reference ${idx + 1}`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(idx);
                          }}
                          className="absolute top-2 right-2 bg-black/50 hover:bg-destructive text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 backdrop-blur-sm"
                          title="Remove image"
                        >
                          <Xmark className="w-3.5 h-3.5" />
                        </button>
                        {idx === 0 && (
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded-full backdrop-blur-md">
                            PRIMARY
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    The first image is treated as the primary subject reference.
                    Drag and drop to reorder coming soon.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Controls Separator */}
          {!hideControls && <div className="h-4 w-px bg-border mx-1" />}

          {/* Aspect Ratio Selector */}
          {!hideControls && (
            <Select
              value={aspectRatio}
              onValueChange={(val) => onAspectRatioChange(val as AspectRatio)}
            >
              <SelectTrigger className="h-8 w-auto min-w-[130px] border-transparent bg-transparent hover:bg-muted focus:ring-0 text-xs font-medium px-2">
                <div className="flex items-center">
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1:1">
                  <div className="flex items-center gap-2">
                    <Square className="w-3.5 h-3.5" />
                    <span>Square (1:1)</span>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      IG Feed
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="9:16">
                  <div className="flex items-center gap-2">
                    <SmartphoneDevice className="w-3.5 h-3.5" />
                    <span>Vertical (9:16)</span>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      Stories/Reels
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="4:5">
                  <div className="flex items-center gap-2">
                    <SelectWindow className="w-3.5 h-3.5" />
                    <span>Portrait (4:5)</span>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      Fb Feed
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="16:9">
                  <div className="flex items-center gap-2">
                    <PcCheck className="w-3.5 h-3.5" />
                    <span>Landscape (16:9)</span>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      Web
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Creative Format Selector */}
          {!hideControls && onFormatChange && (
            <>
              <div className="h-4 w-px bg-border mx-1" />
              <Select
                value={format}
                onValueChange={(val) => onFormatChange(val as CreativeFormat)}
              >
                <SelectTrigger className="h-8 w-auto border-transparent bg-transparent hover:bg-muted focus:ring-0 text-xs font-medium px-2">
                  <div className="flex items-center gap-1.5">
                    <ViewGrid
                      className={cn(
                        "w-3.5 h-3.5 shrink-0 transition-colors",
                        format !== "social_ad"
                          ? "text-ai"
                          : "text-subtle-foreground",
                      )}
                    />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social_ad">
                    <span className="block">Social Ad</span>
                    <span className="text-[10px] text-muted-foreground">
                      Standard text overlay
                    </span>
                  </SelectItem>
                  <SelectItem value="product_image">
                    <span className="block">Product Shot</span>
                    <span className="text-[10px] text-muted-foreground">
                      Clean, no text
                    </span>
                  </SelectItem>
                  <SelectItem value="poster">
                    <span className="block">Poster / Flyer</span>
                    <span className="text-[10px] text-muted-foreground">
                      Heavy text design
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {/* Consolidated Help */}
          {!hideControls && <FluxTips />}
        </div>

        <div className="flex items-center gap-3">
          {/* Smart Mode Toggle */}
          {onEnhancedChange && (
            <div className="flex items-center gap-2 mr-2">
              <div
                className="flex items-center gap-1.5 cursor-pointer"
                onClick={() => onEnhancedChange(!isEnhanced)}
              >
                <Sparks
                  className={cn(
                    "h-3.5 w-3.5",
                    isEnhanced
                      ? "text-ai fill-ai/10"
                      : "text-subtle-foreground",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    isEnhanced ? "text-ai" : "text-subtle-foreground",
                  )}
                >
                  Enhance
                </span>
              </div>
              <Switch
                id="smart-mode"
                checked={isEnhanced}
                onCheckedChange={onEnhancedChange}
                className="scale-75 data-[state=checked]:bg-ai"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
