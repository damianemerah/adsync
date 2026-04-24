"use client";

import Image from "next/image";
import { Check } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useRef, useEffect } from "react";

interface StudioHistoryStripProps {
  history: string[];
  currentImage: string;
  onSelect: (url: string) => void;
}

export function StudioHistoryStrip({
  history,
  currentImage,
  onSelect,
}: StudioHistoryStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest version whenever history grows
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [history]);

  if (history.length <= 1) return null;

  return (
    <div className="shrink-0 border border-border p-4 rounded-lg m-3 bg-card z-10">
      <p className="text-[10px] font-bold uppercase tracking-wider text-subtle-foreground mb-3">
        Version History
      </p>
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar"
      >
        {history.map((img, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(img)}
            className={cn(
              "relative h-16 w-16 shrink-0 rounded-md overflow-hidden border-2 transition-all hover:scale-105",
              currentImage === img
                ? "border-primary"
                : "border-border hover:border-muted-foreground/30 opacity-70 hover:opacity-100",
            )}
            title={`Version ${idx + 1}`}
          >
            <Image
              src={img}
              alt={`Version ${idx + 1}`}
              fill
              className="object-cover"
            />
            <div className="absolute bottom-0.5 right-0.5 text-[8px] font-bold text-white bg-black/50 rounded px-1 leading-4">
              v{idx + 1}
            </div>
            {currentImage === img && (
              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                <Check className="w-4 h-4 text-primary drop-shadow-md" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
