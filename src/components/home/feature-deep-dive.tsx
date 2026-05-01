"use client";

import { AnimatedGroup } from "@/components/motion-primitives/animated-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Brain, CreditCard, MessageText } from "iconoir-react";

export function FeatureDeepDive() {
  return (
    <section id="features" className="py-24 md:py-32 overflow-hidden bg-muted/30">
      <div className="container px-6 max-w-6xl mx-auto space-y-16">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="outline" className="mb-4 bg-background text-primary border-primary/20">
            Why Tenzu?
          </Badge>
          <h2 className="text-4xl md:text-5xl font-heading text-foreground mb-4">
            Everything you need to scale, in one platform.
          </h2>
          <p className="text-lg text-subtle-foreground">
            We stripped away the complexity of Facebook Business Manager to give you a clean, intelligent engine that drives real WhatsApp sales.
          </p>
        </div>

        {/* BENTO GRID */}
        <AnimatedGroup
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={{
            container: { visible: { transition: { staggerChildren: 0.1 } } },
            item: {
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
            }
          }}
        >
          {/* Card 1: AI (Spans 2 columns on desktop) */}
          <div className="md:col-span-2 relative overflow-hidden rounded-xl border border-border bg-background p-8 flex flex-col justify-between group">
            <div className="relative z-10 max-w-md">
              <div className="size-12 rounded-lg bg-ai/10 flex items-center justify-center mb-6">
                <Brain className="text-ai size-6" />
              </div>
              <h3 className="text-2xl font-bold font-heading mb-2">Tenzu AI Engine</h3>
              <p className="text-subtle-foreground">
                Turn standard product photos into hyper-premium marketing assets. Our AI auto-generates copy, fixes targeting, and optimizes budget while you sleep.
              </p>
            </div>
            
            {/* Miniature UI Mockup */}
            <div className="mt-8 bg-muted rounded-lg border border-border/50 p-4 shadow-sm w-full relative h-[250px] overflow-hidden">
               <div className="absolute inset-0 bg-ai/5 flex items-center justify-center p-6">
                 {/* Fake dashboard cards */}
                 <div className="w-full max-w-sm space-y-3">
                    <div className="w-full h-12 bg-background rounded-md border border-border flex items-center px-4 shadow-sm">
                       <span className="text-sm font-medium">✨ Generating 4 creative variations...</span>
                    </div>
                    <div className="w-4/5 h-12 bg-background rounded-md border border-border flex items-center px-4 shadow-sm opacity-70 translate-x-4">
                       <span className="text-sm font-medium">Writing Hausa ad copy...</span>
                    </div>
                    <div className="w-3/5 h-12 bg-background rounded-md border border-border flex items-center px-4 shadow-sm opacity-40 translate-x-8">
                       <span className="text-sm font-medium">Finding lookalike audience...</span>
                    </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Card 2: WhatsApp (Spans 1 column) */}
          <div className="col-span-1 relative overflow-hidden rounded-xl border border-border bg-background p-8 flex flex-col justify-between group">
            <div className="relative z-10">
              <div className="size-12 rounded-lg bg-whatsapp/10 flex items-center justify-center mb-6">
                <MessageText className="text-whatsapp size-6" />
              </div>
              <h3 className="text-2xl font-bold font-heading mb-2">WhatsApp Sync</h3>
              <p className="text-subtle-foreground">
                No more guessing. Tenzu attributes every WhatsApp chat directly back to the exact ad that caused it.
              </p>
            </div>

            <div className="mt-8 bg-muted rounded-lg border border-border/50 shadow-sm w-full h-[200px] flex items-center justify-center overflow-hidden relative">
               <div className="w-48 h-32 bg-background rounded-lg border border-border shadow-sm flex flex-col p-4 relative z-10">
                 <div className="flex justify-between items-center mb-4">
                   <div className="w-8 h-8 rounded-full bg-whatsapp/20" />
                   <span className="text-whatsapp text-xs font-bold">+1 Sale</span>
                 </div>
                 <div className="w-3/4 h-3 rounded-full bg-muted mb-2" />
                 <div className="w-1/2 h-3 rounded-full bg-muted" />
               </div>
               {/* Connection lines */}
               <svg className="absolute inset-0 w-full h-full stroke-border" strokeDasharray="4 4" fill="none">
                 <path d="M0,100 Q150,100 150,200" />
               </svg>
            </div>
          </div>

          {/* Card 3: Local Payments (Spans 3 columns) */}
          <div className="md:col-span-3 relative overflow-hidden rounded-xl border border-border bg-background p-8 flex flex-col md:flex-row items-center gap-8 group">
            <div className="md:w-1/2 relative z-10">
              <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                <CreditCard className="text-primary size-6" />
              </div>
              <h3 className="text-2xl font-bold font-heading mb-2">Native Naira Payments</h3>
              <p className="text-subtle-foreground">
                Stop worrying about dollar limits. Pay for your ads directly in Naira through Meta's native payment options. We'll guide you on the best methods to keep your ads running without interruptions.
              </p>
            </div>

            <div className="md:w-1/2 w-full bg-muted rounded-lg border border-border/50 p-6 shadow-sm relative">
               <div className="flex justify-between items-end mb-6">
                 <div>
                   <p className="text-sm text-subtle-foreground mb-1">Meta Account Balance</p>
                   <p className="text-3xl font-bold font-heading tabular-nums">₦450,000</p>
                 </div>
                 <div className="bg-background border border-border px-3 py-1 rounded-md text-xs font-medium shadow-sm">
                   Meta Pay
                 </div>
               </div>
               <div className="space-y-3">
                 {[1, 2].map((i) => (
                   <div key={i} className="flex justify-between items-center bg-background p-3 rounded-md border border-border shadow-sm">
                     <div className="flex items-center gap-3">
                       <span className="w-2 h-2 rounded-full bg-primary" />
                       <span className="text-sm font-medium">Ad Spend (Direct)</span>
                     </div>
                     <span className="text-sm tabular-nums">- ₦15,400</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </AnimatedGroup>
      </div>
    </section>
  );
}
