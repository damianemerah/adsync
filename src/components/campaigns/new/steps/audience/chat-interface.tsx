"use client";

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
  placeholder: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  campaignStore: any; // Passed for read-only access in bubbles if needed
  actions: {
    removeInterest: (i: any) => void;
    addInterest: (i: any) => void;
    removeLocation: (l: any) => void;
    addLocation: (l: any) => void;
    handleCopyRefinement: (val: string) => void;
    handleGenerateCreative: (prompt?: string) => void; // also used as onRegenerateImage
    handleAcceptImage: (url: string) => void;
    handleEditInStudio: (url: string, prompt: string) => void;
    setStep: (step: number) => void;
  };
}

function TypingIndicator() {
  return (
    <div className="flex gap-1">
      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
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
  placeholder,
  scrollRef,
  campaignStore,
  actions,
}: ChatInterfaceProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col bg-background border border-border rounded-3xl shadow-soft overflow-hidden relative h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparks className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Sellam AI</h2>
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
      <ScrollArea className="flex-1 p-4 sm:p-6 bg-muted/10 min-h-[50vh] overflow-auto no-scrollbar">
        <div className="space-y-6 pb-4">
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              onRemoveInterest={actions.removeInterest}
              onAddInterest={actions.addInterest}
              currentInterests={campaignStore.targetInterests}
              currentLocations={campaignStore.locations}
              onRemoveLocation={actions.removeLocation}
              onAddLocation={actions.addLocation}
              onCopyRefine={actions.handleCopyRefinement}
              onProceedToCreative={actions.handleGenerateCreative}
              isRefiningCopy={isRefiningCopy}
              onAcceptImage={actions.handleAcceptImage}
              onRegenerateImage={actions.handleGenerateCreative}
              onEditInStudio={actions.handleEditInStudio}
              onClarificationSelect={(option: string) => {
                handleSend(option);
              }}
              onRecoverySelect={(value: string) => {
                handleSend(value);
              }}
              onConfirmAudience={() => actions.setStep(3)}
            />
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparks className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-none">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-background border-t border-border shrink-0 z-10">
        <div className="relative flex items-center">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-14 pl-5 pr-14 rounded-2xl border-border bg-muted/30 shadow-none focus-visible:ring-primary/20 text-md"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isTyping}
            className="absolute right-2 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
