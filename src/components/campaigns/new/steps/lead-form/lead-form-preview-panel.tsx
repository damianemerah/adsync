"use client";

import { Badge } from "@/components/ui/badge";
import { Phone } from "iconoir-react";
import {
  FormField,
  STANDARD_FIELD_LABELS,
  MetaStandardFieldType,
  META_STANDARD_FIELDS,
} from "@/types/lead-form-builder";

interface LeadFormPreviewPanelProps {
  fields: FormField[];
  thankYouMessage?: string;
}

export function LeadFormPreviewPanel({
  fields,
  thankYouMessage,
}: LeadFormPreviewPanelProps) {
  return (
    <div className="h-full flex flex-col bg-card border-l border-border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Phone className="h-4 w-4 text-primary" />
          Form Preview
        </div>
        <Badge
          variant="outline"
          className="px-2 py-0.5 text-xs border-primary/30 bg-primary/5 text-primary"
        >
          LEAD FORM
        </Badge>
      </div>

      {/* Phone Frame */}
      <div className="flex-1 flex items-start justify-center overflow-hidden">
        <div className="w-full max-w-[220px] rounded-lg border-2 border-border bg-background overflow-hidden flex flex-col">
          {/* Notch */}
          <div className="bg-muted/60 py-2 flex justify-center">
            <div className="w-16 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[480px] no-scrollbar">
            <p className="text-xs font-bold text-foreground">
              Fill in your info
            </p>

            {fields.length === 0 && (
              <p className="text-xs text-subtle-foreground italic text-center py-4">
                Add fields to preview your form
              </p>
            )}

            {fields.map((field) => {
              const isStandard = META_STANDARD_FIELDS.includes(
                field.type as MetaStandardFieldType,
              );

              const label = isStandard
                ? STANDARD_FIELD_LABELS[field.type as MetaStandardFieldType]
                : field.label ||
                  (field.type === "USER_CHOICE"
                    ? "Choose one..."
                    : "Your answer");

              return (
                <div key={field.id} className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {label}
                  </p>
                  {field.type === "USER_CHOICE" ? (
                    <div className="border border-border rounded-md px-2 py-1.5 bg-muted/40">
                      <p className="text-xs text-subtle-foreground truncate">
                        {(field.choices ?? []).filter(Boolean)[0] ||
                          "Select an option"}
                      </p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-md px-2 py-1.5 bg-muted/40">
                      {isStandard ? (
                        <p className="text-xs text-subtle-foreground italic">
                          Auto-filled from your profile
                        </p>
                      ) : (
                        <p className="text-xs text-subtle-foreground">
                          &nbsp;
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {thankYouMessage && (
              <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded-md">
                <p className="text-xs text-primary font-medium">
                  After submit:
                </p>
                <p className="text-xs text-foreground line-clamp-2">
                  {thankYouMessage}
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="p-3 border-t border-border bg-muted/20">
            <div className="w-full rounded-full bg-primary py-1.5 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">
                Submit
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
