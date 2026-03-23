"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdvantagePlusConfig {
  audience?: boolean;
  placements?: boolean;
  creative?: boolean;
  budget?: boolean;
}

interface AdvantagePlusBadgeProps {
  config: AdvantagePlusConfig | null;
  compact?: boolean;
}

export function AdvantagePlusBadge({
  config,
  compact = false,
}: AdvantagePlusBadgeProps) {
  if (!config) return null;

  const enabledFeatures = Object.entries(config)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);

  if (enabledFeatures.length === 0) return null;

  const featureLabels: Record<string, string> = {
    audience: "Audience Expansion",
    placements: "Automatic Placements",
    creative: "Creative Optimization",
    budget: "Budget Optimization",
  };

  const tooltipText = enabledFeatures
    .map((f) => featureLabels[f as keyof typeof featureLabels] || f)
    .join(", ");

  const label = compact
    ? `A+ (${enabledFeatures.length})`
    : `Advantage+ (${enabledFeatures.length})`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1 cursor-help bg-blue-50 text-blue-700 border-blue-200">
            <Sparkles className="h-3 w-3" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-semibold mb-1">Meta is optimizing:</div>
            <ul className="list-disc list-inside">
              {enabledFeatures.map((f) => (
                <li key={f}>
                  {featureLabels[f as keyof typeof featureLabels] || f}
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
