"use client";

import { cn } from "@/lib/utils";
import { WarningTriangle } from "iconoir-react";
import type { TargetingOption } from "@/stores/campaign-store";

export function UnresolvedTargetingWarning({
  targetInterests,
  targetBehaviors,
}: {
  targetInterests: TargetingOption[];
  targetBehaviors: TargetingOption[];
}) {
  const unresolvedInterests = targetInterests.filter(
    (i) => !/^\d+$/.test(i.id),
  );
  const unresolvedBehaviors = targetBehaviors.filter(
    (b) => !/^\d+$/.test(b.id),
  );
  const totalUnresolved = unresolvedInterests.length + unresolvedBehaviors.length;
  const totalTargets = targetInterests.length + targetBehaviors.length;
  const unresolvedRatio = totalTargets > 0 ? totalUnresolved / totalTargets : 0;

  if (totalUnresolved === 0) return null;

  const isSevere = unresolvedRatio > 0.3;

  return (
    <div
      className={cn(
        "p-4 rounded-lg border flex items-start gap-3",
        isSevere
          ? "bg-red-50 border-red-200 text-red-800"
          : "bg-amber-50 border-amber-200 text-amber-800",
      )}
    >
      <WarningTriangle
        className={cn(
          "h-5 w-5 mt-0.5 shrink-0",
          isSevere ? "text-red-500" : "text-amber-500",
        )}
      />
      <div className="text-sm">
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
    </div>
  );
}
