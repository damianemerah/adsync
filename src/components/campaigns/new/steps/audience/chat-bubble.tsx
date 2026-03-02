"use client";

import { User, Sparks, Check } from "iconoir-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OutcomePreviewCard } from "./outcome-preview-card";
import { CopySuggestion } from "./copy-suggestion";

// Recovery chips — location injected at render time from user's context
const RECOVERY_CHIP_TEMPLATES = [
  {
    label: "👗 Fashion & Clothing",
    template: "I sell fashion and clothing in {location}",
  },
  {
    label: "💄 Beauty & Skincare",
    template: "I sell skincare and beauty products in {location}",
  },
  {
    label: "🍖 Food & Catering",
    template: "I sell food and catering services in {location}",
  },
  {
    label: "💇 Wigs & Hair",
    template: "I sell wigs and hair products in {location}",
  },
  {
    label: "📱 Electronics",
    template: "I sell phones and electronics in {location}",
  },
  {
    label: "🎂 Cakes & Pastries",
    template: "I sell cakes and pastries in {location}",
  },
];

function buildRecoveryChips(detectedLocation?: string | null) {
  const loc = detectedLocation || "Nigeria";
  return RECOVERY_CHIP_TEMPLATES.map((c) => ({
    label: c.label,
    value: c.template.replace("{location}", loc),
  }));
}

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
  onClarificationSelect: (val: string) => void;
  onRecoverySelect: (val: string) => void;
  onConfirmAudience: () => void;
  copyReady: boolean;
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
  isRefiningCopy,
  onClarificationSelect,
  onRecoverySelect,
  onConfirmAudience,
  copyReady,
}: ChatBubbleProps) {
  const isAI = message.role === "ai";

  // Helper for mismatch chips
  const handleChipClick = (value: string) => {
    if (value.startsWith("Yes, rebuild")) {
      // Extract goal name after "for "
      const goal = value.split("for ")[1];
      // Use a sentinel prefix that handleSend can detect BEFORE classifyUserInput
      // so it routes to a full strategy rebuild, not copy refinement
      onRecoverySelect(`__OBJECTIVE_REWRITE__${goal}`);
    } else if (value.startsWith("No, keep")) {
      // Dismiss silently — just acknowledge with no AI call
      onRecoverySelect(`__OBJECTIVE_KEEP__`);
    } else {
      onRecoverySelect(value);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-3 max-h-[700px] w-[92%] max-w-[92%] animate-in fade-in slide-in-from-bottom-2",
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
              "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
              isAI
                ? "bg-card border border-border text-foreground rounded-tl-none"
                : "bg-primary text-primary-foreground rounded-tr-none font-medium",
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
            onRemoveInterest={onRemoveInterest}
            onAddInterest={onAddInterest}
            currentInterests={currentInterests}
            onConfirmAudience={onConfirmAudience}
            copyReady={copyReady}
            onRefinementAnswer={(answer) => {
              onRecoverySelect(answer);
            }}
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

        {/* Recovery chips — only for genuine AI failures, uses user's detected location */}
        {message.type === "recovery" &&
          !message.data?.clarificationOptions?.length && (
            <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-wrap gap-2">
                {buildRecoveryChips(message.data?.detectedLocation).map(
                  (chip) => (
                    <button
                      key={chip.value}
                      onClick={() => handleChipClick(chip.value)}
                      className="px-3 py-2 rounded-full border border-border bg-card text-sm font-medium hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      {chip.label}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

        {/* Custom Recovery for Mismatch (uses clarificationOptions from data for dynamic chips) */}
        {message.type === "recovery" &&
          message.data?.clarificationOptions?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
              {message.data.clarificationOptions.map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleChipClick(opt)}
                  className="px-4 py-2 rounded-full border border-primary/40 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

        {/* Clarification choice chips */}
        {message.type === "clarification_choice" &&
          message.data?.clarificationOptions?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
              {message.data.clarificationOptions.map((option: string) => (
                <button
                  key={option}
                  onClick={() => onClarificationSelect(option)}
                  className="px-4 py-2 rounded-full border border-primary/40 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

        {/* Copy suggestion */}
        {message.type === "copy_suggestion" && message.data?.adCopy && (
          <CopySuggestion
            headline={message.data.adCopy.headline}
            primary={message.data.adCopy.primary}
            onRefine={onCopyRefine}
            onProceed={onConfirmAudience}
            isRefining={isRefiningCopy}
          />
        )}

        {/* Legacy suggestion type (history replay) */}
        {message.type === "suggestion" &&
          message.data &&
          !message.data.outcomeLabel && (
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
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
