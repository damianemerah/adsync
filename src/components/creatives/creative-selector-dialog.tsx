"use client";

import { useState } from "react";
import { useCreativesList } from "@/hooks/use-creatives";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { Button } from "@/components/ui/button"; // [NEW]
import { Check, SystemRestart, Search, MediaImage } from "iconoir-react"; // [NEW] Check
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CreativeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (urls: string[]) => void; // [UPDATED] Array
}

export function CreativeSelectorDialog({
  open,
  onOpenChange,
  onSelect,
}: CreativeSelectorDialogProps) {
  const { data: creatives, isLoading } = useCreativesList();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]); // [NEW]

  const filteredCreatives = creatives?.filter(
    (c) =>
      (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) &&
      c.media_type === "image",
  );

  const toggleSelection = (url: string) => {
    setSelectedUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    );
  };

  const handleConfirm = () => {
    onSelect(selectedUrls);
    setSelectedUrls([]); // Reset
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) setSelectedUrls([]); // Reset on close
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0 overflow-scroll no-scrollbar">
        {" "}
        {/* [FIX] overflow-hidden for flex layout */}
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle>Select from Library</DialogTitle>
          <div className="pt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6 pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <SystemRestart className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCreatives?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-subtle-foreground">
              <MediaImage className="h-12 w-12 mb-4 opacity-20" />
              <p>No images found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {filteredCreatives?.map((creative) => {
                const isSelected =
                  creative.original_url &&
                  selectedUrls.includes(creative.original_url);
                return (
                  <button
                    key={creative.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (creative.original_url) {
                        toggleSelection(creative.original_url);
                      }
                    }}
                    className={cn(
                      "group relative aspect-square rounded-md bg-muted/30 overflow-hidden focus:outline-hidden transition-all",
                      isSelected
                        ? "border-2 border-primary"
                        : "border border-border hover:border-primary/50",
                    )}
                  >
                    {creative.original_url && (
                      <Image
                        src={creative.original_url}
                        alt={creative.name || "Creative"}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                    <div
                      className={cn(
                        "absolute inset-0 transition-colors flex items-center justify-center",
                        isSelected
                          ? "bg-primary/40"
                          : "bg-black/0 group-hover:bg-black/10",
                      )}
                    >
                      {isSelected && (
                        <Check className="w-8 h-8 text-white drop-shadow-md" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {/* Footer Actions */}
        <div className="p-4 border-t border-border flex justify-end gap-2 bg-background sticky bottom-0 z-10">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedUrls.length === 0}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm border border-border"
          >
            Add Selected ({selectedUrls.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
