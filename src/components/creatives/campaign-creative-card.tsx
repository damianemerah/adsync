"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";
import {
  MediaImage,
  Sparks,
  NavArrowLeft,
  NavArrowRight,
  WarningTriangle,
  PlaySolid,
} from "iconoir-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  CampaignCreative,
  CampaignCreativeAssetMetric,
  CampaignCreativeCardMetric,
  CampaignCreativeCarouselCard,
} from "@/hooks/use-campaign-creatives";
import type { CreativeInsight } from "@/lib/creative-signals";

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv"];

function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().split("?")[0];
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function formatCtr(ctr: number | null): string {
  if (ctr == null) return "—";
  return `${(ctr * 100).toFixed(2)}%`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatNaira(cents: number): string {
  const naira = cents / 100;
  return `₦${naira.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function severityRank(s: CreativeInsight["severity"]): number {
  return s === "critical" ? 3 : s === "warning" ? 2 : 1;
}

function topSeverity(
  insights: CreativeInsight[],
): CreativeInsight["severity"] | null {
  if (insights.length === 0) return null;
  return insights.reduce<CreativeInsight["severity"]>(
    (acc, i) => (severityRank(i.severity) > severityRank(acc) ? i.severity : acc),
    "opportunity",
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta =
    status === "pending_review"
      ? { label: "Pending", tone: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400", dot: "bg-yellow-500" }
      : status === "paused"
        ? { label: "Paused", tone: "bg-muted text-subtle-foreground", dot: "bg-muted-foreground" }
        : { label: "Active", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        meta.tone,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function IssueTag({
  count,
  severity,
  onClick,
}: {
  count: number;
  severity: CreativeInsight["severity"];
  onClick: () => void;
}) {
  const tone =
    severity === "critical"
      ? "bg-destructive text-destructive-foreground"
      : severity === "warning"
        ? "bg-yellow-500 text-white"
        : "bg-emerald-500 text-white";
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide shadow-md hover:scale-105 transition-transform",
        tone,
      )}
    >
      <WarningTriangle className="h-3 w-3" />
      {count} {count === 1 ? "issue" : "issues"}
    </button>
  );
}

function VideoFrame({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function togglePlay(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }

  return (
    <div className="absolute inset-0 cursor-pointer" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
          <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <PlaySolid className="h-6 w-6 text-black ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}

function ImageFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, 400px"
      className="object-cover"
    />
  );
}

function MediaFrame({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted">
        <MediaImage className="h-10 w-10 text-muted-foreground/40" />
      </div>
    );
  }
  return isVideoUrl(src) ? (
    <VideoFrame src={src} />
  ) : (
    <ImageFrame src={src} alt={alt} />
  );
}

function MetricRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-l-2 border-border pl-3">
      <span className="text-xs text-subtle-foreground">{label}</span>
      <span
        className={cn(
          "text-xs font-mono font-medium",
          accent ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

interface MediaItem {
  url: string;
  headline?: string;
  description?: string;
}

function getMediaItems(data: CampaignCreative): MediaItem[] {
  if (data.adFormatType === "carousel") {
    const items = (data.carouselCards ?? []).map((c) => ({
      url: c.imageUrl,
      headline: c.headline,
      description: c.description,
    }));
    if (items.length > 0) return items;
  }
  return data.creatives.map((url) => ({ url }));
}

export interface CampaignCreativeCardProps {
  data: CampaignCreative;
  insights?: CreativeInsight[];
  onShowIssues?: (campaignId: string) => void;
}

export function CampaignCreativeCard({
  data,
  insights = [],
  onShowIssues,
}: CampaignCreativeCardProps) {
  const items = getMediaItems(data);
  const [index, setIndex] = useState(0);
  const active = items[index];

  const isDynamic = data.adFormatType === "dynamic_creative";
  const isCarousel = data.adFormatType === "carousel";

  const activeAssetMetric: CampaignCreativeAssetMetric | undefined =
    isDynamic ? data.assetMetrics?.[index] : undefined;
  const activeCardMetric: CampaignCreativeCardMetric | undefined =
    isCarousel ? data.carouselCardMetrics?.[index] : undefined;
  const displayPerf = activeAssetMetric ?? activeCardMetric ?? data.performance;

  const hasMulti = items.length > 1;
  const goPrev = () =>
    setIndex((i) => (i - 1 + items.length) % items.length);
  const goNext = () => setIndex((i) => (i + 1) % items.length);

  const issueCount = insights.length;
  const issueSeverity = topSeverity(insights);

  const formatLabel =
    data.adFormatType === "carousel"
      ? `Carousel · ${items.length}`
      : data.adFormatType === "dynamic_creative"
        ? `Dynamic · ${items.length} variations`
        : isVideoUrl(active?.url)
          ? "Video"
          : "Single";

  return (
    <div className="group bg-card rounded-lg border border-border overflow-hidden flex flex-col">
      {/* ── Media area ─────────────────────────────────────────────────── */}
      <div className="aspect-square relative bg-muted overflow-hidden">
        <MediaFrame src={active?.url} alt={data.campaignName} />

        {/* Format pill */}
        <span className="absolute top-2 left-2 z-10 inline-flex items-center rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
          {formatLabel}
        </span>

        {/* Issue tag */}
        {issueCount > 0 && issueSeverity && (
          <div className="absolute top-2 right-2 z-10">
            <IssueTag
              count={issueCount}
              severity={issueSeverity}
              onClick={() => onShowIssues?.(data.campaignId)}
            />
          </div>
        )}

        {/* Carousel arrows */}
        {hasMulti && (
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous"
            >
              <NavArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next"
            >
              <NavArrowRight className="h-4 w-4" />
            </button>

            {/* Dots indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1">
              {items.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-4 bg-white" : "w-1.5 bg-white/50",
                  )}
                />
              ))}
            </div>
          </>
        )}

        {/* Carousel card headline overlay (only for carousel format) */}
        {data.adFormatType === "carousel" && active?.headline && (
          <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-3 pointer-events-none">
            <p className="text-white text-xs font-semibold truncate">
              {active.headline}
            </p>
            {active.description && (
              <p className="text-white/80 text-[10px] truncate mt-0.5">
                {active.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/campaigns/${data.campaignId}`}
            className="font-semibold text-sm text-foreground hover:text-primary truncate"
            title={data.campaignName}
          >
            {data.campaignName}
          </Link>
          <StatusBadge status={data.status} />
        </div>

        {/* Metric block — Spend / Impressions / Clicks / CTR */}
        <div className="flex flex-col">
          {isDynamic && activeAssetMetric && (
            <p className="text-[10px] text-subtle-foreground mb-1 pl-3">
              Variation {index + 1} of {items.length}
            </p>
          )}
          {isCarousel && activeCardMetric && (
            <p className="text-[10px] text-subtle-foreground mb-1 pl-3">
              Card {index + 1} of {items.length}
            </p>
          )}
          {isCarousel && !activeCardMetric && items.length > 1 && (
            <p className="text-[10px] text-subtle-foreground mb-1 pl-3">
              Campaign total · swipe to browse cards
            </p>
          )}
          <MetricRow label="Spend" value={formatNaira(displayPerf.spendCents)} />
          <MetricRow label="Impressions" value={formatNumber(displayPerf.impressions)} />
          <MetricRow label="Clicks" value={formatNumber(displayPerf.clicks)} />
          <MetricRow label="CTR" value={formatCtr(displayPerf.ctr)} accent />
        </div>

        {/* CTA */}
        <Link
          href={`/ai-creative/studio?sourceCampaignId=${data.campaignId}`}
          className="mt-1"
        >
          <Button
            variant="default"
            className="w-full h-9 gap-1.5 bg-ai hover:bg-ai/90 text-white text-xs font-bold rounded-md"
          >
            <Sparks className="h-3.5 w-3.5" />
            Improve Creative
          </Button>
        </Link>
      </div>
    </div>
  );
}
