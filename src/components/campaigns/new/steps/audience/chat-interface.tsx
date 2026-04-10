"use client";

import React from "react";
import { Send, Sparks } from "iconoir-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatBubble } from "./chat-bubble";

interface ChatInterfaceProps {
  messages: any[];
  inputValue: string;
  setInputValue: (val: string) => void;
  handleSend: (val?: string) => void;
  isTyping: boolean;
  isRefiningCopy: boolean;
  isReadingUrl?: boolean;
  copyReady: boolean;
  placeholder: string;
  campaignStore: any; // Passed for read-only access in bubbles if needed
  actions: {
    removeInterest: (i: any) => void;
    addInterest: (i: any) => void;
    removeLocation: (l: any) => void;
    addLocation: (l: any) => void;
    handleCopyRefinement: (val: string) => void;
    confirmAudience: () => void;
  };
}

function StrategyProgressIndicator({ isReadingUrl }: { isReadingUrl?: boolean }) {
  const [stepIdx, setStepIdx] = React.useState(0);
  const steps = [
    ...(isReadingUrl ? ["Reading your website…"] : []),
    "Reading your business description…",
    "Building your audience targeting…",
    "Writing ad copy variations…",
    "Checking Meta ad policy compliance…",
    "Almost done — finalising strategy…",
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-foreground/80">{steps[stepIdx]}</p>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
      </div>
    </div>
  );
}

export function ChatInterface({
  messages,
  inputValue,
  setInputValue,
  handleSend,
  isTyping,
  isRefiningCopy,
  isReadingUrl,
  placeholder,
  campaignStore,
  actions,
  copyReady,
}: ChatInterfaceProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Find the index of the last copy_suggestion message so only that bubble
  // renders the refinement action buttons (Shorter / More Fire / Try Again).
  const lastCopySuggestionIdx = messages.reduce(
    (last, msg, idx) => (msg.type === "copy_suggestion" ? idx : last),
    -1,
  );

  // Find the index of the last outcome_preview message so only that bubble
  // renders the follow-up suggestions (↳ links at the bottom of the card).
  const lastOutcomePreviewIdx = messages.reduce(
    (last, msg, idx) => (msg.type === "outcome_preview" ? idx : last),
    -1,
  );

  return (
    <div className="flex flex-col bg-background rounded-lg shadow-sm border border-border overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparks className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Tenzu AI</h2>
            <p className="text-xs text-subtle-foreground">
              Tell me what you sell — I'll build the ad
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-primary/5 text-primary">
          Beta
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 sm:p-6 bg-muted/10 min-h-[60vh] overflow-auto no-scrollbar max-h-[1000px]">
        <div className="space-y-6 pb-4 flex flex-col items-start w-full">
          {messages.map((msg, idx) => {
            const isConsecutive =
              idx > 0 && messages[idx - 1].role === "ai" && msg.role === "ai";
            return (
              <ChatBubble
                key={msg.id}
                message={msg}
                isConsecutive={isConsecutive}
                onRemoveInterest={actions.removeInterest}
                onAddInterest={actions.addInterest}
                currentInterests={campaignStore.targetInterests}
                currentLocations={campaignStore.locations}
                onRemoveLocation={actions.removeLocation}
                onAddLocation={actions.addLocation}
                onCopyRefine={actions.handleCopyRefinement}
                isRefiningCopy={isRefiningCopy}
                onFollowUpSelect={(instruction: string) => {
                  handleSend(instruction);
                }}
                onClarificationSelect={(option: string, mode: "send" | "prefill") => {
                  if (option === "Let me adjust") {
                    inputRef.current?.focus();
                    return;
                  }
                  if (mode === "prefill") {
                    setInputValue(option);
                    setTimeout(() => inputRef.current?.focus(), 50);
                    return;
                  }
                  handleSend(option);
                }}
                onRecoverySelect={(value: string) => {
                  handleSend(value);
                }}
                onConfirmAudience={() => actions.confirmAudience()}
                copyReady={copyReady}
                isLastCopySuggestion={idx === lastCopySuggestionIdx}
                isLastOutcomePreview={idx === lastOutcomePreviewIdx}
              />
            );
          })}
          {isTyping && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparks className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted px-4 py-3 rounded-lg rounded-tl-none">
                <StrategyProgressIndicator isReadingUrl={isReadingUrl} />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-background border-t border-border shrink-0 z-10">
        <div className="relative flex items-center">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-14 pl-5 pr-14 rounded-lg border-border bg-muted/30 shadow-none focus-visible:ring-primary/20 text-md"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isTyping}
            className="absolute right-2 h-10 w-10 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm border border-border"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {isReadingUrl && !isTyping && (
          <p className="mt-1.5 text-xs text-subtle-foreground pl-1">
            I'll read this page and use it to build your ad
          </p>
        )}
      </div>
    </div>
  );
}
