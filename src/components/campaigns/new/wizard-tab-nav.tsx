"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface WizardTabNavProps {
  hasExtraStep: boolean;
  extraStepLabel: string;
  canGoTo: {
    extraStep: boolean;
    audience: boolean;
    creative: boolean;
    launch: boolean;
  };
}

export function WizardTabNav({
  hasExtraStep,
  extraStepLabel,
  canGoTo,
}: WizardTabNavProps) {
  const tabTriggerClass = cn(
    "h-12 rounded-lg border-2 transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=inactive]:border-border data-[state=inactive]:bg-background",
    "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2",
  );
  const disabledClass = "disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <TabsList
      className={cn(
        "grid w-full mb-8 h-auto gap-2 bg-transparent p-0",
        hasExtraStep ? "grid-cols-5" : "grid-cols-4",
      )}
    >
      <TabsTrigger value="1" className={tabTriggerClass}>
        <span className="text-xs sm:text-sm font-bold">1.</span>
        <span className="text-xs sm:text-sm">Goal</span>
      </TabsTrigger>

      {hasExtraStep && (
        <TabsTrigger
          value="2"
          disabled={!canGoTo.extraStep}
          className={cn(tabTriggerClass, disabledClass)}
        >
          <span className="text-xs sm:text-sm font-bold">2.</span>
          <span className="text-xs sm:text-sm">{extraStepLabel}</span>
        </TabsTrigger>
      )}

      <TabsTrigger
        value={hasExtraStep ? "3" : "2"}
        disabled={!canGoTo.audience}
        className={cn(tabTriggerClass, disabledClass)}
      >
        <span className="text-xs sm:text-sm font-bold">
          {hasExtraStep ? "3" : "2"}.
        </span>
        <span className="text-xs sm:text-sm">Targeting</span>
      </TabsTrigger>

      <TabsTrigger
        value={hasExtraStep ? "4" : "3"}
        disabled={!canGoTo.creative}
        className={cn(tabTriggerClass, disabledClass)}
      >
        <span className="text-xs sm:text-sm font-bold">
          {hasExtraStep ? "4" : "3"}.
        </span>
        <span className="text-xs sm:text-sm">Creative</span>
      </TabsTrigger>

      <TabsTrigger
        value={hasExtraStep ? "5" : "4"}
        disabled={!canGoTo.launch}
        className={cn(tabTriggerClass, disabledClass)}
      >
        <span className="text-xs sm:text-sm font-bold">
          {hasExtraStep ? "5" : "4"}.
        </span>
        <span className="text-xs sm:text-sm">Launch 🚀</span>
      </TabsTrigger>
    </TabsList>
  );
}
