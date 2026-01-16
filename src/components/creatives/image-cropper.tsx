"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getCroppedImg } from "@/lib/crop-image";
import {
  Loader2,
  Smartphone,
  LayoutGrid,
  RectangleVertical,
} from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
}

export function ImageCropper({
  imageSrc,
  onCropComplete,
  onCancel,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(1); // Default 1:1 (Square)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 1. The Cropper Area */}
      <div className="relative h-[400px] w-full bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteInternal}
          onZoomChange={onZoomChange}
          showGrid={true}
        />
      </div>

      {/* 2. Controls */}
      <div className="space-y-6 px-2">
        {/* Aspect Ratio Selector */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Aspect Ratio
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={aspect === 1 ? "default" : "outline"}
              className={aspect === 1 ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setAspect(1)}
            >
              <LayoutGrid className="w-4 h-4 mr-2" /> Feed (1:1)
            </Button>
            <Button
              variant={aspect === 4 / 5 ? "default" : "outline"}
              className={
                aspect === 4 / 5 ? "bg-blue-600 hover:bg-blue-700" : ""
              }
              onClick={() => setAspect(4 / 5)}
            >
              <RectangleVertical className="w-4 h-4 mr-2" /> Portrait (4:5)
            </Button>
            <Button
              variant={aspect === 9 / 16 ? "default" : "outline"}
              className={
                aspect === 9 / 16 ? "bg-blue-600 hover:bg-blue-700" : ""
              }
              onClick={() => setAspect(9 / 16)}
            >
              <Smartphone className="w-4 h-4 mr-2" /> Story (9:16)
            </Button>
          </div>
        </div>

        {/* Zoom Slider */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Zoom
            </Label>
            <span className="text-xs text-slate-500">{zoom.toFixed(1)}x</span>
          </div>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(val) => setZoom(val[0])}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isProcessing}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cropping...
              </>
            ) : (
              "Apply Crop"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
