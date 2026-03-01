"use client";

import { useState } from "react";
import { User, Sparks, Check, Refresh, EditPencil } from "iconoir-react";
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

// ─── Studio Suggestion Bubble ───────────────────────────────────
// For structural edits (add prop, replace object) — needs Studio inpainting

function StudioSuggestionBubble({
  imageUrl,
  imagePrompt,
  editInstruction,
  onEditInStudio,
}: {
  imageUrl: string;
  imagePrompt: string;
  editInstruction: string;
  onEditInStudio: (url: string, prompt: string) => void;
}) {
  // Pre-fill the Studio prompt: original prompt + user's structural edit instruction
  const studioPrompt = editInstruction
    ? `${imagePrompt}. Edit: ${editInstruction}`
    : imagePrompt;

  return (
    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2">
      <div className="p-4 rounded-2xl bg-ai/5 border border-ai/20 space-y-3">
        <div className="flex items-start gap-2">
          <EditPencil className="h-4 w-4 text-ai mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Your edit instruction
            </p>
            <p className="text-xs text-muted-foreground italic">
              “{editInstruction}”
            </p>
          </div>
        </div>
        <p className="text-xs text-foreground/70 leading-relaxed">
          Structural edits like adding props or swapping objects work best in
          Studio, where you can paint exactly what to change. Your instruction
          is already pre-filled.
        </p>
      </div>
      <Button
        onClick={() => onEditInStudio(imageUrl, studioPrompt)}
        className="w-full h-11 rounded-2xl bg-ai hover:bg-ai/90 text-white font-bold shadow-soft"
      >
        <EditPencil className="h-4 w-4 mr-2" />
        Open in Studio with this edit
      </Button>
    </div>
  );
}

// ─── Image Generated Bubble (with inline constraint input) ──────────────────

function ImageGeneratedBubble({
  message,
  onAcceptImage,
  onRegenerateImage,
  onEditInStudio,
}: {
  message: any;
  onAcceptImage: (url: string) => void;
  onRegenerateImage: (prompt?: string) => void;
  onEditInStudio: (url: string, prompt: string) => void;
}) {
  const [showConstraintInput, setShowConstraintInput] = useState(false);
  const [constraint, setConstraint] = useState("");

  const { url, prompt } = message.data.generatedImage;

  const handleRegenWithConstraint = () => {
    const fullPrompt = constraint.trim()
      ? `${prompt}. ${constraint.trim()}`
      : undefined;
    onRegenerateImage(fullPrompt);
    setConstraint("");
    setShowConstraintInput(false);
  };

  return (
    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-4 max-w-sm">
      <div className="rounded-2xl overflow-hidden border border-border shadow-soft bg-black/5">
        <img
          src={url}
          alt="Generated ad creative"
          className="w-full h-auto object-contain"
          loading="lazy"
        />
      </div>

      {/* Inline constraint input */}
      {showConstraintInput && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
          <input
            autoFocus
            value={constraint}
            onChange={(e) => setConstraint(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRegenWithConstraint();
            }}
            placeholder="e.g. no street background, add model..."
            className="flex-1 text-sm bg-muted/40 border border-primary/40 rounded-xl px-3 py-2 focus:outline-none focus:border-primary placeholder:text-muted-foreground"
          />
          <Button
            size="sm"
            onClick={handleRegenWithConstraint}
            className="rounded-xl bg-primary text-primary-foreground shrink-0 h-9"
          >
            <Refresh className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowConstraintInput((v) => !v)}
          className="rounded-xl border-border hover:border-primary/50 hover:bg-primary/5"
        >
          <Refresh className="h-3.5 w-3.5 mr-1.5" />
          {showConstraintInput ? "Cancel" : "Try Again"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEditInStudio(url, prompt)}
          className="rounded-xl border-border text-ai hover:border-ai/50 hover:bg-ai/5"
        >
          <EditPencil className="h-3.5 w-3.5 mr-1.5" />
          Edit in Studio
        </Button>
        <Button
          size="sm"
          onClick={() => onAcceptImage(url)}
          className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft ml-auto"
        >
          <Check className="h-3.5 w-3.5 mr-1.5" />
          Use This
        </Button>
      </div>
    </div>
  );
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
  onProceedToCreative: () => void;
  isRefiningCopy: boolean;
  onAcceptImage: (url: string) => void;
  onRegenerateImage: (prompt?: string) => void;
  onEditInStudio: (url: string, prompt: string) => void;
  onClarificationSelect: (val: string) => void;
  onRecoverySelect: (val: string) => void;
  onConfirmAudience: () => void;
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
  onProceedToCreative,
  isRefiningCopy,
  onAcceptImage,
  onRegenerateImage,
  onEditInStudio,
  onClarificationSelect,
  onRecoverySelect,
  onConfirmAudience,
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
            onProceed={onProceedToCreative}
            isRefining={isRefiningCopy}
          />
        )}

        {/* Creative suggestion */}
        {message.type === "creative_suggestion" && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2">
            <Button
              onClick={() => onProceedToCreative()}
              className="w-full h-12 bg-linear-to-r from-purple-600 to-primary hover:from-purple-700 hover:to-primary/90 text-white shadow-soft rounded-2xl font-bold"
            >
              <Sparks className="h-4 w-4 mr-2" />
              Yes, design my ad image ✨
            </Button>
          </div>
        )}

        {/* Image generating */}
        {message.type === "image_generating" && (
          <div className="mt-3 animate-in fade-in">
            <div className="p-6 rounded-3xl bg-linear-to-br from-primary/5 to-purple-500/5 border border-primary/20">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <Sparks className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">
                    Designing your ad...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Using your audience data + location context
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Studio suggestion — structural edit that needs inpainting */}
        {message.type === "studio_suggestion" &&
          message.data?.generatedImage && (
            <StudioSuggestionBubble
              imageUrl={message.data.generatedImage.url}
              imagePrompt={message.data.generatedImage.prompt}
              editInstruction={message.data.editInstruction ?? ""}
              onEditInStudio={onEditInStudio}
            />
          )}

        {/* Image generated */}
        {message.type === "image_generated" && message.data?.generatedImage && (
          <ImageGeneratedBubble
            message={message}
            onAcceptImage={onAcceptImage}
            onRegenerateImage={onRegenerateImage}
            onEditInStudio={onEditInStudio}
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
