"use client";

import { useEffect } from "react";
import { useCampaignStore } from "@/stores/campaign-store";

export function StoreHydrator({ userId }: { userId: string }) {
  const update = useCampaignStore((state) => state.updateDraft);

  useEffect(() => {
    if (userId) {
      update({ userId });
    }
  }, [userId, update]);

  return null;
}
