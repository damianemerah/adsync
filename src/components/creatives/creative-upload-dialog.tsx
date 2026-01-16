"use client";

import { useState, useEffect } from "react";
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
import { CloudUpload } from "lucide-react";
import { Creative } from "@/types";

interface UploadQueueItem {
  id: string;
  name: string;
  status: "uploading" | "done" | "error" | "queued";
  progress: number;
  url: string;
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

  // Local State
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);

  // --- HANDLERS ---

  const handleUploadProcess = async (
    file: File,
    dimensions: { width: number; height: number }
  ) => {
    const queueId = Math.random().toString(36).substring(7);

    // 1. Add to Queue
    setUploadQueue((prev) => [
      ...prev,
      {
        id: queueId,
        name: file.name,
        status: "uploading",
        progress: 0,
        url: URL.createObjectURL(file),
      },
    ]);

    try {
      // 2. Perform Real Upload
      const newCreative = await uploadCreative({ file, dimensions });

      // 3. Update UI to Done
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === queueId
            ? { ...item, status: "done", progress: 100 }
            : item
        )
      );

      // 4. Callback
      if (onUploadComplete && newCreative) {
        onUploadComplete(newCreative as unknown as Creative);
      }
    } catch (error) {
      console.error(error);
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === queueId ? { ...item, status: "error", progress: 0 } : item
        )
      );
    }
  };

  const handleCropSave = async (croppedFile: File) => {
    // Get dimensions
    const img = new (window as any).Image();
    img.src = URL.createObjectURL(croppedFile);
    await new Promise((r) => (img.onload = r));

    // Close Crop Modal
    setCropModalOpen(false);
    setSelectedFile(null);

    // Trigger Upload
    await handleUploadProcess(croppedFile, {
      width: img.width,
      height: img.height,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Video: Upload Direct (No Crop)
      if (file.type.startsWith("video")) {
        handleUploadProcess(file, { width: 0, height: 0 });
        return;
      }

      // Image: Open Cropper (Do NOT upload yet)
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setSelectedFile(reader.result?.toString() || null);
        setCropModalOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  // Simulate Progress for Visual Feedback
  useEffect(() => {
    if (uploadQueue.some((i) => i.status === "uploading" && i.progress < 90)) {
      const interval = setInterval(() => {
        setUploadQueue((prev) =>
          prev.map((item) => {
            if (item.status === "uploading" && item.progress < 90) {
              return { ...item, progress: item.progress + 10 };
            }
            return item;
          })
        );
      }, 300);
      return () => clearInterval(interval);
    }
  }, [uploadQueue]);

  // Pass through close handler to clear queue if needed, or keep history
  const handleClose = () => {
    onOpenChange(false);
    // Optional: setUploadQueue([]); // Clear queue on close? Maybe keep it.
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl text-slate-900">
          <DialogHeader>
            <DialogTitle>Upload Assets</DialogTitle>
            <DialogDescription>
              Supported: JPG, PNG, MP4. Max 50MB.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-blue-400 transition-all cursor-pointer group bg-slate-50/50">
              <input
                type="file"
                multiple
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={handleFileSelect}
              />
              <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CloudUpload className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">
                Drag & Drop files
              </h3>
              <p className="text-slate-500 text-sm">or click to browse</p>
            </div>

            {uploadQueue.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {uploadQueue.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 border rounded-xl bg-white"
                  >
                    <div className="h-10 w-10 bg-slate-100 rounded-lg overflow-hidden shrink-0 relative">
                      <Image
                        src={file.url}
                        alt="preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium truncate pr-4">
                          {file.name || "N/A"}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">
                          {file.status}
                        </span>
                      </div>
                      <Progress
                        value={file.progress}
                        className="h-1.5 bg-slate-100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button
              disabled={uploadQueue.length === 0}
              onClick={handleClose}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Internal Crop Modal */}
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="max-w-xl text-slate-900">
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <ImageCropper
              imageSrc={selectedFile}
              onCancel={() => setCropModalOpen(false)}
              onCropComplete={handleCropSave}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
