"use client";

import { AnimatedGroup } from "@/components/motion-primitives/animated-group";
import { MessageText, MagicWand, StatsUpSquare } from "iconoir-react";

const steps = [
  {
    number: "01",
    icon: <MessageText className="w-7 h-7" />,
    title: "Chat with AI",
    description:
      "Tell Tenzu what you sell, who buys from you, and how much you want to spend. That's it. AI handles targeting, budget, and setup — in under 2 minutes.",
  },
  {
    number: "02",
    icon: <MagicWand className="w-7 h-7" />,
    title: "AI Builds Your Ad",
    description:
      "Upload a phone photo of your product. AI transforms it into a professional ad image. Review it, approve it, launch it — or ask AI to try a different look.",
  },
  {
    number: "03",
    icon: <StatsUpSquare className="w-7 h-7" />,
    title: "See Who Messaged & What You Made",
    description:
      "Every ad gets a smart link. When someone clicks your ad and messages you on WhatsApp, Tenzu records it. You see ₦ spent vs ₦ made — clearly.",
  },
];

export function ContentSection() {
  return (
    <section
      id="how-it-works"
      className="py-20 md:py-32 bg-background border-b border-border overflow-hidden"
    >
      <div className="container px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 md:mb-24">
          <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3">
            How It Works
          </h2>
          <h3 className="text-4xl md:text-5xl font-heading font-bold text-foreground">
            From Zero to Running Ad in 2 Minutes
          </h3>
          <p className="mt-4 text-lg text-subtle-foreground">
            No marketing degree. No agency. No dollar card. Just tell Tenzu what
            you sell — it does the rest.
          </p>
        </div>

        <AnimatedGroup className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative flex flex-col gap-6 rounded-lg border border-border bg-background p-8 hover:border-border/80 transition-all duration-300"
            >
              {/* Step number */}
              <span className="absolute top-6 right-8 text-5xl font-bold font-heading text-muted/40 select-none leading-none">
                {step.number}
              </span>

              {/* Icon */}
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {step.icon}
              </div>

              {/* Content */}
              <div className="space-y-3">
                <h4 className="text-xl font-bold font-heading text-foreground">
                  {step.title}
                </h4>
                <p className="text-subtle-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </AnimatedGroup>
      </div>
    </section>
  );
}
