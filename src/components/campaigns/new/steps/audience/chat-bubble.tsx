"use client";

import { User, Sparks, Check } from "iconoir-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OutcomePreviewCard } from "./outcome-preview-card";
import { CopySuggestion } from "./copy-suggestion";

interface ChatBubbleProps {
  message: any;
  isConsecutive?: boolean;
  currentInterests: any[];
  onRemoveInterest: (interest: any) => void;
  onAddInterest: (interest: any) => void;
  currentLocations: any[];
  onRemoveLocation: (loc: any) => void;
  onAddLocation: (loc: any) => void;
  onCopyRefine: (val: string) => void;
  isRefiningCopy: boolean;
  onClarificationSelect: (val: string, mode: "send" | "prefill") => void;
  onRecoverySelect: (val: string) => void;
  onConfirmAudience: () => void;
  onFollowUpSelect: (instruction: string) => void;
  copyReady: boolean;
  /** True when this is the last copy_suggestion message in the conversation */
  isLastCopySuggestion?: boolean;
  /** True when this is the last outcome_preview message — only this card shows follow-up links */
  isLastOutcomePreview?: boolean;
}

export function ChatBubble({
  message,
  isConsecutive,
  currentInterests,
  onRemoveInterest,
  onAddInterest,
  currentLocations, // params kept for future use if needed
  onRemoveLocation, // params kept for future use if needed
  onAddLocation, // params kept for future use if needed
  onCopyRefine,
  onFollowUpSelect,
  isRefiningCopy,
  onClarificationSelect,
  onRecoverySelect,
  onConfirmAudience,
  copyReady,
  isLastCopySuggestion = false,
  isLastOutcomePreview = false,
}: ChatBubbleProps) {
  const isAI = message.role === "ai";

  return (
    <div
      id={`msg-${message.id}`}
      className={cn(
        "flex gap-3 w-[92%] max-w-[92%] animate-in fade-in slide-in-from-bottom-2",
        isAI ? "mr-auto" : "ml-auto flex-row-reverse",
        isConsecutive && "-mt-6!",
      )}
    >
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-1",
          isAI ? "bg-primary/10 text-primary" : "bg-muted text-foreground",
          isConsecutive && "invisible",
        )}
      >
        {isAI ? <Sparks className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      <div className={cn("space-y-2 min-w-0 w-full", isConsecutive && "mt-2")}>
        {/* Message bubble */}
        {!(isAI && message.type === "outcome_preview") && (
          <div
            className={cn(
              "py-3 px-4 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap shadow-sm",
              isAI
                ? "bg-card border border-border text-foreground rounded-tl-sm"
                : "bg-primary text-primary-foreground rounded-tr-sm font-medium",
            )}
          >
            {message.content}
          </div>
        )}

        {/* Outcome preview — new type */}
        {message.type === "outcome_preview" && message.data && (
          <OutcomePreviewCard
            plainSummary={message.content}
            outcomeLabel={message.data.outcomeLabel}
            outcomeRange={message.data.outcomeRange}
            budget={message.data.budget}
            interests={message.data.interests || []}
            locations={message.data.locations || []}
            inferredAssumptions={message.data.inferredAssumptions}
            refinementQuestion={message.data.refinementQuestion}
            followUps={isLastOutcomePreview ? message.data.followUps : null}
            onRemoveInterest={onRemoveInterest}
            onAddInterest={onAddInterest}
            currentInterests={currentInterests}
            onConfirmAudience={onConfirmAudience}
            copyReady={copyReady}
            onRefinementAnswer={(answer) => {
              onRecoverySelect(answer);
            }}
            onFollowUpSelect={onFollowUpSelect}
          />
        )}

        {/* Network error — retry button, preserves original input */}
        {message.type === "network_error" && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2">
            <button
              onClick={() =>
                onRecoverySelect(message.data?.originalInput || "")
              }
              className="px-4 py-2 rounded-full border border-primary/40 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
            >
              🔄 Try Again
            </button>
          </div>
        )}


        {/* Clarification choice chips */}
        {message.type === "clarification_choice" &&
          message.data?.clarificationOptions?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
              {message.data.clarificationOptions.map((option: { label: string; mode: "send" | "prefill" } | string) => {
                const label = typeof option === "string" ? option : option.label;
                const mode = typeof option === "string" ? "send" : option.mode;
                return (
                  <button
                    key={label}
                    onClick={() => onClarificationSelect(label, mode)}
                    className={cn(
                      "px-4 py-2 rounded-full border text-sm font-medium transition-colors",
                      mode === "prefill"
                        ? "border-border bg-muted/40 text-foreground hover:bg-muted"
                        : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/15"
                    )}
                  >
                    {label}
                    {mode === "prefill" && <span className="ml-1.5 text-xs opacity-40">edit ✎</span>}
                  </button>
                );
              })}
            </div>
          )}

        {/* Copy suggestion */}
        {message.type === "copy_suggestion" && (
          <div className="space-y-6 w-full">
            {message.data?.adCopyVariations?.length > 0 ? (
              message.data.adCopyVariations.map(
                (variation: any, idx: number) => {
                  const isLastVariation =
                    idx === message.data.adCopyVariations.length - 1;
                  return (
                    <div key={idx}>
                      {idx > 0 && (
                        <div className="flex items-center gap-2 mb-3 mt-4">
                          <div className="h-px bg-border/50 flex-1" />
                          <span className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
                            Option {idx + 1}
                          </span>
                          <div className="h-px bg-border/50 flex-1" />
                        </div>
                      )}
                      <CopySuggestion
                        headline={variation.headline}
                        primary={variation.primary}
                        onRefine={onCopyRefine}
                        onProceed={onConfirmAudience}
                        isRefining={isRefiningCopy}
                        isLast={isLastCopySuggestion && isLastVariation}
                        variantIdx={idx}
                      />
                    </div>
                  );
                },
              )
            ) : message.data?.adCopy ? (
              <CopySuggestion
                headline={message.data.adCopy.headline}
                primary={message.data.adCopy.primary}
                onRefine={onCopyRefine}
                onProceed={onConfirmAudience}
                isRefining={isRefiningCopy}
                isLast={isLastCopySuggestion}
                variantIdx={0}
              />
            ) : null}
          </div>
        )}

        {/* Legacy suggestion type (history replay) */}
        {message.type === "suggestion" &&
          message.data &&
          !message.data.outcomeLabel && (
            <div className="bg-card border border-border rounded-md p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-wrap gap-2">
                {message.data.interests
                  ?.filter((int: any) => {
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
            </div>
          )}
      </div>
    </div>
  );
}
