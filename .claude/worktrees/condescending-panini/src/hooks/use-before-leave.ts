"use client";

/**
 * useBeforeLeave
 *
 * Attaches a browser `beforeunload` listener that shows the native
 * "Leave site?" dialog whenever `isDirty` is true.
 *
 * Use this everywhere the user could lose unsaved work:
 *  - Campaign wizard (unsaved draft / un-accepted generated image)
 *  - Studio pages (generated image not yet saved to library)
 */

import { useEffect } from "react";

export function useBeforeLeave(isDirty: boolean, message?: string) {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      // Modern browsers ignore the custom message but require returnValue to be set
      e.preventDefault();
      e.returnValue = message ?? "You have unsaved changes. Leave anyway?";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, message]);
}
