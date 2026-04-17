import { useEffect } from "react";
import { useStudioStore } from "@/store/studio-store";
import { type CampaignContext } from "@/lib/ai/context-compiler";
import { type AspectRatio } from "@/components/creatives/studio/prompt-input";

interface UseStudioSessionSyncProps {
  editCreative: any | null;
  historyData: any | null;
  initialImageParam: string | null;
  promptParam: string | null;
  aspectRatioParam: AspectRatio | null;
  campaignContext: CampaignContext | null;
  metaPlacement: string | null | undefined;
  platform: string | null | undefined;
  editId: string | null;
}

export function useStudioSessionSync({
  editCreative,
  historyData,
  initialImageParam,
  promptParam,
  aspectRatioParam,
  campaignContext,
  metaPlacement,
  platform,
  editId,
}: UseStudioSessionSyncProps) {
  const {
    activeCreativeId,
    setGeneratedImage,
    setViewMode,
    setActiveCreativeId,
    setAspectRatio,
    setLastUsedFullPrompt,
    setSeed,
    appendGenerationHistory,
    setPrompt,
  } = useStudioStore();

  // Sync edit creative data to view state
  useEffect(() => {
    if (!editCreative) return;
    setGeneratedImage(editCreative.original_url);
    setViewMode("result");
    if (!activeCreativeId) setActiveCreativeId(editCreative.id);
    if (editCreative.width && editCreative.height) {
      const ratio = editCreative.width / editCreative.height;
      if (Math.abs(ratio - 1) < 0.05) setAspectRatio("1:1");
      else if (Math.abs(ratio - 9 / 16) < 0.05) setAspectRatio("9:16");
      else if (Math.abs(ratio - 16 / 9) < 0.05) setAspectRatio("16:9");
      else if (Math.abs(ratio - 4 / 5) < 0.05) setAspectRatio("4:5");
      else setAspectRatio("1:1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editCreative]);

  // Aspect Ratio Auto-Selection from Placement
  useEffect(() => {
    // Only apply smart default if we are creating a new creative (not editing an existing one)
    if (editId || initialImageParam) return;

    // Determine placement source: campaign context from DB, or live draft store
    const placement =
      campaignContext?.platform === "meta"
        ? campaignContext?.objective
          ? metaPlacement
          : "automatic"
        : metaPlacement;

    const isAutomatic = platform === "meta" && placement === "automatic";

    if (isAutomatic || !platform || platform !== "meta") {
      setAspectRatio("1:1"); // Default for automatic or non-Meta
      return;
    }

    // Platform-specific smart defaults:
    switch (placement) {
      case "instagram":
        setAspectRatio("4:5");
        break;
      case "facebook":
        setAspectRatio("1:1");
        break;
      default:
        setAspectRatio("1:1");
    }
  }, [
    campaignContext,
    metaPlacement,
    platform,
    editId,
    initialImageParam,
    setAspectRatio,
  ]);

  // Sync Hook Data to Local State
  useEffect(() => {
    if (historyData) {
      setLastUsedFullPrompt(historyData.prompt);
      setSeed(historyData.seed);

      if (historyData.history) {
        // Replace history in the store by resetting then appending each entry
        historyData.history.forEach((entry: { imageUrl: string; id: string }) =>
          appendGenerationHistory(entry)
        );
      }
    }
  }, [historyData, setLastUsedFullPrompt, setSeed, appendGenerationHistory]);

  // Handle initial image from campaign chat ("Edit in Studio" button)
  useEffect(() => {
    if (initialImageParam) {
      setGeneratedImage(initialImageParam);
      setViewMode("result");

      if (promptParam) {
        setPrompt(promptParam);
        setLastUsedFullPrompt(promptParam);
      }

      const validRatios: AspectRatio[] = ["1:1", "9:16", "4:5", "16:9"];
      if (aspectRatioParam && validRatios.includes(aspectRatioParam)) {
        setAspectRatio(aspectRatioParam);
      }
    }
  }, [
    initialImageParam,
    promptParam,
    aspectRatioParam,
    setGeneratedImage,
    setViewMode,
    setPrompt,
    setLastUsedFullPrompt,
    setAspectRatio,
  ]);
}
