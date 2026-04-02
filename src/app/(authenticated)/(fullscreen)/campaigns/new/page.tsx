"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { saveDraft, getDraft, deleteDraft } from "@/actions/drafts";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { useSubscription } from "@/hooks/use-subscription";
import { PaymentDialog } from "@/components/billing/payment-dialog";

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
  /* eslint-disable react-hooks/exhaustive-deps */
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");
  const [persistedDraftId, setPersistedDraftId] = useState<string | null>(
    draftId,
  );
  const {
    currentStep: step,
    setStep,
    resetDraft,
    hydrate,
    ...campaignState
  } = useCampaignStore();
  const [savingState, setSavingState] = useState<"none" | "save" | "exit">(
    "none",
  );
  const isSaving = savingState !== "none";
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: subscriptionData, isLoading: isLoadingSub } = useSubscription();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const hasActiveSub =
    !isLoadingSub &&
    (subscriptionData?.org?.status === "active" ||
      subscriptionData?.org?.status === "trialing");

  useEffect(() => {
    if (!isLoadingSub && !hasActiveSub) {
      setIsPaymentOpen(true);
    }
  }, [isLoadingSub, hasActiveSub]);

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
      // Start fresh ONLY if not resuming from another flow
      resetDraft();
    }
  }, [draftId, searchParams]);

  const handleSaveAndExit = async () => {
    setSavingState("exit");
    try {
      const savedId = await saveDraft(
        campaignState,
        persistedDraftId || undefined,
      );
      if (savedId && savedId !== persistedDraftId) {
        setPersistedDraftId(savedId);
      }
      toast.success("Draft saved", {
        description: "You can resume this ad from the dashboard.",
      });
      router.push("/campaigns");
    } catch (error) {
      toast.error("Failed to save draft");
      console.error(error);
    } finally {
      setSavingState("none");
    }
  };

  const handleSaveOnly = async () => {
    setSavingState("save");
    try {
      const savedId = await saveDraft(
        campaignState,
        persistedDraftId || undefined,
      );
      if (savedId && savedId !== persistedDraftId) {
        setPersistedDraftId(savedId);
        router.replace(`/campaigns/new?draftId=${savedId}`, { scroll: false });
      }
      toast.success("Draft saved", {
        description: "Your progress is saved.",
      });
    } catch (error) {
      toast.error("Failed to save draft");
      console.error(error);
    } finally {
      setSavingState("none");
    }
  };

  const handleDeleteDraft = async () => {
    if (!persistedDraftId) {
      if (confirm("Discard this ad and start over?")) {
        resetDraft();
      }
      return;
    }

    if (!confirm("Delete this draft? This can't be undone.")) return;

    setIsDeleting(true);
    try {
      await deleteDraft(persistedDraftId);
      toast.success("Draft deleted");
      resetDraft();
      router.push("/campaigns");
    } catch (error) {
      toast.error("Failed to delete draft");
      console.error(error);
      setIsDeleting(false);
    }
  };

  const handleTabChange = (value: string) => {
    const newStep = parseInt(value);
    setStep(newStep);
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

  // Dynamic Step configuration based on objective
  const hasExtraStep =
    campaignState.objective === "app_promotion" ||
    campaignState.objective === "leads";

  const extraStepLabel =
    campaignState.objective === "app_promotion" ? "App Info" : "Lead Form";

  const numSteps = hasExtraStep ? 5 : 4;

  // Validation logic
  const canGoToExtraStep = canAccessExtraStep(fullState);

  // If we have an extra step, the guards shift
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
          {/* Completion Badge */}
          <Badge
            variant="outline"
            className="hidden sm:flex border-border text-foreground"
          >
            {completionPercentage}% Complete
          </Badge>

          {/* Global Reset */}
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
          {/* Tab Navigation */}
          <TabsList
            className={cn(
              "grid w-full mb-8 h-auto gap-2 bg-transparent p-0",
              hasExtraStep ? "grid-cols-5" : "grid-cols-4"
            )}
          >
            <TabsTrigger
              value="1"
              className={cn(
                "h-12 rounded-lg border-2 transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=inactive]:border-border data-[state=inactive]:bg-background",
                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2",
              )}
            >
              <span className="text-xs sm:text-sm font-bold">1.</span>
              <span className="text-xs sm:text-sm">Goal</span>
            </TabsTrigger>

            {hasExtraStep && (
              <TabsTrigger
                value="2"
                disabled={!canGoToExtraStep}
                className={cn(
                  "h-12 rounded-lg border-2 transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=inactive]:border-border data-[state=inactive]:bg-background",
                  "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                )}
              >
                <span className="text-xs sm:text-sm font-bold">2.</span>
                <span className="text-xs sm:text-sm">{extraStepLabel}</span>
              </TabsTrigger>
            )}

            <TabsTrigger
              value={hasExtraStep ? "3" : "2"}
              disabled={!canGoToAudienceAdjusted}
              className={cn(
                "h-12 rounded-lg border-2 transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=inactive]:border-border data-[state=inactive]:bg-background",
                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              <span className="text-xs sm:text-sm font-bold">
                {hasExtraStep ? "3" : "2"}.
              </span>
              <span className="text-xs sm:text-sm">Targeting</span>
            </TabsTrigger>

            <TabsTrigger
              value={hasExtraStep ? "4" : "3"}
              disabled={!canGoToCreativeAdjusted}
              className={cn(
                "h-12 rounded-lg border-2 transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=inactive]:border-border data-[state=inactive]:bg-background",
                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              <span className="text-xs sm:text-sm font-bold">
                {hasExtraStep ? "4" : "3"}.
              </span>
              <span className="text-xs sm:text-sm">Creative</span>
            </TabsTrigger>

            <TabsTrigger
              value={hasExtraStep ? "5" : "4"}
              disabled={!canGoToLaunchAdjusted}
              className={cn(
                "h-12 rounded-lg border-2 transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=inactive]:border-border data-[state=inactive]:bg-background",
                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              <span className="text-xs sm:text-sm font-bold">
                {hasExtraStep ? "5" : "4"}.
              </span>
              <span className="text-xs sm:text-sm">Launch 🚀</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
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
              onDraftSaved={(id) => {
                setPersistedDraftId(id);
                router.replace(`/campaigns/new?draftId=${id}`, {
                  scroll: false,
                });
              }}
            />
          </TabsContent>

          <TabsContent value={hasExtraStep ? "4" : "3"} className="mt-0">
            <CreativeStep
              persistedDraftId={persistedDraftId}
              onDraftSaved={(id) => {
                setPersistedDraftId(id);
                router.replace(`/campaigns/new?draftId=${id}`, {
                  scroll: false,
                });
              }}
            />
          </TabsContent>

          <TabsContent value={hasExtraStep ? "5" : "4"} className="mt-0">
            <BudgetLaunchStep
              persistedDraftId={persistedDraftId}
              onDraftSaved={(id) => {
                setPersistedDraftId(id);
                router.replace(`/campaigns/new?draftId=${id}`, {
                  scroll: false,
                });
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
