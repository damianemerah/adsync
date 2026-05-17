"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Sparks,
  NavArrowRight,
  SystemRestart,
  Check,
  MagicWand,
} from "iconoir-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { TemplateVariableForm } from "@/components/creatives/template-variable-form";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { useSubscription, useCreditBalance } from "@/hooks/use-subscription";
import { useCreativeTemplates } from "@/hooks/use-creative-templates";
import { generateAdCreative, autoSaveCreative } from "@/actions/ai-images";
import { CREDIT_COSTS, type TierId } from "@/lib/constants";

interface ImageCreatorClientProps {
  templateId: string | null;
}

export function ImageCreatorClient({ templateId }: ImageCreatorClientProps) {
  const router = useRouter();
  const { data: subscription } = useSubscription();
  const { balance } = useCreditBalance();
  const tierId = (subscription?.org?.tier as TierId | undefined) ?? "starter";
  const { data: templates, isLoading: loadingTemplates } = useCreativeTemplates();

  const template = templates?.find((t) => t.id === templateId) ?? null;

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [savedCreativeId, setSavedCreativeId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const handleGenerate = async (values: Record<string, string>) => {
    if (!template) return;
    if (balance < CREDIT_COSTS.IMAGE_GEN_PRO) {
      toast.error(
        `Not enough credits. You need ${CREDIT_COSTS.IMAGE_GEN_PRO} credits to generate an image.`,
      );
      setUpgradeOpen(true);
      return;
    }

    setIsGenerating(true);
    const toastId = "img-creator-gen";
    toast.loading("Generating from template…", { id: toastId });

    try {
      const result = await generateAdCreative({
        prompt: template.id,
        mode: "template",
        templateValues: values,
        aspectRatio: "1:1",
        creativeFormat: "social_ad",
      });

      if (!result?.imageUrl) throw new Error("No image returned");

      const finalRatio = result.resolvedAspectRatio ?? "1:1";
      toast.loading("Saving creative…", { id: toastId });

      const saved = await autoSaveCreative({
        falUrl: result.imageUrl,
        prompt: result.usedPrompt ?? "",
        aspectRatio: finalRatio,
        templateId: template.id,
        templateValues: values,
      });

      setGeneratedUrl(saved.publicUrl);
      setSavedCreativeId(saved.creativeId);
      toast.success("Creative ready!", { id: toastId });
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "Generation failed. Please try again.";
      toast.error(msg, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <PageHeader title="Create Image" showCredits />

      <main className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-subtle-foreground mb-6">
          <Link
            href="/ai-creative"
            className="hover:text-foreground transition-colors"
          >
            AI Creative
          </Link>
          <NavArrowRight className="h-3.5 w-3.5 shrink-0" />
          <Link
            href="/ai-creative/templates"
            className="hover:text-foreground transition-colors"
          >
            Templates
          </Link>
          {template && (
            <>
              <NavArrowRight className="h-3.5 w-3.5 shrink-0" />
              <span className="text-foreground font-medium truncate">
                {template.title}
              </span>
            </>
          )}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* ── Left: controls ─────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Template selector widget */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
              <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                {template?.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={template.thumbnail_url}
                    alt={template.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Sparks className="h-6 w-6 text-subtle-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">
                  {loadingTemplates
                    ? "Loading…"
                    : template?.title ?? "No template selected"}
                </p>
                <p className="text-xs text-subtle-foreground truncate mt-0.5">
                  {template?.description ?? "Go back to browse templates"}
                </p>
              </div>
              <Link href="/ai-creative/templates">
                <Button variant="outline" size="sm" className="shrink-0">
                  Change
                </Button>
              </Link>
            </div>

            {/* Variable form or empty state */}
            {!loadingTemplates && template ? (
              <TemplateVariableForm
                template={template}
                isSubmitting={isGenerating}
                submitLabel={`Generate (${CREDIT_COSTS.IMAGE_GEN_PRO} credits)`}
                onCancel={() => router.push("/ai-creative/templates")}
                onSubmit={handleGenerate}
              />
            ) : !loadingTemplates ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center border border-dashed border-border rounded-xl">
                <div className="h-14 w-14 rounded-xl bg-ai/10 flex items-center justify-center">
                  <MagicWand className="h-7 w-7 text-ai" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    No template selected
                  </p>
                  <p className="text-sm text-subtle-foreground mt-1">
                    Choose a template to get started
                  </p>
                </div>
                <Button asChild>
                  <Link href="/ai-creative/templates">Browse Templates</Link>
                </Button>
              </div>
            ) : null}
          </div>

          {/* ── Right: preview ─────────────────────────────────────── */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            <div className="aspect-square rounded-xl border border-border bg-muted/30 flex items-center justify-center relative overflow-hidden">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3 text-subtle-foreground">
                  <SystemRestart className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium text-foreground">
                    AI is generating…
                  </p>
                  <p className="text-xs text-subtle-foreground">
                    This takes about 10–20 seconds
                  </p>
                </div>
              ) : generatedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={generatedUrl}
                  alt="Generated creative"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-subtle-foreground px-8 text-center">
                  <div className="h-16 w-16 rounded-xl bg-ai/10 flex items-center justify-center">
                    <Sparks className="h-8 w-8 text-ai" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Ready to Create
                    </p>
                    <p className="text-xs text-subtle-foreground mt-1">
                      Fill in the details on the left and click Generate
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Post-generation actions */}
            {generatedUrl && savedCreativeId && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    router.push(`/ai-creative/studio/${savedCreativeId}`)
                  }
                >
                  Edit in Studio
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() =>
                    router.push(
                      `/ai-creative/library?highlight=${savedCreativeId}`,
                    )
                  }
                >
                  <Check className="h-4 w-4" />
                  Open in Library
                </Button>
              </div>
            )}

            {/* Regenerate button */}
            {generatedUrl && template && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-subtle-foreground hover:text-foreground"
                onClick={() => {
                  setGeneratedUrl(null);
                  setSavedCreativeId(null);
                }}
              >
                <SystemRestart className="h-3.5 w-3.5 mr-1.5" />
                Generate another variation
              </Button>
            )}
          </div>
        </div>
      </main>

      <PaymentDialog
        planId="growth"
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
      />
    </>
  );
}
