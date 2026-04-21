"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCampaignStore } from "@/stores/campaign-store";
import { useAdAccountsList } from "@/hooks/use-ad-account";
import { useOrganization } from "@/hooks/use-organization";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Plus, SystemRestart, Check, Sparks } from "iconoir-react";
import {
  fetchLeadGenForms,
  fetchMetaPages,
  createLeadForm,
} from "@/actions/lead-forms";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
} from "@dnd-kit/sortable";
import { nanoid } from "nanoid";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Phone } from "iconoir-react";
import { FormField } from "@/types/lead-form-builder";
import { FieldPalette } from "./lead-form/field-palette";
import { SortableFieldRow } from "./lead-form/sortable-field-row";
import { LeadFormPreviewPanel } from "./lead-form/lead-form-preview-panel";
import { FormMetadataPanel } from "./lead-form/form-metadata-panel";
import {
  getLeadFormDefaults,
  aiSuggestionToFormFields,
} from "@/lib/lead-form-defaults";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const leadFormSchema = z.object({
  formName: z.string().min(1, "Form name is required"),
  privacyPolicyUrl: z.string().url("Must be a valid URL (e.g. https://…)"),
  thankYouMessage: z.string().min(1, "Thank you message is required"),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

const DEFAULT_FIELDS: FormField[] = [
  { id: nanoid(), type: "FULL_NAME" },
  { id: nanoid(), type: "EMAIL" },
];

type ViewMode = "select" | "create";

export function LeadFormStep() {
  const { leadGenFormId, updateDraft, suggestedLeadForm, campaignName } =
    useCampaignStore();
  const queryClient = useQueryClient();
  const { data: accounts } = useAdAccountsList();
  const { organization } = useOrganization();

  const defaultAccount = accounts?.find((a) => a.isDefault) ?? accounts?.[0];
  const adAccountId = defaultAccount?.accountId;

  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [view, setView] = useState<ViewMode>("select");
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS);
  const [hasAppliedAISuggestion, setHasAppliedAISuggestion] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const {
    register,
    setValue,
    watch,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      formName: "",
      privacyPolicyUrl: "",
      thankYouMessage: "Thanks, we'll be in touch soon!",
    },
  });

  const thankYouMessage = watch("thankYouMessage");
  const formName = watch("formName");
  const privacyPolicyUrl = watch("privacyPolicyUrl");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // ─── Fetch Facebook Pages ────────────────────────────────────────────────────
  const { data: pagesData, isLoading: isPagesLoading } = useQuery({
    queryKey: ["meta", "pages", adAccountId],
    queryFn: async () => {
      const res = await fetchMetaPages(adAccountId!);
      if (!res.success) throw new Error("Failed to load Facebook Pages");
      return res.pages;
    },
    enabled: !!adAccountId,
    staleTime: 5 * 60 * 1000,
    meta: {
      onSuccess: (pages: Array<{ id: string; name: string }>) => {
        if (pages.length > 0 && !selectedPageId) {
          setSelectedPageId(pages[0].id);
          updateDraft({ pageId: pages[0].id });
        }
      },
    },
  });

  const pages = pagesData ?? [];

  // Auto-select first page
  const firstPageId = pages[0]?.id;
  const effectivePageId = selectedPageId || firstPageId || "";

  // ─── Fetch Lead Gen Forms ────────────────────────────────────────────────────
  const { data: formsData, isLoading: isFormsLoading } = useQuery({
    queryKey: ["meta", "lead-forms", adAccountId, effectivePageId],
    queryFn: async () => {
      const res = await fetchLeadGenForms(adAccountId!, effectivePageId);
      if (!res.success) {
        toast.error("Failed to load existing forms from Meta");
        return [];
      }
      return res.forms ?? [];
    },
    enabled: !!adAccountId && !!effectivePageId,
    staleTime: 2 * 60 * 1000,
  });

  const forms = formsData ?? [];
  const isLoading = isPagesLoading || isFormsLoading;

  // ─── Create Form Mutation ────────────────────────────────────────────────────
  const createFormMutation = useMutation({
    mutationFn: async (values: LeadFormValues) => {
      if (!adAccountId || !effectivePageId) {
        throw new Error("Missing ad account or page selection");
      }
      const res = await createLeadForm(adAccountId, effectivePageId, {
        name: values.formName,
        privacyPolicyUrl: values.privacyPolicyUrl,
        thankYouMessage: values.thankYouMessage,
        questions: fields,
      });
      if (!res.success || !res.formId) {
        throw new Error(
          res.error ||
            "Failed to create form. Ensure your Page has accepted Meta's Lead Ads TOS.",
        );
      }
      return res.formId;
    },
    onSuccess: (formId) => {
      toast.success("Lead Form Created!");
      updateDraft({ leadGenFormId: formId });
      // Invalidate so forms list refreshes
      queryClient.invalidateQueries({
        queryKey: ["meta", "lead-forms", adAccountId, effectivePageId],
      });
      setView("select");
      reset();
      setFields(DEFAULT_FIELDS);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFields((prev) => {
      const oldIndex = prev.findIndex((f) => f.id === active.id);
      const newIndex = prev.findIndex((f) => f.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleAddField = (field: FormField) => {
    setFields((prev) => [...prev, field]);
  };

  const handleRemoveField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpdateField = (id: string, updated: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updated } : f)),
    );
  };

  const handleCreateNewForm = handleSubmit((values) => {
    createFormMutation.mutate(values);
  });

  const isCreating = createFormMutation.isPending;

  // AI Generate: populate builder from local defaults or store's AI suggestion
  const handleAIGenerate = () => {
    if (suggestedLeadForm) {
      const result = aiSuggestionToFormFields(suggestedLeadForm);
      setFields(result.fields);
      setValue("thankYouMessage", result.thankYouMessage);
    } else {
      const defaults = getLeadFormDefaults(organization?.industry);
      setFields(defaults.fields);
      setValue("thankYouMessage", defaults.thankYouMessage);
    }
    const baseName = campaignName || organization?.name || "Lead Form";
    setValue("formName", `${baseName} - Lead Form`);
    setHasAppliedAISuggestion(true);
  };

  // Question validation helpers
  const fieldCount = fields.length;
  const hasMinimumFields = fieldCount >= 2;
  const isOptimalRange = fieldCount >= 3 && fieldCount <= 5;
  const isAcceptableRange = fieldCount >= 6 && fieldCount <= 8;
  const hasTooManyFields = fieldCount > 8;

  const getFieldCountColor = () => {
    if (fieldCount < 2) return "text-destructive";
    if (isOptimalRange) return "text-status-success";
    if (isAcceptableRange) return "text-status-warning";
    if (hasTooManyFields) return "text-status-danger";
    return "text-foreground";
  };

  const getFieldCountMessage = () => {
    if (fieldCount < 2) return "Add at least 2 fields to create a valid form";
    if (isOptimalRange)
      return "Optimal number of questions for high conversion";
    if (isAcceptableRange) return "Good balance between quality and conversion";
    if (hasTooManyFields)
      return "Many questions may reduce conversions but improve lead quality";
    return "";
  };

  const canSave = !isCreating && hasMinimumFields;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4">
      {/* Page Header */}
      <div className="text-center space-y-2 mb-8 mt-12">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-2">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-heading text-foreground">
          Lead Generation Form
        </h1>
        <p className="text-subtle-foreground max-w-lg mx-auto">
          Choose an existing form, let AI suggest one, or build your own to
          capture leads directly on Meta.
        </p>
      </div>

      {/* Toggle Header — 2 tabs */}
      <div className="flex bg-muted p-1 rounded-md mb-8 relative z-10 w-full max-w-sm mx-auto">
        <button
          onClick={() => setView("select")}
          className={cn(
            "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all",
            view === "select"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Select Existing
        </button>
        <button
          onClick={() => setView("create")}
          className={cn(
            "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all",
            view === "create"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Create New Form
        </button>
      </div>

      {/* Select Existing */}
      {view === "select" && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-card border border-border rounded-lg p-6 md:p-8 shadow-sm space-y-6 animate-in slide-in-from-left-4 fade-in">
            {pages.length > 1 && (
              <div className="space-y-2">
                <Label className="text-sm font-bold text-foreground">
                  Facebook Page
                </Label>
                <Select
                  value={effectivePageId}
                  onValueChange={(val) => {
                    setSelectedPageId(val);
                    updateDraft({ pageId: val });
                  }}
                >
                  <SelectTrigger className="h-12 bg-muted/50 border-border font-medium rounded-md">
                    <SelectValue placeholder="Select a page..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-md border-border">
                    {pages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-3">
              <Label className="text-sm font-bold text-foreground">
                Select a Meta Instant Form
              </Label>
              {isLoading ? (
                <div className="h-12 border border-border bg-muted/50 rounded-md flex items-center px-4 gap-3 text-subtle-foreground">
                  <SystemRestart className="w-5 h-5 animate-spin" /> Loading
                  your forms...
                </div>
              ) : forms.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-border rounded-md text-center">
                  <p className="text-subtle-foreground mb-4">
                    No lead forms found on this Facebook Page.
                  </p>
                  <Button variant="outline" onClick={() => setView("create")}>
                    <Plus className="w-4 h-4 mr-2" /> Create Your First Form
                  </Button>
                </div>
              ) : (
                <Select
                  value={leadGenFormId || ""}
                  onValueChange={(val) => updateDraft({ leadGenFormId: val })}
                >
                  <SelectTrigger className="h-14 bg-muted/50 border-border font-medium text-base rounded-md focus:ring-primary/20">
                    <SelectValue placeholder="Choose a form..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-md border-border">
                    {forms.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="py-3">
                        {f.name}{" "}
                        <span className="text-xs text-subtle-foreground ml-2">
                          ({f.id})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-md flex gap-3">
              <div className="mt-0.5">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <div className="text-sm space-y-2">
                <p className="font-bold text-foreground">How Lead Ads Work</p>
                <ol className="text-subtle-foreground space-y-1 list-decimal list-inside">
                  <li>
                    Your <strong>ad creative</strong> (image/video + copy)
                    appears in the user's feed
                  </li>
                  <li>
                    When they click, this <strong>form opens instantly</strong>{" "}
                    inside Meta
                  </li>
                  <li>
                    Contact fields are <strong>pre-filled</strong> from their
                    profile
                  </li>
                  <li>They submit with one tap — no website visit needed</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Form */}
      {view === "create" && (
        <>
          {/* Mobile: floating Preview button */}
          <div className="lg:hidden fixed bottom-6 right-6 z-40">
            <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
              <SheetTrigger asChild>
                <Button
                  size="lg"
                  className="h-14 px-5 rounded-lg border border-border bg-primary text-primary-foreground font-bold gap-2"
                >
                  <Phone className="h-5 w-5" />
                  Preview
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="max-h-[85dvh] rounded-t-3xl overflow-y-auto"
              >
                <SheetHeader className="mb-4">
                  <SheetTitle className="font-heading flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" /> Form Preview
                  </SheetTitle>
                </SheetHeader>
                <LeadFormPreviewPanel
                  fields={fields}
                  thankYouMessage={thankYouMessage}
                />
              </SheetContent>
            </Sheet>
          </div>

          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-[calc(100vh-20rem)] animate-in slide-in-from-right-4 fade-in"
          >
            {/* Left Panel */}
            <ResizablePanel defaultSize={75} minSize={60} maxSize={90}>
              <div className="space-y-6 lg:pr-6">
              {/* AI Auto-Generate Banner */}
              {!hasAppliedAISuggestion && (
                <button
                  onClick={handleAIGenerate}
                  className="w-full p-5 rounded-lg bg-linear-to-r from-primary/10 via-primary/5 to-transparent border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Sparks className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-base">
                        ✨ Auto-Generate for{" "}
                        {organization?.industry || "your business"}
                      </p>
                      <p className="text-sm text-subtle-foreground">
                        {suggestedLeadForm
                          ? "Use AI-suggested fields from your campaign strategy"
                          : `We'll pick the best fields for ${organization?.industry || "your industry"} — 3-4 questions, high conversion.`}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* AI Applied Badge */}
              {hasAppliedAISuggestion && (
                <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Sparks className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {suggestedLeadForm
                        ? "AI-generated from your campaign strategy"
                        : `AI-generated for ${organization?.industry || "your business"}`}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleAIGenerate();
                      toast.success("Regenerated form fields");
                    }}
                    className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    <SystemRestart className="w-3 h-3" /> Regenerate
                  </button>
                </div>
              )}

              {/* Form Details */}
              <FormMetadataPanel
                formName={formName}
                privacyPolicyUrl={privacyPolicyUrl}
                thankYouMessage={thankYouMessage}
                onFormNameChange={(v) => setValue("formName", v)}
                onPrivacyPolicyUrlChange={(v) =>
                  setValue("privacyPolicyUrl", v)
                }
                onThankYouMessageChange={(v) => setValue("thankYouMessage", v)}
              />
              {/* Zod validation errors */}
              {errors.formName && (
                <p className="text-xs text-destructive -mt-3">
                  {errors.formName.message}
                </p>
              )}
              {errors.privacyPolicyUrl && (
                <p className="text-xs text-destructive -mt-3">
                  {errors.privacyPolicyUrl.message}
                </p>
              )}

              {/* Best Practices Info */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-md">
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <Check className="w-5 h-5 text-primary shrink-0" />
                  </div>
                  <div className="text-xs space-y-1.5">
                    <p className="font-bold text-foreground">
                      Best Practices for High-Converting Forms
                    </p>
                    <ul className="text-subtle-foreground space-y-1 list-disc list-inside">
                      <li>
                        <strong>Group contact fields first</strong> (Name,
                        Email, Phone) so Meta can auto-fill them
                      </li>
                      <li>
                        <strong>Keep it short</strong> — 3-5 questions is
                        optimal for conversions
                      </li>
                      <li>
                        <strong>More questions = better quality</strong>, but
                        fewer leads
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Field Palette */}
              <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
                <p className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Add Fields
                </p>
                <FieldPalette fields={fields} onAdd={handleAddField} />
              </div>

              {/* Sortable Field List */}
              <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Form Fields{" "}
                    <span className="text-xs font-normal text-subtle-foreground normal-case">
                      — drag to reorder
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("text-sm font-bold", getFieldCountColor())}
                    >
                      {fieldCount} {fieldCount === 1 ? "field" : "fields"}
                    </span>
                  </div>
                </div>
                {getFieldCountMessage() && (
                  <div
                    className={cn(
                      "p-3 rounded-md text-xs flex items-center gap-2",
                      fieldCount < 2 &&
                        "bg-destructive/10 border border-destructive/20 text-destructive",
                      isOptimalRange &&
                        "bg-status-success-soft border border-status-success/30 text-status-success",
                      isAcceptableRange &&
                        "bg-status-warning-soft border border-status-warning/30 text-status-warning",
                      hasTooManyFields &&
                        "bg-status-danger-soft border border-status-danger/30 text-status-danger",
                    )}
                  >
                    <span className="font-medium">
                      {getFieldCountMessage()}
                    </span>
                  </div>
                )}

                {fields.length === 0 ? (
                  <p className="text-sm text-subtle-foreground text-center py-6 border-2 border-dashed border-border rounded-md">
                    No fields yet. Add some above.
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={fields.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {fields.map((field) => (
                          <SortableFieldRow
                            key={field.id}
                            field={field}
                            onRemove={() => handleRemoveField(field.id)}
                            onUpdate={(updated) =>
                              handleUpdateField(field.id, updated)
                            }
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Save Button */}
              <Button
                className="w-full h-14 rounded-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                onClick={handleCreateNewForm}
                disabled={!canSave}
              >
                {isCreating ? (
                  <>
                    <SystemRestart className="w-5 h-5 mr-2 animate-spin" />{" "}
                    Creating Form on Meta...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" /> Save &amp; Select Form
                  </>
                )}
              </Button>
            </div>
            </ResizablePanel>

            {/* Resize Handle */}
            <ResizableHandle className="hidden lg:flex w-[1.5px] bg-border hover:bg-accent data-[panel-group-direction=horizontal]:hover:w-1 transition-all data-[resize-handle-state=drag]:bg-primary/20 data-[resize-handle-state=hover]:bg-primary/10" />

            {/* Right Preview Panel */}
            <ResizablePanel
              defaultSize={25}
              minSize={10}
              maxSize={40}
              className="hidden lg:block"
            >
              <LeadFormPreviewPanel
                fields={fields}
                thankYouMessage={thankYouMessage}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </>
      )}
    </div>
  );
}
