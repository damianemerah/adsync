"use client";

import { Footer } from "@/components/layout/footer";
import { HeroHeader } from "@/components/home/hero-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BILLING_PLANS, PLAN_PRICES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Check,
  Sparks,
  BrainElectricity,
  StatsReport,
  Group,
  Settings,
  NavArrowDown,
  ArrowRight,
  Star,
  Flash,
  InfoCircle,
} from "iconoir-react";
import Link from "next/link";
import React from "react";

// ─── Spend → Plan resolver (mirrors tier-resolver.ts logic) ──────────────────

const SLIDER_MAX = 500; // ₦500K represented as max
const SNAP_MARKS = [0, 100, 300, 500]; // tier boundaries in ₦K
const SNAP_RADIUS = 18; // snap within ₦18K of a mark

function snapToMark(v: number): number {
  const nearest = SNAP_MARKS.reduce((prev, curr) =>
    Math.abs(curr - v) < Math.abs(prev - v) ? curr : prev
  );
  return Math.abs(nearest - v) <= SNAP_RADIUS ? nearest : v;
}

function resolvePlanFromSpend(spendK: number): 0 | 1 | 2 {
  if (spendK <= 100) return 0; // Starter
  if (spendK <= 300) return 1; // Growth
  return 2; // Agency
}

// ─── Feature modules ──────────────────────────────────────────────────────────

const FEATURE_MODULES = [
  {
    icon: Settings,
    title: "Campaign Management",
    features: [
      "One-click ad launch",
      "AI-generated ad copy (free, no credits)",
      "Smart Rules Engine — auto-pauses low performers",
      "Full manual control & override",
      "Instant ad templates",
    ],
  },
  {
    icon: StatsReport,
    title: "Performance Analysis",
    features: [
      "Real-time Naira ROI tracking",
      "WhatsApp click attribution",
      "Smart link analytics",
      "Account health monitoring",
      "Unified performance report",
    ],
  },
  {
    icon: BrainElectricity,
    title: "AI Creative Studio",
    features: [
      "AI image generation — FLUX 2 Pro",
      "AI Creative Redesign",
      "AI Marketing Assistant",
      "Brand-aware copy generation",
      "Custom prompt control",
    ],
  },
  {
    icon: Group,
    title: "Team & Attribution",
    features: [
      "Unlimited team members",
      "Role-based permissions",
      "Smart attribution links",
      "Mark as Sold tracking",
      "Conversions API (CAPI) integration",
    ],
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: "Chioma O.",
    role: "Fashion Vendor, Lagos",
    quote:
      "I spent ₦150k on an agency for one ad. With Tenzu I run 10 ads monthly — and I see exactly which ones brought sales.",
    stars: 5,
  },
  {
    name: "Ahmed I.",
    role: "Dropshipper, Abuja",
    quote:
      "Tried paying for international tools — card declined twice. With Tenzu I paid with my Opay card. No stress. The ad was live the same day.",
    stars: 5,
  },
  {
    name: "Grace U.",
    role: "Skincare Vendor, Lagos",
    quote:
      "I used to spend on ads and never know if they sold anything. Now I see exactly who messaged from the ad and record my sales right there.",
    stars: 5,
  },
];

// ─── FAQs ─────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "How is my plan determined?",
    a: "Your plan is automatically assigned based on your Meta ad account's rolling 30-day spend — not something you choose manually. Spend up to ₦100K and you're on Starter. ₦100K–₦300K puts you on Growth. Above ₦300K moves you to Agency. Tenzu syncs your spend every few hours and upgrades or downgrades your plan automatically.",
  },
  {
    q: "Can I try Tenzu before paying?",
    a: "Yes. Every account starts with a 7-day free trial. You get 50 AI Credits and access to all features — no card required upfront.",
  },
  {
    q: "How do I pay? Do I need a dollar card?",
    a: "No dollar card needed. Tenzu uses Paystack so you can pay in Naira via your local bank card, USSD, or bank transfer. No international payment failures.",
  },
  {
    q: "What are AI Credits and what uses them?",
    a: "AI Credits power image generation (5 credits per image). Ad copy and strategy generation are completely free — 0 credits. You can top up credits anytime from ₦3,000 for 50 credits.",
  },
  {
    q: "What happens when I run out of AI Credits?",
    a: "Image generation pauses until your next billing cycle. Ad copy is always free regardless of credits. You can also top up credits anytime — no need to wait for renewal.",
  },
  {
    q: "What if my spend drops and I should be on a lower plan?",
    a: "Tenzu checks your 30-day spend regularly. If your spend drops below a threshold, you'll be moved to the appropriate lower-cost plan at your next billing cycle — you only pay for what you need.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your settings at any time. You keep access until the end of your current billing period with no penalties.",
  },
];

