/**
 * useAudienceChat
 *
 * Custom hook that owns all non-render logic for AudienceChatStep:
 *  - All refs (abort controller, pending timers, scroll-lock, draft-id mirror)
 *  - All business useState (isTyping, copyReady, chat phase, upgrade dialogs, …)
 *  - 7 useEffect hooks (cleanup, URL indicator, init-chat, objective mismatch,
 *    scroll-lock, auto-save, placeholder rotation)
 *  - handleSend / handleCopyRefinement / handleEarlyResponse / handleRateLimit
 *  - Audience editing (addInterest, removeInterest, addLocation, removeLocation)
 *  - Tier / credit guards
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useCampaignStore,
  type Message,
  type TargetingOption,
  type LocationOption,
} from "@/stores/campaign-store";
import { messageContainsUrl } from "@/lib/ai/url-scraper";
import { saveDraft } from "@/actions/drafts";
import { useSubscription } from "@/hooks/use-subscription";
import { useOrganization } from "@/hooks/use-organization";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";
import type { AIStrategyResult } from "@/lib/ai/types";
import { TIER_CONFIG } from "@/lib/constants";
import {
  extractTargetingNames,
  applyCopyResult,
  resolveLocationsOnly,
  runPhase2Targeting,
  type Phase2Result,
} from "./chat-handlers";
import {
  CHAT_PLACEHOLDERS,
  buildTriageHistory,
  generateCampaignName,
  buildLocationString,
  buildOutcomePreview,
  normalizeAmounts,
} from "./helpers";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseAudienceChatOptions {
  persistedDraftId: string | null;
  onDraftSaved: (id: string) => void;
}

export interface UseAudienceChatReturn {
  // UI state
  isTyping: boolean;
  isReadingUrl: boolean;
  isRefiningCopy: boolean;
  copyReady: boolean;
  chatPhase: "initial" | "refining";
  upgradeDialogOpen: boolean;
  setUpgradeDialogOpen: (open: boolean) => void;
  trialExpired: boolean;
  subscriptionInactive: boolean;
  summaryOpen: boolean;
  setSummaryOpen: (open: boolean) => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  currentPlaceholder: string;
  // Audience snapshot for ChatInterface prop
  campaignStore: {
    targetInterests: TargetingOption[];
    targetBehaviors: TargetingOption[];
    ageRange: { min: number; max: number };
    gender: string;
    locations: LocationOption[];
  };
  // Handlers
  handleSend: (overrideValue?: string) => Promise<void>;
  handleCopyRefinement: (instruction: string) => Promise<void>;
  handleConfirmFromChat: () => void;
  // Audience editing
  removeInterest: (interest: TargetingOption) => void;
  addInterest: (interest: TargetingOption) => void;
  removeLocation: (
    loc: LocationOption & { key?: string },
  ) => void;
  addLocation: (
    loc: Omit<LocationOption, "id"> & {
      key?: string;
      country_name?: string;
    },
  ) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAudienceChat({
  persistedDraftId,
  onDraftSaved,
}: UseAudienceChatOptions): UseAudienceChatReturn {
  const router = useRouter();

  // ── Store slices ──────────────────────────────────────────────────────────
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

  const refinementCount = useCampaignStore((s) => s.refinementCount);
  const incrementRefinementCount = useCampaignStore(
    (s) => s.incrementRefinementCount,
  );

  // ── Tier / credit guards ──────────────────────────────────────────────────
  const { activeOrgId } = useActiveOrgContext();
  const { organization: currentOrg } = useOrganization(activeOrgId);
  const { data: subscription } = useSubscription();
  const tier = (subscription?.org?.tier ?? "starter") as keyof typeof TIER_CONFIG;
  const maxRefinements =
    TIER_CONFIG[tier]?.ai?.maxRefinementsPerCampaign ?? Infinity;
  const maxCopyVariations = TIER_CONFIG[tier]?.ai?.maxCopyVariations ?? 2;

  // ── UI state ──────────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isRefiningCopy, setIsRefiningCopy] = useState(false);
  const [isReadingUrl, setIsReadingUrl] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [subscriptionInactive, setSubscriptionInactive] = useState(false);
  const [copyReady, setCopyReady] = useState(false);
  const [chatPhase, setChatPhase] = useState<"initial" | "refining">(
    "initial",
  );

  // ── Refs ──────────────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const lockScrollToCopy = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Always reflects the latest persistedDraftId so Phase-2 callbacks aren't stale
  const persistedDraftIdRef = useRef<string | null>(persistedDraftId);
  useEffect(() => {
    persistedDraftIdRef.current = persistedDraftId;
  }, [persistedDraftId]);

  // ── Side effects ──────────────────────────────────────────────────────────

  // Clear URL-reading indicator once the AI finishes responding
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

  // Rotate placeholder every 4 s while input is empty
  useEffect(() => {
    if (inputValue || chatPhase === "refining") return;
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % CHAT_PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [inputValue, chatPhase]);

  // Init-chat greeting (runs once on mount)
  useEffect(() => {
    if (messages.length > 0) return;

    const greeting =
      objective === "whatsapp"
        ? "Tell me about what you sell and I'll build your ad.\n\nFor best results, you can include:\n• What you sell (e.g. \"women's ankara gowns\", \"shawarma delivery\")\n• Your price range (e.g. \"from ₦5,000\" or \"₦10k–₦25k\")\n• Who you're targeting (e.g. \"women\", \"men\", \"both\")\n\nYou can also paste your website URL and I'll read it automatically."
        : objective === "traffic"
          ? "Tell me about what you sell and I'll build your traffic ad.\n\nYou can include: what you sell, your price range, and who you're targeting. You can also paste your website URL."
          : "Tell me about what you sell and I'll build your ad.\n\nInclude: what you sell, your price range, and who you're targeting. You can also paste your website URL.";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional snapshot-at-mount
  }, []);

  // Objective mismatch detection
  useEffect(() => {
    if (
      !objective ||
      !lastGeneratedObjective ||
      objective === lastGeneratedObjective ||
      messages.length === 0
    )
      return;

    const lastAiMsg = [...messages].reverse().find((m) => m.role === "ai");
    if (lastAiMsg?.data?.isObjectiveMismatchPrompt) return;

    const fromGoal = lastGeneratedObjective.toUpperCase();
    const toGoal = objective.toUpperCase();

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "ai",
        content: `You switched from ${fromGoal} to ${toGoal}. Should I rebuild the strategy and copy for the new goal?`,
        type: "clarification_choice",
        data: {
          isObjectiveMismatchPrompt: true,
          clarificationOptions: [
            { label: `Yes, rebuild for ${toGoal}`, mode: "send" },
            { label: "No, keep it", mode: "send" },
          ],
        },
      },
    ]);
  }, [objective, lastGeneratedObjective]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll-lock to the most recent copy suggestion
  useEffect(() => {
    if (lockScrollToCopy.current) {
      const el = document.getElementById(`msg-${lockScrollToCopy.current}`);
      if (el) {
        el.scrollIntoView({ block: "start", behavior: "smooth" });
        lockScrollToCopy.current = null;
        return;
      }
    }
  }, [messages, isTyping]);

  // Auto-save on every new AI message
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- messages.length is the intentional trigger
  }, [messages.length]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const currentPlaceholder =
    chatPhase === "refining"
      ? "Refine copy, fix details, or describe a different product…"
      : CHAT_PLACEHOLDERS[placeholderIdx];

  const campaignStore = {
    targetInterests,
    targetBehaviors,
    ageRange,
    gender,
    locations,
  };

  // ── Timer helpers ──────────────────────────────────────────────────────────

  function scheduleTimer(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    pendingTimers.current.push(id);
    return id;
  }

  function clearPendingTimers() {
    pendingTimers.current.forEach(clearTimeout);
    pendingTimers.current = [];
  }

  // ── Audience editing ───────────────────────────────────────────────────────

  const removeInterest = useCallback(
    (interest: TargetingOption) => {
      updateDraft({
        targetInterests: targetInterests.filter(
          (i) => i.id !== interest.id && i.name !== interest.name,
        ),
      });
    },
    [targetInterests, updateDraft],
  );

  const addInterest = useCallback(
    (interest: TargetingOption) => {
      if (!targetInterests.some((i) => i.id === interest.id)) {
        updateDraft({ targetInterests: [...targetInterests, interest] });
      }
    },
    [targetInterests, updateDraft],
  );

  const removeLocation = useCallback(
    (loc: LocationOption & { key?: string }) => {
      const id = loc.id || loc.key;
      updateDraft({
        locations: locations.filter((l) => l.id !== id),
      });
    },
    [locations, updateDraft],
  );

  const addLocation = useCallback(
    (
      loc: Omit<LocationOption, "id"> & {
        key?: string;
        country_name?: string;
      },
    ) => {
      const newLoc: LocationOption = {
        id: loc.key || (loc as LocationOption).id,
        name: loc.name,
        type: loc.type,
        country: loc.country_name || loc.country,
      };
      if (!locations.some((l) => l.id === newLoc.id)) {
        updateDraft({ locations: [...locations, newLoc] });
      }
    },
    [locations, updateDraft],
  );

  // ── handleConfirmFromChat ──────────────────────────────────────────────────

  const handleConfirmFromChat = useCallback(() => {
    if (window.innerWidth < 1024) {
      setSummaryOpen(true);
    } else {
      setStep(3);
    }
  }, [setStep]);

  // ── handleRateLimit ────────────────────────────────────────────────────────

  async function handleRateLimit(res: Response) {
    const errBody = await res.json().catch(() => ({}));
    setIsTyping(false);
    if (errBody?.noCredits) {
      toast.error(
        errBody.error || "No credits left. Top up to keep chatting.",
        {
          duration: 7000,
          action: {
            label: "Top Up",
            onClick: () => router.push("/settings/subscription"),
          },
        },
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

  // ── handleEarlyResponse ────────────────────────────────────────────────────

  function handleEarlyResponse(result: AIStrategyResult): boolean {
    const kind = result.responseKind;
    if (!kind || kind === "strategy") return false;

    if (kind === "refine") {
      if (result.copy?.length && result.headline?.length) {
        if (tier === "starter" && refinementCount >= maxRefinements) {
          setIsTyping(false);
          setUpgradeDialogOpen(true);
          return true;
        }
        setIsRefiningCopy(true);
        const { variations, primaryCopy, ctaData } = applyCopyResult(result, {
          maxCopyVariations,
          platform,
          objective,
          locations,
        });
        updateDraft({
          adCopy: { ...primaryCopy, cta: ctaData },
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
          scheduleTimer(() => {
            setIsRefiningCopy(false);
            incrementRefinementCount();
          }, 600);
        }, 800);
        return true;
      }
      return false;
    }

    setIsTyping(false);

    if (kind === "confirm") {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content:
            result.meta?.proposed_plan ||
            "Based on your business profile, I can create an ad now. Want me to proceed, or would you like to adjust anything?",
          type: "clarification_choice",
          data: {
            clarificationOptions: [
              { label: "Yes, proceed", mode: "send" },
              { label: "Let me adjust", mode: "send" },
            ],
          },
        },
      ]);
      return true;
    }

    if (kind === "clarify") {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content:
            result.meta?.clarification_question ||
            "What are you selling? (e.g. 'Ankara bags Lagos', 'Skincare Abuja')",
          type: "text",
        },
      ]);
      return true;
    }

    if (kind === "answer" || kind === "redirect") {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content:
            result.meta?.question_answer ||
            result.meta?.clarification_question ||
            "How can I help?",
          type: "text",
        },
      ]);
      return true;
    }

    if (kind === "noop") {
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
      return true;
    }

    return false;
  }

  // ── handleCopyRefinement ───────────────────────────────────────────────────

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
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setIsTyping(false);
      toast.error("Copy refinement failed. Please try again.", {
        duration: 4000,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content:
            "I couldn't refine the copy. Try sending your feedback again.",
          type: "recovery",
        },
      ]);
    } finally {
      setIsRefiningCopy(false);
    }
  };

  // ── handleSend ─────────────────────────────────────────────────────────────

  const handleSend = async (overrideValue?: string) => {
    const raw = overrideValue || inputValue;
    const text = normalizeAmounts(raw);
    if (!text.trim() || isTyping) return;

    abortRef.current?.abort();
    clearPendingTimers();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!overrideValue) setInputValue("");
    setIsTyping(true);
    if (messageContainsUrl(text)) setIsReadingUrl(true);

    setCopyReady(false);
    setChatPhase("initial");

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          description: text,
          location: buildLocationString(locations),
          objective: objective || "whatsapp",
          currentCopy: adCopy.headline
            ? { headline: adCopy.headline, primary: adCopy.primary }
            : undefined,
          conversationHistory: buildTriageHistory(messages),
        }),
      });

      if (res.status === 429) {
        await handleRateLimit(res);
        return;
      }

      if (res.status === 403) {
        const errBody = await res.json().catch(() => ({}));
        const msg: string = errBody?.error ?? "";
        setIsTyping(false);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== userMsg.id),
          userMsg,
        ]);
        if (msg.toLowerCase().includes("trial")) {
          setTrialExpired(true);
        } else {
          setSubscriptionInactive(true);
        }
        return;
      }

      if (!res.ok) throw new Error("AI Failed");
      const result: AIStrategyResult = await res.json();

      const earlyReturn = handleEarlyResponse(result);
      if (earlyReturn) return;

      // Phase 1: resolve locations + copy
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

      const isConfirmPhrase =
        /^(yes|proceed|go ahead|ok|okay|yep|sure|do it|yes proceed|make it|create it|do am|oya do am)$/i.test(
          text.trim(),
        );
      const effectiveAiPrompt =
        isConfirmPhrase &&
        (currentOrg?.business_description || result.plain_english_summary)
          ? currentOrg?.business_description || result.plain_english_summary!
          : text;

      updateDraft({
        aiPrompt: effectiveAiPrompt,
        resolvedSiteContext:
          (result as AIStrategyResult & { siteContextSummary?: string })
            .siteContextSummary ?? null,
        ageRange: {
          min: result.demographics?.age_min || 18,
          max: result.demographics?.age_max || 65,
        },
        gender: result.demographics?.gender || "all",
        campaignName:
          !campaignName || campaignName === "Untitled Campaign"
            ? generateCampaignName(effectiveAiPrompt, result.interests || [])
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
        targetInterests: [],
        targetBehaviors: [],
        targetLifeEvents: [],
        targetWorkPositions: [],
        targetIndustries: [],
        targetingMode: result.targeting_mode ?? null,
        isResolvingTargeting: true,
        targetingResolutionError: false,
      });

      // Phase 2 in the background (no await — fire-and-forget)
      runPhase2Targeting(
        {
          interestNames: names.interestNames,
          behaviorNames: names.behaviorNames,
          lifeEventNames: names.lifeEventNames,
          workPositionNames: names.workPositionNames,
          industryNames: names.industryNames,
          adCopy:
            copyResult.primaryCopy.primary ||
            copyResult.primaryCopy.headline,
          ctaIntent: result.ctaIntent || "buy_now",
          businessType:
            result.meta?.detected_business_type || "general",
          targetingMode: result.targeting_mode,
          locations: result.suggestedLocations,
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
          const latestDraftId = persistedDraftIdRef.current;
          saveDraft(useCampaignStore.getState(), latestDraftId ?? undefined)
            .then((savedId) => {
              if (savedId && savedId !== latestDraftId) onDraftSaved(savedId);
            })
            .catch(() => {});
        },
        () => {
          updateDraft({
            isResolvingTargeting: false,
            targetingResolutionError: true,
          });
          toast.warning(
            "Audience targeting took longer than expected — add interests manually.",
          );
        },
      );

      const outcome = buildOutcomePreview(objective, budget);
      const assumptions = result.meta?.inferred_assumptions;
      const refinementQ = result.meta?.refinement_question;
      const followUps = result.meta?.follow_ups?.length
        ? result.meta.follow_ups
        : null;

      // Render messages (tracked timers for safe cleanup)
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
              ...(followUps ? { followUps } : {}),
            },
          },
        ]);

        // 2. Copy suggestion — 900 ms later
        if (
          copyResult.primaryCopy.headline &&
          copyResult.primaryCopy.primary
        ) {
          scheduleTimer(() => {
            const copyId = Date.now().toString();
            lockScrollToCopy.current = copyId;
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
          }, 900);
        }
      }, 1000);
    } catch (err: unknown) {
      const errObj = err as {
        name?: string;
        message?: string;
        code?: string;
        cause?: { code?: string };
      };
      if (errObj?.name === "AbortError") return;
      setIsTyping(false);

      const isNetworkError =
        errObj?.message?.toLowerCase().includes("timeout") ||
        errObj?.message?.toLowerCase().includes("network") ||
        errObj?.message?.toLowerCase().includes("fetch") ||
        errObj?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        errObj?.cause?.code === "UND_ERR_CONNECT_TIMEOUT";

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

  // ── Public surface ─────────────────────────────────────────────────────────

  return {
    isTyping,
    isReadingUrl,
    isRefiningCopy,
    copyReady,
    chatPhase,
    upgradeDialogOpen,
    setUpgradeDialogOpen,
    trialExpired,
    subscriptionInactive,
    summaryOpen,
    setSummaryOpen,
    inputValue,
    setInputValue,
    currentPlaceholder,
    campaignStore,
    handleSend,
    handleCopyRefinement,
    handleConfirmFromChat,
    removeInterest,
    addInterest,
    removeLocation,
    addLocation,
  };
}
