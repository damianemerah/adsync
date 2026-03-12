"use client";

import { useRef, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface AdCanvasProps {
  imageSrc: string | null;
  headline: string;
  ctaText: string;
  overlayStyle: "none" | "modern" | "luxury" | "bold";
  isGenerating: boolean;
}

export const AdCanvas = forwardRef<HTMLDivElement, AdCanvasProps>(
  ({ imageSrc, headline, ctaText, overlayStyle, isGenerating }, ref) => {
    // --- OVERLAY STYLES ---
    const renderOverlay = () => {
      switch (overlayStyle) {
        case "modern":
          return (
            <div className="absolute inset-0 flex flex-col justify-end p-6 bg-linear-to-t from-black/80 via-black/20 to-transparent">
              <h2 className="text-3xl font-black text-white leading-tight mb-3 drop-shadow-md">
                {headline}
              </h2>
              <div className="bg-white text-black text-sm font-bold px-4 py-2 rounded-full w-fit">
                {ctaText}
              </div>
            </div>
          );
        case "luxury":
          // UPDATED: Matches "Timeless Elegance" example
          return (
            <div className="absolute inset-0 m-4 border border-white/40 flex flex-col justify-between items-center p-6 bg-black/10 backdrop-blur-[1px]">
              {/* Top Badge/Logo Placeholder */}
              <div className="bg-white/90 text-black px-3 py-1 font-serif text-xs uppercase tracking-widest mt-4">
                Collection
              </div>

              {/* Bottom Text Area */}
              <div className="text-center mb-8 bg-black/40 p-4 w-full backdrop-blur-md border-t border-white/20">
                <h2 className="text-2xl font-serif text-white tracking-widest mb-3 uppercase leading-tight">
                  {headline}
                </h2>
                <div className="inline-block border border-white/50 text-white text-[10px] tracking-[0.2em] px-6 py-2 uppercase hover:bg-white hover:text-black transition-colors cursor-pointer">
                  {ctaText} &rsaquo;
                </div>
              </div>
            </div>
          );
        case "bold":
          return (
            <div className="absolute top-6 left-6 right-6">
              <span className="bg-yellow-400 text-black text-4xl font-black px-2 py-1 box-decoration-clone leading-snug shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {headline}
              </span>
              <div className="mt-4">
                <span className="bg-black text-white text-lg font-bold px-4 py-2 rounded-none border-2 border-transparent shadow-[4px_4px_0px_0px_#fbbf24]">
                  {ctaText} &rarr;
                </span>
              </div>
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div className="w-full flex justify-center bg-slate-100 rounded-xl border border-slate-200 p-4">
        {/* THE CANVAS AREA - Fixed Aspect Ratio 1:1 */}
        <div
          ref={ref}
          className="relative w-[500px] h-[500px] bg-white shadow-2xl overflow-hidden group"
          id="ad-canvas"
        >
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400 animate-pulse">
              <div className="w-16 h-16 bg-slate-200 rounded-full mb-4" />
              <p>Generating AI Creative...</p>
            </div>
          ) : imageSrc ? (
            <>
              {/* Note: Unoptimized Image needed for html2canvas CORS */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="Ad Background"
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
              {renderOverlay()}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400 border-2 border-dashed border-slate-200 m-4 rounded-xl">
              <p>Your design will appear here</p>
            </div>
          )}
        </div>
      </div>
    );
  },
);

AdCanvas.displayName = "AdCanvas";
