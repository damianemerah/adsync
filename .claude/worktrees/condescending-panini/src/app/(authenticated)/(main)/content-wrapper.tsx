"use client";

import { useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();

  return (
    <div
      className={cn(
        "flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out",
        isOpen ? "ml-64" : "ml-20",
      )}
    >
      {children}
    </div>
  );
}
