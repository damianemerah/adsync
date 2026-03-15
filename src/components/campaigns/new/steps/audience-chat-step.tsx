"use client";

import {
  useCampaignStore,
  Message,
  CopyVariation,
} from "@/stores/campaign-store";
import { classifyLocally } from "@/lib/ai/preprocessor";
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
  mapIntentToCTA,
  generateWhatsAppMessage,
} from "@/lib/constants/cta-options";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Check, ListSelect } from "iconoir-react";
import type { AIStrategyResult } from "@/lib/ai/types";
import {
  resolveInterests,
  resolveBehaviors,
  resolveLifeEvents,
  resolveLocation,
  normalizeLocationName,
  LAGOS_DEFAULT,
} from "@/lib/utils/targeting-resolver";
import { estimateBudget } from "@/lib/intelligence/estimator";
import type { AdSyncObjective } from "@/lib/constants";
import { CREDIT_COSTS, TIER_CONFIG } from "@/lib/constants";
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
  const [isRefiningCopy, setIsRefiningCopy] = useState(false);
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
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          description: aiPrompt,
          location: buildLocationString(locations), // send ALL locations, not just first
          objective: objective || "whatsapp",
          currentCopy: adCopy.headline
            ? { headline: adCopy.headline, primary: adCopy.primary }
            : undefined,
          refinementInstruction: instruction,
        }),
      });
      if (!res.ok) throw new Error("Refinement failed");
      const result = await res.json();

      // Build sliced variations from refinement result
      const allHeadlines: string[] = (result.headline || []).slice(
        0,
        maxCopyVariations,
      );
      const allCopies: string[] = (result.copy || []).slice(
        0,
        maxCopyVariations,
      );
      const variations: CopyVariation[] = allHeadlines.map(
        (h: string, i: number) => ({
          headline: h,
          primary: allCopies[i] || allCopies[0] || "",
        }),
      );
      const newCopy = variations[0] ?? { headline: "", primary: "" };

      const ctaFromIntent = mapIntentToCTA(
        result.ctaIntent || "buy_now",
        platform,
        objective,
      );
      const whatsappMsg =
        result.whatsappMessage ||
        (ctaFromIntent.code === "SEND_MESSAGE"
          ? generateWhatsAppMessage({ headline: newCopy.headline, locations })
          : undefined);

      updateDraft({
        adCopy: {
          ...newCopy,
          cta: {
            intent: result.ctaIntent || "buy_now",
            platformCode: ctaFromIntent.code,
            displayLabel: ctaFromIntent.label,
            whatsappMessage: whatsappMsg,
          },
        },
        adCopyVariations: variations,
        selectedCopyIdx: 0,
      });

      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content: "Here's the updated version:",
            type: "copy_suggestion",
            data: { adCopy: newCopy, adCopyVariations: variations },
          },
        ]);
      }, 800);
      incrementRefinementCount();
    } catch {
      setIsTyping(false);
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
        // Silent
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [messages.length]);

  // ─── Main Send Handler ─────────────────────────────────────────────────────

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

  const handleSend = async (overrideValue?: string) => {
    const raw = overrideValue || inputValue;
    const text = normalizeAmounts(raw);
    if (!text.trim() || isTyping) return;

    const isInternalSentinel = text.startsWith("__OBJECTIVE_");

    // Triage will determine if this is a refinement using conversation history.
    // No client-side merging or heuristic length checks.
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
      setIsTyping(false);
      const businessDesc = aiPrompt;
      if (!businessDesc) {
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
      setIsTyping(true);
      try {
        console.log("REWRITE REQUEST🔥🔥🔥", {
          description: businessDesc,
          location: buildLocationString(locations),
          objective: objective || "whatsapp",
          conversationHistory: buildTriageHistory(messages),
        });
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          body: JSON.stringify({
            description: businessDesc,
            location: buildLocationString(locations),
            objective: objective || "whatsapp",
            conversationHistory: buildTriageHistory(messages),
          }),
        });
        if (!res.ok) throw new Error("Rebuild failed");
        const result: AIStrategyResult = await res.json();

        console.log("REWRITE RESULT🔥🔥🔥", result);

        const rewriteInterestNames = (result.interests || []).map(
          (interest: any) =>
            typeof interest === "string" ? interest : interest.name,
        );
        const rewriteBehaviorNames = (result.behaviors || []).map((b: any) =>
          typeof b === "string" ? b : b.name,
        );
        const rewriteLifeEventNames = (result.lifeEvents || []).map((e: any) =>
          typeof e === "string" ? e : e.name,
        );

        const [
          resolvedInterests,
          rewriteResolvedBehaviors,
          rewriteResolvedLifeEvents,
        ] = await Promise.all([
          resolveInterests(rewriteInterestNames, async (query) => {
            const r = await fetch(
              `/api/meta/search-interest?query=${encodeURIComponent(query)}`,
            );
            return r.ok ? r.json() : [];
          }),
          resolveBehaviors(rewriteBehaviorNames, async (query) => {
            const r = await fetch(
              `/api/meta/search-behavior?query=${encodeURIComponent(query)}`,
            );
            return r.ok ? r.json() : [];
          }),
          resolveLifeEvents(rewriteLifeEventNames, async (query) => {
            const r = await fetch(
              `/api/meta/search-life-events?query=${encodeURIComponent(query)}`,
            );
            return r.ok ? r.json() : [];
          }),
        ]);

        const allHeadlines: string[] = (result.headline || []).slice(
          0,
          maxCopyVariations,
        );
        const allCopies: string[] = (result.copy || []).slice(
          0,
          maxCopyVariations,
        );
        const variations: CopyVariation[] = allHeadlines.map(
          (h: string, i: number) => ({
            headline: h,
            primary: allCopies[i] || allCopies[0] || "",
          }),
        );
        const newCopy = variations[0] ?? { headline: "", primary: "" };

        const ctaFromIntent = mapIntentToCTA(
          result.ctaIntent || "buy_now",
          platform,
          objective,
        );
        const whatsappMsg =
          result.whatsappMessage ||
          (ctaFromIntent.code === "SEND_MESSAGE"
            ? generateWhatsAppMessage({ headline: newCopy.headline, locations })
            : undefined);

        updateDraft({
          targetInterests: resolvedInterests.filter(Boolean),
          targetBehaviors: rewriteResolvedBehaviors.map(({ id, name }) => ({
            id,
            name,
          })),
          targetLifeEvents: rewriteResolvedLifeEvents.map(({ id, name }) => ({
            id,
            name,
          })),
          ageRange: {
            min: result.demographics?.age_min || 18,
            max: result.demographics?.age_max || 65,
          },
          gender: result.demographics?.gender || "all",
          adCopy: {
            ...newCopy,
            cta: {
              intent: result.ctaIntent || "buy_now",
              platformCode: ctaFromIntent.code,
              displayLabel: ctaFromIntent.label,
              whatsappMessage: whatsappMsg,
            },
          },
          adCopyVariations: variations,
          selectedCopyIdx: 0,
          lastGeneratedObjective: objective || "whatsapp",
        });

        const outcome = buildOutcomePreview(objective, budget);
        const plainSummary =
          result.plain_english_summary ||
          `Rebuilt for ${(objective || "whatsapp").toUpperCase()} — targeting ${resolvedInterests.length} audiences.`;

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
              interests: resolvedInterests,
              locations,
            },
          },
        ]);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "ai",
              content: "Here's the updated copy for your new goal:",
              type: "copy_suggestion",
              data: { adCopy: newCopy, adCopyVariations: variations },
            },
          ]);
          setCopyReady(true);
          setChatPhase("refining");
        }, 900);
      } catch {
        setIsTyping(false);
        // Remove the failed user message so retrying doesn't create duplicates
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

      if (!res.ok) throw new Error("AI Failed");
      const result: AIStrategyResult = await res.json();

      // ── TYPE_B from triage (single bare word — triage returned early) ──────
      if (result.meta?.input_type === "TYPE_B") {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content:
              result.meta.clarification_question ||
              "What are you selling? (e.g. 'Ankara bags Lagos', 'Skincare Abuja')",
            type: "text",
          },
        ]);
        return;
      }

      // ── TYPE_C / TYPE_E — question or sign-off (triage returned early) ─────
      if (
        result.meta?.is_question &&
        (result.meta.input_type === "TYPE_C" ||
          result.meta.input_type === "TYPE_E")
      ) {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content:
              result.meta.question_answer ||
              "Good question. What are you selling?",
            type: "text",
          },
        ]);
        return;
      }

      // ── TYPE_F / TYPE_H — image actions (defer to creative step) ──────────
      if (
        result.meta?.input_type === "TYPE_F" ||
        result.meta?.input_type === "TYPE_H"
      ) {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content:
              "You can generate and edit images in the next 'Creative' step.",
            type: "text",
          },
        ]);
        return;
      }

      // ── TYPE_D — copy refinement ───────────────────────────────────────────
      if (result.meta?.input_type === "TYPE_D" && adCopy.headline) {
        setIsTyping(false);
        await handleCopyRefinement(text);
        return;
      }

      // ── Full strategy — resolve targeting ──────────────────────────────────
      const interestNames = (result.interests || []).map((i: any) =>
        typeof i === "string" ? i : i.name,
      );
      const behaviorNames = (result.behaviors || []).map((b: any) =>
        typeof b === "string" ? b : b.name,
      );
      const lifeEventNames = (result.lifeEvents || []).map((e: any) =>
        typeof e === "string" ? e : e.name,
      );
      console.log("Suggested Locations 👇👇", result.suggestedLocations);
      console.log("Suggested Interests 👇👇", result.interests);
      console.log("Suggested Behaviors 👇👇", result.behaviors);
      console.log("Suggested Life Events 👇👇", result.lifeEvents);
      const locationNames: string[] = Array.from(
        new Set(
          (result.suggestedLocations || []).map((name: string) =>
            normalizeLocationName(name),
          ),
        ),
      );

      console.log("Location Names 👇👇", locationNames);

      const [
        resolvedInterests,
        resolvedLocations,
        resolvedBehaviors,
        resolvedLifeEvents,
      ] = await Promise.all([
        resolveInterests(interestNames, async (query) => {
          const r = await fetch(
            `/api/meta/search-interest?query=${encodeURIComponent(query)}`,
          );
          return r.ok ? r.json() : [];
        }),
        Promise.all(
          locationNames.map((name: string) =>
            resolveLocation(name, async (query, type) => {
              const r = await fetch(
                `/api/meta/search-location?query=${encodeURIComponent(query)}&type=${type}`,
              );
              return r.ok ? r.json() : [];
            }),
          ),
        ),
        resolveBehaviors(behaviorNames, async (query) => {
          const r = await fetch(
            `/api/meta/search-behavior?query=${encodeURIComponent(query)}`,
          );
          return r.ok ? r.json() : [];
        }),
        resolveLifeEvents(lifeEventNames, async (query) => {
          const r = await fetch(
            `/api/meta/search-life-events?query=${encodeURIComponent(query)}`,
          );
          return r.ok ? r.json() : [];
        }),
      ]);

      console.log("Resolved Locations 👇👇", resolvedLocations);
      console.log("Resolved Interests 👇👇", resolvedInterests);
      console.log("Resolved Behaviors 👇👇", resolvedBehaviors);
      console.log("Resolved Life Events 👇👇", resolvedLifeEvents);

      const validLocations = resolvedLocations.filter(Boolean) as NonNullable<
        (typeof resolvedLocations)[number]
      >[];

      console.log("Valid Locations 👇👇", validLocations);

      const normalizedInterests = resolvedInterests.map(({ id, name }) => ({
        id,
        name,
      }));
      const normalizedBehaviors = resolvedBehaviors.map(({ id, name }) => ({
        id,
        name,
      }));
      const normalizedLifeEvents = resolvedLifeEvents.map(({ id, name }) => ({
        id,
        name,
      }));
      console.log("[Targeting] Resolved behaviors:", normalizedBehaviors);
      console.log("[Targeting] Resolved life events:", normalizedLifeEvents);

      // Deduplicate validLocations by id just to be absolutely certain we don't duplicate
      const uniqueValidLocations = Array.from(
        new Map(validLocations.map((l) => [l.id, l])).values(),
      );

      const finalLocations =
        locations.length > 0
          ? locations
          : uniqueValidLocations.length > 0
            ? uniqueValidLocations
            : [LAGOS_DEFAULT];

      // ── Build tier-sliced copy variations ─────────────────────────────────
      const allHeadlines: string[] = (result.headline || []).slice(
        0,
        maxCopyVariations,
      );
      const allCopies: string[] = (result.copy || []).slice(
        0,
        maxCopyVariations,
      );
      const variations: CopyVariation[] = allHeadlines.map(
        (h: string, i: number) => ({
          headline: h,
          primary: allCopies[i] || allCopies[0] || "",
        }),
      );
      const primaryCopy = variations[0] ?? { headline: "", primary: "" };

      // ── Update Store ──────────────────────────────────────────────────────
      const ctaFromIntent = mapIntentToCTA(
        result.ctaIntent || "buy_now",
        platform,
        objective,
      );
      const whatsappMsg =
        result.whatsappMessage ||
        (ctaFromIntent.code === "SEND_MESSAGE"
          ? generateWhatsAppMessage({
              headline: primaryCopy.headline,
              locations,
            })
          : undefined);

      updateDraft({
        aiPrompt: text,
        targetInterests: normalizedInterests,
        targetBehaviors: normalizedBehaviors,
        targetLifeEvents: normalizedLifeEvents,
        ageRange: {
          min: result.demographics?.age_min || 18,
          max: result.demographics?.age_max || 65,
        },
        gender: result.demographics?.gender || "all",
        campaignName:
          !campaignName || campaignName === "Untitled Campaign"
            ? generateCampaignName(text, normalizedInterests)
            : campaignName,
        adCopy: {
          ...primaryCopy,
          cta: {
            intent: result.ctaIntent || "buy_now",
            platformCode: ctaFromIntent.code,
            displayLabel: ctaFromIntent.label,
            whatsappMessage: whatsappMsg,
          },
        },
        adCopyVariations: variations,
        selectedCopyIdx: 0,
        locations: finalLocations,
        lastGeneratedObjective: objective || "whatsapp",
        suggestedLeadForm: result.suggestedLeadForm ?? null,
      });

      const outcome = buildOutcomePreview(objective, budget);
      const plainSummary =
        result.plain_english_summary ||
        `Targeting ${result.demographics?.gender === "female" ? "women" : result.demographics?.gender === "male" ? "men" : "people"} ${result.demographics?.age_min}–${result.demographics?.age_max} in ${finalLocations.map((l) => l.name).join(", ")}.`;

      updateDraft({ latestAiSummary: plainSummary });

      const assumptions = result.meta?.inferred_assumptions;
      const refinementQ = result.meta?.refinement_question;

      // ── Render Messages ────────────────────────────────────────────────────
      setTimeout(() => {
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
              interests: normalizedInterests,
              locations: finalLocations,
              ...(assumptions?.length
                ? { inferredAssumptions: assumptions }
                : {}),
              ...(refinementQ ? { refinementQuestion: refinementQ } : {}),
            },
          },
        ]);

        // 2. Copy suggestion — 900ms later
        if (primaryCopy.headline && primaryCopy.primary) {
          setTimeout(() => {
            const copyId = Date.now().toString();
            setMessages((prev) => [
              ...prev,
              {
                id: copyId,
                role: "ai",
                content: "Here's your ad copy — ready to use:",
                type: "copy_suggestion",
                data: {
                  adCopy: primaryCopy,
                  adCopyVariations: variations,
                },
              },
            ]);
            setCopyReady(true);
            setChatPhase("refining");

            // 3. Clarification nudge — 900ms after copy (post-generation, not a gate)
            if (
              result.meta?.needs_clarification &&
              result.meta?.clarification_question
            ) {
              setTimeout(() => {
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
      setIsTyping(false);

      const isNetworkError =
        err?.message?.toLowerCase().includes("timeout") ||
        err?.message?.toLowerCase().includes("network") ||
        err?.message?.toLowerCase().includes("fetch") ||
        err?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        err?.cause?.code === "UND_ERR_CONNECT_TIMEOUT";

      if (isNetworkError) {
        // Remove the user message — it will be re-added when they tap "Try Again"
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
        // Remove the failed user message so a retry starts fresh
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        setMessages((prev) => [
          ...prev,
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Mobile: floating "Review Audience" button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Sheet open={summaryOpen} onOpenChange={setSummaryOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="h-14 px-5 rounded-2xl shadow-soft bg-primary text-primary-foreground font-bold gap-2"
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
          <div className="bg-card border border-border rounded-3xl shadow-soft h-full p-5 flex flex-col overflow-hidden">
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
