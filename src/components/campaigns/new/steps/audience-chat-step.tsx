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
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Check, ListSelect } from "iconoir-react";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { SubscriptionBanner } from "@/components/billing/subscription-banner";
import { ChatInterface } from "./audience/chat-interface";
import { AudienceSummaryPanel } from "./audience/audience-summary";
import { useAudienceChat } from "./audience/use-audience-chat";

// ─── Component ─────────────────────────────────────────────────────────────────

export function AudienceChatStep({
  persistedDraftId,
  onDraftSaved,
}: {
  persistedDraftId: string | null;
  onDraftSaved: (id: string) => void;
}) {
  const { targetInterests } = useCampaignStore();

  const {
    isTyping,
    isReadingUrl,
    isRefiningCopy,
    copyReady,
    upgradeDialogOpen,
    setUpgradeDialogOpen,
    trialExpired,
    subscriptionInactive,
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

  const { messages } = useCampaignStore();

  return (
    <>
      {/* Mobile: floating "Review Audience" button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Sheet open={summaryOpen} onOpenChange={setSummaryOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="h-14 px-5 rounded-lg shadow-sm border border-border bg-primary text-primary-foreground font-bold gap-2"
            >
              <ListSelect className="h-5 w-5" />
              Review Audience
              {targetInterests.length > 0 && (
                <span className="bg-primary-foreground/20 text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  {targetInterests.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] rounded-t-3xl overflow-y-auto pb-8"
          >
            <SheetHeader className="mb-4">
              <SheetTitle className="font-heading flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" /> Audience Summary
              </SheetTitle>
            </SheetHeader>
            <AudienceSummaryPanel />
          </SheetContent>
        </Sheet>
      </div>

      {/* Subscription banners — inline, non-blocking */}
      {trialExpired && (
        <div className="mb-3">
          <SubscriptionBanner
            variant="expired"
            planId="growth"
            description="Your free trial has ended. Subscribe to keep using AI ad generation and all campaign tools."
          />
        </div>
      )}
      {subscriptionInactive && !trialExpired && (
        <div className="mb-3">
          <SubscriptionBanner variant="inactive" planId="growth" />
        </div>
      )}

      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-[500px] animate-in fade-in slide-in-from-bottom-4"
      >
        {/* LEFT: CHAT */}
        <ResizablePanel defaultSize={65} minSize={55} maxSize={80}>
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
        </ResizablePanel>

        <ResizableHandle className="hidden lg:flex w-[1.5px] bg-border hover:bg-accent transition-all" />

        {/* RIGHT: AUDIENCE SUMMARY (desktop only) */}
        <ResizablePanel
          defaultSize={35}
          minSize={20}
          maxSize={45}
          className="hidden lg:block"
        >
          <div className="bg-card rounded-lg shadow-sm border border-border h-full p-5 flex flex-col overflow-hidden">
            <h3 className="font-bold text-base text-foreground mb-4 flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" /> Audience Summary
            </h3>
            <AudienceSummaryPanel />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <PaymentDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        planId="growth"
      />
    </>
  );
}
