"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveDraft, deleteDraft } from "@/actions/drafts";
import { useCampaignStore } from "@/stores/campaign-store";

export function useDraftPersistence(draftIdFromUrl: string | null) {
  const router = useRouter();
  const { resetDraft } = useCampaignStore();
  const [persistedDraftId, setPersistedDraftId] = useState<string | null>(
    draftIdFromUrl,
  );
  const persistedDraftIdRef = useRef<string | null>(draftIdFromUrl);
  const [savingState, setSavingState] = useState<"none" | "save" | "exit">(
    "none",
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const onDraftSaved = (id: string) => {
    setPersistedDraftId(id);
    persistedDraftIdRef.current = id;
    router.replace(`/campaigns/new?draftId=${id}`, { scroll: false });
  };

  const handleSaveAndExit = async () => {
    setSavingState("exit");
    try {
      const state = useCampaignStore.getState();
      const savedId = await saveDraft(
        state,
        persistedDraftIdRef.current ?? undefined,
      );
      if (savedId && savedId !== persistedDraftIdRef.current) {
        setPersistedDraftId(savedId);
        persistedDraftIdRef.current = savedId;
      }
      toast.success("Draft saved", {
        description: "You can resume this ad from the dashboard.",
      });
      router.push("/campaigns");
    } catch (error) {
      toast.error("Failed to save draft");
      console.error(error);
    } finally {
      setSavingState("none");
    }
  };

  const handleSaveOnly = async () => {
    setSavingState("save");
    try {
      const state = useCampaignStore.getState();
      const savedId = await saveDraft(
        state,
        persistedDraftIdRef.current ?? undefined,
      );
      if (savedId && savedId !== persistedDraftIdRef.current) {
        setPersistedDraftId(savedId);
        persistedDraftIdRef.current = savedId;
        router.replace(`/campaigns/new?draftId=${savedId}`, { scroll: false });
      }
      toast.success("Draft saved", { description: "Your progress is saved." });
    } catch (error) {
      toast.error("Failed to save draft");
      console.error(error);
    } finally {
      setSavingState("none");
    }
  };

  const handleDeleteDraft = async () => {
    const currentId = persistedDraftIdRef.current;
    if (!currentId) {
      if (confirm("Discard this ad and start over?")) {
        resetDraft();
      }
      return;
    }

    if (!confirm("Delete this draft? This can't be undone.")) return;

    setIsDeleting(true);
    try {
      await deleteDraft(currentId);
      toast.success("Draft deleted");
      resetDraft();
      router.push("/campaigns");
    } catch (error) {
      toast.error("Failed to delete draft");
      console.error(error);
      setIsDeleting(false);
    }
  };

  return {
    persistedDraftId,
    persistedDraftIdRef,
    savingState,
    isSaving: savingState !== "none",
    isDeleting,
    onDraftSaved,
    handleSaveOnly,
    handleSaveAndExit,
    handleDeleteDraft,
  };
}
