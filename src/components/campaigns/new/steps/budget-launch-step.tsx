"use client";

import { useState, useMemo, useEffect } from "react";
import { useCampaignStore } from "@/stores/campaign-store";
import { useCampaignMutations } from "@/hooks/use-campaigns";
import { useAdAccountsList, AdAccountUI } from "@/hooks/use-ad-account";
import { useOrgROI } from "@/hooks/use-org-roi";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  SystemRestart,
  ArrowRight,
  CheckCircle,
  Check,
  Coins,
  StatUp,
  WarningTriangle,
} from "iconoir-react";
import { AdSyncObjective } from "@/lib/constants";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { estimateBudget, predictROAS } from "@/lib/intelligence";
import {
  getObjectiveOutcomeLabel,
  getObjectiveOutcomeRange,
} from "@/lib/intelligence/estimator";
import { createLeadForm, fetchMetaPages } from "@/actions/lead-forms";
import { saveDraft } from "@/actions/drafts";
import { toast } from "sonner";
import { CheckItem } from "./budget/check-item";
import { UnresolvedTargetingWarning } from "./budget/unresolved-targeting-warning";
import { LaunchSuccessModal } from "./budget/launch-success-modal";

// ─── Outcome Tiers ────────────────────────────────────────────────────────────

// Tier amounts intentionally match the store's default (7000 = Grow)
// convLow/convHigh are now derived live from estimateBudget() per objective
type OutcomeTier = {
  key: string;
  label: string;
  sublabel: string;
  amount: number;
  color: string;
  activeColor: string;
  popular?: boolean;
};

const OUTCOME_TIERS: OutcomeTier[] = [
  {
    key: "test",
    label: "Test",
    sublabel: "Try it out",
    amount: 2500,
    color: "border-border",
    activeColor: "border-2 border-primary bg-primary/5",
  },
  {
    key: "grow",
    label: "Grow",
    sublabel: "Recommended",
    amount: 7000,
    color: "border-border",
    activeColor: "border-2 border-primary bg-primary/5",
    popular: true,
  },
  {
    key: "scale",
    label: "Scale",
    sublabel: "Maximum reach",
    amount: 15000,
    color: "border-border",
    activeColor: "border-2 border-primary bg-primary/5",
  },
];

