"use client";

import Image from "next/image";
import { Check, Star } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useState } from "react";
import { setSelectedVariant } from "@/actions/creatives";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface HistoryItem {
  id: string;
  imageUrl: string;
}

interface StudioHistoryStripProps {
  history: HistoryItem[];
  currentImage: string;
  onSelect: (url: string) => void;
  rootId?: string | null;
  selectedVariantId?: string | null;
}

export function StudioHistoryStrip({
  history,
  currentImage,
  onSelect,
  rootId,
  selectedVariantId,
}: StudioHistoryStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [history]);

  if (history.length <= 1) return null;

  const handleSetPrimary = async (item: HistoryItem, isRoot: boolean) => {
    if (!rootId) return;
    setSettingPrimaryId(item.id);
    try {
      await setSelectedVariant(rootId, isRoot ? null : item.id);
      queryClient.invalidateQueries({ queryKey: ["creatives"] });
      toast.success("Set as primary variant");
    } catch {
      toast.error("Failed to set primary variant");
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const effectiveRootId = history[0]?.id;

  return (
    <div className="shrink-0 border border-border p-4 rounded-lg m-3 bg-card z-10">
      <p className="text-[10px] font-bold uppercase tracking-wider text-subtle-foreground mb-3">
        Version History
      </p>
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar"
      >
        {history.map((item, idx) => {
          const isCurrentView = currentImage === item.imageUrl;
          const isRoot = idx === 0;
          const isPrimary = isRoot
            ? !selectedVariantId
            : selectedVariantId === item.id;

          return (
            <div key={item.id} className="relative group/thumb shrink-0">
              <button
                onClick={() => onSelect(item.imageUrl)}
                className={cn(
                  "relative h-16 w-16 rounded-md overflow-hidden border-2 transition-all hover:scale-105",
                  isCurrentView
                    ? "border-primary"
                    : "border-border hover:border-muted-foreground/30 opacity-70 hover:opacity-100",
                )}
                title={`Version ${idx + 1}`}
              >
                <Image
                  src={item.imageUrl}
                  alt={`Version ${idx + 1}`}
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-white bg-black/50 rounded px-1 leading-4">
                  v{idx + 1}
                </div>
                {isCurrentView && (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary drop-shadow-md" />
                  </div>
                )}
              </button>

              {/* Set as Primary button — visible on hover, shown if rootId is available */}
              {rootId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetPrimary(item, isRoot);
                  }}
                  disabled={settingPrimaryId === item.id || isPrimary}
                  title={isPrimary ? "Primary variant" : "Set as primary"}
                  className={cn(
                    "absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full flex items-center justify-center transition-all",
                    isPrimary
                      ? "bg-amber-400 text-white opacity-100"
                      : "bg-card border border-border text-muted-foreground opacity-0 group-hover/thumb:opacity-100 hover:bg-amber-50 hover:text-amber-500 hover:border-amber-300",
                  )}
                >
                  <Star
                    className={cn(
                      "w-2.5 h-2.5",
                      isPrimary && "fill-current",
                    )}
                  />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {rootId && (
        <p className="text-[9px] text-muted-foreground mt-2">
          Hover a version to set it as the primary image shown in your library.
        </p>
      )}
    </div>
  );
}
