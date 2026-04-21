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

/**
 * Returns answer chips if the question is clearly binary/choice-based.
 * Otherwise returns null (render as plain text).
 */
function inferAnswerChips(question: string): string[] | null {
  const q = question.toLowerCase();
  if (q.includes("in-store") || q.includes("ship")) {
    return ["Just Lagos/my city", "We ship nationwide"];
  }
  if (
    q.includes("budget") ||
    q.includes("mid-range") ||
    q.includes("premium")
  ) {
    return ["Budget-friendly", "Mid-range", "Premium"];
  }
  if (q.includes("women") || q.includes("men") || q.includes("both")) {
    return ["Women only", "Men only", "Both"];
  }
  if (q.includes("promo") || q.includes("discount") || q.includes("offer")) {
    return ["Yes, I have a promo", "No promo right now"];
  }
  return null; // open-ended — render as text, let user type
}

interface OutcomePreviewCardProps {
  plainSummary: string;
  outcomeLabel: string;
  outcomeRange: string;
  budget: number;
  interests: any[];
  locations: any[];
  inferredAssumptions?: string[];
  refinementQuestion?: string | null;
  followUps?: Array<{ label: string; instruction: string }> | null;
  onRemoveInterest: (i: any) => void;
  onAddInterest: (i: any) => void;
  currentInterests: any[];
  onConfirmAudience: () => void;
  copyReady: boolean;
  onRefinementAnswer?: (answer: string) => void;
  onFollowUpSelect?: (instruction: string) => void;
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
  followUps,
  onRemoveInterest,
  onAddInterest,
  currentInterests,
  onConfirmAudience,
  copyReady,
  onRefinementAnswer,
  onFollowUpSelect,
}: OutcomePreviewCardProps) {
  const [showAssumptions, setShowAssumptions] = useState(true);

  return (
    <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-top-2">
      {/* Outcome box — most prominent */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
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
      {interests && interests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {interests.map((int: any) => {
            const intId = typeof int === "string" ? int : int.id;
            const intName = typeof int === "string" ? int : int.name;
            const isResolved = !isNaN(Number(intId));
            const isSelected = currentInterests.find(
              (i: any) => i.id === intId || i.name === intName,
            );

            return (
              <Badge
                key={intId}
                variant="outline"
                title={
                  isResolved
                    ? `Meta ID: ${intId}`
                    : "Could not verify with Meta — may not reach audience"
                }
                className={cn(
                  "cursor-pointer transition-all py-1.5 px-3 rounded-full border hover:border-primary",
                  isSelected
                    ? "bg-primary/10 text-primary border-primary"
                    : isResolved
                      ? "bg-background text-muted-foreground hover:text-foreground"
                      : "bg-muted/30 text-muted-foreground border-dashed border-border opacity-60", // unresolved style
                )}
                onClick={() =>
                  isSelected
                    ? onRemoveInterest(int)
                    : onAddInterest(
                        typeof int === "string" ? { id: int, name: int } : int,
                      )
                }
              >
                {isSelected && <Check className="h-3 w-3 mr-1" />}
                {intName}
                {!isResolved && (
                  <span className="ml-1 text-xs opacity-50">?</span>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Inferred assumptions */}
      {inferredAssumptions && inferredAssumptions.length > 0 && (
        <div className="space-y-1.5 bg-muted/20 rounded-md p-2 border border-border/50">
          {inferredAssumptions.length > 3 ? (
            <button
              onClick={() => setShowAssumptions(!showAssumptions)}
              className="flex items-center justify-between w-full text-left"
            >
              <p className="text-xs font-medium text-subtle-foreground uppercase tracking-wide">
                What I assumed
              </p>
              {showAssumptions ? (
                <NavArrowDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <NavArrowRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          ) : (
            <p className="text-xs font-medium text-subtle-foreground uppercase tracking-wide">
              What I assumed
            </p>
          )}

          {showAssumptions && (
            <div className="flex flex-wrap gap-1.5 pt-1 animate-in fade-in slide-in-from-top-1">
              {inferredAssumptions.map((assumption: string, i: number) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-subtle-foreground border border-border"
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
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/15">
            <Sparks className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-[13px] text-foreground leading-snug">
              {refinementQuestion}
            </p>
          </div>
          {/* Render chips if binary, otherwise let user type in main input */}
          {(() => {
            const chips = inferAnswerChips(refinementQuestion);
            return chips ? (
              <div className="flex flex-wrap gap-2 pl-1">
                {chips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => onRefinementAnswer?.(chip)}
                    className="px-4 py-2 rounded-full border border-primary/40 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Follow-up suggestions — Perplexity-style ↳ text links */}
      {followUps && followUps.length > 0 && (
        <div className="space-y-1 pt-1">
          <p className="text-xs font-medium text-subtle-foreground uppercase tracking-wide">
            Improve this ad
          </p>
          {followUps.map((fu) => (
            <button
              key={fu.label}
              onClick={() => onFollowUpSelect?.(fu.instruction)}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline w-full text-left py-0.5"
            >
              <span className="text-subtle-foreground text-xs">↳</span>
              {fu.label}
            </button>
          ))}
        </div>
      )}

      {/* Confirm CTA */}
      <Button
        onClick={onConfirmAudience}
        disabled={currentInterests.length === 0 || !copyReady}
        className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg shadow-sm border border-border text-sm"
      >
        {copyReady ? (
          <>
            Review & confirm audience <ArrowRight className="ml-2 h-4 w-4" />
          </>
        ) : (
          <>
            Writing your copy… <span className="ml-2 animate-pulse">✍️</span>
          </>
        )}
      </Button>
    </div>
  );
}
