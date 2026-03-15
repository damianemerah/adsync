"use client";

import { useState, useEffect, useRef } from "react";
import { useCampaignStore } from "@/stores/campaign-store";
import { useAdAccounts } from "@/hooks/use-ad-account";
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
import { FormField } from "@/types/lead-form-builder";
import { FieldPalette } from "./lead-form/field-palette";
import { SortableFieldRow } from "./lead-form/sortable-field-row";
import { LeadFormPreviewPanel } from "./lead-form/lead-form-preview-panel";
import { FormMetadataPanel } from "./lead-form/form-metadata-panel";
import {
  getLeadFormDefaults,
  aiSuggestionToFormFields,
} from "@/lib/lead-form-defaults";

const DEFAULT_FIELDS: FormField[] = [
  { id: nanoid(), type: "FULL_NAME" },
  { id: nanoid(), type: "EMAIL" },
];

type ViewMode = "select" | "ai" | "create";

export function LeadFormStep() {
  const {
    leadGenFormId,
    updateDraft,
    suggestedLeadForm,
    campaignName,
  } = useCampaignStore();
  const { data: accounts } = useAdAccounts();
  const { organization } = useOrganization();

  // Bug 1 & 2 fix: auto-select the default (or first) account using the correct field name
  const defaultAccount = accounts?.find((a) => a.isDefault) ?? accounts?.[0];
  const adAccountId = defaultAccount?.accountId;

  const [pages, setPages] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const pageSelectionInitialized = useRef(false);
  const [forms, setForms] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<ViewMode>("select");

  // Builder state
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS);
  const [formName, setFormName] = useState("");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState(
    "Thanks, we'll be in touch soon!",
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Bug 3 fix: fetch Facebook Pages first, then load forms for the selected page
  useEffect(() => {
    if (!adAccountId) return;
    let cancelled = false;

    async function loadPagesAndForms() {
      setIsLoading(true);
      const pagesRes = await fetchMetaPages(adAccountId!);
      if (cancelled) return;

      if (!pagesRes.success || !pagesRes.pages.length) {
        setIsLoading(false);
        return;
      }

      setPages(pagesRes.pages);
      const pageId = pagesRes.pages[0].id;
      setSelectedPageId(pageId);
      updateDraft({ pageId });

      const formsRes = await fetchLeadGenForms(adAccountId!, pageId);
      if (cancelled) return;

      if (formsRes.success && formsRes.forms) {
        setForms(formsRes.forms);
      } else {
        toast.error("Failed to load existing forms from Meta");
      }
      setIsLoading(false);
    }

    loadPagesAndForms();
    return () => { cancelled = true; };
  }, [adAccountId]);

  // Reload forms when user manually switches page (skip the initial auto-selection)
  useEffect(() => {
    if (!adAccountId || !selectedPageId) return;
    if (!pageSelectionInitialized.current) {
      pageSelectionInitialized.current = true;
      return;
    }
    let cancelled = false;

    async function reloadForms() {
      setIsLoading(true);
      const res = await fetchLeadGenForms(adAccountId!, selectedPageId);
      if (cancelled) return;
      if (res.success && res.forms) {
        setForms(res.forms);
      } else {
        toast.error("Failed to load existing forms from Meta");
      }
      setIsLoading(false);
    }

    reloadForms();
    return () => { cancelled = true; };
  }, [selectedPageId]);

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

  const handleCreateNewForm = async () => {
    if (!formName || !privacyPolicyUrl) {
      toast.error("Please provide a form name and privacy policy URL");
      return;
    }
    if (!adAccountId || !selectedPageId) {
      toast.error("Missing ad account or page selection");
      return;
    }

    setIsCreating(true);

    const res = await createLeadForm(adAccountId, selectedPageId, {
      name: formName,
      privacyPolicyUrl,
      thankYouMessage,
      questions: fields,
    });

    if (res.success && res.formId) {
      toast.success("Lead Form Created!");
      setForms((prev) => [...prev, { id: res.formId!, name: formName }]);
      updateDraft({ leadGenFormId: res.formId });
      setView("select");
      setFormName("");
      setPrivacyPolicyUrl("");
      setFields([
        { id: nanoid(), type: "FULL_NAME" },
        { id: nanoid(), type: "EMAIL" },
      ]);
    } else {
      toast.error(
        res.error ||
          "Failed to create form. Ensure your Page has accepted Meta's Lead Ads TOS.",
      );
    }
    setIsCreating(false);
  };

  // AI Generate: populate builder from local defaults or store's AI suggestion
  const handleAIGenerate = () => {
    if (suggestedLeadForm) {
      // Use AI suggestion from strategy result
      const result = aiSuggestionToFormFields(suggestedLeadForm);
      setFields(result.fields);
      setThankYouMessage(result.thankYouMessage);
    } else {
      // Use local industry-based defaults
      const defaults = getLeadFormDefaults(organization?.industry);
      setFields(defaults.fields);
      setThankYouMessage(defaults.thankYouMessage);
    }
    // Auto-generate form name from campaign name
    const baseName = campaignName || organization?.name || "Lead Form";
    setFormName(`${baseName} - Lead Form`);
  };

  const handleCustomizeFromAI = () => {
    // Fields are already populated, just switch to create view
    setView("create");
  };

  const canSave =
    !isCreating && !!formName && !!privacyPolicyUrl && fields.length > 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4">
      {/* Page Header */}
      <div className="text-center space-y-2 mb-8 mt-12">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-2">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-foreground">
          Lead Generation Form
        </h1>
        <p className="text-subtle-foreground max-w-lg mx-auto">
          Choose an existing form, let AI suggest one, or build your own to
          capture leads directly on Meta.
        </p>
      </div>

      {/* Toggle Header — 3 options */}
      <div className="flex bg-muted p-1 rounded-xl mb-8 relative z-10 w-full max-w-md mx-auto">
        <button
          onClick={() => setView("select")}
          className={cn(
            "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
            view === "select"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Select Existing
        </button>
        <button
          onClick={() => {
            setView("ai");
            handleAIGenerate();
          }}
          className={cn(
            "flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
            view === "ai"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparks className="h-3.5 w-3.5" />
          AI Generate
        </button>
        <button
          onClick={() => setView("create")}
          className={cn(
            "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
            view === "create"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Build Manually
        </button>
      </div>

      {/* Select Existing */}
      {view === "select" && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm space-y-6 animate-in slide-in-from-left-4 fade-in">
            {pages.length > 1 && (
              <div className="space-y-2">
                <Label className="text-sm font-bold text-foreground">
                  Facebook Page
                </Label>
                <Select
                  value={selectedPageId}
                  onValueChange={(val) => {
                    setSelectedPageId(val);
                    updateDraft({ pageId: val });
                  }}
                >
                  <SelectTrigger className="h-12 bg-muted/50 border-border font-medium rounded-xl">
                    <SelectValue placeholder="Select a page..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border">
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
                <div className="h-12 border border-border bg-muted/50 rounded-xl flex items-center px-4 gap-3 text-subtle-foreground">
                  <SystemRestart className="w-5 h-5 animate-spin" /> Loading
                  your forms...
                </div>
              ) : forms.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-border rounded-xl text-center">
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
                  <SelectTrigger className="h-14 bg-muted/50 border-border font-medium text-base rounded-xl focus:ring-primary/20">
                    <SelectValue placeholder="Choose a form..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border">
                    {forms.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="py-3">
                        {f.name}{" "}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({f.id})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex gap-3">
              <div className="mt-0.5">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <div className="text-sm">
                <p className="font-bold text-foreground">What happens next?</p>
                <p className="text-subtle-foreground">
                  When users click your ad, this form will pop up natively
                  inside Facebook/Instagram pre-filled with their information,
                  making it extremely easy for them to become a lead.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate */}
      {view === "ai" && (
        <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 fade-in">
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparks className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">AI-Suggested Form</h2>
                <p className="text-xs text-subtle-foreground">
                  {suggestedLeadForm
                    ? "Based on your campaign strategy"
                    : `Based on your industry: ${organization?.industry || "General"}`}
                </p>
              </div>
            </div>

            {/* Preview of suggested fields */}
            <div className="space-y-2">
              <p className="text-sm font-bold uppercase tracking-wider text-foreground">
                Suggested Fields ({fields.length})
              </p>
              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-xl"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-6 text-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {field.label ||
                          field.type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </p>
                      {field.choices && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Options: {field.choices.join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                      {field.type === "CUSTOM" || field.type === "USER_CHOICE"
                        ? field.type.replace("_", " ")
                        : "Standard"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Thank You Message Preview */}
            <div className="p-4 bg-muted/30 border border-border rounded-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Thank You Message
              </p>
              <p className="text-sm text-foreground">{thankYouMessage}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleCustomizeFromAI}
                variant="outline"
                className="flex-1 h-12 rounded-2xl font-bold"
              >
                Customize Fields
              </Button>
              <Button
                onClick={() => {
                  // Re-generate with fresh IDs
                  handleAIGenerate();
                  toast.success("Regenerated form suggestion");
                }}
                variant="ghost"
                className="h-12 rounded-2xl font-medium"
              >
                <SystemRestart className="w-4 h-4 mr-2" /> Regenerate
              </Button>
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex gap-3">
              <div className="mt-0.5">
                <Sparks className="w-5 h-5 text-primary" />
              </div>
              <div className="text-sm">
                <p className="font-bold text-foreground">This is a draft</p>
                <p className="text-subtle-foreground">
                  Click &quot;Customize Fields&quot; to edit, reorder, or add
                  more fields. Then save the form to Meta from the builder.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Form (Manual or from AI customization) */}
      {view === "create" && (
        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-[calc(100vh-20rem)] animate-in slide-in-from-right-4 fade-in"
        >
          {/* Left Panel */}
          <ResizablePanel defaultSize={75} minSize={60} maxSize={90}>
            <div className="space-y-6 pr-6">
              {/* Form Details */}
              <FormMetadataPanel
                formName={formName}
                privacyPolicyUrl={privacyPolicyUrl}
                thankYouMessage={thankYouMessage}
                onFormNameChange={setFormName}
                onPrivacyPolicyUrlChange={setPrivacyPolicyUrl}
                onThankYouMessageChange={setThankYouMessage}
              />

              {/* Field Palette */}
              <div className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-4">
                <p className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Add Fields
                </p>
                <FieldPalette fields={fields} onAdd={handleAddField} />
              </div>

              {/* Sortable Field List */}
              <div className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-3">
                <p className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Form Fields{" "}
                  <span className="text-xs font-normal text-muted-foreground normal-case">
                    — drag to reorder
                  </span>
                </p>

                {fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed border-border rounded-xl">
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
                className="w-full h-14 rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
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
      )}
    </div>
  );
}
