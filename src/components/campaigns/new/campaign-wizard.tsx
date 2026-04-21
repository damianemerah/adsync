"use client";

// All interactive wizard state lives here.
// page.tsx (Server) handles subscription gating and passes draftId as a prop.

import { useCampaignStore } from "@/stores/campaign-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getDraft } from "@/actions/drafts";
import {
  FloppyDisk,
  MoreVert,
  Undo,
  Trash,
  SystemRestart,
} from "iconoir-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
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

// ─── Props ─────────────────────────────────────────────────────────────────────

interface CampaignWizardProps {
  /** Resolved from server `searchParams.draftId` — null when creating fresh. */
  draftId: string | null;
  /** Whether this session is resuming (suppresses resetDraft on mount). */
  isResume: boolean;
}

// ─── Wizard ────────────────────────────────────────────────────────────────────

export function CampaignWizard({ draftId, isResume }: CampaignWizardProps) {
  const router = useRouter();

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

  // Hydrate from server draft if ID present, or reset for a fresh session
  useEffect(() => {
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
  }, [draftId, isResume, hydrate, resetDraft]);

  const handleTabChange = (value: string) => {
    setStep(parseInt(value));
  };

  // ── Validation states ────────────────────────────────────────────────────────
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
  const canGoToAudienceAdjusted = hasExtraStep ? canGoToExtraStep : canGoToAudience;
  const canGoToCreativeAdjusted = hasExtraStep ? canGoToAudience : canGoToCreative;
  const canGoToLaunchAdjusted = hasExtraStep ? canGoToCreative : canGoToLaunch;

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
                  if (confirm("Discard this ad and start over?")) resetDraft();
                }}
                className={cn(
                  "rounded-lg cursor-pointer",
                  !persistedDraftId &&
                    "text-red-600 focus:bg-red-50 focus:text-red-700",
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

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mt-0"
            >
              {step === 1 && <GoalPlatformStep />}
              {hasExtraStep &&
                step === 2 &&
                (campaignState.objective === "app_promotion" ? (
                  <AppInfoStep />
                ) : (
                  <LeadFormStep />
                ))}
              {step === (hasExtraStep ? 3 : 2) && (
                <AudienceChatStep
                  persistedDraftId={persistedDraftId}
                  onDraftSaved={onDraftSaved}
                />
              )}
              {step === (hasExtraStep ? 4 : 3) && (
                <CreativeStep
                  persistedDraftId={persistedDraftId}
                  onDraftSaved={onDraftSaved}
                />
              )}
              {step === (hasExtraStep ? 5 : 4) && (
                <BudgetLaunchStep
                  persistedDraftId={persistedDraftId}
                  onDraftSaved={onDraftSaved}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </main>
    </div>
  );
}
