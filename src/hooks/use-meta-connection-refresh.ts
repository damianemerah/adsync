"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Detects `?success=meta_connected` in the URL after a Meta OAuth callback,
 * waits 3 seconds for the background sync to settle, then invalidates the
 * relevant caches and removes the param from the URL without a browser reload.
 */
export function useMetaConnectionRefresh({
  activeOrgId,
  selectedPlatform,
}: {
  activeOrgId: string | null;
  selectedPlatform: string;
}) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchParams.get("success") !== "meta_connected") return;

    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ["insights", selectedPlatform] });

      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      window.history.replaceState({}, "", url.pathname + url.search);
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchParams, queryClient, activeOrgId, selectedPlatform]);
}
