"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "iconoir-react";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden bg-foreground text-white isolate">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full opacity-30 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[80px] translate-x-20" />
      </div>

      <div className="container px-6 relative z-10 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl md:text-6xl font-heading font-bold tracking-tight">
            Start your <span className="text-primary">7-Day Free Trial</span>
          </h2>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Join 2,000+ Nigerian sellers already running ads with Sellam. Cancel
            anytime. No dollar card required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="h-14 px-10 rounded-full text-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all w-full sm:w-auto font-bold"
            >
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-4 text-sm font-medium text-gray-400">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-foreground/60">
                No credit card required
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-foreground/60">7-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-foreground/60">Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
