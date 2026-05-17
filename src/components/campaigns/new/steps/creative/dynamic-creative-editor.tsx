"use client";

import { useCampaignStore, type CopyVariation } from "@/stores/campaign-store";
import { Sparks, Check, WarningTriangle } from "iconoir-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Props {
  images: string[];
  variations: CopyVariation[];
}

export function DynamicCreativeEditor({ images, variations }: Props) {
  const { selectedCopyIdx, adCopy, updateDraft } = useCampaignStore();

  const hasEnoughImages = images.length >= 2;

  return (
    <div className="space-y-5">
      {/* Images grid */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
          Images ({images.length} selected)
        </p>
        {!hasEnoughImages && (
          <p className="text-xs text-status-warning flex items-center gap-1.5">
            <WarningTriangle className="h-3.5 w-3.5 shrink-0" />
            Add at least one more image above so Meta can run A/B tests
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div
              key={i}
              className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted shrink-0"
            >
              <Image src={url} alt={`Creative ${i + 1}`} fill className="object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Copy variants */}
      {variations.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
            Copy Variants ({variations.length} — Meta picks the best)
          </p>
          <div className="space-y-2">
            {variations.map((v, idx) => {
              const isSelected = selectedCopyIdx === idx;
              return (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg border text-sm transition-all",
                    isSelected
                      ? "border-2 border-primary bg-primary/5"
                      : "border-border bg-background",
                  )}
                >
                  <p className="font-bold text-foreground text-[13px] leading-snug truncate">
                    {v.headline}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2 leading-relaxed">
                    {v.primary}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-primary">
                        <Check className="h-3 w-3" /> Using this copy
                      </span>
                    ) : (
                      <button
                        onClick={() =>
                          updateDraft({
                            selectedCopyIdx: idx,
                            adCopy: { ...adCopy, headline: v.headline, primary: v.primary },
                          })
                        }
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Use This Copy
                      </button>
                    )}
                    <span className="text-[10px] text-muted-foreground">Variant {idx + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-xs text-subtle-foreground italic py-2">
          Copy variants will appear here after AI generates them in the audience step.
        </div>
      )}

      {/* Meta info banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-ai/5 border border-ai/20">
        <Sparks className="h-4 w-4 text-ai shrink-0 mt-0.5" />
        <p className="text-xs text-foreground/80 leading-relaxed">
          Meta will automatically serve all combinations of{" "}
          <span className="font-semibold">{images.length} image{images.length !== 1 ? "s" : ""}</span>{" "}
          ×{" "}
          <span className="font-semibold">
            {variations.length || 1} copy variant{(variations.length || 1) !== 1 ? "s" : ""}
          </span>{" "}
          and shift delivery toward whichever performs best in real time.
        </p>
      </div>
    </div>
  );
}
