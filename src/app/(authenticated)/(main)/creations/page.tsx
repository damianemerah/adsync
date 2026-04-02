"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sparks, Play, MessageText, UserScan } from "iconoir-react";

export default function CreationsHubPage() {
  const router = useRouter();

  // Mode cards configuration
  const modes = [
    {
      id: "image",
      title: "Create Image with AI",
      description:
        "Quickly design ad visuals using AI tailored for your product.",
      icon: Sparks,
      color: "bg-purple-500/10 text-purple-600 border-purple-200",
      image: "/templates-preview.png", // Use an appropriate placeholder/existing image here
      action: () => router.push("/creations/studio"),
      comingSoon: false,
    },
    {
      id: "video",
      title: "Create Video with Templates",
      description:
        "Produce high-quality ad videos instantly with ready-to-use templates.",
      icon: Play,
      color: "bg-blue-500/10 text-blue-600 border-blue-200",
      image: "/video-preview.png", // Use an appropriate placeholder/existing image here
      action: () => router.push("/creations/studio"), // Adjust if a specific video route exists
      comingSoon: false,
    },

    {
      id: "ugc",
      title: "UGC Ads",
      description: "Generate authentic user-generated content style ads.",
      icon: UserScan,
      color: "bg-orange-500/10 text-orange-600 border-orange-200",
      image: "/ugc-preview.png", // Use an appropriate placeholder/existing image here
      action: () => {},
      comingSoon: true,
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/30 font-sans">
      {/* HEADER */}
      <PageHeader title="AI Ad Creator" showCredits className="z-30" />

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="container max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modes.map((mode) => (
              <div
                key={mode.id}
                onClick={!mode.comingSoon ? mode.action : undefined}
                className={`group relative flex flex-col bg-card border border-border rounded-lg overflow-hidden shadow-sm transition-all duration-300
                  ${
                    mode.comingSoon
                      ? "opacity-75 cursor-not-allowed"
                      : "cursor-pointer hover:shadow-md hover:border-primary/30 hover:-translate-y-1"
                  }
                `}
              >
                {/* Image Placeholder Section */}
                <div className="aspect-4/3 w-full bg-muted/50 p-6 flex flex-col items-center justify-center relative border-b border-border text-center overflow-hidden">
                  {/* Fallback styling if actual images don't exist */}
                  <div className={`p-4 rounded-full mb-4 ${mode.color}`}>
                    <mode.icon className="w-8 h-8" />
                  </div>
                  {/* We can place real images here later if we have assets */}
                </div>

                {/* Content Section */}
                <div className="p-6 flex flex-col flex-1 h-full justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-foreground font-heading">
                        {mode.title}
                      </h3>
                      {mode.comingSoon && (
                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
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
