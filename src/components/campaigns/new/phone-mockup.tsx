"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CTAData } from "@/types/cta-types";
import {
  NavArrowLeft,
  NavArrowRight,
  Heart,
  ChatBubble,
  ShareIos,
  MusicNote,
  MoreHoriz,
  Check,
} from "iconoir-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAllowedCTAsForPlacement } from "@/lib/constants/cta-options";

interface PhoneMockupProps {
  adCopy: {
    primary: string;
    headline: string;
    cta: CTAData;
  };
  creatives: string[];
  objective: string;
  platform: "meta" | "tiktok" | null;
  metaPlacement?: "automatic" | "instagram" | "facebook";
  brandName?: string; // Real org/brand name from useOrganization
  dailyBudgetNgn?: number; // Used to derive a realistic engagement estimate
  onCTAChange?: (ctaCode: string) => void;
}

export function PhoneMockup({
  adCopy,
  creatives,
  objective,
  platform = "meta",
  metaPlacement = "automatic",
  brandName,
  dailyBudgetNgn = 7000,
  onCTAChange,
}: PhoneMockupProps) {
  // For display purposes: automatic shows Instagram feed (most visual)
  // facebook placement shows Facebook-styled header
  const showFacebookHeader = metaPlacement === "facebook";

  // Derive display values from real props
  const displayName = brandName?.trim() || "Your Business";
  const displayHandle =
    "@" +
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);
  const displayInitial = displayName[0]?.toUpperCase() || "B";

  // Derive a plausible-looking likes count from the budget (purely cosmetic)
  // ₦7,000/day → ~490 reach at ₦14.3/reach → show ~240–490 likes range midpoint
  // Formula: (budget / 1600) * 1000 / 1.5 * 0.7 * 0.02 (2% engagement rate)
  const estimatedLikes = Math.max(
    48,
    Math.round((((dailyBudgetNgn / 1_600) * 1_000) / 1.5) * 0.7 * 0.02),
  );
  const likesDisplay =
    estimatedLikes >= 1000
      ? `${(estimatedLikes / 1000).toFixed(1)}k`
      : estimatedLikes.toLocaleString();
  const [activeIndex, setActiveIndex] = useState(0);
  const currentCreative = creatives[activeIndex];

  // Get CTA label from adCopy prop
  const activeCTA = adCopy.cta;
  const CTA_LABEL = activeCTA?.displayLabel || "Shop now";

  // Get allowed CTAs for dropdown
  const allowedCTAs = getAllowedCTAsForPlacement(
    platform as any,
    objective as any,
  );

  // --- TIKTOK LAYOUT ---
  if (platform === "tiktok") {
    return (
      <div className="mx-auto w-[280px] h-[580px] bg-black rounded-[2.5rem] shadow-2xl overflow-hidden relative border-[6px] border-slate-900">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-20" />

        {/* Full Screen Media */}
        <div className="absolute inset-0 bg-slate-800">
          {creatives.length > 0 ? (
            <img
              src={currentCreative}
              className="w-full h-full object-cover opacity-90"
              alt="TikTok Ad"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              Select Video/Image
            </div>
          )}
        </div>

        {/* Right Sidebar Actions */}
        <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4 z-10 text-white">
          <div className="flex flex-col items-center gap-1">
            <Avatar className="h-10 w-10 border border-white">
              <AvatarFallback className="bg-purple-600 text-white text-[10px]">
                AD
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Heart className="h-7 w-7 fill-white/20" strokeWidth={2} />
            <span className="text-[10px] font-bold">1.2k</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ChatBubble className="h-7 w-7" strokeWidth={2} />
            <span className="text-[10px] font-bold">24</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ShareIos className="h-7 w-7" strokeWidth={2} />
            <span className="text-[10px] font-bold">Share</span>
          </div>
        </div>

        {/* Bottom Overlay Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-linear-to-t from-black/80 to-transparent text-white z-10">
          <div className="mb-3 pr-12">
            <h4 className="font-bold text-sm shadow-black drop-shadow-md">
              {displayHandle}
            </h4>
            <p className="text-xs leading-tight mt-1 opacity-90 line-clamp-2 shadow-black drop-shadow-md">
              {adCopy.primary ||
                `Check out what ${displayName} has for you! 🔥`}
            </p>
            <div className="flex items-center gap-2 mt-2 opacity-80">
              <MusicNote className="h-3 w-3" />
              <span className="text-[10px] animate-pulse">
                Original Sound - Trending
              </span>
            </div>
          </div>

          {/* CTA Button */}
          {/* CTA Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!onCTAChange}>
              <Button className="w-full bg-[#FE2C55] hover:bg-[#E61E45] text-white font-bold h-10 rounded-sm">
                {CTA_LABEL} <NavArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              {allowedCTAs.map((cta) => (
                <DropdownMenuItem
                  key={cta.code}
                  onClick={() => onCTAChange?.(cta.code)}
                  className="justify-between"
                >
                  {cta.label}
                  {activeCTA?.platformCode === cta.code && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // --- META (INSTAGRAM/FB) LAYOUT ---
  return (
    <div className="mx-auto w-[280px] h-[580px] bg-white border-[6px] border-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
      {/* Header — adapts to placement */}
      <div
        className={cn(
          "px-3 py-3 border-b flex items-center justify-between shrink-0",
          showFacebookHeader ? "border-slate-200 bg-white" : "border-slate-50",
        )}
      >
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback
              className={cn(
                "text-[9px] font-bold",
                showFacebookHeader
                  ? "bg-blue-600 text-white"
                  : "bg-linear-to-tr from-purple-500 via-pink-500 to-orange-400 text-white",
              )}
            >
              {displayInitial}
            </AvatarFallback>
          </Avatar>
          <div className="leading-none">
            <p className="text-[10px] font-bold text-slate-900">
              {displayName}
            </p>
            <div className="flex items-center gap-1">
              <p className="text-[8px] text-slate-500">Sponsored ·</p>
              {showFacebookHeader ? (
                <span className="text-[8px] text-blue-600 font-semibold">
                  Facebook
                </span>
              ) : (
                <span className="text-[8px] text-slate-500">Instagram</span>
              )}
            </div>
          </div>
        </div>
        <MoreHoriz className="h-4 w-4 text-slate-400" />
      </div>

      {/* Media (Scrollable if multiple) */}
      <div className="relative aspect-square bg-slate-100 shrink-0">
        {creatives.length > 0 ? (
          <img
            src={currentCreative}
            className="w-full h-full object-cover"
            alt="Ad Creative"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
            No Image
          </div>
        )}

        {creatives.length > 1 && (
          <>
            <button
              onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full shadow-sm hover:bg-white"
            >
              <NavArrowLeft className="h-3 w-3" />
            </button>
            <button
              onClick={() =>
                setActiveIndex((prev) =>
                  Math.min(creatives.length - 1, prev + 1),
                )
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full shadow-sm hover:bg-white"
            >
              <NavArrowRight className="h-3 w-3" />
            </button>
            {/* Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {creatives.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-all",
                    i === activeIndex ? "bg-blue-500" : "bg-white/60",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Action Bar */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex gap-3">
          <Heart className="h-5 w-5 text-slate-800" />
          <ChatBubble className="h-5 w-5 text-slate-800" />
          <ShareIos className="h-5 w-5 text-slate-800" />
        </div>
      </div>

      {/* Caption Area (Scrollable remaining space) */}
      <div className="px-3 pb-2 text-[11px] overflow-y-auto flex-1 overflow-auto no-scrollbar">
        <p className="font-bold text-slate-900 mb-1">{likesDisplay} likes</p>
        <p className="text-slate-800 leading-snug">
          <span className="font-bold mr-1">{displayName}</span>
          {adCopy.primary ||
            "Your ad caption will appear here — write it in step 2!"}
        </p>
        <p className="text-slate-400 text-[9px] mt-2 uppercase">Just now</p>
      </div>

      {/* CTA Bar (Sticky Bottom) */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
        <div className="text-[10px]">
          <p className="text-slate-400">Headline</p>
          <p className="font-bold text-slate-900 truncate max-w-[140px]">
            {adCopy.headline || "Shop Now"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={!onCTAChange}>
            <Button
              size="sm"
              className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px]"
            >
              {CTA_LABEL}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            {allowedCTAs.map((cta) => (
              <DropdownMenuItem
                key={cta.code}
                onClick={() => onCTAChange?.(cta.code)}
                className="justify-between"
              >
                {cta.label}
                {activeCTA?.platformCode === cta.code && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
