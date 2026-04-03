// src/components/campaigns/new/steps/audience-chat-step.tsx

"use client";

import {
  useCampaignStore,
  Message,
} from "@/stores/campaign-store";
import { classifyLocally } from "@/lib/ai/preprocessor";
import { messageContainsUrl } from "@/lib/ai/url-scraper";
import type { TriageMessage } from "@/lib/ai/service";
import { useState, useRef, useEffect } from "react";
import { saveDraft } from "@/actions/drafts";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Check, ListSelect } from "iconoir-react";
import type { AIStrategyResult } from "@/lib/ai/types";
import {
  extractTargetingNames,
  resolveAllTargeting,
  buildResolvedStrategy,
  applyCopyResult,
  resolveLocationsOnly,
  runPhase2Targeting,
  type Phase2Result,
} from "./audience/chat-handlers";
import { estimateBudget } from "@/lib/intelligence/estimator";
import type { AdSyncObjective } from "@/lib/constants";
import { TIER_CONFIG } from "@/lib/constants";
import { useSubscription } from "@/hooks/use-subscription";
import { PaymentDialog } from "@/components/billing/payment-dialog";

// Extracted Components
import { ChatInterface } from "./audience/chat-interface";
import { AudienceSummaryPanel } from "./audience/audience-summary";

