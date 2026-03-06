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
import { CreditsDisplay } from "@/components/layout/credits-display";
import { HelpCenterSheet } from "@/components/layout/help-center-sheet";

// Step Components
import { GoalPlatformStep } from "@/components/campaigns/new/steps/goal-platform-step";
import { AudienceChatStep } from "@/components/campaigns/new/steps/audience-chat-step";
import { CreativeStep } from "@/components/campaigns/new/steps/creative-step";
import { BudgetLaunchStep } from "@/components/campaigns/new/steps/budget-launch-step";

// Validation Helpers
import {
  canAccessAudienceStep,
  canAccessCreativeStep,
  canAccessLaunchStep,
  getWizardCompletionPercentage,
} from "@/stores/campaign-helpers";

export default function NewCampaignPage() {
  const router = useRouter();
  /* eslint-disable react-hooks/exhaustive-deps */
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");
  const {
    currentStep: step,
    setStep,
    resetDraft,
    hydrate,
    predictedROAS,
    ...campaignState
  } = useCampaignStore();
  const [savingState, setSavingState] = useState<"none" | "save" | "exit">(
    "none",
  );
  const isSaving = savingState !== "none";
  const [isDeleting, setIsDeleting] = useState(false);

  // Hydrate from Server Draft if ID present
  useEffect(() => {
    const isResume = searchParams.get("resume") === "true";

    if (draftId) {
      toast.promise(
        getDraft(draftId).then((data) => {
          if (data) hydrate(data);
          else toast.error("Draft not found");
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
      await saveDraft(campaignState, draftId || undefined);
      toast.success("Draft Saved", {
        description: "You can resume this campaign from the dashboard.",
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
      await saveDraft(campaignState, draftId || undefined);
      toast.success("Draft Saved", {
        description: "Your progress has been saved.",
      });
    } catch (error) {
      toast.error("Failed to save draft");
      console.error(error);
    } finally {
      setSavingState("none");
    }
  };

  const handleDeleteDraft = async () => {
    if (!draftId) {
      if (confirm("Discard all changes and start over?")) {
        resetDraft();
      }
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this draft? This action cannot be undone.",
      )
    )
      return;

    setIsDeleting(true);
    try {
      await deleteDraft(draftId);
      toast.success("Draft Deleted");
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
    predictedROAS,
  };
  const canGoToAudience = canAccessAudienceStep(fullState);
  const canGoToCreative = canAccessCreativeStep(fullState);
  const canGoToLaunch = canAccessLaunchStep(fullState);
  const completionPercentage = getWizardCompletionPercentage(fullState);

  return (
    <div className="min-h-screen bg-muted font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveOnly}
              disabled={isSaving}
              className="flex items-center gap-2 h-9 rounded-xl font-medium border-border"
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
              onClick={handleSaveAndExit}
              disabled={isSaving}
              className="flex items-center gap-2 text-subtle-foreground hover:text-foreground hover:bg-transparent transition-colors p-0 disabled:opacity-50"
            >
              {savingState === "exit" ? (
                <SystemRestart className="h-4 w-4 animate-spin" />
              ) : (
                <FloppyDisk className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {savingState === "exit" ? "Saving..." : "Save & Exit"}
              </span>
            </Button>
            <CreditsDisplay />
            <HelpCenterSheet />
          </div>

          <div className="flex items-center gap-4">
            {/* ROAS Badge (if available) */}
            {predictedROAS && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full">
                <Sparks className="h-4 w-4" />
                <span className="text-sm font-bold">
                  Predicted Return: {predictedROAS.value.toFixed(1)}x
                </span>
                <span className="text-xs text-subtle-foreground">
                  ({(predictedROAS.confidence * 100).toFixed(0)}% confidence)
                </span>
              </div>
            )}

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
                className="rounded-xl shadow-soft border-border bg-popover"
              >
                {draftId && (
                  <DropdownMenuItem
                    onClick={handleDeleteDraft}
                    disabled={isDeleting}
                    className="text-red-600 rounded-lg focus:bg-red-50 cursor-pointer mb-1"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    {isDeleting ? "Deleting..." : "Delete Draft"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm("Discard all changes and start over?"))
                      resetDraft();
                  }}
                  className={cn(
                    "rounded-lg cursor-pointer",
                    !draftId && "text-red-600 focus:bg-red-50",
                  )}
                >
                  <Undo className="h-4 w-4 mr-2" /> Start Over
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        <Tabs
          value={step.toString()}
          onValueChange={handleTabChange}
          className="w-full"
        >
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-4 mb-8 h-auto gap-2 bg-transparent p-0">
            <TabsTrigger
              value="1"
              className={cn(
                "h-12 rounded-2xl border-2 transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=inactive]:border-border data-[state=inactive]:bg-background",
                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2",
              )}
            >
              <span className="text-xs sm:text-sm font-bold">1.</span>
              <span className="text-xs sm:text-sm">Goal</span>
            </TabsTrigger>

            <TabsTrigger
              value="2"
              disabled={!canGoToAudience}
              className={cn(
                "h-12 rounded-2xl border-2 transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=inactive]:border-border data-[state=inactive]:bg-background",
                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              <span className="text-xs sm:text-sm font-bold">2.</span>
              <span className="text-xs sm:text-sm">Targeting</span>
            </TabsTrigger>

            <TabsTrigger
              value="3"
              disabled={!canGoToCreative}
              className={cn(
                "h-12 rounded-2xl border-2 transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=inactive]:border-border data-[state=inactive]:bg-background",
                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              <span className="text-xs sm:text-sm font-bold">3.</span>
              <span className="text-xs sm:text-sm">Creative</span>
            </TabsTrigger>

            <TabsTrigger
              value="4"
              disabled={!canGoToLaunch}
              className={cn(
                "h-12 rounded-2xl border-2 transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=inactive]:border-border data-[state=inactive]:bg-background",
                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              <span className="text-xs sm:text-sm font-bold">4.</span>
              <span className="text-xs sm:text-sm">Launch 🚀</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="1" className="mt-0">
            <GoalPlatformStep />
          </TabsContent>

          <TabsContent value="2" className="mt-0">
            <AudienceChatStep />
          </TabsContent>

          <TabsContent value="3" className="mt-0">
            <CreativeStep />
          </TabsContent>

          <TabsContent value="4" className="mt-0">
            <BudgetLaunchStep />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
