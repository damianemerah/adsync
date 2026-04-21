"use client";

import { nanoid } from "nanoid";
import { Plus } from "iconoir-react";
import { cn } from "@/lib/utils";
import {
  FormField,
  MetaStandardFieldType,
  META_STANDARD_FIELDS,
  STANDARD_FIELD_LABELS,
} from "@/types/lead-form-builder";

interface FieldPaletteProps {
  fields: FormField[];
  onAdd: (field: FormField) => void;
}

export function FieldPalette({ fields, onAdd }: FieldPaletteProps) {
  const activeStandardTypes = new Set(
    fields.filter((f) => META_STANDARD_FIELDS.includes(f.type as MetaStandardFieldType)).map((f) => f.type),
  );

  const handleAddStandard = (type: MetaStandardFieldType) => {
    if (activeStandardTypes.has(type)) return;
    onAdd({ id: nanoid(), type });
  };

  const handleAddCustom = (type: "CUSTOM" | "USER_CHOICE") => {
    onAdd({
      id: nanoid(),
      type,
      label: "",
      ...(type === "USER_CHOICE" ? { choices: ["", ""] } : {}),
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
            Standard Fields
          </p>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-full">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              Auto-prefilled by Meta
            </span>
          </div>
        </div>
        <p className="text-xs text-subtle-foreground">
          These fields are automatically filled from the user's Meta profile,
          making it faster for them to submit the form.
        </p>
        <div className="flex flex-wrap gap-2">
          {META_STANDARD_FIELDS.map((type) => {
            const disabled = activeStandardTypes.has(type);
            return (
              <button
                key={type}
                type="button"
                disabled={disabled}
                onClick={() => handleAddStandard(type)}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  disabled
                    ? "bg-muted/50 border-border text-muted-foreground cursor-not-allowed opacity-50"
                    : "bg-background border-border text-foreground hover:bg-primary/5 hover:border-primary/50 cursor-pointer",
                )}
              >
                {!disabled && <Plus className="h-3 w-3" />}
                {STANDARD_FIELD_LABELS[type]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
          Custom Questions
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleAddCustom("CUSTOM")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 cursor-pointer transition-all"
          >
            <Plus className="h-3 w-3" />
            Text Question
          </button>
          <button
            type="button"
            onClick={() => handleAddCustom("USER_CHOICE")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 cursor-pointer transition-all"
          >
            <Plus className="h-3 w-3" />
            Dropdown Question
          </button>
        </div>
      </div>
    </div>
  );
}
