"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EditPencil, Plus, Xmark } from "iconoir-react";
import { FormField } from "@/types/lead-form-builder";

interface FieldEditorPopoverProps {
  field: FormField;
  onUpdate: (updated: Partial<FormField>) => void;
}

export function FieldEditorPopover({ field, onUpdate }: FieldEditorPopoverProps) {
  const [open, setOpen] = useState(false);

  const handleChoiceChange = (index: number, value: string) => {
    const next = [...(field.choices ?? [])];
    next[index] = value;
    onUpdate({ choices: next });
  };

  const handleAddChoice = () => {
    onUpdate({ choices: [...(field.choices ?? []), ""] });
  };

  const handleRemoveChoice = (index: number) => {
    const next = (field.choices ?? []).filter((_, i) => i !== index);
    onUpdate({ choices: next });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Edit field"
        >
          <EditPencil className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-3" side="left" align="start">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider">
          Edit Question
        </p>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Question Label</label>
          <Input
            value={field.label ?? ""}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="e.g. What is your biggest challenge?"
            className="h-9 text-sm bg-muted/50 border-border"
            autoFocus
          />
        </div>

        {field.type === "USER_CHOICE" && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Choices</label>
            <div className="space-y-1.5">
              {(field.choices ?? []).map((choice, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <Input
                    value={choice}
                    onChange={(e) => handleChoiceChange(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="h-8 text-xs bg-muted/50 border-border flex-1"
                  />
                  {(field.choices?.length ?? 0) > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveChoice(i)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Xmark className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {(field.choices?.length ?? 0) < 2 && (
              <p className="text-xs text-destructive">At least 2 choices required.</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddChoice}
              className="w-full h-8 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Choice
            </Button>
          </div>
        )}

        <Button
          type="button"
          size="sm"
          className="w-full h-9 text-xs"
          onClick={() => setOpen(false)}
        >
          Done
        </Button>
      </PopoverContent>
    </Popover>
  );
}
