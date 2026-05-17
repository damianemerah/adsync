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
import { Check, Sparks, MoreVert, NavArrowLeft, LayoutLeft, Xmark } from "iconoir-react";
import { FloppyDisk, SystemRestart, Undo, Trash } from "iconoir-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChatInterface } from "./audience/chat-interface";
import { AudienceSummaryPanel } from "./audience/audience-summary";
import { useAudienceChat } from "./audience/use-audience-chat";
import { canAccessCreativeStep } from "@/stores/campaign-helpers";

interface WizardActions {
  savingState: "none" | "save" | "exit";
  isSaving: boolean;
  isDeleting: boolean;
  completionPercentage: number;
  persistedDraftId: string | null;
  onSaveOnly: () => void;
  onSaveAndExit: () => void;
  onDeleteDraft: () => void;
  onStartOver: () => void;
}

export function AudienceChatStep({
  persistedDraftId,
  onDraftSaved,
  wizardActions,
}: {
  persistedDraftId: string | null;
  onDraftSaved: (id: string) => void;
  wizardActions: WizardActions;
}) {
  const campaignState = useCampaignStore();
  const { targetInterests, messages, setStep } = campaignState;

  const {
    isTyping,
    isReadingUrl,
    isRefiningCopy,
    copyReady,
    summaryOpen,
    setSummaryOpen,
    inputValue,
    setInputValue,
    currentPlaceholder,
    maxCopyVariations,
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
    <div className="flex-1 h-full w-full flex flex-row bg-background animate-in fade-in slide-in-from-bottom-4 overflow-hidden">
      
      {/* Main Column (Header + Chat) */}
      <div className="flex-1 h-full flex flex-col min-w-0 transition-all duration-300 ease-in-out">
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

            {/* Save button — visible directly in header */}
            <Button
              variant="outline"
              size="sm"
              onClick={wizardActions.onSaveOnly}
              disabled={wizardActions.isSaving}
              className="hidden sm:flex items-center gap-1.5 h-8 rounded-md font-medium border-border text-sm"
            >
              {wizardActions.savingState === "save"
                ? <SystemRestart className="h-3.5 w-3.5 animate-spin" />
                : <FloppyDisk className="h-3.5 w-3.5" />}
              {wizardActions.savingState === "save" ? "Saving..." : "Save"}
            </Button>

            {/* Branding */}
                <div className="px-2 py-1.5 flex items-center gap-2">
                  <Sparks className="h-3.5 w-3.5 text-ai" />
                  <span className="text-xs font-medium text-subtle-foreground">Powered by Tenzu AI</span>
                </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile Sheet Trigger */}
            <div className="lg:hidden">
              <Sheet open={summaryOpen} onOpenChange={setSummaryOpen} modal={false}>
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
                  hideOverlay
                  onInteractOutside={(e) => e.preventDefault()}
                  className="w-full sm:max-w-md p-0 flex flex-col h-full border-l border-border lg:hidden"
                >
                  <div className="p-4 sm:p-6 border-b border-border flex-none">
                    <SheetHeader>
                      <SheetTitle className="font-heading flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" /> Audience Summary
                      </SheetTitle>
                    </SheetHeader>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
                    <AudienceSummaryPanel maxCreativeCount={maxCopyVariations} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Toggle Button */}
            <div className="hidden lg:block">
              <Button
                variant={summaryOpen ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSummaryOpen(!summaryOpen)}
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
            </div>

            {/* 3-Dot Menu — secondary/power-user actions only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-subtle-foreground hover:text-foreground">
                  <MoreVert className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Completion badge */}
                <div className="px-2 py-1.5">
                  <Badge variant="outline" className="border-border text-foreground text-xs">
                    {wizardActions.completionPercentage}% Complete
                  </Badge>
                </div>

                <DropdownMenuSeparator />

                {/* Skip to creative */}
                <DropdownMenuItem
                  onClick={() => { if (canGoToCreative) setStep(creativeStepNumber); }}
                  disabled={!canGoToCreative}
                  className="cursor-pointer"
                >
                  <Check className="h-4 w-4 mr-2" /> Skip to Creative
                </DropdownMenuItem>

                {/* Save & exit */}
                <DropdownMenuItem
                  onClick={wizardActions.onSaveAndExit}
                  disabled={wizardActions.isSaving}
                  className="cursor-pointer"
                >
                  <FloppyDisk className="h-4 w-4 mr-2" />
                  {wizardActions.savingState === "exit" ? "Saving..." : "Save & exit"}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Start over */}
                <DropdownMenuItem
                  onClick={wizardActions.onStartOver}
                  className="cursor-pointer rounded-lg"
                >
                  <Undo className="h-4 w-4 mr-2" /> Start over
                </DropdownMenuItem>

                {/* Delete draft (conditional) */}
                {wizardActions.persistedDraftId && (
                  <DropdownMenuItem
                    onClick={wizardActions.onDeleteDraft}
                    disabled={wizardActions.isDeleting}
                    className="text-red-600 rounded-lg focus:bg-red-50 focus:text-red-700 cursor-pointer"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    {wizardActions.isDeleting ? "Deleting..." : "Delete draft"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Chat Area */}
        <div className="flex-1 min-h-0 flex flex-row relative bg-muted/10 overflow-hidden">
          <div className="flex-1 min-w-0 flex flex-col relative transition-all duration-300 ease-in-out">
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
        </div>
      </div>

      {/* RIGHT: desktop sidebar — hidden on mobile (uses Sheet instead) */}
      <div
        className={cn(
          "hidden lg:flex flex-col h-full border-l border-border bg-background",
          "transition-all duration-300 ease-in-out overflow-hidden",
          summaryOpen ? "w-[450px] min-w-[400px]" : "w-0 min-w-0"
        )}
      >
        {/* Only render children when open to avoid tab order issues */}
        {summaryOpen && (
          <>
            <div className="p-4 border-b border-border flex-none flex items-center justify-between">
              <h2 className="font-heading text-sm font-bold flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Audience Summary
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-subtle-foreground hover:text-foreground"
                onClick={() => setSummaryOpen(false)}
              >
                <Xmark className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              <AudienceSummaryPanel maxCreativeCount={maxCopyVariations} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