// ─── Rotating placeholders ─────────────────────────────────────────────────────
const CHAT_PLACEHOLDERS = [
  "What do you sell? (e.g. 'Ankara bags Lagos')",
  "What do you sell? (e.g. 'Shawarma delivery Lekki')",
  "What do you sell? (e.g. 'Wigs and hair care Abuja')",
  "What do you sell? (e.g. 'Skincare products, nationwide delivery')",
  "What do you sell? (e.g. 'Men's shoes Port Harcourt')",
  "What do you sell? (e.g. 'Cakes and small chops Yaba')",
  "What do you sell? (e.g. 'Thrift fashion Surulere')",
  "Analyse jumia.com.ng for ad ideas"
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTriageHistory(messages: Message[]): TriageMessage[] {
  return messages
    .filter((m) => typeof m.content === "string" && m.content.length > 0)
    .map((m) => ({
      role: m.role === "user" ? "user" : "ai",
      content: m.content as string,
    }));
}

function generateCampaignName(prompt: string, interests: any[]): string {
  if (interests && interests.length > 0) {
    const main =
      typeof interests[0] === "string" ? interests[0] : interests[0].name;
    return `${main} Campaign`;
  }
  if (prompt) {
    const words = prompt.split(" ").slice(0, 3).join(" ");
    return `${words.charAt(0).toUpperCase() + words.slice(1)} Campaign`;
  }
  return `Campaign - ${new Date().toLocaleDateString()}`;
}

/**
 * Build the location string sent to the AI.
 * Joins ALL stored locations so the AI has full geographic context.
 * Fallback: "Nigeria" (AI uses this as the broadest default).
 */
function buildLocationString(locs: { name: string }[]): string {
  return locs.length > 0 ? locs.map((l) => l.name).join(", ") : "Nigeria";
}

function buildOutcomePreview(
  objective: string | null,
  budget: number,
): { label: string; range: string } {
  const est = estimateBudget(
    budget,
    (objective || "whatsapp") as AdSyncObjective,
  );
  if (objective === "whatsapp") {
    return {
      label: "WhatsApp messages/day",
      range: `${est.estimatedConversations.low}–${est.estimatedConversations.high}`,
    };
  }
  if (objective === "traffic") {
    return {
      label: "website visitors/day",
      range: `${est.estimatedClicks.low}–${est.estimatedClicks.high}`,
    };
  }
  return {
    label: "people reached/day",
    range: `${est.estimatedReach.low.toLocaleString()}–${est.estimatedReach.high.toLocaleString()}`,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AudienceChatStep({
  persistedDraftId,
  onDraftSaved,
}: {
  persistedDraftId: string | null;
  onDraftSaved: (id: string) => void;
}) {
  const router = useRouter();
  const {
    setStep,
    updateDraft,
    aiPrompt,
    latestAiSummary,
    targetInterests,
    targetBehaviors,
    ageRange,
    gender,
    locations,
    objective,
    campaignName,
    platform,
    adCopy,
    budget,
    lastGeneratedObjective,
    messages,
    setMessages,
  } = useCampaignStore();

  const campaignStore = {
    targetInterests,
    targetBehaviors,
    ageRange,
    gender,
    locations,
  };

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lockScrollToCopy = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Stores the user message that triggered TYPE_G so we can use it when they confirm
  const typegTriggerRef = useRef<string | null>(null);
  const [isRefiningCopy, setIsRefiningCopy] = useState(false);
  const [isReadingUrl, setIsReadingUrl] = useState(false);

  // Clear URL reading indicator once the AI finishes responding
  useEffect(() => {
    if (!isTyping) setIsReadingUrl(false);
  }, [isTyping]);

  // Cleanup: abort in-flight fetches and pending timers on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      pendingTimers.current.forEach(clearTimeout);
    };
  }, []);

  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [copyReady, setCopyReady] = useState(false);
  const [chatPhase, setChatPhase] = useState<"initial" | "refining">("initial");

  // Credit & tier guards
  const { data: subscription } = useSubscription();
  const tier = (subscription?.org?.tier ??
    "starter") as keyof typeof TIER_CONFIG;
  const maxRefinements =
    TIER_CONFIG[tier]?.ai?.maxRefinementsPerCampaign ?? Infinity;
  // Copy variations limit — Starter:2, Growth:3, Agency:5
  const maxCopyVariations = TIER_CONFIG[tier]?.ai?.maxCopyVariations ?? 2;
  const refinementCount = useCampaignStore((s) => s.refinementCount);
  const incrementRefinementCount = useCampaignStore(
    (s) => s.incrementRefinementCount,
  );

  // Rotate placeholder every 4 seconds while input is empty
  useEffect(() => {
    if (inputValue || chatPhase === "refining") return;
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % CHAT_PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [inputValue, chatPhase]);

  const currentPlaceholder =
    chatPhase === "refining"
      ? "Refine copy, fix details, or describe a different product…"
      : CHAT_PLACEHOLDERS[placeholderIdx];

  // ─── Copy Refinement ───────────────────────────────────────────────────────

  const handleCopyRefinement = async (instruction: string) => {
    if (tier === "starter" && refinementCount >= maxRefinements) {
      setUpgradeDialogOpen(true);
      toast.error(
        `Starter plan allows ${maxRefinements} copy refinements per campaign. Upgrade to Growth or Agency for unlimited refinements.`,
        { duration: 5000 },
      );
      return;
    }
    setIsRefiningCopy(true);
    setIsTyping(true);

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          description: aiPrompt,
          location: buildLocationString(locations),
          objective: objective || "whatsapp",
          currentCopy: adCopy.headline
            ? { headline: adCopy.headline, primary: adCopy.primary }
            : undefined,
          refinementInstruction: instruction,
        }),
      });
      if (!res.ok) throw new Error("Refinement failed");
      const result = await res.json();

      const { variations, primaryCopy, ctaData } = applyCopyResult(result, {
        maxCopyVariations,
        platform,
        objective,
        locations,
      });

      updateDraft({
        adCopy: {
          ...primaryCopy,
          cta: ctaData,
        },
        adCopyVariations: variations,
        selectedCopyIdx: 0,
      });

      scheduleTimer(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content: "Here's the updated version:",
            type: "copy_suggestion",
            data: { adCopy: primaryCopy, adCopyVariations: variations },
          },
        ]);
      }, 800);
      incrementRefinementCount();
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setIsTyping(false);
      toast.error("Copy refinement failed. Please try again.", {
        duration: 4000,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content: "I couldn't refine the copy. Try sending your feedback again.",
          type: "recovery",
        },
      ]);
    } finally {
      setIsRefiningCopy(false);
    }
  };

  // ─── Audience Editing ──────────────────────────────────────────────────────

  const removeInterest = (interest: any) => {
    const id = interest.id || interest;
    updateDraft({
      targetInterests: targetInterests.filter(
        (i: any) => i.id !== id && i.name !== interest.name,
      ),
    });
  };

  const addInterest = (interest: any) => {
    if (!targetInterests.some((i: any) => i.id === interest.id)) {
      updateDraft({ targetInterests: [...targetInterests, interest] });
    }
  };

  const removeLocation = (loc: any) => {
    const id = loc.id || loc.key;
    updateDraft({
      locations: locations.filter((l: any) => l.id !== id && l.key !== id),
    });
  };

  const addLocation = (loc: any) => {
    const newLoc = {
      id: loc.key || loc.id,
      name: loc.name,
      type: loc.type,
      country: loc.country_name || loc.country,
    };
    if (!locations.some((l: any) => l.id === newLoc.id)) {
      updateDraft({ locations: [...locations, newLoc] });
    }
  };

  // ─── Init Chat ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0) return;

    console.log("🚀 [AudienceChatStep] Init chat", messages);

    const greeting =
      objective === "whatsapp"
        ? "Oya, tell me what you sell — I'll build your WhatsApp ad in seconds."
        : objective === "traffic"
          ? "What product or service are you driving traffic to? One sentence is enough."
          : "Tell me what you're selling. One sentence — I'll do the rest.";

    const initialMessage: Message = {
      id: "init-1",
      role: "ai",
      content: greeting,
      type: "text",
    };

    if (aiPrompt && targetInterests.length > 0) {
      const history: Message[] = [
        initialMessage,
        { id: "hist-1", role: "user", content: aiPrompt },
        {
          id: "hist-2",
          role: "ai",
          content:
            latestAiSummary ||
            `Your campaign is ready. Targeting ${targetInterests.length} audience groups.`,
          type: "suggestion",
          data: { interests: targetInterests, locations },
        },
      ];
      const { adCopy: storedCopy, adCopyVariations: storedVariations } =
        useCampaignStore.getState();
      if (storedCopy?.headline && storedCopy?.primary) {
        history.push({
          id: "hist-3",
          role: "ai",
          content: "Here's your ad copy:",
          type: "copy_suggestion",
          data: {
            adCopy: {
              headline: storedCopy.headline,
              primary: storedCopy.primary,
            },
            adCopyVariations: storedVariations?.length
              ? storedVariations
              : undefined,
          },
        });
      }
      setMessages(history);
    } else {
      setMessages([initialMessage]);
    }
  }, []);

  // ─── Objective Mismatch Detection ─────────────────────────────────────────
  useEffect(() => {
    if (
      !objective ||
      !lastGeneratedObjective ||
      objective === lastGeneratedObjective ||
      messages.length === 0
    )
      return;

    const lastAiMsg = [...messages].reverse().find((m) => m.role === "ai");
    if (lastAiMsg?.type === "recovery" && lastAiMsg?.data?.isMismatchPrompt)
      return;

    const fromGoal = lastGeneratedObjective.toUpperCase();
    const toGoal = objective.toUpperCase();

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "ai",
        content: `You switched from ${fromGoal} to ${toGoal}. Should I rebuild the strategy and copy for the new goal?`,
        type: "recovery",
        data: {
          isMismatchPrompt: true,
          clarificationOptions: [`Yes, rebuild for ${toGoal}`, "No, keep it"],
        },
      },
    ]);
  }, [objective, lastGeneratedObjective]);

  useEffect(() => {
    if (lockScrollToCopy.current) {
      const el = document.getElementById(`msg-${lockScrollToCopy.current}`);
      if (el) {
        el.scrollIntoView({ block: "start", behavior: "smooth" });
        lockScrollToCopy.current = null;
        return;
      }
    }
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Auto-save on every new AI message ─────────────────────────────────────
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "ai" || messages.length <= 1) return;

    const timer = setTimeout(async () => {
      try {
        const state = useCampaignStore.getState();
        const savedId = await saveDraft(state, persistedDraftId ?? undefined);
        if (savedId && savedId !== persistedDraftId) {
          onDraftSaved(savedId);
        }
      } catch {
        toast.warning("Changes not saved — check your connection.", {
          duration: 3000,
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [messages.length]);

  // ─── Main Send Handler ─────────────────────────────────────────────────────

  /** Schedule a timeout that is auto-cleared on next send or unmount. */
  function scheduleTimer(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    pendingTimers.current.push(id);
    return id;
  }

  /** Cancel all pending message-sequencing timers. */
  function clearPendingTimers() {
    pendingTimers.current.forEach(clearTimeout);
    pendingTimers.current = [];
  }

  function normalizeAmounts(input: string): string {
    return input
      .replace(/(\d+(?:\.\d+)?)k\b/gi, (_, n) => `₦${parseFloat(n) * 1000}`)
      .replace(
        /(\d+(?:\.\d+)?)m\b/gi,
        (_, n) => `₦${parseFloat(n) * 1_000_000}`,
      );
  }

  const handleConfirmFromChat = () => {
    if (window.innerWidth < 1024) {
      setSummaryOpen(true);
    } else {
      setStep(3);
    }
  };

  const handleSend = async (overrideValue?: string, isProceedConfirm?: boolean) => {
    const raw = overrideValue || inputValue;
    const text = normalizeAmounts(raw);
    if (!text.trim() || isTyping) return;

    // Abort any in-flight request and clear pending message timers
    abortRef.current?.abort();
    clearPendingTimers();
    const controller = new AbortController();
    abortRef.current = controller;

    const isInternalSentinel = text.startsWith("__OBJECTIVE_");
    const finalDescription = text;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: isInternalSentinel
        ? text.startsWith("__OBJECTIVE_KEEP__")
          ? "No, keep it"
          : "Yes, rebuild for new goal"
        : text,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!overrideValue) setInputValue("");
    setIsTyping(true);
    if (messageContainsUrl(text)) setIsReadingUrl(true);

    // ── Sentinel: Objective keep ────────────────────────────────────────────
    if (text.startsWith("__OBJECTIVE_KEEP__")) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content: "Got it — keeping your current strategy. Carry on!",
          type: "text",
        },
      ]);
      return;
    }

    // ── Sentinel: Objective rewrite ────────────────────────────────────────
    if (text.startsWith("__OBJECTIVE_REWRITE__")) {
      const businessDesc = aiPrompt;
      if (!businessDesc) {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content:
              "Tell me what you sell first and I'll rebuild the strategy.",
            type: "text",
          },
        ]);
        return;
      }
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            description: businessDesc,
            location: buildLocationString(locations),
            objective: objective || "whatsapp",
            conversationHistory: buildTriageHistory(messages),
          }),
        });
        if (res.status === 429) {
          handleRateLimit(res);
          return;
        }
        if (!res.ok) throw new Error("Rebuild failed");
        const result: AIStrategyResult = await res.json();

        const names = extractTargetingNames(result);
        const resolved = await resolveAllTargeting(names);
        const strategy = buildResolvedStrategy(result, resolved, {
          existingLocations: locations,
          maxCopyVariations,
          platform,
          objective,
        });

        updateDraft({
          targetInterests: strategy.normalizedInterests,
          targetBehaviors: strategy.normalizedBehaviors,
          targetLifeEvents: strategy.normalizedLifeEvents,
          targetWorkPositions: strategy.normalizedWorkPositions,
          targetIndustries: strategy.normalizedIndustries,
          ageRange: {
            min: result.demographics?.age_min || 18,
            max: result.demographics?.age_max || 65,
          },
          gender: result.demographics?.gender || "all",
          adCopy: {
            ...strategy.primaryCopy,
            cta: strategy.ctaData,
          },
          adCopyVariations: strategy.variations,
          selectedCopyIdx: 0,
          lastGeneratedObjective: objective || "whatsapp",
        });

        const outcome = buildOutcomePreview(objective, budget);
        const plainSummary =
          result.plain_english_summary ||
          `Rebuilt for ${(objective || "whatsapp").toUpperCase()} — targeting ${strategy.normalizedInterests.length} audiences.`;

        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content: plainSummary,
            type: "outcome_preview",
            data: {
              outcomeLabel: outcome.label,
              outcomeRange: outcome.range,
              budget,
              interests: strategy.normalizedInterests,
              locations,
            },
          },
        ]);
        scheduleTimer(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "ai",
              content: "Here's the updated copy for your new goal:",
              type: "copy_suggestion",
              data: { adCopy: strategy.primaryCopy, adCopyVariations: strategy.variations },
            },
          ]);
          setCopyReady(true);
          setChatPhase("refining");
        }, 900);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setIsTyping(false);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== userMsg.id),
          {
            id: Date.now().toString(),
            role: "ai",
            content: "Couldn't rebuild right now. Try again in a moment.",
            type: "text",
          },
        ]);
      }
      return;
    }

    // ── TYPE_G confirmation bypass ─────────────────────────────────────────
    // "Yes, proceed" after a TYPE_G proposal must skip triage and go straight
    // to generation — sending "Yes, proceed" as the description would cause
    // triage to loop back to TYPE_G again.
    if (isProceedConfirm) {
      console.log("Proceeding with TYPE_G confirmation💎💎💎");
      setCopyReady(false);
      setChatPhase("initial");
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            description: typegTriggerRef.current || "",
            location: buildLocationString(locations),
            objective: objective || "whatsapp",
            conversationHistory: buildTriageHistory(messages),
            forceGenerate: true,
          }),
        });

        if (res.status === 429) { handleRateLimit(res); return; }
        if (!res.ok) throw new Error("AI Failed");
        const result: AIStrategyResult = await res.json();

        const earlyReturn = routeTriageResponse(result);
        if (earlyReturn) return;

        const names = extractTargetingNames(result);
        const resolved = await resolveAllTargeting(names);
        const strategy = buildResolvedStrategy(result, resolved, {
          existingLocations: locations,
          maxCopyVariations,
          platform,
          objective,
        });

        const triggerPrompt = typegTriggerRef.current || "";
        updateDraft({
          aiPrompt: triggerPrompt,
          resolvedSiteContext: (result as any).siteContextSummary ?? null,
          targetInterests: strategy.normalizedInterests,
          targetBehaviors: strategy.normalizedBehaviors,
          targetLifeEvents: strategy.normalizedLifeEvents,
          targetWorkPositions: strategy.normalizedWorkPositions,
          targetIndustries: strategy.normalizedIndustries,
          ageRange: {
            min: result.demographics?.age_min || 18,
            max: result.demographics?.age_max || 65,
          },
          gender: result.demographics?.gender || "all",
          campaignName:
            !campaignName || campaignName === "Untitled Campaign"
              ? generateCampaignName(triggerPrompt, strategy.normalizedInterests)
              : campaignName,
          adCopy: { ...strategy.primaryCopy, cta: strategy.ctaData },
          adCopyVariations: strategy.variations,
          selectedCopyIdx: 0,
          locations: strategy.finalLocations,
          lastGeneratedObjective: objective || "whatsapp",
          suggestedLeadForm: result.suggestedLeadForm ?? null,
        });

        const plainSummary =
          result.plain_english_summary ||
          `Targeting ${result.demographics?.gender === "female" ? "women" : result.demographics?.gender === "male" ? "men" : "people"} ${result.demographics?.age_min}–${result.demographics?.age_max} in ${strategy.finalLocations.map((l) => l.name).join(", ")}.`;
        updateDraft({ latestAiSummary: plainSummary });

        const outcome = buildOutcomePreview(objective, budget);
        typegTriggerRef.current = null;

        scheduleTimer(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "ai",
              content: plainSummary,
              type: "outcome_preview",
              data: {
                outcomeLabel: outcome.label,
                outcomeRange: outcome.range,
                budget,
                interests: strategy.normalizedInterests,
                locations: strategy.finalLocations,
              },
            },
          ]);

          if (strategy.primaryCopy.headline && strategy.primaryCopy.primary) {
            scheduleTimer(() => {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: "ai",
                  content: "Here's your ad copy — ready to use:",
                  type: "copy_suggestion",
                  data: {
                    adCopy: strategy.primaryCopy,
                    adCopyVariations: strategy.variations,
                  },
                },
              ]);
              setCopyReady(true);
              setChatPhase("refining");
            }, 900);
          }
        }, 0);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content: "Couldn't generate right now. Try again in a moment.",
            type: "text",
          },
        ]);
      }
      return;
    }

    // ── TIER 1 gate (zero API cost) ────────────────────────────────────────
    const classification = classifyLocally(text);

    if (classification.localType === "TIER1_TYPE_E") {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content:
            "You're all set! Click Next when you're ready to set your ad visuals.",
          type: "text",
        },
      ]);
      return;
    }

    // ── Main AI generation ─────────────────────────────────────────────────
    setCopyReady(false);
    setChatPhase("initial");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          description: finalDescription,
          location: buildLocationString(locations),
          objective: objective || "whatsapp",
          currentCopy: adCopy.headline
            ? { headline: adCopy.headline, primary: adCopy.primary }
            : undefined,
          conversationHistory: buildTriageHistory(messages),
        }),
      });

      if (res.status === 429) {
        handleRateLimit(res);
        return;
      }
      if (!res.ok) throw new Error("AI Failed");
      const result: AIStrategyResult = await res.json();

      // ── Triage early returns (zero-cost AI responses) ──────────────────────
      const earlyReturn = routeTriageResponse(result, text);
      if (earlyReturn) return;

      // ── TYPE_D — copy refinement ───────────────────────────────────────────
      if (result.meta?.input_type === "TYPE_D" && adCopy.headline) {
        setIsTyping(false);
        await handleCopyRefinement(text);
        return;
      }

      // ── Phase 1: resolve locations + copy immediately ─────────────────────
      const names = extractTargetingNames(result);
      const finalLocations = await resolveLocationsOnly(
        names.locationNames,
        locations,
      );
      const copyResult = applyCopyResult(result, {
        maxCopyVariations,
        platform,
        objective,
        locations: finalLocations,
      });

      const plainSummary =
        result.plain_english_summary ||
        `Targeting ${result.demographics?.gender === "female" ? "women" : result.demographics?.gender === "male" ? "men" : "people"} ${result.demographics?.age_min}–${result.demographics?.age_max} in ${finalLocations.map((l) => l.name).join(", ")}.`;

      // ── Update store with Phase 1 data (copy + demographics + locations) ──
      updateDraft({
        aiPrompt: text,
        resolvedSiteContext: (result as any).siteContextSummary ?? null,
        ageRange: {
          min: result.demographics?.age_min || 18,
          max: result.demographics?.age_max || 65,
        },
        gender: result.demographics?.gender || "all",
        campaignName:
          !campaignName || campaignName === "Untitled Campaign"
            ? generateCampaignName(text, result.interests || [])
            : campaignName,
        adCopy: {
          ...copyResult.primaryCopy,
          cta: copyResult.ctaData,
        },
        adCopyVariations: copyResult.variations,
        selectedCopyIdx: 0,
        locations: finalLocations,
        lastGeneratedObjective: objective || "whatsapp",
        suggestedLeadForm: result.suggestedLeadForm ?? null,
        latestAiSummary: plainSummary,
        // Clear any previous targeting from a prior generation
        targetInterests: [],
        targetBehaviors: [],
        targetLifeEvents: [],
        targetWorkPositions: [],
        targetIndustries: [],
        isResolvingTargeting: true,
        targetingResolutionError: false,
      });

      // ── Fire Phase 2 in the background (no await) ─────────────────────────
      runPhase2Targeting(
        {
          interestNames: names.interestNames,
          behaviorNames: names.behaviorNames,
          lifeEventNames: names.lifeEventNames,
          workPositionNames: names.workPositionNames,
          industryNames: names.industryNames,
          adCopy: copyResult.primaryCopy.primary || copyResult.primaryCopy.headline,
          ctaIntent: result.ctaIntent || "buy_now",
          businessType: result.meta?.detected_business_type || "general",
        },
        (phase2: Phase2Result) => {
          updateDraft({
            targetInterests: phase2.interests,
            targetBehaviors: phase2.behaviors,
            targetLifeEvents: phase2.lifeEvents,
            targetWorkPositions: phase2.workPositions,
            targetIndustries: phase2.industries,
            isResolvingTargeting: false,
          });
        },
        () => {
          updateDraft({ isResolvingTargeting: false, targetingResolutionError: true });
          toast.warning("Audience targeting took longer than expected — add interests manually.");
        },
      );

      const outcome = buildOutcomePreview(objective, budget);
      const assumptions = result.meta?.inferred_assumptions;
      const refinementQ = result.meta?.refinement_question;

      // ── Render Messages (tracked timers for safe cleanup) ──────────────────
      scheduleTimer(() => {
        setIsTyping(false);

        // 1. Outcome preview
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content: plainSummary,
            type: "outcome_preview",
            data: {
              outcomeLabel: outcome.label,
              outcomeRange: outcome.range,
              budget,
              interests: [],
              locations: finalLocations,
              ...(assumptions?.length
                ? { inferredAssumptions: assumptions }
                : {}),
              ...(refinementQ ? { refinementQuestion: refinementQ } : {}),
            },
          },
        ]);

        // 2. Copy suggestion — 900ms later
        if (copyResult.primaryCopy.headline && copyResult.primaryCopy.primary) {
          scheduleTimer(() => {
            const copyId = Date.now().toString();
            setMessages((prev) => [
              ...prev,
              {
                id: copyId,
                role: "ai",
                content: "Here's your ad copy — ready to use:",
                type: "copy_suggestion",
                data: {
                  adCopy: copyResult.primaryCopy,
                  adCopyVariations: copyResult.variations,
                },
              },
            ]);
            setCopyReady(true);
            setChatPhase("refining");

            // 3. Clarification nudge — 900ms after copy
            if (
              result.meta?.needs_clarification &&
              result.meta?.clarification_question
            ) {
              scheduleTimer(() => {
                lockScrollToCopy.current = copyId;
                setMessages((prev) => [
                  ...prev,
                  {
                    id: (Date.now() + 2).toString(),
                    role: "ai",
                    content: `Your ads are ready! Want sharper targeting? ${result.meta.clarification_question}`,
                    type: result.meta.clarification_options?.length
                      ? "clarification_choice"
                      : "text",
                    data: {
                      clarificationOptions:
                        result.meta.clarification_options || [],
                    },
                  },
                ]);
              }, 900);
            }
          }, 900);
        }
      }, 1000);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setIsTyping(false);

      const isNetworkError =
        err?.message?.toLowerCase().includes("timeout") ||
        err?.message?.toLowerCase().includes("network") ||
        err?.message?.toLowerCase().includes("fetch") ||
        err?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        err?.cause?.code === "UND_ERR_CONNECT_TIMEOUT";

      if (isNetworkError) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== userMsg.id),
          {
            id: Date.now().toString(),
            role: "ai",
            content:
              "I had a connection issue. Tap 'Try Again' and I'll build your campaign.",
            type: "network_error",
            data: { originalInput: text },
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== userMsg.id),
          {
            id: Date.now().toString(),
            role: "ai",
            content: "Something went wrong on our end. Try sending that again.",
            type: "recovery",
            data: { originalInput: text },
          },
        ]);
      }
    }
  };

  // ── Extracted triage routing (reduces handleSend nesting) ────────────────

  /** Handle 429 rate-limit responses. Returns void (always early-exits handleSend). */
  async function handleRateLimit(res: Response) {
    const errBody = await res.json().catch(() => ({}));
    setIsTyping(false);
    if (errBody?.noCredits) {
      toast.error(
        errBody.error || "No credits left. Top up to keep chatting.",
        { duration: 7000, action: { label: "Top Up", onClick: () => router.push("/settings/subscription") } },
      );
    } else if (errBody?.limitReached) {
      setUpgradeDialogOpen(true);
      toast.error(
        errBody.error || "Monthly AI chat limit reached. Upgrade to continue.",
        { duration: 6000 },
      );
    } else {
      toast.error("Too many requests. Please wait a moment and try again.");
    }
  }

  /** Route triage-only responses (TYPE_G/B/C/E/F). Returns true if handled. */
  function routeTriageResponse(result: AIStrategyResult, triggerText?: string): boolean {
    const meta = result.meta;
    if (!meta) return false;

    if (meta.input_type === "TYPE_G") {
      // Remember what the user said so we can use it (or org profile fallback) when they confirm
      if (triggerText) typegTriggerRef.current = triggerText;
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content:
            meta.proposed_plan ||
            "Based on your business profile, I can create an ad now. Want me to proceed, or would you like to adjust anything?",
          type: "clarification_choice",
          data: { clarificationOptions: ["Yes, proceed", "Let me adjust"] },
        },
      ]);
      return true;
    }

    if (meta.input_type === "TYPE_B") {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content:
            meta.clarification_question ||
            "What are you selling? (e.g. 'Ankara bags Lagos', 'Skincare Abuja')",
          type: "text",
        },
      ]);
      return true;
    }

    if (
      meta.is_question &&
      (meta.input_type === "TYPE_C" || meta.input_type === "TYPE_E")
    ) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content: meta.question_answer || "Good question. What are you selling?",
          type: "text",
        },
      ]);
      return true;
    }

    if (meta.input_type === "TYPE_F") {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content:
            meta.question_answer ||
            "I can only help with ad campaigns. Tell me what you're selling and I'll build your ad.",
          type: "text",
        },
      ]);
      return true;
    }

    return false;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Mobile: floating "Review Audience" button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Sheet open={summaryOpen} onOpenChange={setSummaryOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="h-14 px-5 rounded-lg shadow-sm border border-border bg-primary text-primary-foreground font-bold gap-2"
            >
              <ListSelect className="h-5 w-5" />
              Review Audience
              {targetInterests.length > 0 && (
                <span className="bg-primary-foreground/20 text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  {targetInterests.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] rounded-t-3xl overflow-y-auto pb-8"
          >
            <SheetHeader className="mb-4">
              <SheetTitle className="font-heading flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" /> Audience Summary
              </SheetTitle>
            </SheetHeader>
            <AudienceSummaryPanel />
          </SheetContent>
        </Sheet>
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        className="min-h-[500px] animate-in fade-in slide-in-from-bottom-4"
      >
        {/* LEFT: CHAT */}
        <ResizablePanel defaultSize={65} minSize={55} maxSize={80}>
          <ChatInterface
            messages={messages}
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSend={handleSend}
            isTyping={isTyping}
            isRefiningCopy={isRefiningCopy}
            isReadingUrl={isReadingUrl}
            placeholder={currentPlaceholder}
            scrollRef={scrollRef}
            campaignStore={campaignStore}
            actions={{
              removeInterest,
              addInterest,
              removeLocation,
              addLocation,
              handleCopyRefinement,
              confirmAudience: handleConfirmFromChat,
            }}
            copyReady={copyReady}
          />
        </ResizablePanel>

        <ResizableHandle className="hidden lg:flex w-[1.5px] bg-border hover:bg-accent transition-all" />

        {/* RIGHT: AUDIENCE SUMMARY (desktop only) */}
        <ResizablePanel
          defaultSize={35}
          minSize={20}
          maxSize={45}
          className="hidden lg:block"
        >
          <div className="bg-card rounded-lg shadow-sm border border-border h-full p-5 flex flex-col overflow-hidden">
            <h3 className="font-bold text-base text-foreground mb-4 flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" /> Audience Summary
            </h3>
            <AudienceSummaryPanel />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <PaymentDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        planId="growth"
      />
    </>
  );
}
