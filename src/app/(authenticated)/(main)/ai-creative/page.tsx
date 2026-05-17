"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sparks, Play, UserScan, ViewGrid } from "iconoir-react";

export default function CreationsHubPage() {
  const router = useRouter();

  // Mode cards configuration
  const modes = [
    {
      id: "ugc",
      title: "Create UGC with Templates",
      description: "Generate compelling ad videos from simple text prompts in seconds.",
      icon: UserScan,
      color: "bg-warning-bg text-warning-text border-warning-border",
      image: "/ugc_ad_preview.png",
      action: () => router.push("/ai-creative/studio"),
      comingSoon: false,
      promptText: null,
    },
    {
      id: "video",
      title: "Create Video with Templates",
      description: "Produce high-quality ad videos instantly with ready-to-use templates.",
      icon: Play,
      color: "bg-primary/10 text-primary border-primary/20",
      image: "/video_ad_preview.png",
      action: () => router.push("/ai-creative/studio"),
      comingSoon: false,
      promptText: null,
    },
    {
      id: "image",
      title: "Create Image with Prompt",
      description: "Turn simple text prompts into professional ad visuals in seconds.",
      icon: Sparks,
      color: "bg-ai/10 text-ai border-ai/20",
      image: "/image_ad_preview.png",
      action: () => router.push("/ai-creative/studio"),
      comingSoon: false,
      promptText: "Create an Ad image for my Nigerian Jollof Rice brand |",
    },
    {
      id: "image_template",
      title: "Create Image with Templates",
      description: "Pick a template, fill in details, and generate a polished ad image instantly.",
      icon: ViewGrid,
      color: "bg-ai/10 text-ai border-ai/20",
      image: "/image_ad_preview.png",
      action: () => router.push("/ai-creative/templates"),
      comingSoon: false,
      promptText: null,
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/30 font-sans">
      {/* HEADER */}
      <PageHeader title="AI Ad Creator" showCredits className="z-30" />

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 no-scrollbar">
        <div className="container max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modes.map((mode) => (
              <div
                key={mode.id}
                onClick={!mode.comingSoon ? mode.action : undefined}
                className={`group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300
                  ${
                    mode.comingSoon
                      ? "opacity-75 cursor-not-allowed"
                      : "cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-primary/30 hover:-translate-y-1"
                  }
                `}
              >
                {/* Image Placeholder Section */}
                <div className="relative w-full aspect-[4/3] bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] p-6 flex flex-col items-center justify-center border-b border-border/50 overflow-hidden">
                  
                  {/* The actual image floating in the center */}
                  <div className="relative w-[75%] h-[95%] rounded-xl overflow-hidden shadow-sm transform transition-transform duration-500 group-hover:scale-[1.02] border border-border/50 bg-muted/20">
                    <Image
                      src={mode.image}
                      alt={mode.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>

                  {/* Prompt Bubble Overlay (for the AI prompt cards) */}
                  {mode.promptText && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[85%] bg-background/95 backdrop-blur-sm border border-ai/30 shadow-lg rounded-xl p-3.5 transform transition-transform duration-500 group-hover:-translate-y-1">
                      <p className="text-[13px] font-medium text-center bg-gradient-to-r from-ai to-primary bg-clip-text text-transparent leading-tight animate-pulse">
                        {mode.promptText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-6 flex flex-col items-center text-center flex-1 justify-center bg-card">
                  <div className="space-y-3">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <h3 className="font-bold text-foreground font-heading text-lg">
                        {mode.title}
                      </h3>
                      {mode.comingSoon && (
                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] text-subtle-foreground leading-relaxed max-w-[280px]">
                      {mode.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
