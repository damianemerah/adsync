"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Sparks,
  Xmark,
  EditPencil,
  Plus,
  Xmark as Close,
} from "iconoir-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { STANDARD_FIELD_LABELS } from "@/types/lead-form-builder";
import type { FormField } from "@/types/lead-form-builder";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { nanoid } from "nanoid";
import {
  aiSuggestionToFormFields,
  getLeadFormDefaults,
} from "@/lib/lead-form-defaults";
import { useOrganization } from "@/hooks/use-organization";
import { LeadFormStep } from "../lead-form-step";

function SortableFieldRow({
  field,
  onRemove,
}: {
  field: FormField;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getFieldLabel = () => {
    if (field.label) return field.label;
    if (field.type in STANDARD_FIELD_LABELS) {
      return STANDARD_FIELD_LABELS[
        field.type as keyof typeof STANDARD_FIELD_LABELS
      ];
    }
    return field.type.replace(/_/g, " ");
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-muted/50 border border-border rounded-lg group hover:bg-muted/70 transition-colors"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {getFieldLabel()}
        </p>
        {field.choices && field.choices.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">
            {field.choices.slice(0, 2).join(", ")}
            {field.choices.length > 2 && `, +${field.choices.length - 2}`}
          </p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 rounded-full p-1"
      >
        <Xmark className="h-3 w-3 text-destructive" />
      </button>
    </div>
  );
}

export function LeadFormPreviewCompact() {
  const { suggestedLeadForm, updateDraft, objective } = useCampaignStore();
  const { organization } = useOrganization();
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFields, setLocalFields] = useState<FormField[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  // Track whether we've seeded defaults so we don't overwrite user edits with defaults again,
  // but still allow AI suggestions to win whenever they arrive.
  const defaultsSeededRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Seed from AI suggestion whenever it arrives (or update if it changes).
  // Falls back to industry defaults only once, so subsequent renders don't reset user edits.
  useEffect(() => {
    if (suggestedLeadForm) {
      // AI suggestion takes priority — always apply it when it arrives or changes.
      const converted = aiSuggestionToFormFields(suggestedLeadForm);
      setLocalFields(converted.fields);
      defaultsSeededRef.current = true;
    } else if (!defaultsSeededRef.current) {
      // No AI suggestion yet — seed with industry defaults once.
      const defaults = getLeadFormDefaults(organization?.industry);
      setLocalFields(defaults.fields);
      updateDraft({
        suggestedLeadForm: {
          fields: defaults.fields.map((f) => ({
            type: f.type,
            ...(f.label ? { label: f.label } : {}),
            ...(f.choices ? { choices: f.choices } : {}),
          })),
          thankYouMessage: defaults.thankYouMessage,
        },
      });
      defaultsSeededRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedLeadForm]);

  // Only show for leads objective
  if (objective !== "leads") return null;

  // Sync localFields back to store whenever they change
  const handleFieldsChange = (newFields: FormField[]) => {
    setLocalFields(newFields);
    updateDraft({
      suggestedLeadForm: {
        fields: newFields.map((f) => ({
          type: f.type,
          ...(f.label ? { label: f.label } : {}),
          ...(f.choices ? { choices: f.choices } : {}),
        })),
        thankYouMessage:
          suggestedLeadForm?.thankYouMessage ||
          "Thanks for your interest! We'll be in touch soon.",
      },
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localFields.findIndex((f) => f.id === active.id);
    const newIndex = localFields.findIndex((f) => f.id === over.id);
    handleFieldsChange(arrayMove(localFields, oldIndex, newIndex));
  };

  const handleRemoveField = (id: string) => {
    handleFieldsChange(localFields.filter((f) => f.id !== id));
  };

  const handleAddField = (type: string) => {
    const newField: FormField = {
      id: nanoid(),
      type: type as FormField["type"],
    };
    handleFieldsChange([...localFields, newField]);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left group"
      >
        <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider flex items-center gap-2 cursor-pointer">
          <Mail className="h-3.5 w-3.5 text-pink-500" />
          Lead Form
          {localFields.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 bg-pink-500/10 text-pink-600 border-pink-200"
            >
              {localFields.length} fields
            </Badge>
          )}
        </label>
        <svg
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
          {/* AI Indicator */}
          {suggestedLeadForm && (
            <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
              <Sparks className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-subtle-foreground">
                AI-suggested based on your campaign
              </p>
            </div>
          )}

          {/* Sortable Fields */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localFields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localFields.map((field) => (
                  <SortableFieldRow
                    key={field.id}
                    field={field}
                    onRemove={() => handleRemoveField(field.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Quick Add Common Fields */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground w-full mb-1">
              Quick add:
            </p>
            {["PHONE", "EMAIL", "CITY"].map((type) => {
              const alreadyAdded = localFields.some((f) => f.type === type);
              if (alreadyAdded) return null;
              return (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddField(type)}
                  className="h-7 text-xs rounded-full"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {STANDARD_FIELD_LABELS[
                    type as keyof typeof STANDARD_FIELD_LABELS
                  ] || type}
                </Button>
              );
            })}
          </div>

          {/* Edit in Detail Button */}
          <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-9 text-xs rounded-xl font-medium border border-border hover:bg-muted/50"
              >
                <EditPencil className="h-3 w-3 mr-2" />
                Edit in Detail
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0 no-scrollbar">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-2xl font-heading">
                  Lead Form Editor
                </DialogTitle>
              </DialogHeader>
              <div className="p-6 pt-4">
                <LeadFormStep />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
