import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparks } from "iconoir-react";

export function Navbar() {
  return (
    <nav className="w-full bg-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm border border-border transition-transform group-hover:scale-105">
              <Sparks className="h-5 w-5 fill-current" />
            </div>
            <span className="font-heading text-2xl font-bold tracking-tight text-white">
              AdSync
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            {["Features", "Pricing", "Resources"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-semibold text-gray-300 hover:text-primary transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-gray-300 font-semibold hover:text-primary hover:bg-white/10 rounded-lg"
              >
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 h-11 shadow-sm border border-border transition-all hover:-translate-y-0.5">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
