"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "iconoir-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  TemplateGallery,
  type TemplateGalleryProps,
} from "@/components/creatives/template-gallery";
import { TemplateVariableForm } from "@/components/creatives/template-variable-form";
import type { CreativeTemplate } from "@/hooks/use-creative-templates";

export interface TemplatePickerSheetProps {
  trigger: React.ReactNode;
  tierId: TemplateGalleryProps["tierId"];
  isSubmitting?: boolean;
  /**
   * Called after the user fills the variable form and submits. Implementation should
   * trigger generation and close the sheet (via the controlled `open` state) when ready.
   */
  onGenerate: (templateId: string, values: Record<string, string>) => void | Promise<void>;
  onUpgradeRequired?: () => void;
}

export function TemplatePickerSheet({
  trigger,
  tierId,
  isSubmitting,
  onGenerate,
  onUpgradeRequired,
}: TemplatePickerSheetProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CreativeTemplate | null>(null);

  // Auto-close after a successful generation kicks off (parent flips isSubmitting back to false)
  const [pendingClose, setPendingClose] = useState(false);
  useEffect(() => {
    if (pendingClose && !isSubmitting) {
      setOpen(false);
      setSelected(null);
      setPendingClose(false);
    }
  }, [pendingClose, isSubmitting]);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSelected(null);
      }}
    >
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-full overflow-y-auto p-6"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="font-heading flex items-center gap-2">
            {selected && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1 rounded-md hover:bg-muted text-subtle-foreground"
                aria-label="Back to gallery"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {selected ? "Customize Template" : "Choose a Template"}
          </SheetTitle>
        </SheetHeader>

        {selected ? (
          <TemplateVariableForm
            template={selected}
            isSubmitting={isSubmitting}
            submitLabel="Generate Image"
            onCancel={() => setSelected(null)}
            onSubmit={async (values) => {
              setPendingClose(true);
              await onGenerate(selected.id, values);
            }}
          />
        ) : (
          <TemplateGallery
            tierId={tierId}
            onSelect={setSelected}
            onUpgradeRequired={onUpgradeRequired}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// Re-export Button so consumers don't need a second import in trivial cases
export { Button as TemplatePickerTriggerButton };
