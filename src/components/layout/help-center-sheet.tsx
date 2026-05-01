"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Lifebelt, Headset, Laptop } from "iconoir-react";

interface HelpVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
}

const HELP_VIDEOS: HelpVideo[] = [
  {
    id: "1",
    title: "Getting Started with AdSync",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg", // Placeholder
    duration: "2:30",
  },
  {
    id: "2",
    title: "How to Create High-Converting Ads",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "5:45",
  },
  {
    id: "3",
    title: "Understanding Your Dashboard Metrics",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "3:15",
  },
  {
    id: "4",
    title: "Connecting Your Ad Accounts",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "4:00",
  },
];

export function HelpCenterSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-border bg-background text-foreground hover:bg-muted h-9 rounded-md shadow-sm"
        >
          <Lifebelt className="h-4 w-4" />
          Help Center
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col w-[400px] sm:w-[400px] p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b border-border text-left space-y-0">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Lifebelt className="h-5 w-5" />
            Help Center
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
          <h3 className="font-medium text-foreground">Watch & Learn</h3>

          <div className="grid gap-4">
            {HELP_VIDEOS.map((video) => (
              <div
                key={video.id}
                className="group cursor-pointer rounded-[16px] border border-border bg-card p-2 transition-all hover:shadow-md"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black mb-2">
                  <div className="absolute inset-0 z-10 bg-black/10 transition-colors group-hover:bg-transparent" />
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                  />
                  <div className="absolute bottom-2 right-2 z-20 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {video.duration}
                  </div>
                </div>
                <p className="px-2 pb-2 pt-1 text-sm font-medium text-foreground line-clamp-1">
                  {video.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex border-t border-border bg-background">
          <button className="flex flex-1 h-16 items-center justify-center gap-2 text-sm font-medium text-subtle-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Headset className="h-4 w-4" />
            Support
          </button>
          <button className="flex flex-1 h-16 items-center justify-center gap-2 text-sm font-medium text-subtle-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-l border-border">
            <Laptop className="h-4 w-4" />
            Get a Demo
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
