"use client";

import { ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

interface StudioLayoutProps {
  sidebarLeft: ReactNode;
  canvasArea: ReactNode;
  sidebarRight: ReactNode;
}

export function StudioLayout({
  sidebarLeft,
  canvasArea,
  sidebarRight,
}: StudioLayoutProps) {
  return (
    <div className="h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-100">
      <ResizablePanelGroup direction="horizontal">
        {/* LEFT TOOLBOX */}
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={25}
          className="bg-white border-r z-10"
        >
          {sidebarLeft}
        </ResizablePanel>

        <ResizableHandle />

        {/* CENTER CANVAS */}
        <ResizablePanel defaultSize={60} className="relative bg-slate-100/50">
          {canvasArea}
        </ResizablePanel>

        <ResizableHandle />

        {/* RIGHT INSPECTOR */}
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={25}
          className="bg-white border-l z-10"
        >
          {sidebarRight}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
