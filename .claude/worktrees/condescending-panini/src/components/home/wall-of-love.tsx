"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

type Testimonial = {
  name: string;
  role: string;
  image: string;
  quote: string;
};

const testimonials: Testimonial[] = [
  {
    name: "Chisom O.",
    role: "Fashion Vendor, Lagos",
    image: "",
    quote:
      "I took a photo of my ankara bags, uploaded it, and the AI turned it into a proper ad. People were messaging me asking for prices within an hour.",
  },
  {
    name: "Ahmed I.",
    role: "Dropshipper, Abuja",
    image: "",
    quote:
      "I tried paying for Wask — card declined twice. Sellam I paid with my Opay card. No stress. The ad was live the same day.",
  },
  {
    name: "Grace U.",
    role: "Skincare Vendor, Lagos",
    image: "",
    quote:
      "I used to spend on ads and never know if they sold anything. Now I see exactly who messaged from the ad and record my sales right there.",
  },
  {
    name: "Tunde A.",
    role: "Electronics Reseller, PH",
    image: "",
    quote:
      "The Naira payment is the main thing for me. I don't want to be thinking about exchange rates when I just want to sell my phones.",
  },
  {
    name: "Sarah O.",
    role: "Food Vendor, Port Harcourt",
    image: "",
    quote:
      "I don't understand targeting at all. I just typed what I sell and who buys from me. The AI figured out the rest. Sales came in.",
  },
  {
    name: "Emeka N.",
    role: "Clothing Store, Kano",
    image: "",
    quote:
      "My ad was running for 3 days with no messages. Sellam paused it and told me why. That alone saved me ₦18,000 that week.",
  },
];

// Helper to split array into chunks for columns
const chunkArray = (
  array: Testimonial[],
  numChunks: number,
): Testimonial[][] => {
  const result: Testimonial[][] = Array.from({ length: numChunks }, () => []);
  array.forEach((item, index) => {
    result[index % numChunks].push(item);
  });
  return result;
};

export function WallOfLove() {
  // Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns
  // We'll render a responsive grid. For simplicity in SSR/hydration matching, we'll use CSS grid columns
  // but to get the masonry effect cleanly with different heights, vertical stacks per column is best.
  // Here we'll just pre-calculate 3 chunks and stack them on large screens.

  const chunks = chunkArray(testimonials, 3);

  return (
    <section id="testimonials" className="py-16 md:py-32 bg-background">
      <div className="container px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-primary font-bold tracking-widest uppercase text-sm mb-4 block">
            Real Results
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground">
            Loved by Nigerian Sellers
          </h2>
          <p className="mt-6 text-xl text-subtle-foreground">
            Join 2,000+ Nigerian businesses already selling more with Sellam.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
          {chunks.map((chunk, colIndex) => (
            <div key={colIndex} className="grid gap-6">
              {chunk.map((testimonial, index) => (
                <Card
                  key={index}
                  className="bg-muted/30 border-none shadow-none hover:shadow-soft transition-all"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                          {testimonial.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-foreground text-sm">
                          {testimonial.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                    <blockquote className="text-subtle-foreground leading-relaxed text-sm">
                      "{testimonial.quote}"
                    </blockquote>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
