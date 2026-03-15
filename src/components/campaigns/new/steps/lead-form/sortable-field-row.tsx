"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandGesture, Xmark } from "iconoir-react";
import { Badge } from "@/components/ui/badge";
import { FieldEditorPopover } from "./field-editor-popover";
import {
  FormField,
  STANDARD_FIELD_LABELS,
  MetaStandardFieldType,
  META_STANDARD_FIELDS,
} from "@/types/lead-form-builder";
import { cn } from "@/lib/utils";

interface SortableFieldRowProps {
  field: FormField;
  onRemove: () => void;
  onUpdate: (updated: Partial<FormField>) => void;
}

function getFieldLabel(field: FormField): string {
  if (META_STANDARD_FIELDS.includes(field.type as MetaStandardFieldType)) {
    return STANDARD_FIELD_LABELS[field.type as MetaStandardFieldType];
  }
  if (field.label) return field.label;
  return field.type === "USER_CHOICE"
    ? "Untitled Dropdown"
    : "Untitled Question";
}

export function SortableFieldRow({
  field,
  onRemove,
  onUpdate,
}: SortableFieldRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isStandard = META_STANDARD_FIELDS.includes(
    field.type as MetaStandardFieldType,
  );
  const isCustom = field.type === "CUSTOM" || field.type === "USER_CHOICE";
  const label = getFieldLabel(field);
  const isUntitled = !field.label && isCustom;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-background transition-shadow",
        isDragging && "shadow-lg opacity-80 z-50",
      )}
    >
      {/* Drag Handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
        {...attributes}
        {...listeners}
      >
        <DragHandGesture className="h-4 w-4" />
      </button>

      {/* Label */}
      <span
        className={cn(
          "flex-1 text-sm font-medium truncate",
          isUntitled ? "text-muted-foreground italic" : "text-foreground",
        )}
      >
        {label}
      </span>

      {/* Badge */}
      {isStandard && (
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20 shrink-0"
        >
          standard
        </Badge>
      )}
      {field.type === "USER_CHOICE" && (
        <Badge
          variant="secondary"
          className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground shrink-0"
        >
          dropdown
        </Badge>
      )}

      {/* Edit (custom only) */}
      {isCustom && <FieldEditorPopover field={field} onUpdate={onUpdate} />}

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        title="Remove field"
      >
        <Xmark className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
