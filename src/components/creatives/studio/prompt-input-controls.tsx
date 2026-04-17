"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type AspectRatio } from "@/components/creatives/studio/prompt-input";
import { type CreativeFormat } from "@/lib/ai/prompts";
import { FluxTips } from "./flux-tips";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Square, SmartphoneDevice, SelectWindow, PcCheck, ViewGrid, Sparks } from "iconoir-react";

interface PromptInputControlsProps {
  aspectRatio: AspectRatio;
  onAspectRatioChange: (val: AspectRatio) => void;
  format?: CreativeFormat;
  onFormatChange?: (val: CreativeFormat) => void;
  isEnhanced?: boolean;
  onEnhancedChange?: (val: boolean) => void;
  hideControls?: boolean;
}

export function PromptInputControls({
  aspectRatio,
  onAspectRatioChange,
  format = "auto",
  onFormatChange,
  isEnhanced = true,
  onEnhancedChange,
  hideControls = false,
}: PromptInputControlsProps) {
  if (hideControls) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Aspect Ratio Selector */}
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

      {/* Creative Format Selector */}
      {onFormatChange && (
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
      <FluxTips />
      
      {/* Smart Mode Toggle positioned with margins or flex helpers depending on layout needs */}
      {onEnhancedChange && (
        <div className="ml-auto flex items-center gap-2 mr-2">
          <div
            className="flex items-center gap-1.5 cursor-pointer"
            onClick={() => onEnhancedChange(!isEnhanced)}
          >
            <Sparks
              className={cn(
                "h-3.5 w-3.5",
                isEnhanced ? "text-ai fill-ai/10" : "text-subtle-foreground",
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
  );
}
