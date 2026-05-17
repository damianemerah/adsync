"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import Link from "next/link"
import { MediaImage, ArrowRight, Plus, Check } from "iconoir-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { GlobalContextBar } from "@/components/layout/global-context-bar"
import { InsightCard } from "@/components/creatives/insight-card"
import { CampaignCreativeCard } from "@/components/creatives/campaign-creative-card"
import { useCampaignCreatives } from "@/hooks/use-campaign-creatives"
import { getCreativeInsights } from "@/actions/creative-signals"
import { useActiveOrgContext } from "@/components/providers/active-org-provider"
import { useDashboardStore } from "@/store/dashboard-store"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { CreativeInsight } from "@/lib/creative-signals"
import type { CampaignCreative } from "@/hooks/use-campaign-creatives"

type SortKey = "spend" | "impressions" | "clicks" | "ctr" | "recent"

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "spend", label: "Sort by spend" },
  { value: "impressions", label: "Sort by impressions" },
  { value: "clicks", label: "Sort by clicks" },
  { value: "ctr", label: "Sort by CTR" },
  { value: "recent", label: "Most recent" },
]

function sortCreatives(
  list: CampaignCreative[],
  key: SortKey,
): CampaignCreative[] {
  const copy = [...list]
  switch (key) {
    case "spend":
      return copy.sort((a, b) => b.performance.spendCents - a.performance.spendCents)
    case "impressions":
      return copy.sort((a, b) => b.performance.impressions - a.performance.impressions)
    case "clicks":
      return copy.sort((a, b) => b.performance.clicks - a.performance.clicks)
    case "ctr":
      return copy.sort((a, b) => (b.performance.ctr ?? 0) - (a.performance.ctr ?? 0))
    case "recent":
    default:
      return copy // already in created_at DESC order from the hook
  }
}

export default function CreativeIntelligencePage() {
  const { activeOrgId } = useActiveOrgContext()
  const { selectedCampaignIds } = useDashboardStore()
  const [sortKey, setSortKey] = useState<SortKey>("spend")
  const [issuesSheetCampaignId, setIssuesSheetCampaignId] = useState<string | null>(null)

  const { data: allInsights = [] } = useQuery({
    queryKey: ["creative-insights", activeOrgId],
    queryFn: () => getCreativeInsights(),
    enabled: !!activeOrgId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: campaignCreatives = [], isLoading: creativesLoading } =
    useCampaignCreatives()

  // Narrow insights to the same campaigns the user has filtered to.
  const visibleCampaignIds = useMemo(
    () => new Set(campaignCreatives.map((c) => c.campaignId)),
    [campaignCreatives],
  )
  const insights = useMemo(() => {
    const allSelected = selectedCampaignIds.includes("all")
    if (allSelected && visibleCampaignIds.size === 0) return allInsights
    return allInsights.filter(
      (i) => !i.campaignId || visibleCampaignIds.has(i.campaignId),
    )
  }, [allInsights, visibleCampaignIds, selectedCampaignIds])

  // Group insights by campaign for per-card badges and the issue sheet.
  const insightsByCampaign = useMemo(() => {
    const map = new Map<string, CreativeInsight[]>()
    for (const ins of insights) {
      if (!ins.campaignId) continue
      const arr = map.get(ins.campaignId) ?? []
      arr.push(ins)
      map.set(ins.campaignId, arr)
    }
    return map
  }, [insights])

  const sortedCreatives = useMemo(
    () => sortCreatives(campaignCreatives, sortKey),
    [campaignCreatives, sortKey],
  )

  const criticalCount = insights.filter((i) => i.severity === "critical").length
  const warningCount = insights.filter((i) => i.severity === "warning").length
  const opportunityCount = insights.filter((i) => i.severity === "opportunity").length

  const sheetInsights = issuesSheetCampaignId
    ? insightsByCampaign.get(issuesSheetCampaignId) ?? []
    : []
  const sheetCampaign = issuesSheetCampaignId
    ? campaignCreatives.find((c) => c.campaignId === issuesSheetCampaignId)
    : null

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted font-sans text-foreground">
      <PageHeader title="Creative Analyze" className="static shrink-0 z-10" />
      <GlobalContextBar />

      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="container mx-auto px-4 lg:px-8 py-8 space-y-6">

          {/* Summary pills — quick at-a-glance health */}
          {insights.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {criticalCount > 0 && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-1.5 text-sm font-semibold text-destructive">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  {criticalCount} critical
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  {warningCount} warning{warningCount > 1 ? "s" : ""}
                </div>
              )}
              {opportunityCount > 0 && (
                <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  {opportunityCount} opportunit{opportunityCount > 1 ? "ies" : "y"}
                </div>
              )}
            </div>
          )}

          {/* Toolbar — title + sort + nav */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">Ad Analyze</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="h-8 text-xs rounded-md w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link href="/campaigns/new">
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-md gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  New Campaign
                </Button>
              </Link>
              <Link href="/ai-creative/library">
                <Button variant="ghost" size="sm" className="h-8 text-xs rounded-md gap-1.5 text-subtle-foreground hover:text-foreground">
                  Asset library
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Card grid */}
          {creativesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-card border border-border overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="space-y-1.5">
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-full" />
                    </div>
                    <div className="h-9 bg-muted rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedCreatives.length === 0 ? (
            <div className="rounded-lg bg-card border border-dashed border-border p-10 flex flex-col items-center gap-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <MediaImage className="h-5 w-5 text-subtle-foreground" />
              </div>
              <p className="text-xs text-subtle-foreground">
                No campaigns have run yet for the current filters.
              </p>
              <Link href="/campaigns/new">
                <Button size="sm" className="h-7 text-xs rounded-md">
                  Create your first campaign
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedCreatives.map((cc) => (
                <CampaignCreativeCard
                  key={cc.campaignId}
                  data={cc}
                  insights={insightsByCampaign.get(cc.campaignId) ?? []}
                  onShowIssues={setIssuesSheetCampaignId}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Per-campaign issues sheet */}
      <Sheet
        open={!!issuesSheetCampaignId}
        onOpenChange={(open) => !open && setIssuesSheetCampaignId(null)}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-heading">
              {sheetCampaign?.campaignName ?? "Campaign"} · Issues
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {sheetInsights.length === 0 ? (
              <div className="rounded-lg bg-card border border-border p-6 flex flex-col items-center gap-2 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold">All clear</p>
                <p className="text-xs text-subtle-foreground">
                  No issues detected for this campaign.
                </p>
              </div>
            ) : (
              sheetInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
