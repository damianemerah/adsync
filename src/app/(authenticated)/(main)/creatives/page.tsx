"use client";

import { GlobalContextBar } from "@/components/layout/global-context-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { NavArrowLeft, Sparks } from "iconoir-react";
import Image from "next/image";
// --- MOCK DATA REMOVED ---

import { useAdAnalysis } from "@/hooks/use-ad-analysis";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";

export default function CreativeAnalyzePage() {
  // Use the hook to fetch real data
  const { data: ads, isLoading } = useAdAnalysis();
  const router = useRouter();

  const handleImprove = (ad: any) => {
    // Enhanced: Pass full ad context for smarter improvement suggestions
    if (!ad.image || ad.image === "/placeholder.png") {
      router.push(`/creations/studio`);
      return;
    }

    // Build query params with rich context
    const params = new URLSearchParams({
      image: ad.image,
      intent: "improve",
      current_ctr: ad.ctr.toString(),
      campaign_name: ad.campaignName || "",
      spend: ad.spend.toString(),
      impressions: ad.impressions.toString(),
    });

    router.push(`/creations/studio?${params.toString()}`);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted font-sans text-foreground">
      {/* 1. Sticky Header (Global Pattern) */}
      <PageHeader title="Ad Analyze" className="static shrink-0 z-10" />

      {/* 2. Global Filters (Context Bar) */}
      <GlobalContextBar />

      {/* 3. Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="container mx-auto px-4 lg:px-8 py-8 space-y-10">
          {/* Sub-Header / Toolbar Section */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              {/* Left Side: Page-Specific Filters */}
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-3 py-1.5 text-xs font-semibold rounded-lg gap-2 shadow-sm transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Show Ads with Creatives Only
                </Badge>
              </div>

              {/* Right Side: Sort Controls */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 border-border text-subtle-foreground bg-background hover:text-foreground hover:border-primary/50 rounded-md transition-all shadow-sm"
                >
                  Sorting By Spend{" "}
                  <NavArrowLeft className="w-4 h-4 -rotate-90 ml-2" />
                </Button>
              </div>
            </div>

            {/* Cards Grid */}
            {isLoading ? (
              // Simple Loading Skeleton
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-card rounded-lg h-96 shadow-sm border border-border animate-pulse"
                  />
                ))}
              </div>
            ) : ads && ads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {ads.map((ad) => (
                  <AdAnalyzeCard
                    key={ad.id}
                    data={ad}
                    onImprove={() => handleImprove(ad)}
                  />
                ))}
              </div>
            ) : (
              <Empty className="bg-card shadow-sm border border-border rounded-lg">
                <EmptyHeader>
                  <EmptyTitle>No Creatives Found</EmptyTitle>
                  <EmptyDescription>
                    Sync your ad accounts to analyze creative performance.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button className="rounded-md">Sync Accounts</Button>
                </EmptyContent>
              </Empty>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function AdAnalyzeCard({
  data,
  onImprove,
}: {
  data: any;
  onImprove: () => void;
}) {
  return (
    <div className="bg-card rounded-lg shadow-sm hover:shadow-sm border border-border transition-all duration-300 p-5 group flex flex-col h-full">
      {/* 1. Image Display */}
      <div className="relative aspect-square bg-muted/50 rounded-lg overflow-hidden mb-5 border border-border/50">
        <div className="absolute inset-0 flex items-center justify-center text-subtle-foreground">
          {/* Fallback if no image */}
          <Image
            src={data.image || "/placeholder.png"}
            alt={data.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        {/* Overlay Badge - Optional */}
        <div className="absolute top-3 right-3">
          <Badge className="bg-background/90 backdrop-blur-sm text-foreground hover:bg-background shadow-sm border-0 text-[10px] px-2 h-6">
            {data.status || "Active"}
          </Badge>
        </div>
      </div>

      {/* 2. Title */}
      <div className="mb-5 grow">
        <h3
          className="font-heading text-foreground text-base truncate mb-1"
          title={data.name}
        >
          {data.name}
        </h3>
        <p className="text-xs text-subtle-foreground truncate flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
          {data.campaignName}
        </p>
      </div>

      {/* 3. Metrics */}
      <div className="space-y-3 mb-6 bg-muted/30 p-4 rounded-lg border border-border/50">
        <MetricRow
          label="Spend"
          value={`$${data.spend.toFixed(2)}`}
          color="text-foreground"
        />
        <MetricRow
          label="Impressions"
          value={data.impressions.toLocaleString()}
          color="text-foreground"
        />
        <MetricRow
          label="Clicks"
          value={data.clicks.toLocaleString()}
          color="text-foreground"
        />
        <MetricRow
          label="CTR"
          value={`${data.ctr.toFixed(2)}%`}
          color="text-primary"
        />
      </div>

      {/* 4. Action */}
      <Button
        onClick={onImprove}
        className="w-full bg-ai hover:bg-ai/90 text-white font-bold rounded-md shadow-md hover:shadow-sm border border-border h-11 transition-all"
      >
        <Sparks className="w-4 h-4 mr-2" /> Improve Creative
      </Button>
    </div>
  );
}

function MetricRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "w-1 h-3 rounded-full",
            label === "CTR" ? "bg-primary" : "bg-border",
          )}
        />
        <span className="text-subtle-foreground font-medium text-xs uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span className={cn("font-bold font-mono tracking-tight", color)}>
        {value}
      </span>
    </div>
  );
}
