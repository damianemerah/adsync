import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparks, Refresh, EditPencil, Check } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useCampaignStore } from "@/stores/campaign-store";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { useAtMention, ReferenceImageMentionGrid } from "@/components/creatives/studio/reference-image-picker";

interface CreativeAiPreviewProps {
  isGeneratingAI: boolean;
  onGenerateWithAI: (customPrompt?: string, referenceImageUrls?: string[]) => Promise<void>;
  onAcceptImage: (url: string) => Promise<void>;
  onEditInStudio: (url: string, prompt: string) => Promise<void>;
  referenceImageUrls?: string[];
}

export function CreativeAiPreview({
  isGeneratingAI,
  onGenerateWithAI,
  onAcceptImage,
  onEditInStudio,
  referenceImageUrls = [],
}: CreativeAiPreviewProps) {
  const { pendingGeneratedImage, adFormatType, selectedCreatives } = useCampaignStore();
  const [customPrompt, setCustomPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { mentionOpen, handleChange, handleSelect, closeMention } = useAtMention(
    customPrompt,
    setCustomPrompt,
    referenceImageUrls,
  );

  if (!pendingGeneratedImage) return null;

  const triggerGenerate = () => {
    onGenerateWithAI(customPrompt, referenceImageUrls);
    setCustomPrompt("");
  };

  return (
    <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex gap-4">
        <img
          src={pendingGeneratedImage.url}
          alt="AI Generated"
          className="h-32 w-auto object-cover rounded-md shadow-sm border border-border"
        />
        <div className="flex flex-col gap-2 flex-1 justify-center">
          <h4 className="text-sm font-bold text-primary flex items-center gap-1.5">
            <Sparks className="h-4 w-4" /> AI Generation Ready
          </h4>
          <p className="text-xs text-subtle-foreground">
            Review your image. You can refine it with a prompt, edit it manually, or accept it for your campaign.
          </p>
          <div className="flex gap-1.5 mt-2">
            <Popover open={mentionOpen} onOpenChange={(o) => !o && closeMention()}>
              <PopoverAnchor asChild>
                <Input
                  ref={inputRef}
                  className="flex-1 h-9 text-xs"
                  placeholder={
                    referenceImageUrls.length
                      ? 'Refine… type "@" to reference an image'
                      : "e.g. no text, make it brighter…"
                  }
                  value={customPrompt}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") triggerGenerate();
                    if (e.key === "Escape") closeMention();
                  }}
                />
              </PopoverAnchor>
              <PopoverContent
                className="w-52 p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <ReferenceImageMentionGrid
                  imageUrls={referenceImageUrls}
                  onSelect={(tag) => handleSelect(tag, inputRef.current)}
                />
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              variant="outline"
              onClick={triggerGenerate}
              disabled={isGeneratingAI}
              className="h-9 w-9 p-0 shrink-0"
            >
              <Refresh
                className={cn(
                  "h-4 w-4 text-primary",
                  isGeneratingAI && "animate-spin"
                )}
              />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9 text-xs"
              onClick={() =>
                onEditInStudio(
                  pendingGeneratedImage.url,
                  pendingGeneratedImage.prompt,
                )
              }
            >
              <EditPencil className="h-3.5 w-3.5 mr-1" /> Edit in Studio
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => onAcceptImage(pendingGeneratedImage.url)}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              {adFormatType === "dynamic_creative" && selectedCreatives.length >= 1 ? "Add to Set" : "Accept Image"}
            </Button>
          </div>
          {adFormatType === "dynamic_creative" && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-9 text-xs border-ai/30 text-ai hover:bg-ai/5 hover:border-ai/60 font-semibold gap-1.5"
              disabled={isGeneratingAI}
              onClick={async () => {
                await onAcceptImage(pendingGeneratedImage.url);
                onGenerateWithAI(customPrompt || undefined, referenceImageUrls);
              }}
            >
              <Sparks className="h-3.5 w-3.5" />
              Accept &amp; Generate Another Variation
            </Button>
          )}

        </div>
      </div>
    </div>
  );
}
