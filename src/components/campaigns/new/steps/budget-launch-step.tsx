"use client";

import { useState, useMemo, useEffect } from "react";
import { useCampaignStore } from "@/stores/campaign-store";
import { useCampaigns } from "@/hooks/use-campaigns";
import { useAdAccounts } from "@/hooks/use-ad-account";
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
  Sparks,
  StatUp,
  WarningTriangle,
} from "iconoir-react";
import { AdSyncObjective } from "@/lib/constants";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { estimateBudget, predictROAS } from "@/lib/intelligence";
import { createLeadForm, fetchMetaPages } from "@/actions/lead-forms";
import { saveDraft } from "@/actions/drafts";
import { toast } from "sonner";

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
    activeColor: "border-primary ring-primary/20",
  },
  {
    key: "grow",
    label: "Grow",
    sublabel: "Recommended",
    amount: 7000,
    color: "border-border",
    activeColor: "border-primary ring-primary/20",
    popular: true,
  },
  {
    key: "scale",
    label: "Scale",
    sublabel: "Maximum reach",
    amount: 15000,
    color: "border-border",
    activeColor: "border-primary ring-primary/20",
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
  } = useCampaignStore();

  const orgROI = useOrgROI();
  const { launchCampaign, isLaunching } = useCampaigns();
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
  const { data: adAccounts, isLoading: isLoadingAccounts } = useAdAccounts();

  const healthyAccounts = (adAccounts ?? []).filter((a) => a.status === "healthy");

  const hasHealthyAccount = !isLoadingAccounts && healthyAccounts.length > 0;

  const hasPaymentIssue =
    !isLoadingAccounts &&
    (adAccounts ?? []).some((a) => a.status === "payment_issue");

  // Selected ad account for this campaign (defaults to the marked default, then first healthy)
  const defaultAccount = adAccounts?.find((a) => a.isDefault) ?? adAccounts?.[0];
  const [selectedAdAccountId, setSelectedAdAccountId] = useState<string>(
    () => defaultAccount?.id ?? "",
  );
  // Sync once accounts load (handles the case where accounts load after mount)
  useEffect(() => {
    if (!selectedAdAccountId && defaultAccount?.id) {
      setSelectedAdAccountId(defaultAccount.id);
    }
  }, [defaultAccount?.id]);

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

  /** Extract the right low/high for the current objective from an estimate */
  const getOutcomeRange = (est: ReturnType<typeof estimateBudget>) => {
    if (objective === "whatsapp") {
      return {
        low: est.estimatedConversations.low,
        high: est.estimatedConversations.high,
      };
    }
    if (objective === "traffic") {
      return { low: est.estimatedClicks.low, high: est.estimatedClicks.high };
    }
    // awareness / engagement — show reach
    return { low: est.estimatedReach.low, high: est.estimatedReach.high };
  };

  // ─── Outcome metric label by objective ──────────────────────────────────────

  const outcomeLabel =
    objective === "whatsapp"
      ? "WhatsApp conversations"
      : objective === "traffic"
        ? "website visitors"
        : "people reached";

  const outcomeRange =
    objective === "whatsapp"
      ? `${estimate.estimatedConversations.low}–${estimate.estimatedConversations.high}`
      : objective === "traffic"
        ? `${estimate.estimatedClicks.low}–${estimate.estimatedClicks.high}`
        : `${estimate.estimatedReach.low.toLocaleString()}–${estimate.estimatedReach.high.toLocaleString()}`;

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
        const selectedAccount = adAccounts?.find((a) => a.id === selectedAdAccountId) ?? adAccounts?.[0];
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
      leadGenFormId: finalLeadGenFormId || undefined,
      // Include carousel data if present (2+ cards)
      ...(carouselCards && carouselCards.length >= 2 && { carouselCards }),
    };

    console.log("🚀 [UI Start Launch] Payload sent to action:", launchPayload);

    launchCampaign(launchPayload, {
      onSuccess: (result: any) => {
        console.log("✅ [UI Launch Success] Result:", result);
        if (result?.dbCampaignId) {
          setDbCampaignId(result.dbCampaignId);
          if (result.showPixelPrompt) setShowPixelPrompt(true);
          setShowSuccess(true);
        } else {
          resetDraft();
          router.push("/campaigns");
        }
      },
      onError: (err: any) => {
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
        <h1 className="text-3xl font-heading font-bold text-foreground">
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
                  ? getOutcomeRange(tEst)
                  : { low: 0, high: 0 };
                return (
                  <button
                    key={tier.key}
                    onClick={() => handleTierSelect(tier)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all relative group",
                      active
                        ? `ring-1 bg-primary/5 ${tier.activeColor}`
                        : `${tier.color} bg-card/50 hover:border-primary/50 hover:bg-card`,
                    )}
                  >
                    {tier.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Best
                      </span>
                    )}
                    <p className="text-[10px] font-bold text-subtle-foreground uppercase tracking-wider mb-1">
                      {tier.label}
                    </p>
                    <p className="text-sm font-black text-foreground">
                      ~{range.low.toLocaleString()}–
                      {range.high.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
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
            <p className="text-xs text-muted-foreground">
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
                  {healthyAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <span className="flex items-center gap-2">
                        {acc.nickname || acc.name}
                        {acc.isDefault && (
                          <span className="text-[10px] text-muted-foreground font-normal">
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
                    <span className="text-xs text-muted-foreground inline-block">
                      After launch, tap "Sold! 🎉" every time a customer buys.
                      We'll show you exactly how much your ₦
                      {budget.toLocaleString()}/day is making.
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Est. Cost / Click
                  </span>
                  <span className="font-bold">
                    ₦{estimate.costPerClickNgn.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Weekly Spend</span>
                  <span className="font-bold">
                    ₦{estimate.weeklySpendNgn.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Platform</span>
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
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <StatUp className="w-32 h-32 text-yellow-600" />
            </div>

            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                Recommended
              </div>

              <h3 className="text-2xl font-bold text-yellow-900 mb-2">
                To track how much Naira this ad makes, you need the Tenzu Pixel.
              </h3>
              <p className="text-yellow-800/80 mb-6">
                Without it, you won't know if your ₦{budget.toLocaleString()}{" "}
                daily spend is actually generating sales on your website.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {["Shopify", "WordPress", "Bumpa", "Copy Code"].map(
                  (platform) => (
                    <button
                      key={platform}
                      onClick={() => {
                        // Future Phase: Open Pixel integration modal
                        alert(
                          `Would open ${platform} integration instructions`,
                        );
                      }}
                      className="p-3 bg-white border border-yellow-200 rounded-md hover:border-yellow-400 hover:shadow-sm transition-all text-center text-sm font-bold text-yellow-900"
                    >
                      {platform}
                    </button>
                  ),
                )}
              </div>

              <button
                onClick={() => setSkipPixel(true)}
                className="text-sm font-semibold text-yellow-700 hover:text-yellow-900 underline underline-offset-4"
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
      {(() => {
        const unresolvedInterests = targetInterests.filter(
          (i) => !/^\d+$/.test(i.id),
        );
        const unresolvedBehaviors = (targetBehaviors || []).filter(
          (b) => !/^\d+$/.test(b.id),
        );
        const totalUnresolved =
          unresolvedInterests.length + unresolvedBehaviors.length;
        const totalTargets =
          targetInterests.length + (targetBehaviors || []).length;
        const unresolvedRatio =
          totalTargets > 0 ? totalUnresolved / totalTargets : 0;

        if (totalUnresolved === 0) return null;

        const isSevere = unresolvedRatio > 0.3;

        return (
          <div
            className={cn(
              "p-4 rounded-lg border flex items-start gap-3",
              isSevere
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-amber-50 border-amber-200 text-amber-800",
            )}
          >
            <WarningTriangle
              className={cn(
                "h-5 w-5 mt-0.5 shrink-0",
                isSevere ? "text-red-500" : "text-amber-500",
              )}
            />
            <div className="text-sm">
              <p className="font-bold mb-0.5">
                {totalUnresolved} targeting option
                {totalUnresolved > 1 ? "s" : ""} could not be verified
              </p>
              <p className="text-xs opacity-80">
                {isSevere
                  ? "Over 30% of your targeting is unverified. Consider refining your audience for better results."
                  : "Unverified options will be dropped at launch. Your ad will still run with the verified targets."}
              </p>
            </div>
          </div>
        );
      })()}

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

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <Card className="max-w-lg w-full animate-in zoom-in-95 slide-in-from-bottom-4">
            <CardContent className="p-8 space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-in zoom-in-50">
                  <CheckCircle className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
                    {showPixelPrompt
                      ? "Ad launched! One last step..."
                      : "Your ad is live! 🎉"}
                  </h2>
                  <p className="text-muted-foreground">
                    {showPixelPrompt
                      ? "To track the exact Naira your ad makes, you need to install the Tenzu Pixel."
                      : "Meta is reviewing it now. Messages should start coming in within 24 hours."}
                  </p>
                </div>
              </div>

              {showPixelPrompt ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-100 p-2 rounded-full mt-0.5">
                      <StatUp className="w-5 h-5 text-yellow-700" />
                    </div>
                    <div>
                      <h4 className="font-bold text-yellow-900 mb-1">
                        Install Tracking Pixel
                      </h4>
                      <p className="text-sm text-yellow-800 mb-3">
                        Copy this snippet into your website's{" "}
                        <code>&lt;head&gt;</code> tag to enable ROI tracking.
                      </p>
                      <Button
                        asChild
                        size="sm"
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold"
                      >
                        <Link href={`/campaigns/${dbCampaignId}`}>
                          Get Snippet Code
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-md">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">
                      Daily Budget
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      ₦{budget.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">
                      Expected{" "}
                      {outcomeLabel.replace(/^[a-z]/, (c) => c.toUpperCase())}
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {outcomeRange}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-12 rounded-lg font-bold"
                  onClick={() => {
                    resetDraft();
                    setShowSuccess(false);
                    router.push("/campaigns");
                  }}
                >
                  Watch it perform → View Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg shadow-sm border border-border"
                  onClick={() => {
                    if (dbCampaignId)
                      router.push(
                        `/creations/studio?campaign_id=${dbCampaignId}`,
                      );
                  }}
                  disabled={!dbCampaignId}
                >
                  <Sparks className="mr-2 h-5 w-5" />
                  Improve My Creative with AI
                </Button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => {
                    resetDraft();
                    setShowSuccess(false);
                    router.push("/campaigns");
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  I'll add creative later
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function CheckItem({
  label,
  status,
  inverse = false,
}: {
  label: string;
  status: "success" | "warning" | "error" | "loading";
  inverse?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
          status === "success"
            ? "bg-primary/20 text-primary"
            : status === "warning"
              ? "bg-yellow-100 text-yellow-600"
              : status === "loading"
                ? "bg-white/10 text-white/60"
                : "bg-red-100 text-red-600",
        )}
      >
        {status === "success" ? (
          <Check className="h-4 w-4" />
        ) : status === "warning" ? (
          <span className="text-yellow-600 font-bold text-xs">!</span>
        ) : status === "loading" ? (
          <div className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white/80 animate-spin" />
        ) : (
          <div className="h-2 w-2 bg-red-600 rounded-full" />
        )}
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          status === "loading" && "opacity-60",
          inverse ? "text-muted" : "text-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Ad Preview Card Component ───────────────────────────────────────────────

function AdPreviewCard({
  campaignName,
  adCopy,
  creativeUrl,
  platform,
}: {
  campaignName: string;
  adCopy: any;
  creativeUrl: string;
  platform: any;
}) {
  return (
    <div className="rounded-lg bg-card overflow-hidden shadow-sm border border-border animate-in fade-in slide-in-from-bottom-4">
      {/* Header (Fake User) */}
      <div className="p-3 flex items-center gap-3 border-b border-border/50">
        <div className="h-8 w-8 rounded-full bg-linear-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
          {campaignName?.[0]?.toUpperCase() || "B"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {campaignName || "Your Business"}
          </p>
          <p className="text-[10px] text-muted-foreground">Sponsored</p>
        </div>
        {platform === "meta" ? (
          <div className="h-4 w-4 bg-blue-600 rounded-sm flex items-center justify-center text-[8px] text-white font-bold">
            f
          </div>
        ) : (
          <div className="h-4 w-4 bg-black rounded-full flex items-center justify-center text-[8px] text-white font-bold">
            t
          </div>
        )}
      </div>

      {/* Primary Text */}
      <div className="px-3 py-2">
        <p className="text-sm text-foreground line-clamp-3 leading-relaxed">
          {adCopy.primary || "Your primary ad text will appear here..."}
        </p>
      </div>

      {/* Creative */}
      <div className="bg-black/5 aspect-4/5 relative w-full overflow-hidden">
        {creativeUrl ? (
          <img
            src={creativeUrl}
            alt="Ad creative"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
            No image selected
          </div>
        )}
      </div>

      {/* Headline & CTA */}
      <div className="bg-muted/30 p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
            {platform === "whatsapp" ? "whatsapp.com" : "yoursite.com"}
          </p>
          <p className="text-sm font-bold text-foreground truncate">
            {adCopy.headline || "Your Headline Here"}
          </p>
        </div>
        <button className="px-4 py-1.5 bg-muted-foreground/10 text-foreground text-xs font-bold rounded border border-border whitespace-nowrap">
          {adCopy?.cta?.displayLabel || "Learn More"}
        </button>
      </div>
    </div>
  );
}
