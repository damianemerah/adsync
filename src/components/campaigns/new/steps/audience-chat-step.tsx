"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import { useState, useRef, useEffect } from "react";
import {
  generateAdCreative,
  stashGeneratedImage,
  saveCreativeToLibrary,
} from "@/actions/ai-images";
import { saveDraft } from "@/actions/drafts";
import { useBeforeLeave } from "@/hooks/use-before-leave";
import { useRouter, useSearchParams } from "next/navigation";
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
  resolveLocation,
  LAGOS_DEFAULT,
} from "@/lib/utils/targeting-resolver";
import { estimateBudget } from "@/lib/intelligence/estimator";
import type { AdSyncObjective } from "@/lib/constants";
import { CREDIT_COSTS, TIER_CONFIG } from "@/lib/constants";
import { useCreditBalance, useSubscription } from "@/hooks/use-subscription";
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "ai" | "user";
  content: string;
  type?:
    | "text"
    | "suggestion"
    | "summary"
    | "copy_suggestion"
    | "creative_suggestion"
    | "image_generating"
    | "image_generated"
    | "clarification_choice"
    | "outcome_preview"
    | "recovery"
    | "network_error"
    | "studio_suggestion";
  data?: {
    interests?: any[];
    locations?: any[];
    adCopy?: { headline: string; primary: string };
    generatedImage?: {
      url: string;
      prompt: string;
      seed?: number;
      creativeId?: string;
    };
    clarificationOptions?: string[];
    inferredAssumptions?: string[];
    refinementQuestion?: string;
    // Outcome preview data
    outcomeLabel?: string;
    outcomeRange?: string;
    budget?: number;
    // Error recovery
    originalInput?: string;
    detectedLocation?: string | null;
    // Studio suggestion
    editInstruction?: string;
    isMismatchPrompt?: boolean;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapObjectiveToContext(
  objective: any,
): "awareness" | "sales" | "leads" | undefined {
  if (!objective) return "sales";
  const o = objective.toString().toLowerCase();
  if (o.includes("awareness") || o.includes("brand")) return "awareness";
  if (o.includes("lead") || o.includes("engagement")) return "leads";
  return "sales";
}

function deduceAspectRatio(
  platform: "meta" | "tiktok" | null,
  objective: any,
): "1:1" | "9:16" | "4:5" | "16:9" {
  if (platform === "tiktok") return "9:16";
  if (platform === "meta") {
    if (!objective) return "1:1";
    const o = objective.toString().toLowerCase();
    if (o.includes("awareness") || o.includes("engagement")) return "9:16";
    if (o.includes("sale") || o.includes("whatsapp") || o.includes("lead"))
      return "4:5";
    return "1:1";
  }
  return "1:1";
}

// classifyUserInput and getInlineAnswer removed — Claude's core-strategy-ng
// skill handles all intent classification and question answering internally.
// The shell is now a pure renderer that reacts to meta fields in the response.

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

/** Build an outcome string based on objective and budget estimate */
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

export function AudienceChatStep() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Track draftId in a ref so saves/replaces don't cause re-renders
  const draftIdRef = useRef<string | null>(searchParams.get("draftId"));
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
    saveAudience,
    objective,
    campaignName,
    platform,
    adCopy,
    budget,
    lastGeneratedObjective,
    pendingGeneratedImage,
    selectedCreatives,
  } = useCampaignStore();

  const campaignStore = {
    targetInterests,
    targetBehaviors,
    ageRange,
    gender,
    locations,
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isRefiningCopy, setIsRefiningCopy] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  // Credit & tier guards
  const { balance } = useCreditBalance();
  const { data: subscription } = useSubscription();
  const tier = (subscription?.org?.tier ??
    "starter") as keyof typeof TIER_CONFIG;
  const maxRefinements =
    TIER_CONFIG[tier]?.ai?.maxRefinementsPerCampaign ?? Infinity;
  const refinementCount = useCampaignStore((s) => s.refinementCount);
  const incrementRefinementCount = useCampaignStore(
    (s) => s.incrementRefinementCount,
  );

  // Warn on page refresh/close if there's a pending generated image not yet accepted
  useBeforeLeave(
    !!pendingGeneratedImage,
    "You have a generated image that hasn\'t been added to your campaign yet. Leave anyway?",
  );

  // Rotate placeholder every 4 seconds while input is empty
  useEffect(() => {
    if (inputValue) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % CHAT_PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [inputValue]);

  // ─── Image Generation ──────────────────────────────────────────────────────

  const handleGenerateCreative = async (customPrompt?: string) => {
    if (isGeneratingImage) return;

    // ── Credit pre-check — don't hit server if balance insufficient ─────────
    if (balance < CREDIT_COSTS.IMAGE_GEN_PRO) {
      toast.error(
        `Not enough credits. You need ${CREDIT_COSTS.IMAGE_GEN_PRO} credits to generate an image. Top up or upgrade your plan.`,
        { duration: 5000 },
      );
      setUpgradeDialogOpen(true);
      return;
    }

    console.log("🎨 [AudienceChatStep] Generating creative...", customPrompt);
    // Ensure customPrompt is a string (and not an Event object from onClick)
    const promptToUse =
      typeof customPrompt === "string" ? customPrompt : undefined;

    const aspectRatio = deduceAspectRatio(platform, objective);

    console.log("🎨 [AudienceChatStep] Aspect ratio:", aspectRatio);

    setIsGeneratingImage(true);
    const generationId = Date.now().toString();
    toast.loading("Designing your ad creative...", { id: "image-generation" });
    setMessages((prev) => [
      ...prev,
      {
        id: generationId,
        role: "ai",
        content: "Creating your ad image with AI...",
        type: "image_generating",
      },
    ]);

    try {
      const campaignContext = {
        businessDescription: aiPrompt || "Product",
        targeting: {
          interests: targetInterests.map((i) => i.name),
          behaviors: (targetBehaviors || []).map((b) => b.name),
          locations:
            locations.length > 0
              ? locations.map((l) => l.name)
              : ["Lagos, Nigeria"],
          demographics: {
            age_min: ageRange?.min || 18,
            age_max: ageRange?.max || 65,
            gender: gender || "all",
          },
        },
        copy: {
          headline: adCopy.headline || "Premium Product",
          bodyCopy: adCopy.primary || "",
        },
        platform: platform || "meta",
        objective: mapObjectiveToContext(objective),
      };

      console.log("🎨 [AudienceChatStep] Campaign context:", campaignContext);

      // If user gave a custom prompt (e.g. "generate image, no street background"),
      // prepend it to the headline context so constraints are respected
      const composedPrompt = promptToUse
        ? `${adCopy.headline || "product shot"}. Additional instructions: ${promptToUse}`
        : adCopy.headline || "product shot";

      const result = await generateAdCreative({
        prompt: composedPrompt,
        mode: "smart",
        aspectRatio,
        creativeFormat: "social_ad",
        campaignContext,
      });

      console.log("🎨 [AudienceChatStep] Result:", result);

      setMessages((prev) => prev.filter((m) => m.id !== generationId));

      if (result.imageUrl) {
        // ── Stash to temp-uploads (no DB row yet) ──────────────────────────────
        // fal.ai URLs expire. We upload to temp-uploads so the image survives
        // step navigation and page reloads WITHOUT writing a `creatives` DB row.
        // The row is only created when the user explicitly accepts the image
        // ("Use This" / "Use in Campaign" / "Save to Library").
        toast.loading("Preparing your image...", { id: "image-persist" });
        let stashedUrl = result.imageUrl; // fallback to ephemeral if stash fails
        try {
          stashedUrl = await stashGeneratedImage(result.imageUrl);
          toast.dismiss("image-persist");
        } catch (stashErr) {
          console.warn(
            "[chat] Temp stash failed, using ephemeral URL:",
            stashErr,
          );
          toast.dismiss("image-persist");
          // No user-facing warning — the image still shows, it just won't survive a hard reload
        }

        // Store in Zustand (persisted to localStorage + next draft save)
        // so it re-appears in the chat if the user navigates away and comes back.
        updateDraft({
          pendingGeneratedImage: {
            url: stashedUrl,
            prompt: result.usedPrompt ?? "",
            aspectRatio,
            savedAt: Date.now(),
          },
        });

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content: "Here's your ad creative — what do you think?",
            type: "image_generated",
            data: {
              generatedImage: {
                url: stashedUrl,
                prompt: result.usedPrompt ?? "",
                seed: result.seed ?? undefined,
              },
            },
          },
        ]);
        toast.success("Creative ready!", { id: "image-generation" });
      } else {
        throw new Error("No image URL returned");
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== generationId));
      toast.error("Couldn't generate image. Try again or upload your own.", {
        id: "image-generation",
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content:
            "I had trouble with that image. You can try again or upload your own in the next step.",
          type: "text",
        },
      ]);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleAcceptImage = async (imageUrl: string) => {
    // Promote temp image to the permanent creatives library on first accept.
    // saveCreativeToLibrary has a dedup guard so if the URL is already
    // permanent (e.g. user came back from Studio where it was already saved)
    // it just returns the existing record with no extra DB write.
    let finalUrl = imageUrl;
    try {
      const saved = await saveCreativeToLibrary({
        imageUrl,
        prompt: pendingGeneratedImage?.prompt ?? adCopy.headline ?? "",
        aspectRatio:
          (pendingGeneratedImage?.aspectRatio as any) ??
          deduceAspectRatio(platform, objective),
      });
      finalUrl = saved.publicUrl;
    } catch (err) {
      console.warn("[chat] Could not promote image to library:", err);
      // Non-fatal — still add to campaign with whatever URL we have
    }

    updateDraft({ selectedCreatives: [finalUrl], pendingGeneratedImage: null });
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "ai",
        content:
          "Done! Creative added. Review it in the Creative tab, then set your budget when ready. 🎨",
        type: "text",
      },
    ]);
    // Go to Creative step so the user can review, swap, or crop before proceeding
    setTimeout(() => setStep(3), 800);
  };

  const handleEditInStudio = async (imageUrl: string, imagePrompt: string) => {
    // 1. Auto-save current draft so we can resume later
    const toastId = toast.loading("Saving campaign progress...");
    let savedId = null;

    try {
      const state = useCampaignStore.getState();
      savedId = await saveDraft(state);
      toast.dismiss(toastId);
    } catch (e) {
      toast.error("Could not save campaign draft");
    }

    // Resolve the correct aspect ratio:
    // 1. Use the stored ratio from the pending image (most accurate — was set at generation time)
    // 2. Fall back to deducing from platform + objective (for accepted images where pendingGeneratedImage is null)
    const aspectRatio =
      (pendingGeneratedImage?.aspectRatio as
        | "1:1"
        | "9:16"
        | "4:5"
        | "16:9"
        | undefined) ?? deduceAspectRatio(platform, objective);

    const params = new URLSearchParams({
      image: imageUrl,
      prompt: imagePrompt,
      aspectRatio,
      returnTo: `/campaigns/new?resume=true${savedId ? `&draftId=${savedId}` : ""}`,
      returnStep: "3",
    });
    router.push(`/creations/studio?${params.toString()}`);
  };

  // ─── Copy Refinement ───────────────────────────────────────────────────────

  const handleCopyRefinement = async (instruction: string) => {
    // ── Starter refinement limit guard ─────────────────────────────────────
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
    console.log(
      "💬 [AudienceChatStep] Sending copy refinement request:",
      instruction,
    );
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          description: aiPrompt,
          location: locations.length > 0 ? locations[0].name : "Nigeria",
          objective: objective || "whatsapp",
          // Pass live copy so AI edits THIS text, not a blank slate
          currentCopy: adCopy.headline
            ? { headline: adCopy.headline, primary: adCopy.primary }
            : undefined,
          // Route to OpenAI gpt-4.1-mini for faster refinement
          refinementInstruction: instruction,
        }),
      });
      if (!res.ok) throw new Error("Refinement failed");
      const result = await res.json();

      const newCopy = {
        headline: result.headline?.[0] || "",
        primary: result.copy?.[0] || "",
      };

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
            data: { adCopy: newCopy },
          },
        ]);
      }, 800);
      // Increment after successful refinement
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
      const { adCopy: storedCopy } = useCampaignStore.getState();
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
          },
        });
      }

      // ── Restore a previously generated but not-yet-accepted image ──────────
      // pendingGeneratedImage is set in the store immediately after generation
      // with a permanent Supabase URL, so it survives step navigation, page
      // reloads, and draft loads. We inject it back into the chat here so the
      // user sees it exactly where they left off.
      if (pendingGeneratedImage) {
        history.push({
          id: "hist-pending-image",
          role: "ai",
          content:
            "Here's the image I generated for you earlier — still waiting on your call!",
          type: "image_generated",
          data: {
            generatedImage: {
              url: pendingGeneratedImage.url,
              prompt: pendingGeneratedImage.prompt,
            },
          },
        });
      }

      setMessages(history);
    } else {
      // No prior strategy, but there might still be a pending image
      // (e.g. user generated then navigated away before submitting a description)
      const msgs: Message[] = [initialMessage];
      if (pendingGeneratedImage) {
        msgs.push({
          id: "hist-pending-image",
          role: "ai",
          content:
            "You generated this image earlier — want to use it or try a new one?",
          type: "image_generated",
          data: {
            generatedImage: {
              url: pendingGeneratedImage.url,
              prompt: pendingGeneratedImage.prompt,
            },
          },
        });
      }
      setMessages(msgs);
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

    // Dedup: don't add another prompt if one is already the last AI message
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
          isMismatchPrompt: true, // flag for dedup guard above
          clarificationOptions: [`Yes, rebuild for ${toGoal}`, "No, keep it"],
        },
      },
    ]);
  }, [objective, lastGeneratedObjective]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Auto-save on every new AI message ──────────────────────────────
  // Debounced 2s so rapid sequential messages (copy → creative suggestion)
  // only trigger a single write. Skips init messages and typing indicators.
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "ai" || messages.length <= 1) return;

    const timer = setTimeout(async () => {
      try {
        const state = useCampaignStore.getState();
        const savedId = await saveDraft(state, draftIdRef.current ?? undefined);
        if (savedId && savedId !== draftIdRef.current) {
          draftIdRef.current = savedId;
          router.replace(`/campaigns/new?draftId=${savedId}`, {
            scroll: false,
          });
        }
      } catch {
        // Silent — never interrupt the user
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [messages.length]);

  // ─── Main Send Handler ─────────────────────────────────────────────────────

  /** Normalize Nigerian shorthand numbers before sending: "15k" → "₦15,000" */
  function normalizeAmounts(input: string): string {
    return input
      .replace(/(\d+(?:\.\d+)?)k\b/gi, (_, n) => `₦${parseFloat(n) * 1000}`)
      .replace(
        /(\d+(?:\.\d+)?)m\b/gi,
        (_, n) => `₦${parseFloat(n) * 1_000_000}`,
      );
  }

  const handleSend = async (overrideValue?: string) => {
    const raw = overrideValue || inputValue;
    const text = normalizeAmounts(raw);
    if (!text.trim() || isTyping) return;

    // Don't render sentinel strings as visible chat bubbles
    const isInternalSentinel = text.startsWith("__OBJECTIVE_");
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

    // ── Sentinel: Objective keep ("No, keep it") ────────────────────────
    // User chose to keep existing strategy — just dismiss with an ack, no AI call
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

    // ── Sentinel: Objective rewrite ("Yes, rebuild for X") ─────────────────
    // Full strategy rebuild using original aiPrompt + new objective
    if (text.startsWith("__OBJECTIVE_REWRITE__")) {
      setIsTyping(false);
      // Use the original business description, not the sentinel text
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
      console.log(
        "💬 [AudienceChatStep] Sending AI rebuild request for objective:",
        objective,
      );
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          body: JSON.stringify({
            description: businessDesc,
            location: locations.length > 0 ? locations[0].name : "Nigeria",
            objective: objective || "whatsapp",
          }),
        });
        if (!res.ok) throw new Error("Rebuild failed");
        const result: AIStrategyResult = await res.json();

        // Resolve interests in parallel (same as main strategy branch)
        const resolvedInterests = await Promise.all(
          (result.interests || []).map(async (interest: any) => {
            const name =
              typeof interest === "string" ? interest : interest.name;
            try {
              const r = await fetch(
                `/api/meta/search-interest?query=${encodeURIComponent(name)}`,
              );
              const data = await r.json();
              const match =
                data?.find(
                  (i: any) => i.name.toLowerCase() === name.toLowerCase(),
                ) || data?.[0];
              return match
                ? { id: String(match.id), name: match.name }
                : { id: name, name };
            } catch {
              return { id: name, name };
            }
          }),
        );

        const ctaFromIntent = mapIntentToCTA(
          result.ctaIntent || "buy_now",
          platform,
          objective,
        );
        const whatsappMsg =
          result.whatsappMessage ||
          (ctaFromIntent.code === "SEND_MESSAGE"
            ? generateWhatsAppMessage({
                headline: result.headline?.[0] || "",
                locations,
              })
            : undefined);

        updateDraft({
          targetInterests: resolvedInterests.filter(Boolean),
          targetBehaviors: (result.behaviors || []).map((b: any) => {
            const name = typeof b === "string" ? b : b.name;
            return { id: name, name };
          }),
          ageRange: {
            min: result.demographics?.age_min || 18,
            max: result.demographics?.age_max || 65,
          },
          gender: result.demographics?.gender || "all",
          adCopy: {
            primary: result.copy?.[0] || "",
            headline: result.headline?.[0] || "",
            cta: {
              intent: result.ctaIntent || "buy_now",
              platformCode: ctaFromIntent.code,
              displayLabel: ctaFromIntent.label,
              whatsappMessage: whatsappMsg,
            },
          },
          lastGeneratedObjective: objective || "whatsapp", // sync so mismatch won't re-fire
        });

        const newCopy = {
          headline: result.headline?.[0] || "",
          primary: result.copy?.[0] || "",
        };
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
              data: { adCopy: newCopy },
            },
          ]);
        }, 900);
      } catch {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
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
    // ── Send ALL input to Claude — it classifies intent via core-strategy-ng ──
    try {
      console.log(
        "💬 [AudienceChatStep] Sending main AI generation request for:",
        text,
      );
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          description: text,
          location: locations.length > 0 ? locations[0].name : "Nigeria",
          objective: objective || "whatsapp",
          // Always pass current copy so Claude can detect refinements/corrections
          currentCopy: adCopy.headline
            ? { headline: adCopy.headline, primary: adCopy.primary }
            : undefined,
        }),
      });

      if (!res.ok) throw new Error("AI Failed");
      const result: AIStrategyResult = await res.json();

      // ── Handle: AI asking for clarification ────────────────────────────
      if (result.meta?.needs_clarification) {
        setIsTyping(false);
        const clarificationMsg: Message = {
          id: Date.now().toString(),
          role: "ai",
          content:
            result.meta.clarification_question ||
            "Can you tell me more about what you sell?",
          type: result.meta.clarification_options
            ? "clarification_choice"
            : "text",
          data: {
            clarificationOptions: result.meta.clarification_options || [],
          },
        };
        setMessages((prev) => [...prev, clarificationMsg]);
        return;
      }

      // ── Handle: AI answering a question (TYPE_C, TYPE_E) ─────────────
      if (result.meta?.is_question) {
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

      // ── Handle: Structural image edit → Studio (TYPE_F) ─────────────────
      if (result.meta?.input_type === "TYPE_F") {
        setIsTyping(false);
        const imageUrl = pendingGeneratedImage?.url ?? selectedCreatives[0];
        const imagePrompt =
          pendingGeneratedImage?.prompt ?? adCopy.headline ?? "";

        if (imageUrl) {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "ai",
              content:
                result.meta.question_answer ||
                "That's a structural edit — use the Studio editor for this.",
              type: "studio_suggestion",
              data: {
                generatedImage: { url: imageUrl, prompt: imagePrompt },
                editInstruction: text,
              },
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "ai",
              content:
                "Let me generate the base image first, then you can refine it in Studio.",
              type: "text",
            },
          ]);
          await handleGenerateCreative();
        }
        return;
      }

      // ── Handle: Image generation request (TYPE_H) ──────────────────────
      if (result.meta?.input_type === "TYPE_H") {
        setIsTyping(false);
        await handleGenerateCreative(text);
        return;
      }

      // ── Handle: Copy refinement (TYPE_D) ───────────────────────────────
      if (result.meta?.input_type === "TYPE_D" && adCopy.headline) {
        setIsTyping(false);
        await handleCopyRefinement(text);
        return;
      }

      // ── Handle: Fact correction (TYPE_G) ───────────────────────────────
      // Claude already returns updated copy + interests in the result
      // We use the same strategy rendering below but also update interests
      // ── Resolve targeting via fuzzy pipeline ─────────────────────────────
      const interestNames = (result.interests || []).map((i: any) =>
        typeof i === "string" ? i : i.name,
      );
      const locationNames: string[] = result.suggestedLocations || [];

      const [resolvedInterests, resolvedLocations] =
        await Promise.all([
          // Interests — keyword extraction + data[0] with word-overlap sanity check
          resolveInterests(interestNames, async (query) => {
            const r = await fetch(
              `/api/meta/search-interest?query=${encodeURIComponent(query)}`,
            );
            return r.ok ? r.json() : [];
          }),

          // Locations — city search then region fallback
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
        ]);

      const validLocations = resolvedLocations.filter(Boolean) as NonNullable<
        (typeof resolvedLocations)[number]
      >[];

      // Keep all interests — resolved ones have real Meta IDs, unresolved fall back to name.
      // Unresolved show in UI and get stripped at launch time (Meta ignores non-numeric IDs).
      const normalizedInterests = resolvedInterests.map(({ id, name }) => ({ id, name }));

      // Behaviors: name-only, no API call. Meta behavior IDs are resolved at launch
      // via the targetingsearch endpoint, not during the AI strategy flow.
      const normalizedBehaviors = (result.behaviors || []).map((b: any) => {
        const name = typeof b === "string" ? b : b.name;
        return { id: name, name };
      });

      const finalLocations =
        locations.length > 0
          ? locations
          : validLocations.length > 0
            ? validLocations
            : [LAGOS_DEFAULT];

      // ── Update Store ───────────────────────────────────────────────────
      updateDraft({
        aiPrompt: text,
        targetInterests: normalizedInterests,
        targetBehaviors: normalizedBehaviors,
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
          primary: result.copy?.[0] || "",
          headline: result.headline?.[0] || "",
          cta: (() => {
            const ctaFromIntent = mapIntentToCTA(
              result.ctaIntent || "buy_now",
              platform,
              objective,
            );
            const whatsappMsg =
              result.whatsappMessage ||
              (ctaFromIntent.code === "SEND_MESSAGE"
                ? generateWhatsAppMessage({
                    headline: result.headline?.[0] || "",
                    locations,
                  })
                : undefined);
            return {
              intent: result.ctaIntent || "buy_now",
              platformCode: ctaFromIntent.code,
              displayLabel: ctaFromIntent.label,
              whatsappMessage: whatsappMsg,
            };
          })(),
        },
        locations: finalLocations,
        lastGeneratedObjective: objective || "whatsapp", // Sync consistency
      });

      saveAudience({
        prompt: text,
        interests: normalizedInterests,
        locations: finalLocations,
      });

      // ── Build outcome preview ──────────────────────────────────────────
      const outcome = buildOutcomePreview(objective, budget);

      // ── Build plain English summary ────────────────────────────────────
      const plainSummary =
        result.plain_english_summary ||
        `Targeting ${result.demographics?.gender === "female" ? "women" : result.demographics?.gender === "male" ? "men" : "people"} ${result.demographics?.age_min}–${result.demographics?.age_max} in ${finalLocations.map((l) => l.name).join(", ")}.`;

      updateDraft({ latestAiSummary: plainSummary });

      const assumptions = result.meta?.inferred_assumptions;
      const refinementQ = result.meta?.refinement_question;

      // ── Render Messages ────────────────────────────────────────────────
      setTimeout(() => {
        setIsTyping(false);

        // 1. Outcome preview — FIRST and most prominent
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

        // 2. Ad copy suggestion — 900ms later
        if (result.headline?.[0] && result.copy?.[0]) {
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: "ai",
                content: "Here's your ad copy — ready to use:",
                type: "copy_suggestion",
                data: {
                  adCopy: {
                    headline: result.headline[0],
                    primary: result.copy[0],
                  },
                },
              },
            ]);
          }, 900);
        }

        // 3. Creative suggestion — 2.5s later
        if (result.headline?.[0]) {
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: "ai",
                content: "Want me to design the image for this ad too?",
                type: "creative_suggestion",
              },
            ]);
          }, 2500);
        }
      }, 1000);
    } catch (err: any) {
      console.log("Error:📁📁", err);
      setIsTyping(false);

      // Detect transient network/timeout errors vs genuine AI failures
      const isNetworkError =
        err?.message?.toLowerCase().includes("timeout") ||
        err?.message?.toLowerCase().includes("network") ||
        err?.message?.toLowerCase().includes("fetch") ||
        err?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        err?.cause?.code === "UND_ERR_CONNECT_TIMEOUT";

      if (isNetworkError) {
        // Show a retry prompt — don't abandon the user's input
        setMessages((prev) => [
          ...prev,
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
        // Genuine AI failure — show category chips so user can pick a cleaner input
        // Pass their location context so chips don't default to the wrong city
        const detectedLocation =
          locations.length > 0 ? locations[0].name : null;
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content:
              "Let me try a different way. What type of business do you run?",
            type: "recovery",
            data: { detectedLocation },
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
            placeholder={CHAT_PLACEHOLDERS[placeholderIdx]}
            scrollRef={scrollRef}
            campaignStore={campaignStore}
            actions={{
              removeInterest,
              addInterest,
              removeLocation,
              addLocation,
              handleCopyRefinement,
              handleGenerateCreative,
              handleAcceptImage,
              handleEditInStudio,
              setStep,
            }}
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

      {/* Upgrade dialog — shown when credits run out or Starter refinement limit hit */}
      <PaymentDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        planId="growth"
      />
    </>
  );
}