export function BudgetLaunchStep({
  persistedDraftId,
  onDraftSaved,
}: {
  persistedDraftId: string | null;
  onDraftSaved: (id: string) => void;
}) {
  const router = useRouter();
  const {
    budget,
    campaignName,
    updateDraft,
    resetDraft,
    objective,
    platform,
    metaPlacement,
    adCopy,
    selectedCreatives,
    locations,
    targetInterests,
    targetBehaviors,
    ageRange,
    gender,
    targetLanguages,
    exclusionAudienceIds,
    targetLifeEvents,
    targetWorkPositions,
    targetIndustries,
    targetingMode,
    destinationValue,
    aiPrompt,
    leadGenFormId,
    suggestedLeadForm,
    carouselCards,
    pageId,
    instagramAccountId,
  } = useCampaignStore();

  const orgROI = useOrgROI();
  const { launchCampaign, isLaunching } = useCampaignMutations();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dbCampaignId, setDbCampaignId] = useState<string | null>(null);
  const [showPixelPrompt, setShowPixelPrompt] = useState(false);
  const [skipPixel, setSkipPixel] = useState(false);

  // Derive initial selected tier from store budget so phone mockup + this step always agree
  const [selectedTier, setSelectedTier] = useState<string | null>(
    () => OUTCOME_TIERS.find((t) => t.amount === budget)?.key ?? null,
  );

  // ─── Real health checks ──────────────────────────────────────────────────
  const { data: adAccounts, isLoading: isLoadingAccounts } = useAdAccountsList();

  const healthyAccounts = (adAccounts ?? []).filter((a: AdAccountUI) => a.status === "healthy");

  const hasHealthyAccount = !isLoadingAccounts && healthyAccounts.length > 0;

  const hasPaymentIssue =
    !isLoadingAccounts &&
    (adAccounts ?? []).some((a: AdAccountUI) => a.status === "payment_issue");

  // Selected ad account for this campaign (defaults to the marked default, then first healthy)
  const defaultAccount = adAccounts?.find((a: AdAccountUI) => a.isDefault) ?? adAccounts?.[0];
  const [selectedAdAccountId, setSelectedAdAccountId] = useState<string>(
    () => defaultAccount?.id ?? "",
  );
  // Sync once accounts load (handles the case where accounts load after mount)
  useEffect(() => {
    if (!selectedAdAccountId && defaultAccount?.id) {
      setSelectedAdAccountId(defaultAccount.id);
    }
  }, [defaultAccount?.id]);

  // ─── Facebook Pages + Instagram accounts ─────────────────────────────────
  const selectedAccount = adAccounts?.find((a: AdAccountUI) => a.id === selectedAdAccountId);
  const { data: pages } = useQuery({
    queryKey: ["meta", "pages", selectedAccount?.accountId],
    queryFn: async () => {
      const res = await fetchMetaPages(selectedAccount!.accountId);
      return res.success ? res.pages : [];
    },
    enabled: !!selectedAccount?.accountId && platform === "meta",
    staleTime: 5 * 60 * 1000,
  });

  // Auto-select first page when pages load and none is selected yet
  useEffect(() => {
    if (pages && pages.length > 0 && !pageId) {
      updateDraft({
        pageId: pages[0].id,
        instagramAccountId: pages[0].instagramAccountId ?? undefined,
      });
    }
  }, [pages]);

  // Mock check for if the org has a pixel configured
  const hasPixel = false;
  // Pixel is recommended but not strictly required for launch
  const isWebsiteObjective = objective === "traffic";
  const needsPixel = isWebsiteObjective && !hasPixel && !skipPixel;

  const missingWhatsappNumber = objective === "whatsapp" && !destinationValue?.trim();
  const canLaunch = !isLaunching && hasHealthyAccount && !missingWhatsappNumber;

  useEffect(() => {
    if (!budget || !campaignName) return;
    const t = setTimeout(async () => {
      try {
        const state = useCampaignStore.getState();
        const id = await saveDraft(state, persistedDraftId ?? undefined);
        if (id && id !== persistedDraftId) onDraftSaved(id);
      } catch {
        // Silent
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [budget, campaignName]);

  // If user loaded a draft with a custom budget, clear the tier highlight
  useEffect(() => {
    const match = OUTCOME_TIERS.find((t) => t.amount === budget);
    setSelectedTier(match?.key ?? null);
  }, []);

  // ─── Live Estimates ──────────────────────────────────────────────────────────

  const estimate = useMemo(
    () => estimateBudget(budget, objective as AdSyncObjective),
    [budget, objective],
  );

  // Per-tier live estimates — compute once for all 3 tiers
  const tierEstimates = useMemo(
    () =>
      Object.fromEntries(
        OUTCOME_TIERS.map((t) => [
          t.key,
          estimateBudget(t.amount, objective as AdSyncObjective),
        ]),
      ) as Record<string, ReturnType<typeof estimateBudget>>,
    [objective],
  );

  const roasPrediction = useMemo(
    () =>
      predictROAS({
        dailyBudgetNgn: budget,
        objective: objective as AdSyncObjective,
        interestCount: targetInterests.length,
        locationCount: locations.length,
        hasCustomAudience: exclusionAudienceIds.length > 0,
        creativeCount: selectedCreatives.length,
        hasPreviousCampaigns: orgROI.hasPreviousCampaigns,
        previousAvgROI: orgROI.avgROIPercent,
        ageRange: ageRange || { min: 18, max: 65 },
      }),
    [
      budget,
      objective,
      targetInterests.length,
      locations.length,
      exclusionAudienceIds.length,
      selectedCreatives.length,
      ageRange,
      orgROI.hasPreviousCampaigns,
      orgROI.avgROIPercent,
    ],
  );

  // ─── Helpers ──────────────────────────────────────────────────────────────


  // ─── Outcome metric label by objective ──────────────────────────────────────

  const outcomeLabel = getObjectiveOutcomeLabel(objective);

  const { low: outcomeLow, high: outcomeHigh } = getObjectiveOutcomeRange(
    estimate,
    objective,
  );
  const outcomeRange =
    objective === "whatsapp" || objective === "traffic"
      ? `${outcomeLow}–${outcomeHigh}`
      : `${outcomeLow.toLocaleString()}–${outcomeHigh.toLocaleString()}`;

  // ─── Tier select handler ─────────────────────────────────────────────────────

  const handleTierSelect = (tier: OutcomeTier) => {
    setSelectedTier(tier.key);
    updateDraft({ budget: tier.amount });
  };

  // ─── Launch handler ──────────────────────────────────────────────────────────

  const handleLaunch = async () => {
    // Auto-create lead form if needed (leads objective without explicit form ID)
    let finalLeadGenFormId = leadGenFormId;

    if (objective === "leads" && !leadGenFormId && suggestedLeadForm) {
      try {
        const selectedAccount = adAccounts?.find((a: AdAccountUI) => a.id === selectedAdAccountId) ?? adAccounts?.[0];
        const adAccountId = selectedAccount?.accountId;

        if (!adAccountId) {
          toast.error("No ad account found");
          return;
        }

        // Fetch page ID
        const pagesRes = await fetchMetaPages(adAccountId);
        if (!pagesRes.success || !pagesRes.pages.length) {
          toast.error("No Facebook Page found. Please connect a Page first.");
          return;
        }

        const pageId = pagesRes.pages[0].id;

        // Create the lead form
        const formName = `${campaignName || "Campaign"} - Lead Form`;
        const res = await createLeadForm(adAccountId, pageId, {
          name: formName,
          privacyPolicyUrl: "https://Tenzu.app/privacy", // Default privacy policy
          thankYouMessage: suggestedLeadForm.thankYouMessage,
          questions: suggestedLeadForm.fields.map((f) => ({
            id: crypto.randomUUID(),
            type: f.type as any,
            ...(f.label ? { label: f.label } : {}),
            ...(f.choices ? { choices: f.choices } : {}),
          })),
        });

        if (res.success && res.formId) {
          finalLeadGenFormId = res.formId;
          updateDraft({ leadGenFormId: res.formId });
          toast.success("Lead form created successfully");
        } else {
          toast.error(res.error || "Failed to create lead form");
          return;
        }
      } catch (error) {
        console.error("Error creating lead form:", error);
        toast.error("Failed to create lead form");
        return;
      }
    }

    const launchPayload = {
      name: campaignName || `New Campaign - ${new Date().toLocaleDateString()}`,
      objective: objective as AdSyncObjective,
      budget,
      platform: platform as "meta" | "tiktok",
      metaPlacement: platform === "meta" ? metaPlacement : undefined,
      adCopy: {
        primary: adCopy.primary,
        headline: adCopy.headline,
        cta: adCopy.cta,
      },
      creatives: selectedCreatives,
      targetLocations: locations,
      targetInterests,
      targetBehaviors: targetBehaviors || [],
      targetAgeRange: ageRange || { min: 18, max: 65 },
      targetGender: gender || "all",
      targetLanguages,
      exclusionAudienceIds,
      targetLifeEvents: targetLifeEvents || [],
      targetWorkPositions: targetWorkPositions || [],
      targetIndustries: targetIndustries || [],
      targetingMode: targetingMode ?? undefined,
      destinationValue,
      aiContext: {
        businessDescription: aiPrompt || "My Business",
        targeting: {
          interests: targetInterests.map((i) => i.name),
          behaviors: (targetBehaviors || []).map((b) => b.name),
          locations: locations.map((l) => l.name),
          demographics: {
            age_min: ageRange?.min || 18,
            age_max: ageRange?.max || 65,
            gender: gender || "all",
          },
        },
        copy: { headline: adCopy.headline, bodyCopy: adCopy.primary },
        platform: platform || "meta",
        objective: objective || "sales",
      },
      campaignId: persistedDraftId || undefined,
      adAccountId: selectedAdAccountId || undefined,
      pageId: pageId ?? pages?.[0]?.id,
      instagramAccountId: instagramAccountId ?? undefined,
      leadGenFormId: finalLeadGenFormId || undefined,
      // Include carousel data if present (2+ cards)
      ...(carouselCards && carouselCards.length >= 2 && { carouselCards }),
    };

    launchCampaign(launchPayload, {
      onSuccess: (result: { campaignId?: string; showPixelPrompt?: boolean } | undefined) => {
        if (result?.campaignId) {
          setDbCampaignId(result.campaignId);
          if (result.showPixelPrompt) setShowPixelPrompt(true);
          setShowSuccess(true);
        } else {
          resetDraft();
          router.push("/campaigns");
        }
      },
      onError: (err: Error) => {
        console.error("❌ [UI Launch Error]:", err);
        if (
          err.message.includes("subscription") ||
          err.message.includes("upgrade")
        ) {
          setIsPaymentOpen(true);
        }
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-2">
          <Coins className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-heading text-foreground">
          How many {outcomeLabel} do you want?
        </h1>
        <p className="text-subtle-foreground max-w-lg mx-auto">
          Pick your daily budget — we'll tell you exactly what to expect.
        </p>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="md:col-span-7 space-y-6">
          {/* ── Outcome-First Tier Picker ── */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider mb-2 block">
              How many {outcomeLabel} do you want?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {OUTCOME_TIERS.map((tier) => {
                const active = selectedTier === tier.key;
                const tEst = tierEstimates[tier.key];
                const range = tEst
                  ? getObjectiveOutcomeRange(tEst, objective)
                  : { low: 0, high: 0 };
                return (
                  <button
                    key={tier.key}
                    onClick={() => handleTierSelect(tier)}
                    className={cn(
                      "p-4 rounded-lg text-left transition-all relative group",
                      active
                        ? tier.activeColor
                        : `border ${tier.color} bg-card/50 hover:border-primary/50 hover:bg-card`,
                    )}
                  >
                    {tier.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Best
                      </span>
                    )}
                    <p className="text-xs font-bold text-subtle-foreground uppercase tracking-wider mb-1">
                      {tier.label}
                    </p>
                    <p className="text-sm font-black text-foreground">
                      ~{range.low.toLocaleString()}–
                      {range.high.toLocaleString()}
                    </p>
                    <p className="text-xs text-subtle-foreground mt-0.5">
                      {outcomeLabel}
                    </p>
                    <p className="text-xs font-bold text-primary mt-2">
                      ₦{tier.amount.toLocaleString()}/day
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Custom Budget Input ── */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
              Or enter a custom daily budget
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center w-8">
                <span className="text-foreground font-bold">₦</span>
              </div>
              <Input
                type="number"
                value={budget}
                onChange={(e) => {
                  updateDraft({ budget: parseInt(e.target.value) || 0 });
                  setSelectedTier(null); // clear tier highlight on custom input
                }}
                className="pl-10 h-14 text-lg font-bold bg-card border-border rounded-md shadow-sm focus-visible:ring-primary/20"
              />
            </div>
            <p className="text-xs text-subtle-foreground text-right">
              Min: ₦1,000/day
            </p>
          </div>

          {/* ── Live Outcome Projection ── */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
            <p className="text-xs font-bold text-primary uppercase tracking-wider">
              What ₦{budget.toLocaleString()}/day gets you
            </p>
            <p className="text-2xl font-heading font-black text-foreground">
              {outcomeRange}{" "}
              <span className="text-base font-medium text-subtle-foreground">
                {outcomeLabel}/day
              </span>
            </p>
            <p className="text-xs text-subtle-foreground">
              Est. ₦{estimate.costPerClickNgn.toLocaleString()} per click ·{" "}
              {estimate.estimatedReach.low.toLocaleString()}–
              {estimate.estimatedReach.high.toLocaleString()} people reached
            </p>
          </div>

          {/* ── Campaign Name ── */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
              Campaign Name
            </label>
            <Input
              value={campaignName}
              onChange={(e) => updateDraft({ campaignName: e.target.value })}
              placeholder="e.g. December Holiday Sale"
              className="font-medium h-12 rounded-md border-border bg-card shadow-sm focus-visible:ring-primary/20"
            />
          </div>

          {/* ── Ad Account Selector ── */}
          {healthyAccounts.length > 1 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
                Ad Account
              </label>
              <Select
                value={selectedAdAccountId}
                onValueChange={setSelectedAdAccountId}
              >
                <SelectTrigger className="h-12 bg-card border-border font-medium">
                  <SelectValue placeholder="Choose ad account…" />
                </SelectTrigger>
                <SelectContent>
                  {healthyAccounts.map((acc: AdAccountUI) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <span className="flex items-center gap-2">
                        {acc.nickname || acc.name}
                        {acc.isDefault && (
                          <span className="text-xs text-subtle-foreground font-normal">
                            (default)
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Facebook Page + Instagram Account ── */}
          {platform === "meta" && pages && pages.length > 0 && (
            <div className="space-y-4">
              {/* Page selector — only show dropdown if multiple pages */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
                  Facebook Page
                </label>
                {pages.length > 1 ? (
                  <Select
                    value={pageId ?? pages[0].id}
                    onValueChange={(val) => {
                      const selected = pages.find((p) => p.id === val);
                      updateDraft({
                        pageId: val,
                        instagramAccountId: selected?.instagramAccountId ?? undefined,
                      });
                    }}
                  >
                    <SelectTrigger className="h-12 bg-card border-border font-medium">
                      <SelectValue placeholder="Choose a page…" />
                    </SelectTrigger>
                    <SelectContent>
                      {pages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium text-foreground h-12 flex items-center px-3 rounded-md border border-border bg-card/50">
                    {pages[0].name}
                  </p>
                )}
              </div>

              {/* Instagram identity — read-only, derived from selected page */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
                  Instagram Account
                </label>
                {instagramAccountId ? (
                  <p className="text-sm font-medium text-foreground h-12 flex items-center px-3 rounded-md border border-border bg-card/50">
                    {pages.find((p) => p.id === (pageId ?? pages[0].id))?.instagramAccountName ?? instagramAccountId}
                  </p>
                ) : (
                  <p className="text-sm text-subtle-foreground h-12 flex items-center px-3 rounded-md border border-border bg-card/50 italic">
                    No Instagram account linked to this Page
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column — Launch Card */}
        <div className="md:col-span-5 space-y-4">
          <Card className="bg-foreground text-primary-foreground rounded-lg shadow-sm border border-border h-full flex flex-col justify-between">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2 text-lg">
                  <CheckCircle className="h-6 w-6 text-primary" /> Campaign
                  Check
                </h3>
                <Badge className="bg-primary/20 text-primary border-0 px-3 py-1 rounded-full">
                  Ready
                </Badge>
              </div>

              <div className="space-y-3 py-3 border-t border-white/10">
                <CheckItem
                  label={
                    isLoadingAccounts
                      ? "Checking ad account…"
                      : hasPaymentIssue
                        ? "Payment method missing on Meta"
                        : hasHealthyAccount
                          ? "Ad Account Connected"
                          : "No healthy ad account"
                  }
                  status={
                    isLoadingAccounts
                      ? "loading"
                      : hasPaymentIssue
                        ? "error"
                        : hasHealthyAccount
                          ? "success"
                          : "error"
                  }
                  inverse
                />
                {hasPaymentIssue && (
                  <p className="text-xs text-red-400 pl-9 -mt-1">
                    <a
                      href="https://business.facebook.com/billing_hub/payment_settings"
                      target="_blank"
                      className="underline"
                      rel="noreferrer"
                    >
                      Add payment method on Meta →
                    </a>
                  </p>
                )}
                <CheckItem
                  label="Creative Selected"
                  status={selectedCreatives.length > 0 ? "success" : "error"}
                  inverse
                />
                <CheckItem
                  label="Audience Defined"
                  status={targetInterests.length > 0 ? "success" : "error"}
                  inverse
                />
                {isWebsiteObjective && (
                  <CheckItem
                    label={
                      hasPixel
                        ? "Pixel Connected"
                        : skipPixel
                          ? "Sales tracking disabled (No Pixel)"
                          : "Pixel Recommended"
                    }
                    status={
                      hasPixel ? "success" : "warning"
                    }
                    inverse
                  />
                )}
              </div>

              {/* Post-launch tracking text */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="p-3 rounded-md bg-primary/5 border border-primary/20 flex gap-3 text-left">
                  <div className="mt-0.5">
                    <StatUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-foreground block mb-1">
                      Track Every Naira
                    </span>
                    <span className="text-xs text-subtle-foreground inline-block">
                      After launch, tap "Sold! 🎉" every time a customer buys.
                      We'll show you exactly how much your ₦
                      {budget.toLocaleString()}/day is making.
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-subtle-foreground">
                    Est. Cost / Click
                  </span>
                  <span className="font-bold">
                    ₦{estimate.costPerClickNgn.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-subtle-foreground">Weekly Spend</span>
                  <span className="font-bold">
                    ₦{estimate.weeklySpendNgn.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-subtle-foreground">Platform</span>
                  <span className="font-bold capitalize">
                    {platform === "meta"
                      ? metaPlacement === "instagram"
                        ? "Instagram"
                        : metaPlacement === "facebook"
                          ? "Facebook"
                          : "Meta (All)"
                      : platform}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Website Tracking Section */}
      {needsPixel && (
        <div className="pt-8 border-t border-border animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-warning-bg border-2 border-warning-border rounded-lg p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <StatUp className="w-32 h-32 text-warning-icon" />
            </div>

            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 bg-warning-icon-bg text-warning-text-secondary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <span className="w-2 h-2 rounded-full bg-warning-icon animate-pulse" />
                Recommended
              </div>

              <h3 className="text-2xl font-bold text-warning-text mb-2">
                To track how much Naira this ad makes, you need the Tenzu Pixel.
              </h3>
              <p className="text-warning-text-secondary/80 mb-6">
                Without it, you won't know if your ₦{budget.toLocaleString()}{" "}
                daily spend is actually generating sales on your website.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {["Shopify", "WordPress", "Bumpa", "Copy Code"].map(
                  (platform) => (
                    <button
                      key={platform}
                      onClick={() => {
                        // TODO: Phase 2 — open Pixel integration modal for each platform
                        alert(
                          `Would open ${platform} integration instructions`,
                        );
                      }}
                      className="p-3 bg-white border border-warning-border rounded-md hover:border-warning-icon hover:shadow-sm transition-all text-center text-sm font-bold text-warning-text"
                    >
                      {platform}
                    </button>
                  ),
                )}
              </div>

              <button
                onClick={() => setSkipPixel(true)}
                className="text-sm font-semibold text-warning-icon hover:text-warning-text underline underline-offset-4"
              >
                Skip tracking for now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing WhatsApp number block */}
      {missingWhatsappNumber && (
        <div className="pt-4 border-t border-border animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive">
            <WarningTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">WhatsApp number required</p>
              <p className="text-destructive/80 mt-0.5">
                Go back to the Creative step and enter your WhatsApp number, or{" "}
                <Link href="/settings/business" className="underline font-semibold hover:text-destructive">
                  save it in Business Settings
                </Link>{" "}
                to auto-fill it on every campaign.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unresolved targeting warning */}
      <UnresolvedTargetingWarning
        targetInterests={targetInterests}
        targetBehaviors={targetBehaviors || []}
      />

      {/* Launch Button */}
      <div className="pt-4 border-t border-border">
        <Button
          size="lg"
          className="w-full h-16 text-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm border border-border rounded-lg transition-all hover:scale-[1.01]"
          onClick={handleLaunch}
          disabled={!canLaunch}
        >
          {isLaunching ? (
            <>
              <SystemRestart className="mr-2 h-6 w-6 animate-spin" />{" "}
              Launching...
            </>
          ) : (
            <>
              Launch Campaign Now <ArrowRight className="ml-2 h-6 w-6" />
            </>
          )}
        </Button>
      </div>

      <PaymentDialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen} />

      <LaunchSuccessModal
        show={showSuccess}
        onClose={() => {
          resetDraft();
          setShowSuccess(false);
          router.push("/campaigns");
        }}
        dbCampaignId={dbCampaignId}
        showPixelPrompt={showPixelPrompt}
        budget={budget}
        outcomeLabel={outcomeLabel}
        outcomeRange={outcomeRange}
      />
    </div>
  );
}

