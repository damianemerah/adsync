"use client";

import { AnimatedGroup } from "@/components/motion-primitives/animated-group";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparks } from "iconoir-react"; // Swapped for Iconoir
import Image from "next/image";
import Link from "next/link";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
        duration: 1.5,
      } as const,
    },
  },
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background text-foreground head-section isolate pt-32 pb-20 md:pt-48 md:pb-32">
      {/* Background Gradients - Replaced with SVG via head-section class */}
      <div
        aria-hidden
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 opacity-20 pointer-events-none"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] sm:left-[calc(50%-30rem)] sm:w-288.75 opacity-30"
        />
      </div>

      <div className="container relative z-10 px-6">
        <div className="text-center mx-auto max-w-5xl">
          {/* Announcement Pill */}
          <AnimatedGroup variants={transitionVariants}>
            <Link
              href="#features"
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-4 py-1.5 text-sm font-medium text-subtle-foreground transition-colors hover:bg-muted/50 hover:text-foreground backdrop-blur-sm mb-8"
            >
              <Sparks className="h-4 w-4 text-primary" />
              <span className="text-foreground text-sm">
                New: Turn phone photos into professional ads in seconds
              </span>
              <span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"></span>
              <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                  <span className="flex size-6">
                    <ArrowRight className="m-auto size-3" />
                  </span>
                  <span className="flex size-6">
                    <ArrowRight className="m-auto size-3" />
                  </span>
                </div>
              </div>
            </Link>
          </AnimatedGroup>

          {/* Main Headline */}
          <TextEffect
            preset="fade-in-blur"
            speedSegment={0.1}
            as="h1"
            className="mx-auto max-w-4xl text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-8 font-heading"
          >
            More Sales From Your Ads. Pay in Naira.
          </TextEffect>

          {/* Subheadline */}
          <TextEffect
            per="line"
            preset="fade-in-blur"
            speedSegment={0.1}
            delay={0.5}
            as="p"
            className="mx-auto max-w-2xl text-lg md:text-xl text-subtle-foreground leading-relaxed mb-10"
          >
            Stop spending on ads and not knowing if they sold anything. Sellam
            shows you who messaged, how many bought, and what you made — in
            Naira. No agency. No designer. No dollar card.
          </TextEffect>

          {/* CTAs */}
          <AnimatedGroup
            variants={{
              container: {
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                    delayChildren: 0.75,
                  },
                },
              },
              ...transitionVariants,
            }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className="h-12 px-8 rounded-full text-base shadow-soft hover:shadow-soft hover:scale-105 transition-all w-full sm:w-auto"
            >
              <Link href="/signup">
                Start Selling with Ads
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-8 rounded-full text-base bg-background/50 border-border hover:bg-background hover:text-foreground transition-all w-full sm:w-auto"
            >
              <Link href="#features">See How It Works</Link>
            </Button>
          </AnimatedGroup>
        </div>

        {/* Hero Image / Mockup */}
        <AnimatedGroup
          variants={{
            container: {
              visible: {
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 1.0,
                },
              },
            },
            ...transitionVariants,
          }}
          className="mt-16 md:mt-24 relative max-w-6xl mx-auto"
        >
          <div className="relative rounded-4xl border border-border/40 bg-background/50 p-2 shadow-2xl shadow-primary/5 backdrop-blur-xl">
            <div className="relative overflow-hidden rounded-3xl bg-background border border-border shadow-inner aspect-16/10 md:aspect-21/9">
              <Image
                src="/images/dark-hero-dashboard.png"
                alt="Sellam Dashboard — WhatsApp Sales & Ad Tracking"
                fill
                className="object-cover object-top"
                priority
              />
              {/* Glass Overlay for depth */}
              <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent opacity-20 pointer-events-none" />
            </div>
          </div>
        </AnimatedGroup>
      </div>
    </section>
  );
}
