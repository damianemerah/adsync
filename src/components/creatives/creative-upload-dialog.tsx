"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useCreatives } from "@/hooks/use-creatives";
import { ImageCropper } from "@/components/creatives/image-cropper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CloudUpload,
  Check,
  WarningTriangle,
  Xmark,
  Play,
} from "iconoir-react";
import { Creative } from "@/types";
import { cn } from "@/lib/utils";

const generateVideoThumbnail = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    // Set time after loaded metadata
    video.onloadedmetadata = () => {
      // Seek to 1 second or halfway if shorter
      video.currentTime = Math.min(1, video.duration / 2 || 0);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg"));
      URL.revokeObjectURL(url);
    };

    video.onerror = () => {
      resolve("");
      URL.revokeObjectURL(url);
    };
  });

interface UploadQueueItem {
  id: string;
  file: File;
  name: string;
  status: "pending_crop" | "uploading" | "done" | "error" | "queued";
  progress: number;
  previewUrl: string; // blob URL for display only
  errorMessage?: string;
}

interface CreativeUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (creative: Creative) => void;
}

export function CreativeUploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: CreativeUploadDialogProps) {
  const { uploadCreative } = useCreatives();

  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);

  // Crop state — processes one image at a time from the queue
  const [cropItem, setCropItem] = useState<UploadQueueItem | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Derived state
  const hasUploading = uploadQueue.some((i) => i.status === "uploading");
  const allDone =
    uploadQueue.length > 0 &&
    uploadQueue.every((i) => i.status === "done" || i.status === "error");
  const pendingCrop = uploadQueue.find((i) => i.status === "pending_crop");

  // ----- OPEN CROPPER for the next pending image -----
  useEffect(() => {
    if (!cropItem && pendingCrop) {
      // Read the file as a data URL for the cropper
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setCropSrc(reader.result?.toString() || null);
        setCropItem(pendingCrop);
      });
      reader.readAsDataURL(pendingCrop.file);
    }
  }, [pendingCrop, cropItem]);

  // ----- ACTUAL UPLOAD -----
  const handleUploadProcess = useCallback(
    async (
      queueId: string,
      file: File,
      dimensions: { width: number; height: number },
      thumbnailDataUrl?: string,
    ) => {
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === queueId
            ? { ...item, status: "uploading", progress: 0 }
            : item,
        ),
      );

      try {
        const newCreative = await uploadCreative({
          file,
          dimensions,
          thumbnailDataUrl,
        });

        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === queueId
              ? { ...item, status: "done", progress: 100 }
              : item,
          ),
        );

        if (onUploadComplete && newCreative) {
          onUploadComplete(newCreative as unknown as Creative);
        }
      } catch (error: any) {
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === queueId
              ? {
                  ...item,
                  status: "error",
                  progress: 0,
                  errorMessage: error?.message || "Upload failed",
                }
              : item,
          ),
        );
      }
    },
    [uploadCreative, onUploadComplete],
  );

  // ----- CROP SAVE: user approved a crop -----
  const handleCropSave = async (croppedFile: File) => {
    if (!cropItem) return;

    const img = new (window as any).Image();
    img.src = URL.createObjectURL(croppedFile);
    await new Promise((r) => (img.onload = r));

    const queueId = cropItem.id;

    // Swap the original file for the cropped one in the queue entry
    setUploadQueue((prev) =>
      prev.map((item) =>
        item.id === queueId
          ? {
              ...item,
              file: croppedFile,
              previewUrl: URL.createObjectURL(croppedFile),
              status: "queued",
            }
          : item,
      ),
    );

    // Reset crop state so the next pending_crop can open
    setCropItem(null);
    setCropSrc(null);

    // Kick off upload
    await handleUploadProcess(queueId, croppedFile, {
      width: img.width,
      height: img.height,
    });
  };

  // ----- CROP SKIP: user cancelled crop, upload as-is -----
  const handleCropSkip = async () => {
    if (!cropItem) return;

    const file = cropItem.file;
    const queueId = cropItem.id;

    const img = new (window as any).Image();
    img.src = URL.createObjectURL(file);
    await new Promise((r) => (img.onload = r));

    setUploadQueue((prev) =>
      prev.map((item) =>
        item.id === queueId ? { ...item, status: "queued" } : item,
      ),
    );

    setCropItem(null);
    setCropSrc(null);

    await handleUploadProcess(queueId, file, {
      width: img.width,
      height: img.height,
    });
  };

  // ----- FILE SELECTION: handles multiple files -----
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);

    const newItems: UploadQueueItem[] = files.map((file) => {
      const isVideo = file.type.startsWith("video");
      return {
        id: Math.random().toString(36).substring(7),
        file,
        name: file.name,
        // Videos skip cropping; images go to pending_crop
        status: isVideo ? "queued" : "pending_crop",
        progress: 0,
        previewUrl: isVideo ? "" : URL.createObjectURL(file), // Will generate video thumbnail async
      };
    });

    console.log(newItems, "New items");

    setUploadQueue((prev) => [...prev, ...newItems]);

    // Immediately kick off video uploads (no crop needed)
    newItems.forEach(async (item) => {
      if (item.file.type.startsWith("video")) {
        // Generate thumbnail client-side to avoid rendering <video> in tiny containers
        try {
          const thumbUrl = await generateVideoThumbnail(item.file);
          if (thumbUrl) {
            setUploadQueue((prev) =>
              prev.map((qItem) =>
                qItem.id === item.id
                  ? { ...qItem, previewUrl: thumbUrl }
                  : qItem,
              ),
            );
          }
          handleUploadProcess(
            item.id,
            item.file,
            { width: 0, height: 0 },
            thumbUrl,
          );
        } catch (err) {
          console.error("Failed to generate video thumbnail", err);
          handleUploadProcess(item.id, item.file, { width: 0, height: 0 });
        }
      }
    });

    // Reset input so the same files can be re-selected if needed
    e.target.value = "";
  };

  // ----- REMOVE item from queue -----
  const handleRemove = (id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // ----- Progress simulation -----
  useEffect(() => {
    if (uploadQueue.some((i) => i.status === "uploading" && i.progress < 90)) {
      const interval = setInterval(() => {
        setUploadQueue((prev) =>
          prev.map((item) => {
            if (item.status === "uploading" && item.progress < 90) {
              return { ...item, progress: item.progress + 10 };
            }
            return item;
          }),
        );
      }, 300);
      return () => clearInterval(interval);
    }
  }, [uploadQueue]);

  const handleClose = useCallback(() => {
    // Clean up blob URLs to avoid memory leaks
    uploadQueue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setUploadQueue([]);
    setCropItem(null);
    setCropSrc(null);
    onOpenChange(false);
  }, [uploadQueue, onOpenChange]);

  // Auto-close after successful upload
  useEffect(() => {
    if (allDone && uploadQueue.length > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [allDone, uploadQueue.length, handleClose]);

  const statusLabel = (item: UploadQueueItem) => {
    switch (item.status) {
      case "pending_crop":
        return "Waiting to crop";
      case "queued":
        return "Queued";
      case "uploading":
        return "Uploading...";
      case "done":
        return "Done";
      case "error":
        return item.errorMessage || "Error";
    }
  };

  return (
    <>
      {/* ---- MAIN UPLOAD DIALOG ---- */}
      <Dialog
        open={open && !cropItem}
        onOpenChange={(o) => !o && handleClose()}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col text-foreground">
          <DialogHeader>
            <DialogTitle>Upload Assets</DialogTitle>
            <DialogDescription>
              Supported: JPG, PNG, MP4. Max 50MB. You can select multiple files.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto">
            {/* Drop Zone */}
            {!hasUploading && !allDone && (
              <label className="relative border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-muted/50 hover:border-primary transition-all cursor-pointer group bg-muted/20">
                <input
                  type="file"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                  accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4"
                  onChange={handleFileSelect}
                />
                <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <CloudUpload className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg text-foreground">
                  Drag & Drop files
                </h3>
                <p className="text-muted-foreground text-sm">
                  or click to browse — multiple files supported
                </p>
              </label>
            )}

            {/* Upload Queue */}
            {uploadQueue.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {uploadQueue.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-xl bg-card transition-colors w-full overflow-hidden",
                      item.status === "error"
                        ? "border-destructive/40 bg-destructive/5"
                        : item.status === "done"
                          ? "border-primary/30 bg-primary/5"
                          : "border-border",
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="h-10 w-10 bg-muted/50 rounded-lg overflow-hidden shrink-0 relative flex items-center justify-center">
                      {item.file.type.startsWith("video") ? (
                        <>
                          {item.previewUrl ? (
                            <Image
                              src={item.previewUrl}
                              alt="preview"
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              {/* Generic Video Icon if thumb failed or loading */}
                              <Play className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="w-4 h-4 text-white" />
                          </div>
                        </>
                      ) : (
                        item.previewUrl && (
                          <Image
                            src={item.previewUrl}
                            alt="preview"
                            fill
                            className="object-cover"
                          />
                        )
                      )}
                    </div>

                    {/* Info + Progress */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex gap-2 justify-between items-center text-sm mb-1.5 w-full overflow-hidden">
                        <span
                          className="font-medium truncate text-foreground flex-1 min-w-0 block"
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <span
                          className={cn(
                            "text-xs capitalize shrink-0",
                            item.status === "done"
                              ? "text-primary font-semibold"
                              : item.status === "error"
                                ? "text-destructive font-semibold"
                                : "text-muted-foreground",
                          )}
                        >
                          {statusLabel(item)}
                        </span>
                      </div>
                      {item.status === "uploading" ? (
                        <Progress
                          value={item.progress}
                          className="h-1.5 bg-muted"
                        />
                      ) : (
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              item.status === "done"
                                ? "bg-primary w-full"
                                : item.status === "error"
                                  ? "bg-destructive w-full"
                                  : "bg-muted-foreground/30 w-0",
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {/* Status icon / Remove */}
                    <div className="shrink-0">
                      {item.status === "done" ? (
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-primary" />
                        </div>
                      ) : item.status === "error" ? (
                        <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center">
                          <WarningTriangle className="w-3.5 h-3.5 text-destructive" />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Xmark className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {allDone ? "Close" : "Cancel"}
            </Button>
            {!allDone && !hasUploading && uploadQueue.length > 0 && (
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-soft"
                onClick={handleClose}
              >
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- CROP DIALOG: one at a time, auto-advances through queue ---- */}
      <Dialog
        open={!!cropItem && !!cropSrc}
        onOpenChange={(o) => {
          if (!o) handleCropSkip();
        }}
      >
        <DialogContent className="max-w-xl text-foreground">
          <DialogHeader>
            <DialogTitle>
              Crop Image
              {uploadQueue.filter((i) => i.status === "pending_crop").length >
                1 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({uploadQueue.findIndex((i) => i.id === cropItem?.id) + 1} of{" "}
                  {uploadQueue.length})
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Crop to a standard ad ratio, or skip to upload as-is.
            </DialogDescription>
          </DialogHeader>
          {cropSrc && (
            <ImageCropper
              imageSrc={cropSrc}
              onCancel={handleCropSkip}
              onCropComplete={handleCropSave}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
