"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "iconoir-react";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="dark py-24 md:py-32 relative overflow-hidden bg-background text-foreground isolate border-t border-border">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full opacity-30 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-ai/20 rounded-full blur-[120px]" />
      </div>

      <div className="container px-6 relative z-10 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl md:text-6xl font-heading tracking-tight">
            Start your <span className="text-primary">7-Day Free Trial</span>
          </h2>
          <p className="text-xl text-subtle-foreground max-w-2xl mx-auto leading-relaxed">
            Join 2,000+ Nigerian sellers already multiplying their WhatsApp sales with Tenzu. Cancel anytime. No dollar card required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              asChild
              size="lg"
              className="h-14 px-10 text-lg hover:bg-primary/90 w-full sm:w-auto font-bold"
            >
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-6 text-sm font-medium">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-subtle-foreground">
                No credit card required
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-subtle-foreground">7-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-subtle-foreground">Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
