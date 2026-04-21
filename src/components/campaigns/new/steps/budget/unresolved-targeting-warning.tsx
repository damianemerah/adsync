"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { WarningTriangle, Xmark } from "iconoir-react";
import type { TargetingOption } from "@/stores/campaign-store";

export function UnresolvedTargetingWarning({
  targetInterests,
  targetBehaviors,
}: {
  targetInterests: TargetingOption[];
  targetBehaviors: TargetingOption[];
}) {
  const [dismissed, setDismissed] = useState(false);

  const unresolvedInterests = targetInterests.filter(
    (i) => !/^\d+$/.test(i.id),
  );
  const unresolvedBehaviors = targetBehaviors.filter(
    (b) => !/^\d+$/.test(b.id),
  );
  const totalUnresolved = unresolvedInterests.length + unresolvedBehaviors.length;
  const totalTargets = targetInterests.length + targetBehaviors.length;
  const unresolvedRatio = totalTargets > 0 ? totalUnresolved / totalTargets : 0;

  if (totalUnresolved === 0 || dismissed) return null;

  const isSevere = unresolvedRatio > 0.3;
  const tone = isSevere ? "danger" : "warning";

  return (
    <div
      className={cn(
        "p-4 rounded-lg border flex items-start gap-3",
        tone === "danger"
          ? "bg-status-danger-soft border-status-danger/30 text-status-danger"
          : "bg-status-warning-soft border-status-warning/30 text-status-warning",
      )}
    >
      <WarningTriangle className="h-5 w-5 mt-0.5 shrink-0" />
      <div className="text-sm flex-1">
        <p className="font-bold mb-0.5">
          {totalUnresolved} targeting option
          {totalUnresolved > 1 ? "s" : ""} could not be verified
        </p>
        <p className="text-xs opacity-80">
          {isSevere
            ? "Over 30% of your targeting is unverified. Consider refining your audience for better results."
            : "Unverified options will be dropped at launch. Your ad will still run with the verified targets."}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 -m-1 p-1 rounded-md hover:bg-foreground/10 transition-colors"
        aria-label="Dismiss warning"
      >
        <Xmark className="h-4 w-4" />
      </button>
    </div>
  );
}
