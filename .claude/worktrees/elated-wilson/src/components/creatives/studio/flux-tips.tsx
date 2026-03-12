"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Sparks, HelpCircle } from "iconoir-react";

export function FluxTips() {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div className="cursor-help text-muted-foreground hover:text-foreground p-1 transition-colors">
          <HelpCircle className="w-4 h-4" />
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4" align="start">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Sparks className="h-4 w-4 text-primary" />
            Flux Editing Tips
          </h4>
          <ul className="list-disc pl-4 space-y-2 text-xs text-muted-foreground">
            <li>
              <strong>Natural Language:</strong> Describe changes naturally
              (e.g., "Replace background with a beach").
            </li>
            <li>
              <strong>Multi-Reference:</strong> The first image is your main
              subject. You can upload up to 9 references.
            </li>
            <li>
              <strong>Precise Edits:</strong> Use "Refine" mode for
              high-fidelity re-styling.
            </li>
          </ul>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
