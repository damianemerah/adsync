import Link from "next/link";
import { Sparks, Facebook, Twitter, Linkedin, Instagram } from "iconoir-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8 mb-20">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
                <Sparks className="h-5 w-5 fill-current" />
              </div>
              <span className="font-heading text-2xl font-bold tracking-tight text-foreground">
                AdSync
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-8 max-w-sm font-medium">
              Smart Ad Management and Automation tool for Meta, TikTok and
              Google Ads.
            </p>
            <div className="flex gap-4">
              {/* Socials placeholder - in real Wask these are often distinct icons */}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-2xl w-10 h-10"
              >
                <Twitter className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-2xl w-10 h-10"
              >
                <Facebook className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-2xl w-10 h-10"
              >
                <Linkedin className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-2xl w-10 h-10"
              >
                <Instagram className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Links Columns - Wask Style */}
          <div className="lg:col-span-1">
            <h4 className="font-bold text-foreground mb-6 text-lg">Features</h4>
            <ul className="space-y-4">
              {[
                "Optimization",
                "Smart Audience",
                "Auto Pilot",
                "Design Tool",
                "Scheduler",
              ].map((item) => (
                <li key={item}>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-1">
            <h4 className="font-bold text-foreground mb-6 text-lg">
              Resources
            </h4>
            <ul className="space-y-4">
              {[
                "Case Studies",
                "Blog",
                "Help Center",
                "Community",
                "Academy",
              ].map((item) => (
                <li key={item}>
                  <Link
                    href="#"
                    className="text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-1">
            <h4 className="font-bold text-foreground mb-6 text-lg">Company</h4>
            <ul className="space-y-4">
              {["About Us", "Pricing", "Contact", "Careers", "Affiliate"].map(
                (item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-muted-foreground hover:text-primary transition-colors font-medium"
                    >
                      {item}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className="lg:col-span-1">
            <h4 className="font-bold text-foreground mb-6 text-lg">Legal</h4>
            <ul className="space-y-4">
              {["Privacy Policy", "Terms of Use", "Cookie Policy", "GDPR"].map(
                (item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-muted-foreground hover:text-primary transition-colors font-medium"
                    >
                      {item}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-muted-foreground font-medium">
            © 2026 AdSync Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
            <span className="text-sm font-semibold text-foreground">
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
