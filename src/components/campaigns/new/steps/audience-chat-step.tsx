// src/components/campaigns/new/steps/audience-chat-step.tsx
// Render-only. All logic lives in `./audience/use-audience-chat`.

"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Check, Sparks, MoreVert, NavArrowLeft, LayoutLeft } from "iconoir-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { ChatInterface } from "./audience/chat-interface";
import { AudienceSummaryPanel } from "./audience/audience-summary";
import { useAudienceChat } from "./audience/use-audience-chat";
import { canAccessCreativeStep } from "@/stores/campaign-helpers";

export function AudienceChatStep({
  persistedDraftId,
  onDraftSaved,
}: {
  persistedDraftId: string | null;
  onDraftSaved: (id: string) => void;
}) {
  const campaignState = useCampaignStore();
  const { targetInterests, messages, setStep } = campaignState;

  const {
    isTyping,
    isReadingUrl,
    isRefiningCopy,
    copyReady,
    upgradeDialogOpen,
    setUpgradeDialogOpen,
    summaryOpen,
    setSummaryOpen,
    inputValue,
    setInputValue,
    currentPlaceholder,
    campaignStore,
    handleSend,
    handleCopyRefinement,
    handleConfirmFromChat,
    removeInterest,
    addInterest,
    removeLocation,
    addLocation,
  } = useAudienceChat({ persistedDraftId, onDraftSaved });

  // Navigation helpers
  const canGoToCreative = canAccessCreativeStep(campaignState);
  const hasExtraStep =
    campaignState.objective === "app_promotion" ||
    campaignState.objective === "leads";
  const creativeStepNumber = hasExtraStep ? 4 : 3;
  const audienceStepNumber = hasExtraStep ? 3 : 2;
  const previousStepNumber = audienceStepNumber - 1;

  return (
    <div className="flex-1 h-full w-full flex flex-col bg-background animate-in fade-in slide-in-from-bottom-4 relative">
      {/* Header */}
      <header className="flex-none h-16 border-b border-border bg-background flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Back button — always visible, top-left, universal mobile pattern */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-subtle-foreground hover:text-foreground shrink-0"
            onClick={() => setStep(previousStepNumber)}
            aria-label="Go back"
          >
            <NavArrowLeft className="h-5 w-5" />
          </Button>

          {/* Avatar + identity */}
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparks className="h-4 w-4 text-primary" />
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm leading-none">Tenzu AI</h2>
              <p className="text-xs text-subtle-foreground mt-0.5 hidden sm:block">
                Tell me what you sell — I'll build the ad
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Audience Summary Sheet Trigger */}
          <Sheet open={summaryOpen} onOpenChange={setSummaryOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative gap-1.5 text-subtle-foreground hover:text-foreground h-9 px-2.5"
              >
                <LayoutLeft className="h-4 w-4 shrink-0" />
                <span className="font-medium text-sm">Audience</span>
                {targetInterests.length > 0 && (
                  <span className="absolute -top-1 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {targetInterests.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:max-w-md p-0 flex flex-col h-full border-l border-border"
            >
              <div className="p-4 sm:p-6 border-b border-border flex-none">
                <SheetHeader>
                  <SheetTitle className="font-heading flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary" /> Audience Summary
                  </SheetTitle>
                </SheetHeader>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
                <AudienceSummaryPanel />
              </div>
            </SheetContent>
          </Sheet>

          {/* 3-Dot Menu — secondary/power-user actions only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-subtle-foreground hover:text-foreground">
                <MoreVert className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5 flex items-center gap-2">
                <Sparks className="h-3.5 w-3.5 text-ai" />
                <span className="text-xs font-medium text-subtle-foreground">Powered by Tenzu AI</span>
              </div>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  if (canGoToCreative) {
                    setStep(creativeStepNumber);
                  }
                }}
                disabled={!canGoToCreative}
              >
                <Check className="h-4 w-4 mr-2" />
                Skip to Creative Step
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col bg-muted/10 relative">
        <ChatInterface
          messages={messages}
          inputValue={inputValue}
          setInputValue={setInputValue}
          handleSend={handleSend}
          isTyping={isTyping}
          isRefiningCopy={isRefiningCopy}
          isReadingUrl={isReadingUrl}
          placeholder={currentPlaceholder}
          campaignStore={campaignStore}
          actions={{
            removeInterest,
            addInterest,
            removeLocation,
            addLocation,
            handleCopyRefinement,
            confirmAudience: handleConfirmFromChat,
          }}
          copyReady={copyReady}
        />
      </div>

      <PaymentDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        planId="growth"
      />
    </div>
  );
}
