"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash, DragHandGesture } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CarouselCard {
  imageUrl: string;
  headline: string;
  description?: string;
  link?: string;
}

interface CarouselEditorProps {
  cards: CarouselCard[];
  onChange: (cards: CarouselCard[]) => void;
  availableImages: string[]; // All selected creatives
  mainDestinationUrl: string; // Fallback URL
}

export function CarouselEditor({
  cards,
  onChange,
  availableImages,
  mainDestinationUrl,
}: CarouselEditorProps) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const addCard = () => {
    if (cards.length >= 10) return; // Meta limit
    const unusedImage = availableImages.find(
      (img) => !cards.some((c) => c.imageUrl === img),
    );
    if (!unusedImage) return;

    onChange([
      ...cards,
      {
        imageUrl: unusedImage,
        headline: `Card ${cards.length + 1}`,
        description: "",
        link: "",
      },
    ]);
  };

  const removeCard = (index: number) => {
    onChange(cards.filter((_, i) => i !== index));
  };

  const updateCard = (index: number, updates: Partial<CarouselCard>) => {
    onChange(cards.map((card, i) => (i === index ? { ...card, ...updates } : card)));
  };

  const canAddMore = cards.length < 10 && cards.length < availableImages.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Carousel Cards ({cards.length}/10)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize each card's headline, description, and link
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={addCard}
          disabled={!canAddMore}
          className="h-8 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Card
        </Button>
      </div>

      <div className="space-y-2">
        {cards.map((card, idx) => (
          <Card
            key={idx}
            className={cn(
              "p-3 border transition-all cursor-pointer hover:border-primary/40",
              expandedCard === idx && "border-primary ring-2 ring-primary/10",
            )}
            onClick={() => setExpandedCard(expandedCard === idx ? null : idx)}
          >
            <div className="flex gap-3">
              {/* Drag Handle */}
              <div className="flex items-start pt-1">
                <DragHandGesture className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Thumbnail */}
              <img
                src={card.imageUrl}
                alt={`Card ${idx + 1}`}
                className="h-16 w-16 object-cover rounded border border-border shrink-0"
              />

              {/* Card Content */}
              <div className="flex-1 min-w-0">
                {expandedCard === idx ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      placeholder="Headline"
                      value={card.headline}
                      onChange={(e) => updateCard(idx, { headline: e.target.value })}
                      className="h-9 text-sm"
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={card.description || ""}
                      onChange={(e) => updateCard(idx, { description: e.target.value })}
                      rows={2}
                      className="text-xs resize-none"
                    />
                    <Input
                      placeholder={`Link (defaults to ${mainDestinationUrl || "main URL"})`}
                      value={card.link || ""}
                      onChange={(e) => updateCard(idx, { link: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                ) : (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {card.headline}
                    </h4>
                    {card.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {card.description}
                      </p>
                    )}
                    <p className="text-[10px] text-subtle-foreground mt-1 truncate">
                      {card.link || mainDestinationUrl || "No destination"}
                    </p>
                  </div>
                )}
              </div>

              {/* Delete Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCard(idx);
                }}
                className="h-8 w-8 p-0 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {cards.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Select 2+ images to enable carousel mode
        </div>
      )}

      {cards.length === 1 && (
        <div className="text-center py-4 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900">
          Add at least one more card to create a carousel ad
        </div>
      )}
    </div>
  );
}