// ─── Spend Slider Section ─────────────────────────────────────────────────────

function SpendSliderSection() {
  // Live value while dragging; snapped value on release
  const [spendK, setSpendK] = React.useState(50);
  const planIndex = resolvePlanFromSpend(spendK);
  const plan = BILLING_PLANS[planIndex];

  const spendLabel = spendK >= SLIDER_MAX ? "₦500K+" : spendK === 0 ? "₦0" : `₦${spendK.toLocaleString()}K`;

  return (
    <section className="pb-24 bg-background">
      <div className="container mx-auto px-6 max-w-5xl">
        {/* Slider card */}
        <Card className="border border-border bg-background mb-8">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-8">
              <div>
                <p className="text-sm font-semibold text-subtle-foreground uppercase tracking-widest mb-1">
                  How much do you spend on ads per month?
                </p>
                <p className="text-4xl font-bold font-heading text-foreground tabular-nums transition-none">
                  {spendLabel}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-subtle-foreground">
                <InfoCircle className="w-4 h-4 shrink-0" />
                <span>Drag to see your recommended plan</span>
              </div>
            </div>

            {/* Slider + tick marks */}
            <div className="relative">
              <Slider
                min={0}
                max={SLIDER_MAX}
                step={1}
                value={[spendK]}
                onValueChange={([v]) => setSpendK(v)}
                onValueCommit={([v]) => setSpendK(snapToMark(v))}
              />

              {/* Tick marks — positioned relative to track width */}
              <div className="relative w-full mt-3 pointer-events-none">
                {SNAP_MARKS.map((mark) => {
                  const pct = (mark / SLIDER_MAX) * 100;
                  return (
                    <div
                      key={mark}
                      className="absolute flex flex-col items-center -translate-x-1/2"
                      style={{ left: `${pct}%` }}
                    >
                      <div className="w-px h-2 bg-border" />
                      <span
                        className={cn(
                          "text-xs mt-1 font-medium whitespace-nowrap",
                          spendK === mark ? "text-primary" : "text-subtle-foreground"
                        )}
                      >
                        {mark === 0 ? "₦0" : mark === SLIDER_MAX ? "₦500K+" : `₦${mark}K`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan recommendation */}
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Plan card */}
          <Card
            className={cn(
              "border-2 bg-background",
              plan.highlight ? "border-primary" : "border-border"
            )}
          >
            {plan.highlight && (
              <div className="bg-primary text-primary-foreground text-xs font-bold text-center py-2 rounded-t-lg tracking-wide uppercase">
                <Flash className="w-3.5 h-3.5 inline-block mr-1.5 align-middle" />
                Most Popular
              </div>
            )}
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold font-heading text-foreground">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-subtle-foreground mt-1">{plan.tagline}</p>
                </div>
                <Badge variant="secondary" className="text-primary bg-primary/10 border-0 shrink-0">
                  Recommended
                </Badge>
              </div>

              <div className="mb-6 pb-6 border-b border-border">
                <span className="text-4xl font-bold font-heading text-foreground">
                  ₦{plan.price.toLocaleString()}
                </span>
                <span className="text-subtle-foreground text-sm font-medium ml-1">/month</span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feat}</span>
                  </li>
                ))}
              </ul>

              <Button asChild className="w-full rounded-md font-semibold">
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* How it works */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold font-heading text-foreground">
              Your plan follows your spend
            </h3>
            <p className="text-subtle-foreground text-sm leading-relaxed">
              No picking a plan. No annual commitment. Tenzu reads your Meta ad account&apos;s
              rolling 30-day spend and automatically assigns you to the right tier — so you
              only ever pay for what your business actually needs.
            </p>

            <div className="space-y-3 pt-2">
              {BILLING_PLANS.map((p, i) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-4 py-3 border transition-all",
                    planIndex === i
                      ? "bg-primary/5 border-primary/30 text-foreground"
                      : "bg-muted/30 border-border text-subtle-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        planIndex === i ? "bg-primary" : "bg-border"
                      )}
                    />
                    <span className="text-sm font-semibold">{p.name}</span>
                    <span className="text-xs">
                      {i === 0
                        ? "up to ₦100K/mo"
                        : i === 1
                          ? "₦100K–₦300K/mo"
                          : "above ₦300K/mo"}
                    </span>
                  </div>
                  <span className="text-sm font-bold">
                    ₦{PLAN_PRICES[p.id].toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-subtle-foreground pt-2">
              7-day free trial · No card required · Pay in Naira via Paystack · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features breakdown ───────────────────────────────────────────────────────

function FeaturesBreakdown() {
  return (
    <section className="py-24 bg-muted/30 border-t border-b border-border">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-bold tracking-widest uppercase text-sm mb-4 block">
            What&apos;s Included
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground">
            All Features. Every Plan.
          </h2>
          <p className="mt-4 text-lg text-subtle-foreground">
            Every Tenzu plan includes the complete toolset. The only difference is how many AI Credits you get each month.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {FEATURE_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.title} className="bg-background border border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold font-heading text-foreground text-lg">
                      {module.title}
                    </h3>
                  </div>
                  <ul className="space-y-2.5">
                    {module.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2.5 text-sm text-foreground">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-bold tracking-widest uppercase text-sm mb-4 block">
            Real Results
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground">
            Nigerian Sellers Love Tenzu
          </h2>
          <p className="mt-4 text-lg text-subtle-foreground">
            Join 2,000+ businesses already selling more without the agency bill.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="bg-background border border-border">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-foreground leading-relaxed text-sm mb-5">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-subtle-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

function CTABanner() {
  return (
    <section className="py-24 bg-primary">
      <div className="container mx-auto px-6 max-w-4xl text-center">
        <Sparks className="w-10 h-10 text-primary-foreground/70 mx-auto mb-6" />
        <h2 className="text-3xl md:text-5xl font-bold font-heading text-primary-foreground mb-6">
          Start Selling More Today
        </h2>
        <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
          Try Tenzu free for 7 days. No dollar card. No agency fees. Launch your first ad in under 2 minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            size="lg"
            className="bg-background text-foreground hover:bg-background/90 rounded-md font-bold text-base px-8"
          >
            <Link href="/signup">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/10 rounded-md font-semibold text-base px-8"
          >
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FAQSection() {
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-16">
          <span className="text-primary font-bold tracking-widest uppercase text-sm mb-4 block">
            FAQ
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left bg-background hover:bg-muted/50 transition-colors duration-150"
              >
                <span className="font-semibold text-foreground text-sm pr-4">{faq.q}</span>
                <NavArrowDown
                  className={cn(
                    "w-5 h-5 text-subtle-foreground shrink-0 transition-transform duration-200",
                    open === i ? "rotate-180" : ""
                  )}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5 bg-background border-t border-border">
                  <p className="text-sm text-subtle-foreground leading-relaxed pt-4">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans selection:bg-primary/20 selection:text-primary">
      <HeroHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-32 pb-16 text-center bg-background">
          <div className="container mx-auto px-6 max-w-4xl">
            <Badge variant="secondary" className="mb-6 text-primary font-semibold px-4 py-1">
              <Sparks className="w-3.5 h-3.5" />
              Spend-Based Pricing
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold font-heading text-foreground mb-6 leading-tight">
              Your Plan Matches
              <br />
              <span className="text-primary">Your Monthly Spend</span>
            </h1>
            <p className="text-xl text-subtle-foreground mb-4 max-w-2xl mx-auto">
              No picking a plan. Tenzu automatically assigns you the right tier based on how much you spend on Meta ads each month — so you always pay the right amount.
            </p>
            <p className="text-sm text-subtle-foreground">
              Drag the slider below to see which plan fits your spend.
            </p>
          </div>
        </section>

        <SpendSliderSection />
        <FeaturesBreakdown />
        <Testimonials />
        <CTABanner />
        <FAQSection />
      </main>

      <Footer />
    </div>
  );
}
