"use client";

import { useState, useRef, DragEvent, ReactNode } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CreativeSelectorDialog } from "../creative-selector-dialog";
import { uploadTempImage } from "@/actions/ai-images";
import { toast } from "sonner";
import { Plus, Sparks, Upload, MediaImage, Xmark } from "iconoir-react";
import { cn } from "@/lib/utils";

export const MAX_IMAGES = 4;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function useReferenceImageUpload({
  imageUrls,
  onImageUrlsChange,
}: {
  imageUrls: string[];
  onImageUrlsChange?: (urls: string[]) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const uploadFiles = async (files: File[]) => {
    if (!files.length || !onImageUrlsChange) return;

    if (imageUrls.length + files.length > MAX_IMAGES) {
      toast.error(`You can only have up to ${MAX_IMAGES} reference images.`);
      return;
    }

    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error("Image Too Large", {
        description: "One or more images exceed the 5MB limit. Please use smaller images.",
      });
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
    } catch (error: any) {
      console.error("Upload failed", error);
      if (
        error?.message?.includes("exceeded 5 MB limit") ||
        error?.message?.includes("exceeded 1 MB limit") ||
        error?.message?.includes("limit")
      ) {
        toast.error("Image Too Large", {
          description: "The uploaded reference image is too large. Please use an image under 5MB.",
        });
      } else {
        toast.error("Failed to upload image. Please try again.");
      }
    } finally {
      setIsUploading(false);
      setIsDragOver(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement | HTMLDivElement>) => {
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
      file.type.startsWith("image/")
    );

    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  return {
    isUploading,
    isDragOver,
    uploadFiles,
    handlePaste,
    dragProps: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}

export function ReferenceImageControls({
  imageUrls,
  onImageUrlsChange,
  isUploading,
  uploadFiles,
}: {
  imageUrls: string[];
  onImageUrlsChange?: (urls: string[]) => void;
  isUploading: boolean;
  uploadFiles: (files: File[]) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleUploadClick = () => {
    if (imageUrls.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} reference images allowed.`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const removeImage = (indexToRemove: number) => {
    if (onImageUrlsChange) {
      onImageUrlsChange(imageUrls.filter((_, idx) => idx !== indexToRemove));
    }
  };

  return (
    <>
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
            <Upload className="w-4 h-4 text-muted-foreground" /> Upload from Computer
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => setLibraryOpen(true)}
          >
            <MediaImage className="w-4 h-4 text-muted-foreground" /> Select from Library
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreativeSelectorDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={(urls) => {
          if (onImageUrlsChange) {
            const remainingSlots = MAX_IMAGES - imageUrls.length;
            if (urls.length > remainingSlots) {
              toast.warning(`Only added ${remainingSlots} images to fit limit.`);
              onImageUrlsChange([...imageUrls, ...urls.slice(0, remainingSlots)]);
            } else {
              onImageUrlsChange([...imageUrls, ...urls]);
            }
          }
        }}
      />

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png, image/jpeg, image/jpg, image/webp, image/avif, image/gif, image/tiff"
        onChange={handleFileSelect}
        multiple
      />

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
                    className="relative aspect-square rounded-md overflow-hidden border border-border group bg-muted/50"
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
              <p className="text-sm text-subtle-foreground mt-4">
                The first image is treated as the primary subject reference.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function ReferenceImageManager({
  imageUrls,
  onImageUrlsChange,
  className,
  children,
}: {
  imageUrls: string[];
  onImageUrlsChange?: (urls: string[]) => void;
  className?: string;
  children: ReactNode;
}) {
  const { isDragOver, dragProps } = useReferenceImageUpload({
    imageUrls,
    onImageUrlsChange,
  });

  return (
    <div
      className={cn(
        "relative rounded-lg bg-card shadow-sm border border-border transition-all focus-within:border-primary",
        isDragOver && "border-2 border-primary bg-primary/5",
        className,
      )}
      {...dragProps}
    >
      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
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

      {children}
    </div>
  );
}
