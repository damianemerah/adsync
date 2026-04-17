"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { getDraft } from "@/actions/drafts";
import {
  FloppyDisk,
  MoreVert,
  Undo,
  Trash,
  Sparks,
  SystemRestart,
} from "iconoir-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { useSubscription } from "@/hooks/use-subscription";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { useDraftPersistence } from "@/hooks/use-draft-persistence";
import { WizardTabNav } from "@/components/campaigns/new/wizard-tab-nav";

// Step Components
import { GoalPlatformStep } from "@/components/campaigns/new/steps/goal-platform-step";
import { AudienceChatStep } from "@/components/campaigns/new/steps/audience-chat-step";
import { CreativeStep } from "@/components/campaigns/new/steps/creative-step";
import { BudgetLaunchStep } from "@/components/campaigns/new/steps/budget-launch-step";
import { LeadFormStep } from "@/components/campaigns/new/steps/lead-form-step";
import { AppInfoStep } from "@/components/campaigns/new/steps/app-info-step";

import {
  canAccessAudienceStep,
  canAccessCreativeStep,
  canAccessLaunchStep,
  canAccessExtraStep,
  getWizardCompletionPercentage,
} from "@/stores/campaign-helpers";

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");

  const {
    currentStep: step,
    setStep,
    resetDraft,
    hydrate,
    ...campaignState
  } = useCampaignStore();

  const {
    persistedDraftId,
    savingState,
    isSaving,
    isDeleting,
    onDraftSaved,
    handleSaveOnly,
    handleSaveAndExit,
    handleDeleteDraft,
  } = useDraftPersistence(draftId);

  const { data: subscriptionData, isLoading: isLoadingSub } = useSubscription();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const hasActiveSub =
    !isLoadingSub &&
    (subscriptionData?.org?.status === "active" ||
      subscriptionData?.org?.status === "trialing");

  // Hydrate from Server Draft if ID present
  useEffect(() => {
    const isResume = searchParams.get("resume") === "true";

    if (draftId) {
      toast.promise(
        getDraft(draftId).then((data) => {
          if (data) hydrate(data);
          else toast.error("Ad draft not found");
        }),
        {
          loading: "Loading draft...",
          success: "Draft loaded",
          error: "Failed to load draft",
        },
      );
    } else if (!isResume) {
      resetDraft();
    }
  }, [draftId, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (value: string) => {
    setStep(parseInt(value));
  };

  // Calculate validation states
  const fullState = {
    ...campaignState,
    currentStep: step,
    setStep,
    resetDraft,
    hydrate,
  };
  const canGoToAudience = canAccessAudienceStep(fullState);
  const canGoToCreative = canAccessCreativeStep(fullState);
  const canGoToLaunch = canAccessLaunchStep(fullState);
  const completionPercentage = getWizardCompletionPercentage(fullState);

  const hasExtraStep =
    campaignState.objective === "app_promotion" ||
    campaignState.objective === "leads";

  const extraStepLabel =
    campaignState.objective === "app_promotion" ? "App Info" : "Lead Form";

  const canGoToExtraStep = canAccessExtraStep(fullState);

  const canGoToAudienceAdjusted = hasExtraStep
    ? canGoToExtraStep
    : canGoToAudience;
  const canGoToCreativeAdjusted = hasExtraStep
    ? canGoToAudience
    : canGoToCreative;
  const canGoToLaunchAdjusted = hasExtraStep ? canGoToCreative : canGoToLaunch;

  if (isLoadingSub) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted">
        <SystemRestart className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasActiveSub) {
    return (
      <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="h-16 w-16 bg-ai/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparks className="h-8 w-8 text-ai" />
          </div>
          <h2 className="text-2xl font-bold font-heading">
            Subscription Required
          </h2>
          <p className="text-subtle-foreground text-sm">
            You need an active subscription or trial to create ads and
            generate AI creatives.
          </p>
          <Button
            className="w-full mt-4 font-bold h-12 rounded-md"
            onClick={() => setIsPaymentOpen(true)}
          >
            Upgrade Plan
          </Button>
          <Button
            variant="ghost"
            className="w-full text-subtle-foreground"
            onClick={() => router.push("/campaigns")}
          >
            Go Back
          </Button>

          <PaymentDialog
            open={isPaymentOpen}
            onOpenChange={(open) => {
              setIsPaymentOpen(open);
              if (!open && !hasActiveSub) router.push("/campaigns");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted font-sans">
      {/* HEADER */}
      <PageHeader
        showCredits
        className="z-40"
        leftContent={
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveOnly}
              disabled={isSaving}
              className="flex items-center gap-2 h-9 rounded-md font-medium border-border"
            >
              {savingState === "save" ? (
                <SystemRestart className="h-4 w-4 animate-spin" />
              ) : (
                <FloppyDisk className="h-4 w-4" />
              )}
              {savingState === "save" ? "Saving..." : "Save"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveAndExit}
              disabled={isSaving}
              className="flex items-center gap-2 text-subtle-foreground hover:text-foreground hover:bg-muted transition-colors rounded-md px-3 h-9 disabled:opacity-50"
            >
              {savingState === "exit" ? (
                <SystemRestart className="h-4 w-4 animate-spin" />
              ) : (
                <FloppyDisk className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {savingState === "exit" ? "Saving..." : "Save & exit"}
              </span>
            </Button>
          </div>
        }
      >
        <div className="flex items-center gap-4">
          <Badge
            variant="outline"
            className="hidden sm:flex border-border text-foreground"
          >
            {completionPercentage}% Complete
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-subtle-foreground hover:text-foreground rounded-full"
              >
                <MoreVert className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-md shadow-sm border border-border bg-popover"
            >
              {persistedDraftId && (
                <DropdownMenuItem
                  onClick={handleDeleteDraft}
                  disabled={isDeleting}
                  className="text-red-600 rounded-lg focus:bg-red-50 cursor-pointer mb-1 focus:text-red-700"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  {isDeleting ? "Deleting..." : "Delete draft"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  if (confirm("Discard this ad and start over?"))
                    resetDraft();
                }}
                className={cn(
                  "rounded-lg cursor-pointer",
                  !persistedDraftId && "text-red-600 focus:bg-red-50 focus:text-red-700",
                )}
              >
                <Undo className="h-4 w-4 mr-2" /> Start over
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        <Tabs
          value={step.toString()}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <WizardTabNav
            hasExtraStep={hasExtraStep}
            extraStepLabel={extraStepLabel}
            canGoTo={{
              extraStep: canGoToExtraStep,
              audience: canGoToAudienceAdjusted,
              creative: canGoToCreativeAdjusted,
              launch: canGoToLaunchAdjusted,
            }}
          />

          <TabsContent value="1" className="mt-0">
            <GoalPlatformStep />
          </TabsContent>

          {hasExtraStep && (
            <TabsContent value="2" className="mt-0">
              {campaignState.objective === "app_promotion" ? (
                <AppInfoStep />
              ) : (
                <LeadFormStep />
              )}
            </TabsContent>
          )}

          <TabsContent value={hasExtraStep ? "3" : "2"} className="mt-0">
            <AudienceChatStep
              persistedDraftId={persistedDraftId}
              onDraftSaved={onDraftSaved}
            />
          </TabsContent>

          <TabsContent value={hasExtraStep ? "4" : "3"} className="mt-0">
            <CreativeStep
              persistedDraftId={persistedDraftId}
              onDraftSaved={onDraftSaved}
            />
          </TabsContent>

          <TabsContent value={hasExtraStep ? "5" : "4"} className="mt-0">
            <BudgetLaunchStep
              persistedDraftId={persistedDraftId}
              onDraftSaved={onDraftSaved}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
