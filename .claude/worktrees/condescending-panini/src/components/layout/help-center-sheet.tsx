"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { HelpCircle, Play } from "iconoir-react";
import Image from "next/image";

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
          className="gap-2 border-border bg-background text-foreground hover:bg-muted font-bold shadow-sm h-9 rounded-xl"
        >
          <HelpCircle className="h-4 w-4" />
          Help Center
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-xl font-heading">
            <HelpCircle className="h-5 w-5 text-primary" />
            Help Center
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Video Tutorials</h3>
            <p className="text-sm text-muted-foreground">
              Learn how to get the most out of AdSync.
            </p>
          </div>

          <div className="grid gap-4">
            {HELP_VIDEOS.map((video) => (
              <div
                key={video.id}
                className="group relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted shadow-sm transition-all hover:shadow-md cursor-pointer"
              >
                {/* Thumbnail Layer */}
                <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20" />

                {/* Ideally use Next/Image with real thumbnails. Using a colored div fallback if src fails effectively */}
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="h-full w-full bg-linear-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                    <Play className="h-12 w-12 text-primary/50 group-hover:text-primary transition-colors fill-current" />
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {video.duration}
                </div>

                {/* Title Overlay (Bottom) */}
                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-3 pt-8">
                  <p className="text-sm font-medium text-white line-clamp-1">
                    {video.title}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
            <h4 className="font-semibold text-primary text-sm mb-1">
              Need more help?
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Check our documentation or contact support.
            </p>
            <Button
              size="sm"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
