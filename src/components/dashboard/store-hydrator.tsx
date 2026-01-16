"use client";

import { useEffect } from "react";
import { useCampaignStore } from "@/stores/campaign-store";

export function StoreHydrator({ userId }: { userId: string }) {
  const hydrate = useCampaignStore((state) => state.hydrateForUser);

  useEffect(() => {
    if (userId) {
      hydrate(userId);
    }
  }, [userId, hydrate]);

  return null;
}
