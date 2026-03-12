"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChatBubble,
  Cpu,
  Flash,
  HandCash,
  MagicWand,
  Whatsapp,
} from "iconoir-react";
import { ReactNode } from "react";

export function FeaturesSection() {
  return (
    <section id="features" className="bg-muted/30 py-16 md:py-32">
      <div className="container px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-balance text-4xl font-bold font-heading lg:text-5xl text-foreground">
            Everything You Need To Sell More
          </h2>
          <p className="mt-4 text-lg text-subtle-foreground">
            No agency. No designer. No dollar card. Just you, your phone, and
            results.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          <FeatureCard
            icon={<Flash className="size-6" />}
            title="Launch in 2 Minutes"
            description="Chat with AI, tell it what you sell. It sets up your ad automatically. No forms, no confusion."
          />
          <FeatureCard
            icon={<HandCash className="size-6" />}
            title="See Your Sales in Naira"
            description="Know how many people messaged from your ad, and how much you made. Not clicks — actual sales."
          />
          <FeatureCard
            icon={<MagicWand className="size-6" />}
            title="AI Creative Studio"
            description="Take a photo of your product. AI turns it into a professional ad. No designer needed."
          />
          <FeatureCard
            icon={<Cpu className="size-6" />}
            title="Naira Payments"
            description="Pay your monthly plan with your Paystack or local bank card. No dollar card, no failed payments."
          />
          <FeatureCard
            icon={<Whatsapp className="size-6" />}
            title="Built for WhatsApp Sellers"
            description="Every ad is tracked with a smart link. See exactly which ad made someone message you on WhatsApp."
          />
          <FeatureCard
            icon={<ChatBubble className="size-6" />}
            title="Ads That Work While You Sleep"
            description="Sellam watches your ads 24/7 and pauses the ones wasting money — automatically. No rules to configure."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="group shadow-sm hover:shadow-soft transition-all duration-300 border-border/60 bg-card">
      <CardHeader className="pb-4">
        <CardDecorator>{icon}</CardDecorator>
        <h3 className="mt-6 font-bold text-xl text-foreground">{title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-subtle-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

const CardDecorator = ({ children }: { children: ReactNode }) => (
  <div className="relative mx-auto size-20 rounded-2xl flex items-center justify-center bg-muted/50 group-hover:bg-primary/10 transition-colors duration-300 text-foreground group-hover:text-primary">
    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-foreground/10 group-hover:ring-primary/20 transition-all" />
    {children}
  </div>
);
