"use client";

import { AnimatedGroup } from "@/components/motion-primitives/animated-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Brain,
  Crop,
  MagicWand,
  VideoCamera,
  WarningTriangle,
} from "iconoir-react";
import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

type FeatureItem = {
  id: string;
  badge: string;
  badgeColor: "green" | "purple";
  title: string;
  description: string;
  image: string;
  icon: ReactNode;
  align: "left" | "right";
  ctaText?: string;
  ctaLink?: string;
};

const features: FeatureItem[] = [
  {
    id: "autopilot",
    badge: "Auto-Pilot",
    badgeColor: "green",
    title: "Sellam Stops Wasted Ad Spend Automatically",
    description:
      "If an ad isn't bringing messages or sales, Sellam pauses it. If one is working, it gets more budget. You set your goal once — Sellam handles the rest.",
    image: "/images/smart-optimization-dashboard.png",
    icon: <WarningTriangle className="w-5 h-5" />,
    align: "left",
    ctaText: "See It in Action",
    ctaLink: "/signup",
  },
  {
    id: "analysis",
    badge: "AI Insights",
    badgeColor: "purple",
    title: "Know Exactly What's Working in Your Ad",
    description:
      "Sellam's AI looks at your ad image and copy, then tells you what to fix to get more people messaging you. Plain English. No jargon.",
    image: "/images/dark-hero-dashboard.png",
    icon: <Brain className="w-5 h-5" />,
    align: "right",
    ctaText: "Analyse My Ad",
    ctaLink: "/signup",
  },
  {
    id: "templates",
    badge: "Templates",
    badgeColor: "purple",
    title: "Professional Ad Images — No Designer Needed",
    description:
      "Pick a template made for Nigerian sellers — fashion, beauty, food, skincare. Add your product photo and price. Looks like you paid ₦150k for it.",
    image: "/images/marketing-templates.webp",
    icon: <Crop className="w-5 h-5" />,
    align: "left",
    ctaText: "Browse Templates",
    ctaLink: "/signup",
  },
  {
    id: "video",
    badge: "Video Ads",
    badgeColor: "purple",
    title: "Turn Photos Into Scroll-Stopping Video Ads",
    description:
      "Bring your product to life with short video ads for Instagram Reels and Facebook. Captions and music added automatically. No video editing skills needed.",
    image: "/images/ugc-mockup.webp",
    icon: <VideoCamera className="w-5 h-5" />,
    align: "right",
    ctaText: "Create Video",
    ctaLink: "/signup",
  },
  {
    id: "redesign",
    badge: "Generative AI",
    badgeColor: "purple",
    title: "Give Old Ads a Fresh New Look",
    description:
      "Tired of your current ad? AI reimagines your product in a new setting — new background, new mood, new creative. Unlimited redesigns included.",
    image: "/images/gen-ai-mockup.webp",
    icon: <MagicWand className="w-5 h-5" />,
    align: "left",
    ctaText: "Try AI Redesign",
    ctaLink: "/signup",
  },
];

export function FeatureDeepDive() {
  return (
    <section className="py-20 md:py-32 overflow-hidden bg-background">
      <div className="container px-6 space-y-24 md:space-y-32">
        <div className="text-center max-w-2xl mx-auto mb-16 md:mb-24">
          <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3">
            Built Around How You Sell
          </h2>
          <h3 className="text-4xl md:text-5xl font-heading font-bold text-foreground">
            Every Feature Built for the WhatsApp Seller
          </h3>
        </div>

        {features.map((feature, index) => (
          <FeatureRow key={feature.id} feature={feature} index={index} />
        ))}
      </div>
    </section>
  );
}

function FeatureRow({
  feature,
  index,
}: {
  feature: FeatureItem;
  index: number;
}) {
  const isEven = index % 2 === 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-12 lg:gap-24 items-center",
        isEven ? "lg:flex-row" : "lg:flex-row-reverse",
      )}
    >
      {/* Content Side */}
      <div className="w-full lg:w-1/2 space-y-6">
        <AnimatedGroup>
          <Badge
            variant="outline"
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border-none mb-4",
              feature.badgeColor === "green"
                ? "bg-primary/10 text-primary"
                : "bg-ai/10 text-ai",
            )}
          >
            {feature.badge}
          </Badge>

          <h3 className="text-3xl md:text-4xl font-bold font-heading text-foreground leading-tight">
            {feature.title}
          </h3>

          <p className="text-lg text-subtle-foreground leading-relaxed">
            {feature.description}
          </p>

          {feature.ctaText && (
            <Button
              asChild
              className={cn(
                "rounded-full h-12 px-8 mt-2 text-base font-semibold shadow-soft hover:scale-105 transition-transform",
                feature.badgeColor === "green"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-ai text-white hover:bg-ai/90",
              )}
            >
              <Link href={feature.ctaLink || "/signup"}>
                {feature.ctaText}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          )}
        </AnimatedGroup>
      </div>

      {/* Visual Side */}
      <div className="w-full lg:w-1/2">
        <div
          className={cn(
            "relative rounded-3xl border border-border/50 bg-muted/30 p-4 shadow-soft aspect-4/3 lg:aspect-square overflow-hidden group",
            feature.badgeColor === "green"
              ? "hover:border-primary/20"
              : "hover:border-ai/20",
          )}
        >
          {/* Background Blob */}
          <div
            className={cn(
              "absolute -z-10 w-full h-full top-0 left-0 opacity-20 blur-3xl rounded-full transform scale-75 group-hover:scale-100 transition-transform duration-700",
              feature.badgeColor === "green" ? "bg-primary/20" : "bg-ai/20",
            )}
          />

          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-background shadow-sm border border-border/50">
            {/* Using Next.js Image if available, otherwise a gradient placeholder for missing assets */}
            <div className="relative w-full h-full bg-muted flex items-center justify-center">
              {/* Fallback visual if image load fails or is a placeholder */}
              <div
                className={cn(
                  "text-center p-8",
                  feature.badgeColor === "green"
                    ? "text-primary/20"
                    : "text-ai/20",
                )}
              >
                {feature.icon && (
                  <div className="mx-auto w-24 h-24 mb-4 [&>svg]:w-full [&>svg]:h-full opacity-50">
                    {feature.icon}
                  </div>
                )}
                <p className="font-bold text-sm uppercase tracking-widest opacity-40">
                  Visual Preview
                </p>
              </div>

              {/* Attempt to load image - if it exists in public folder */}
              {feature.image && !feature.image.includes("placeholder") && (
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover object-top hover:scale-105 transition-transform duration-700"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
