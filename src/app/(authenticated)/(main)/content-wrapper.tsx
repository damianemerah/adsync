"use client";

import { useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";


export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();

  return (
    <div
      className={cn(
        "flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out",
        // No left margin on mobile (sidebar is off-canvas). Desktop margins kick in at lg.
        isOpen ? "lg:ml-64" : "lg:ml-20",
      )}
    >
      {children}
    </div>
  );
}
