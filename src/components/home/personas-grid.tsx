"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Shop, User } from "iconoir-react";
import { Whatsapp } from "iconoir-react";
import Link from "next/link";
import { ReactNode } from "react";

type Persona = {
  icon: ReactNode;
  title: string;
  description: string;
  linkText: string;
  image: string; // Placeholder for background image
};

const personas: Persona[] = [
  {
    icon: <Whatsapp className="w-8 h-8 text-primary" />,
    title: "WhatsApp Sellers",
    description:
      "You already sell daily on WhatsApp. Tenzu runs ads that bring more people to your WhatsApp chat — and shows you how many bought.",
    linkText: "For WhatsApp Sellers",
    image: "bg-primary/5",
  },
  {
    icon: <Shop className="w-8 h-8 text-purple-500" />,
    title: "Fashion & Beauty Vendors",
    description:
      "Your products look great. AI turns your phone photos into professional ads that stop the scroll — no Canva, no agency needed.",
    linkText: "For Fashion & Beauty",
    image: "bg-purple-500/5",
  },
  {
    icon: <User className="w-8 h-8 text-orange-500" />,
    title: "First-Time Advertisers",
    description:
      "Never run an ad before? Good. Tenzu's AI asks what you sell, then sets everything up. You just approve and launch.",
    linkText: "Start Your First Ad",
    image: "bg-orange-500/5",
  },
];

export function PersonasGrid() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3">
            Who is Tenzu for?
          </h2>
          <h3 className="text-3xl md:text-5xl font-heading text-foreground">
            Made For You If...
          </h3>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {personas.map((persona, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden border-border/60 shadow-sm hover:shadow-sm border border-border transition-all duration-300 h-full"
            >
              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${persona.image}`}
              />

              <CardContent className="p-8 flex flex-col h-full gap-6">
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                  {persona.icon}
                </div>

                <div>
                  <h4 className="font-bold text-xl text-foreground mb-3">
                    {persona.title}
                  </h4>
                  <p className="text-subtle-foreground leading-relaxed">
                    {persona.description}
                  </p>
                </div>

                <div className="mt-auto pt-4">
                  <Link
                    href="/signup"
                    className="inline-flex items-center text-sm font-bold text-foreground group-hover:text-primary transition-colors"
                  >
                    {persona.linkText}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
