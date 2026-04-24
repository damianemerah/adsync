import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparks, SystemRestart, MediaImage, Play, Check } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useCreativesList } from "@/hooks/use-creatives";
import { useCampaignStore } from "@/stores/campaign-store";
import { CreativeUploadDialog } from "@/components/creatives/creative-upload-dialog";

interface CreativeMediaSelectorProps {
  isGeneratingAI: boolean;
  onGenerateWithAI: () => Promise<void>;
}

export function CreativeMediaSelector({
  isGeneratingAI,
  onGenerateWithAI,
}: CreativeMediaSelectorProps) {
  const { data: creatives, isLoading: isLoadingCreatives } = useCreativesList();
  const { pendingGeneratedImage, selectedCreatives, updateDraft } = useCampaignStore();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const toggleCreative = (url: string) => {
    if (selectedCreatives.includes(url)) {
      updateDraft({
        selectedCreatives: selectedCreatives.filter((u) => u !== url),
      });
    } else {
      updateDraft({ selectedCreatives: [...selectedCreatives, url] });
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 justify-between">
        <p className="text-xs text-subtle-foreground">
          Select creatives for this campaign:
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onGenerateWithAI()}
          disabled={isGeneratingAI || !!pendingGeneratedImage}
          className={cn(
            "h-8 px-3 rounded-md border-primary/30 text-primary hover:bg-primary/5 hover:border-primary text-xs font-semibold gap-1.5 transition-all",
            (isGeneratingAI || !!pendingGeneratedImage) &&
              "opacity-60 cursor-not-allowed"
          )}
        >
          {isGeneratingAI && !pendingGeneratedImage ? (
            <>
              <SystemRestart className="h-3.5 w-3.5 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparks className="h-3.5 w-3.5" />
              Generate with AI
            </>
          )}
        </Button>
      </div>

      {isLoadingCreatives ? (
        <div className="flex justify-center p-8">
          <SystemRestart className="animate-spin text-primary w-8 h-8" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
          {/* Upload Placeholder */}
          <div
            onClick={() => setUploadModalOpen(true)}
            className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-subtle-foreground hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-colors group"
          >
            <MediaImage className="h-6 w-6 group-hover:text-primary transition-colors" />
            <span className="text-[10px] font-bold mt-1 group-hover:text-primary transition-colors">
              Upload New
            </span>
          </div>

          {/* AI-generating placeholder */}
          {isGeneratingAI && !pendingGeneratedImage && (
            <div className="aspect-square rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-2">
              <SystemRestart className="h-6 w-6 animate-spin text-primary" />
              <span className="text-[10px] font-semibold text-primary">
                AI working…
              </span>
            </div>
          )}

          {/* Real Creatives */}
          {creatives?.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleCreative(item.original_url)}
              className={cn(
                "aspect-square rounded-lg overflow-hidden border-2 cursor-pointer relative transition-all",
                selectedCreatives.includes(item.original_url)
                  ? "border-primary"
                  : "border-transparent ring-1 ring-border hover:border-primary/50",
              )}
            >
              <img
                src={item.thumbnail_url || item.original_url}
                className="w-full h-full object-cover"
                alt="creative"
              />
              {item.media_type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/40 backdrop-blur-md rounded-full p-1.5">
                    <Play className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}
              {selectedCreatives.includes(item.original_url) && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <div className="bg-primary text-primary-foreground p-1.5 rounded-full shadow-sm border border-border">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Helper hint when no creatives and not loading */}
      {!isLoadingCreatives &&
        !isGeneratingAI &&
        (creatives?.length ?? 0) === 0 && (
          <p className="text-center text-sm text-subtle-foreground py-4 flex items-center justify-center gap-1.5">
            <Sparks className="h-4 w-4 text-primary shrink-0" />
            No creatives yet — upload one or use{" "}
            <span className="text-primary font-semibold">Generate with AI</span>
            .
          </p>
        )}

      <CreativeUploadDialog
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadComplete={(creative) => {
          toggleCreative(creative.original_url);
          setUploadModalOpen(false);
        }}
      />
    </>
  );
}
