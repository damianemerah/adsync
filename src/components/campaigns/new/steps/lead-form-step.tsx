import { useState, useEffect } from "react";
import { useCampaignStore } from "@/stores/campaign-store";
import { useAdAccounts } from "@/hooks/use-ad-account";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Plus, SystemRestart, Check } from "iconoir-react";
import { fetchLeadGenForms, createLeadForm } from "@/actions/lead-forms";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function LeadFormStep() {
  const { leadGenFormId, updateDraft, pageId, platformAccountId } =
    useCampaignStore();
  const { data: accounts } = useAdAccounts();

  // Find actual platform ID if platformAccountId is a db UUID
  const activeAccount = accounts?.find(
    (a: any) =>
      a.id === platformAccountId || a.platform_account_id === platformAccountId,
  );
  const adAccountId = (activeAccount as any)?.platform_account_id;

  const [forms, setForms] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<"select" | "create">("select");

  // New form state
  const [formName, setFormName] = useState("");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState(
    "Thanks, we'll be in touch soon!",
  );
  const [customQuestion, setCustomQuestion] = useState("");

  useEffect(() => {
    async function loadForms() {
      if (!adAccountId || !pageId) return;
      setIsLoading(true);
      const res = await fetchLeadGenForms(adAccountId, pageId);
      if (res.success && res.forms) {
        setForms(res.forms);
      } else {
        toast.error("Failed to load existing forms from Meta");
      }
      setIsLoading(false);
    }
    loadForms();
  }, [adAccountId, pageId]);

  const handleCreateNewForm = async () => {
    if (!formName || !privacyPolicyUrl) {
      toast.error("Please provide a form name and privacy policy URL");
      return;
    }
    if (!adAccountId || !pageId) {
      toast.error("Missing ad account or page selection");
      return;
    }

    setIsCreating(true);

    // We always request FULL_NAME and EMAIL by default. Add custom question if provided.
    const questions = [
      { type: "FULL_NAME" },
      { type: "EMAIL" },
      ...(customQuestion ? [{ type: "CUSTOM", label: customQuestion }] : []),
    ];

    const res = await createLeadForm(adAccountId, pageId, {
      name: formName,
      privacyPolicyUrl,
      thankYouMessage,
      questions,
    });

    if (res.success && res.formId) {
      toast.success("Lead Form Created!");
      // Add to list and select it
      setForms((prev) => [...prev, { id: res.formId!, name: formName }]);
      updateDraft({ leadGenFormId: res.formId });
      setView("select");
      // Reset builder
      setFormName("");
      setPrivacyPolicyUrl("");
      setCustomQuestion("");
    } else {
      toast.error(
        res.error ||
          "Failed to create form. Ensure your Page has accepted Meta's Lead Ads TOS.",
      );
    }
    setIsCreating(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20 mt-12">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-2">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-foreground">
          Lead Generation Form
        </h1>
        <p className="text-subtle-foreground max-w-lg mx-auto">
          Choose an existing form or create a new one to capture leads directly
          on Meta.
        </p>
      </div>

      <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm overflow-hidden relative">
        {/* Toggle Header */}
        <div className="flex bg-muted p-1 rounded-xl mb-8 relative z-10 w-full max-w-sm mx-auto">
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
            onClick={() => setView("create")}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
              view === "create"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Create New Form
          </button>
        </div>

        {view === "select" && (
          <div className="space-y-6 animate-in slide-in-from-left-4 fade-in">
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
        )}

        {view === "create" && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold">Form Name (Internal)</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Summer Promo Leads 2026"
                  className="h-12 bg-muted/50 border-border"
                />
              </div>

              <div className="space-y-2 relative">
                <Label className="font-bold">Privacy Policy URL</Label>
                <Input
                  value={privacyPolicyUrl}
                  onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                  placeholder="https://yourwebsite.com/privacy"
                  className="h-12 bg-muted/50 border-border"
                  type="url"
                />
                <p className="text-xs text-muted-foreground">
                  Required by Meta. Must link to a valid privacy policy on your
                  website.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-bold">Custom Question (Optional)</Label>
                <Input
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="e.g. What is your biggest challenge?"
                  className="h-12 bg-muted/50 border-border"
                />
                <p className="text-xs text-muted-foreground">
                  We always ask for Full Name and Email by default.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-bold">
                  Thank You Message (Optional)
                </Label>
                <Textarea
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  placeholder="Thanks, we'll be in touch!"
                  className="resize-none bg-muted/50 border-border"
                  rows={2}
                />
              </div>
            </div>

            <Button
              className="w-full h-14 rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              onClick={handleCreateNewForm}
              disabled={isCreating || !formName || !privacyPolicyUrl}
            >
              {isCreating ? (
                <>
                  <SystemRestart className="w-5 h-5 mr-2 animate-spin" />{" "}
                  Creating Form on Meta...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" /> Save & Select Form
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
