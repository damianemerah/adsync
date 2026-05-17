"use client";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, Xmark } from "iconoir-react";
import Link from "next/link";
import React from "react";

const menuItems = [
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "/pricing" },
];

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(true);
  const lastScrollY = React.useRef(0);

  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 50);

      // Smart Scroll
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "dark fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "-translate-y-full",
      )}
    >
      <nav data-state={menuState && "active"} className="w-full px-2 mt-4">
        <div
          className={cn(
            "mx-auto max-w-6xl px-6 transition-all duration-300 lg:px-12 py-3 rounded-lg",
            isScrolled
              ? "bg-background/80 max-w-4xl border border-border/50 backdrop-blur-lg lg:px-5 shadow-sm text-foreground"
              : "bg-transparent text-white",
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 lg:gap-0">
            <div className="flex w-full justify-between lg:w-auto">
              <Link href="/" aria-label="home" className="flex items-center space-x-2">
                <Logo />
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? "Close Menu" : "Open Menu"}
                className={cn(
                  "relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden",
                  isScrolled ? "text-foreground" : "text-white"
                )}
              >
                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto h-6 w-6 duration-200 transition-all" />
                <Xmark className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto h-6 w-6 -rotate-180 scale-0 opacity-0 duration-200 transition-all text-foreground" />
              </button>
            </div>

            {/* Desktop Menu */}
            <div className="absolute inset-0 m-auto hidden w-fit lg:block">
              <ul className="flex gap-8 text-sm font-medium">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link
                      href={item.href}
                      className={cn(
                        "transition-colors duration-150",
                        isScrolled ? "text-subtle-foreground hover:text-foreground" : "text-white/80 hover:text-white"
                      )}
                    >
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mobile Menu & Actions */}
            <div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-col items-center justify-end space-y-8 rounded-lg border border-border p-6 shadow-sm md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:flex-row lg:gap-4 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
              <div className="lg:hidden w-full text-foreground">
                <ul className="space-y-6 text-base font-medium text-center">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link href={item.href} className="text-subtle-foreground hover:text-foreground block duration-150" onClick={() => setMenuState(false)}>
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={cn("flex w-full flex-col gap-3 sm:flex-row sm:gap-3 md:w-fit", isScrolled ? "hidden lg:flex" : "flex")}>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "hidden lg:inline-flex rounded-md",
                    isScrolled ? "text-subtle-foreground hover:text-foreground" : "text-white hover:text-white hover:bg-white/10"
                  )}
                >
                  <Link href="/login">Log In</Link>
                </Button>
                <Button asChild size="sm" className="rounded-md ring-1 ring-primary/20">
                  <Link href="/signup">Start Free Trial</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
