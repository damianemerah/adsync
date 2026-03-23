"use client";

import { AnimatedGroup } from "@/components/motion-primitives/animated-group";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparks } from "iconoir-react";
import Image from "next/image";
import Link from "next/link";

const transitionVariants = {
  item: {
    hidden: { opacity: 0, filter: "blur(12px)", y: 12 },
    visible: {
      opacity: 1, filter: "blur(0px)", y: 0,
      transition: { type: "spring", bounce: 0.3, duration: 1.5 } as const,
    },
  },
};

export function HeroSection() {
  return (
    <section className="dark relative overflow-hidden bg-background text-foreground pt-32 pb-20 md:pt-40 md:pb-32 border-b border-border">
      {/* Background Gradients - subtle glowing orbs */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl opacity-20 pointer-events-none">
        <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-ai to-primary opacity-30" />
      </div>

      <div className="container relative z-10 px-6">
        <div className="text-center mx-auto max-w-4xl">
          {/* Announcement Pill */}
          <AnimatedGroup variants={transitionVariants}>
            <Link
              href="#ai"
              className="group inline-flex items-center gap-2 rounded-full border border-ai/30 bg-ai/10 px-4 py-1.5 text-sm font-medium text-ai transition-colors hover:bg-ai/20 backdrop-blur-sm mb-8"
            >
              <Sparks className="h-4 w-4" />
              <span>Tenzu AI 2.0 is live. Auto-generate your ad creatives.</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </AnimatedGroup>

          {/* Main Headline */}
          <TextEffect
            preset="fade-in-blur"
            speedSegment={0.1}
            as="h1"
            className="mx-auto max-w-4xl text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6 font-heading"
          >
            Maximize Ads Performance Powered by AI
          </TextEffect>

          {/* Subheadline */}
          <TextEffect
            per="line"
            preset="fade-in-blur"
            speedSegment={0.1}
            delay={0.5}
            as="p"
            className="mx-auto max-w-2xl text-lg text-subtle-foreground leading-relaxed mb-10"
          >
            Stop guessing what works. Tenzu connects your Meta Ads directly to your WhatsApp chats, automatically improving your creative and tracking your sales — without relying on USD cards.
          </TextEffect>

          {/* CTAs */}
          <AnimatedGroup
            variants={transitionVariants}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className="h-12 px-8 text-base w-full sm:w-auto hover:bg-primary/90"
            >
              <Link href="/signup">
                Start 7-Day Free Trial
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base bg-background/50 hover:bg-accent border-border w-full sm:w-auto"
            >
              <Link href="#features">See How It Works</Link>
            </Button>
          </AnimatedGroup>
        </div>

        {/* Hero Image */}
        <AnimatedGroup
          variants={transitionVariants}
          className="mt-16 md:mt-24 relative max-w-5xl mx-auto"
        >
          <div className="relative rounded-lg border border-border/40 bg-background/50 p-2 shadow-sm backdrop-blur-xl">
            <div className="relative overflow-hidden rounded-md bg-background border border-border aspect-16/10 md:aspect-21/9">
              <Image
                src="/images/tenzu-hero-graphic.png"
                alt="Tenzu AI Data Engine"
                fill
                className="object-cover object-center"
                priority
              />
              <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent opacity-30 pointer-events-none" />
            </div>
          </div>
        </AnimatedGroup>
      </div>
    </section>
  );
}
