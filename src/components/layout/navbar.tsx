import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Sparkles className="h-5 w-5 fill-current" />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight text-slate-900">
              AdSync
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {["Features", "Pricing", "Resources"].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-600 font-semibold hover:text-blue-600 hover:bg-blue-50">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/20">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}