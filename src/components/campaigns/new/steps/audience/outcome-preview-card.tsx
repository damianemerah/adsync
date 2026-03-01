"use client";

import { useState } from "react";
import {
  StatsUpSquare,
  Check,
  Sparks,
  ArrowRight,
  NavArrowDown,
  NavArrowRight,
} from "iconoir-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OutcomePreviewCardProps {
  plainSummary: string;
  outcomeLabel: string;
  outcomeRange: string;
  budget: number;
  interests: any[];
  locations: any[];
  inferredAssumptions?: string[];
  refinementQuestion?: string | null;
  onRemoveInterest: (i: any) => void;
  onAddInterest: (i: any) => void;
  currentInterests: any[];
  onConfirmAudience: () => void;
}

export function OutcomePreviewCard({
  plainSummary,
  outcomeLabel,
  outcomeRange,
  budget,
  interests,
  locations,
  inferredAssumptions,
  refinementQuestion,
  onRemoveInterest,
  onAddInterest,
  currentInterests,
  onConfirmAudience,
}: OutcomePreviewCardProps) {
  const [showAssumptions, setShowAssumptions] = useState(false);

  return (
    <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-top-2">
      {/* Outcome box — most prominent */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <StatsUpSquare className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            Expected Result at ₦{budget?.toLocaleString()}/day
          </span>
        </div>
        <p className="text-2xl font-black text-foreground">
          {outcomeRange}{" "}
          <span className="text-sm font-medium text-subtle-foreground">
            {outcomeLabel}
          </span>
        </p>
      </div>

      {/* Interest chips */}
      {interests?.filter((int: any) => {
        const intId = typeof int === "string" ? int : int.id;
        const intName = typeof int === "string" ? int : int.name;
        return isNaN(Number(intId)) === false; // Only show if ID is numeric (verified)
      }).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {interests
            .filter((int: any) => {
              const intId = typeof int === "string" ? int : int.id;
              return isNaN(Number(intId)) === false;
            })
            .map((int: any) => {
              const intId = typeof int === "string" ? int : int.id;
              const intName = typeof int === "string" ? int : int.name;
              const isSelected = currentInterests.find(
                (i: any) => i.id === intId || i.name === intName,
              );
              return (
                <Badge
                  key={intId}
                  variant="outline"
                  className={cn(
                    "cursor-pointer transition-all py-1.5 px-3 rounded-full border hover:border-primary",
                    isSelected
                      ? "bg-primary/10 text-primary border-primary"
                      : "bg-background text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() =>
                    isSelected
                      ? onRemoveInterest(int)
                      : onAddInterest(
                          typeof int === "string"
                            ? { id: int, name: int }
                            : int,
                        )
                  }
                >
                  {isSelected && <Check className="h-3 w-3 mr-1" />}
                  {intName}
                </Badge>
              );
            })}
        </div>
      )}

      {/* Inferred assumptions */}
      {inferredAssumptions && inferredAssumptions.length > 0 && (
        <div className="space-y-1.5 bg-muted/20 rounded-xl p-2 border border-border/50">
          <button
            onClick={() => setShowAssumptions(!showAssumptions)}
            className="flex items-center justify-between w-full text-left"
          >
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              What I assumed
            </p>
            {showAssumptions ? (
              <NavArrowDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <NavArrowRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>

          {showAssumptions && (
            <div className="flex flex-wrap gap-1.5 pt-1 animate-in fade-in slide-in-from-top-1">
              {inferredAssumptions.map((assumption: string, i: number) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
                >
                  {assumption}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Refinement question */}
      {refinementQuestion && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <Sparks className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-[13px] text-foreground leading-snug">
            {refinementQuestion}
          </p>
        </div>
      )}

      {/* Confirm CTA */}
      <Button
        onClick={onConfirmAudience}
        disabled={currentInterests.length === 0}
        className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl shadow-soft text-sm"
      >
        Audience looks good — write my copy{" "}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
