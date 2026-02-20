"use client";

import { Megaphone, Refresh, Sparks, EditPencil, Check } from "iconoir-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useCampaignStore } from "@/stores/campaign-store";
import { cn } from "@/lib/utils";

interface CopySuggestionProps {
  headline: string;
  primary: string;
  onRefine: (instruction: string) => void;
  onProceed: () => void;
  isRefining: boolean;
}

function EditableField({
  label,
  value,
  onSave,
  multiline,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleSave = () => {
    onSave(draft.trim() || value);
    setEditing(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!multiline && e.key === "Enter") { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") { setDraft(value); setEditing(false); }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold text-subtle-foreground uppercase tracking-wider">
          {label}
        </div>
        {!editing && (
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
          >
            <EditPencil className="h-3 w-3" /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
              rows={3}
              className="w-full text-sm text-foreground leading-relaxed bg-muted/40 border border-primary/40 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-primary"
            />
          ) : (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
              className="w-full font-bold text-foreground text-base bg-muted/40 border border-primary/40 rounded-xl px-3 py-2 focus:outline-none focus:border-primary"
            />
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              className="h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs"
            >
              <Check className="h-3 w-3 mr-1" /> Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setDraft(value); setEditing(false); }}
              className="h-7 px-3 rounded-lg text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "cursor-text hover:bg-muted/50 rounded-lg px-2 py-1 -mx-2 transition-colors",
            multiline ? "text-sm text-foreground/80 leading-relaxed" : "font-bold text-foreground text-base leading-snug",
          )}
          onClick={() => { setDraft(value); setEditing(true); }}
          title="Click to edit"
        >
          {value}
        </div>
      )}
    </div>
  );
}

export function CopySuggestion({
  headline,
  primary,
  onRefine,
  onProceed,
  isRefining,
}: CopySuggestionProps) {
  const { adCopy, updateDraft } = useCampaignStore();

  const handleSaveHeadline = (val: string) => {
    updateDraft({ adCopy: { ...adCopy, headline: val } });
  };

  const handleSaveBody = (val: string) => {
    updateDraft({ adCopy: { ...adCopy, primary: val } });
  };

  // Use live store values so edits persist across refinements
  const liveHeadline = adCopy.headline || headline;
  const liveBody = adCopy.primary || primary;

  return (
    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2">
      <div className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider flex items-center gap-2">
        <Megaphone className="h-3.5 w-3.5" />
        Your Ad Copy
      </div>
      <div className="p-4 rounded-3xl bg-card border border-border shadow-soft space-y-3">
        <EditableField
          label="Headline"
          value={liveHeadline}
          onSave={handleSaveHeadline}
        />
        <EditableField
          label="Body"
          value={liveBody}
          onSave={handleSaveBody}
          multiline
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRefine("Make this copy shorter and more punchy")}
          disabled={isRefining}
          className="rounded-xl border-border hover:border-primary/50 hover:bg-primary/5 text-xs"
        >
          {isRefining && (
            <Refresh className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          )}
          Shorter
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRefine("Make this more urgent and exciting")}
          disabled={isRefining}
          className="rounded-xl border-border hover:border-primary/50 hover:bg-primary/5 text-xs"
        >
          More Fire 🔥
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRefine("Rewrite with completely fresh wording")}
          disabled={isRefining}
          className="rounded-xl border-border hover:border-primary/50 hover:bg-primary/5 text-xs"
        >
          <Refresh className="h-3.5 w-3.5 mr-1.5" />
          Try Again
        </Button>
        <Button
          size="sm"
          onClick={() => onProceed()}
          disabled={isRefining}
          className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs shadow-soft ml-auto"
        >
          Generate Creative <Sparks className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
