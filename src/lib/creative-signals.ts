import {
  getPlacementSpec,
  isMismatched,
  estimateCropLoss,
  getRatioMismatch,
} from "@/lib/placement-specs"

export type InsightType =
  | "size_mismatch"
  | "advantage_plus_creative"
  | "ctr_gap"
  | "spend_waste"
  | "fatigue"
  | "missing_placement_creative"
  | "variation_opportunity"
  | "winning_placement"

export type InsightSeverity = "critical" | "warning" | "opportunity"

export interface CreativeInsight {
  id: string
  type: InsightType
  severity: InsightSeverity
  title: string
  description: string
  impactLabel: string
  campaignId?: string
  campaignName?: string
  creativeId?: string
  ctaLabel: string
  ctaHref: string
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface PlacementRow {
  publisher_platform: string
  platform_position: string
  impressions: string | number
  spend: string | number
  clicks: string | number
  ctr: string | number
  cpc?: string | number
  reach?: string | number
}

export interface CampaignData {
  id: string
  name: string
  status: string
  placement_cache: PlacementRow[] | null
  advantage_plus_config: Record<string, boolean> | null
  creative_snapshot: { thumbnail_url?: string; image_url?: string } | null
}

export interface AdData {
  id: string
  campaign_id: string
  creative_id: string | null
  ctr: number | null
  impressions: number | null
  spend_cents: number | null
  created_at: string | null
}

export interface CreativeData {
  id: string
  width: number | null
  height: number | null
  name: string | null
  thumbnail_url: string | null
  created_at: string | null
  campaign_id: string | null
}

export interface DailyMetric {
  campaign_id: string
  date: string
  ctr: number
  impressions: number
  spend_cents: number
}

// ─── Evaluator ───────────────────────────────────────────────────────────────

export function evaluateCreativeSignals(
  campaigns: CampaignData[],
  ads: AdData[],
  creatives: CreativeData[],
  metrics: DailyMetric[]
): CreativeInsight[] {
  const insights: CreativeInsight[] = []

  const creativeMap = new Map(creatives.map((c) => [c.id, c]))
  const adsByCampaign = groupBy(ads, (a) => a.campaign_id)
  const metricsByCampaign = groupBy(metrics, (m) => m.campaign_id)

  for (const campaign of campaigns) {
    const campaignAds = adsByCampaign[campaign.id] ?? []
    const campaignMetrics = metricsByCampaign[campaign.id] ?? []

    // A+C is evaluated at the end of this campaign's loop, after all other signals
    // are known, so we can suppress it when the campaign is otherwise healthy.
    const campaignInsightsStart = insights.length

    const placements = campaign.placement_cache ?? []
    const totalSpend = placements.reduce(
      (s, p) => s + parseFloat(String(p.spend || "0")),
      0
    )
    const totalImpressions = placements.reduce(
      (s, p) => s + parseInt(String(p.impressions || "0"), 10),
      0
    )

    if (placements.length > 0) {
      // Normalised placement rows with computed CTR
      const placementRows = placements.map((p) => {
        const impressions = parseInt(String(p.impressions || "0"), 10)
        const clicks = parseInt(String(p.clicks || "0"), 10)
        const spend = parseFloat(String(p.spend || "0"))
        const ctr =
          impressions > 0 ? parseFloat(String(p.ctr || "0")) || (clicks / impressions) * 100 : 0
        const spendShare = totalSpend > 0 ? spend / totalSpend : 0
        return { ...p, impressions, clicks, spend, ctr, spendShare }
      })

      const maxCtr = Math.max(...placementRows.map((p) => p.ctr))
      const avgCtr =
        placementRows.reduce((s, p) => s + p.ctr, 0) / placementRows.length

      // ── Signal 3: CTR gap between placements ──────────────────────────
      const lowPlacements = placementRows.filter(
        (p) => p.impressions > 200 && p.ctr < avgCtr * 0.5
      )
      const topPlacement = placementRows.find((p) => p.ctr === maxCtr)
      if (lowPlacements.length > 0 && topPlacement && maxCtr > 0) {
        const worst = lowPlacements.reduce((a, b) => (a.ctr < b.ctr ? a : b))
        const worstSpec = getPlacementSpec(
          worst.publisher_platform,
          worst.platform_position
        )
        const topSpec = getPlacementSpec(
          topPlacement.publisher_platform,
          topPlacement.platform_position
        )
        const worstName =
          worstSpec?.name ??
          `${worst.publisher_platform} ${worst.platform_position}`
        const topName =
          topSpec?.name ??
          `${topPlacement.publisher_platform} ${topPlacement.platform_position}`

        insights.push({
          id: `ctr_gap_${campaign.id}_${worst.publisher_platform}_${worst.platform_position}`,
          type: "ctr_gap",
          severity: "warning",
          title: `${worstName} CTR is ${Math.round((maxCtr / Math.max(worst.ctr, 0.01) - 1) * 100)}% below your best placement`,
          description: `"${campaign.name}": ${topName} achieves ${maxCtr.toFixed(1)}% CTR while ${worstName} only achieves ${worst.ctr.toFixed(1)}% CTR. The creative format isn't working for ${worstName}.`,
          impactLabel: `${worst.ctr.toFixed(1)}% vs ${maxCtr.toFixed(1)}% CTR`,
          campaignId: campaign.id,
          campaignName: campaign.name,
          ctaLabel: `Create a ${worstName}-optimised version`,
          ctaHref: worstSpec
            ? `/ai-creative/studio?campaignId=${campaign.id}&placement=${worstSpec.optimalAspectRatio}`
            : `/ai-creative/studio?campaignId=${campaign.id}`,
        })
      }

      // ── Signal 4: Spend waste — high budget share, low CTR ─────────────
      const wasteful = placementRows.filter(
        (p) =>
          p.spendShare > 0.3 &&
          p.ctr < avgCtr * 0.6 &&
          p.impressions > 200
      )
      for (const w of wasteful) {
        const spec = getPlacementSpec(w.publisher_platform, w.platform_position)
        const name = spec?.name ?? `${w.publisher_platform} ${w.platform_position}`
        insights.push({
          id: `spend_waste_${campaign.id}_${w.publisher_platform}_${w.platform_position}`,
          type: "spend_waste",
          severity: "warning",
          title: `${Math.round(w.spendShare * 100)}% of budget goes to ${name} with low returns`,
          description: `"${campaign.name}": ${name} consumes ${Math.round(w.spendShare * 100)}% of spend but has only ${w.ctr.toFixed(1)}% CTR (average: ${avgCtr.toFixed(1)}%). A format-specific creative could fix this.`,
          impactLabel: `${Math.round(w.spendShare * 100)}% spend, ${w.ctr.toFixed(1)}% CTR`,
          campaignId: campaign.id,
          campaignName: campaign.name,
          ctaLabel: spec ? `Create ${spec.optimalAspectRatio} creative` : "Improve Creative",
          ctaHref: spec
            ? `/ai-creative/studio?campaignId=${campaign.id}&placement=${spec.optimalAspectRatio}`
            : `/ai-creative/studio?campaignId=${campaign.id}`,
        })
      }

      // ── Signal 6: Missing placement creative ──────────────────────────
      const activePlacements = placementRows.filter((p) => p.impressions > 100)
      for (const p of activePlacements) {
        const spec = getPlacementSpec(p.publisher_platform, p.platform_position)
        if (!spec) continue

        // Check if any creative in the org matches this aspect ratio
        const hasMatchingCreative = creatives.some((c) => {
          if (!c.width || !c.height) return false
          return !isMismatched(c.width, c.height, spec)
        })

        if (!hasMatchingCreative) {
          insights.push({
            id: `missing_creative_${campaign.id}_${p.publisher_platform}_${p.platform_position}`,
            type: "missing_placement_creative",
            severity: "opportunity",
            title: `No ${spec.name}-optimised creative in your library`,
            description: `"${campaign.name}" is serving impressions in ${spec.name} but you have no ${spec.recommendedDimensions} creative. Meta is adapting your current asset — a native creative will perform better.`,
            impactLabel: `${parseInt(String(p.impressions)).toLocaleString()} impressions`,
            campaignId: campaign.id,
            campaignName: campaign.name,
            ctaLabel: `Create ${spec.name} creative`,
            ctaHref: `/ai-creative/studio?campaignId=${campaign.id}&placement=${spec.optimalAspectRatio}`,
          })
        }
      }

      // ── Signal 8: Winning placement opportunity ────────────────────────
      if (topPlacement && topPlacement.ctr > avgCtr * 2.0 && totalImpressions > 500) {
        const topSpec = getPlacementSpec(
          topPlacement.publisher_platform,
          topPlacement.platform_position
        )
        const topName =
          topSpec?.name ??
          `${topPlacement.publisher_platform} ${topPlacement.platform_position}`

        insights.push({
          id: `winning_placement_${campaign.id}`,
          type: "winning_placement",
          severity: "opportunity",
          title: `${topName} is your best-performing placement`,
          description: `"${campaign.name}": ${topName} achieves ${topPlacement.ctr.toFixed(1)}% CTR — ${Math.round(topPlacement.ctr / Math.max(avgCtr, 0.01))}× your placement average. Create more ${topSpec?.recommendedDimensions ?? "native"} creatives to scale what's working.`,
          impactLabel: `${topPlacement.ctr.toFixed(1)}% CTR`,
          campaignId: campaign.id,
          campaignName: campaign.name,
          ctaLabel: topSpec ? `Create ${topSpec.name} creative` : "Create Creative",
          ctaHref: topSpec
            ? `/ai-creative/studio?campaignId=${campaign.id}&placement=${topSpec.optimalAspectRatio}`
            : `/ai-creative/studio?campaignId=${campaign.id}`,
        })
      }
    }

    // ── Signal 1 (spec): Placement size mismatch for campaign's creative ──
    for (const ad of campaignAds) {
      if (!ad.creative_id) continue
      const creative = creativeMap.get(ad.creative_id)
      if (!creative?.width || !creative?.height) continue

      for (const p of campaign.placement_cache ?? []) {
        const impressions = parseInt(String(p.impressions || "0"), 10)
        if (impressions < 100) continue

        const spec = getPlacementSpec(p.publisher_platform, p.platform_position)
        if (!spec) continue

        if (isMismatched(creative.width, creative.height, spec)) {
          const cropLoss = estimateCropLoss(creative.width, creative.height, spec)
          const cropPct = Math.round(cropLoss * 100)
          const mismatch = getRatioMismatch(creative.width, creative.height, spec)

          if (mismatch < 0.05) continue // not worth flagging tiny deviations

          const existingKey = `size_mismatch_${campaign.id}_${p.publisher_platform}_${p.platform_position}`
          if (insights.some((i) => i.id === existingKey)) continue

          insights.push({
            id: existingKey,
            type: "size_mismatch",
            severity: "critical",
            title: `Creative is wrong size for ${spec.name}`,
            description: `"${campaign.name}": Your ${creative.width}×${creative.height} creative is appearing in ${spec.name} (optimal: ${spec.recommendedDimensions}). Meta is auto-cropping it${cropPct > 0 ? `, losing ~${cropPct}% of the image` : ""}.`,
            impactLabel: cropPct > 0 ? `${cropPct}% cropped` : "Wrong ratio",
            campaignId: campaign.id,
            campaignName: campaign.name,
            creativeId: creative.id,
            ctaLabel: `Create ${spec.recommendedDimensions} version`,
            ctaHref: `/ai-creative/studio?sourceCreativeId=${creative.id}&campaignId=${campaign.id}&placement=${spec.optimalAspectRatio}`,
          })
        }
      }
    }

    // ── Signal 5: Creative fatigue ────────────────────────────────────────
    const totalMetricImpressions = campaignMetrics.reduce((s, m) => s + m.impressions, 0)
    if (campaignMetrics.length >= 14 && totalMetricImpressions > 500) {
      const sorted = [...campaignMetrics].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      const recent7 = sorted.slice(0, 7)
      const prev7 = sorted.slice(7, 14)

      const recentCtr =
        recent7.reduce((s, d) => s + d.ctr, 0) / recent7.length
      const prevCtr =
        prev7.reduce((s, d) => s + d.ctr, 0) / prev7.length

      if (prevCtr > 0.3 && recentCtr < prevCtr * 0.65) {
        const dropPct = Math.round((1 - recentCtr / prevCtr) * 100)
        const topAd = campaignAds
          .filter((a) => a.ctr != null)
          .sort((a, b) => (b.ctr ?? 0) - (a.ctr ?? 0))[0]

        insights.push({
          id: `fatigue_${campaign.id}`,
          type: "fatigue",
          severity: "warning",
          title: `CTR dropped ${dropPct}% in the last 7 days`,
          description: `"${campaign.name}" shows creative fatigue: CTR fell from ${prevCtr.toFixed(1)}% to ${recentCtr.toFixed(1)}% over 7 days. Time to generate a fresh variation before performance collapses further.`,
          impactLabel: `−${dropPct}% CTR`,
          campaignId: campaign.id,
          campaignName: campaign.name,
          creativeId: topAd?.creative_id ?? undefined,
          ctaLabel: "Generate variation",
          ctaHref: topAd?.creative_id
            ? `/ai-creative/studio?sourceCreativeId=${topAd.creative_id}&campaignId=${campaign.id}&mode=variation`
            : `/ai-creative/studio?campaignId=${campaign.id}`,
        })
      }
    }

    // ── Signal 7: Top performer variation opportunity ──────────────────────
    const adsWithMetrics = campaignAds.filter(
      (a) => a.ctr != null && (a.ctr ?? 0) > 1 && a.creative_id
    )
    if (adsWithMetrics.length > 0) {
      const topAd = adsWithMetrics.reduce((a, b) =>
        (a.ctr ?? 0) > (b.ctr ?? 0) ? a : b
      )
      const creative = topAd.creative_id
        ? creativeMap.get(topAd.creative_id)
        : null

      if (creative?.created_at) {
        const ageMs = Date.now() - new Date(creative.created_at).getTime()
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))

        if (ageDays >= 14) {
          // Only suggest if not already covered by fatigue signal
          const alreadyFlagged = insights.some(
            (i) => i.type === "fatigue" && i.campaignId === campaign.id
          )
          if (!alreadyFlagged) {
            insights.push({
              id: `variation_${campaign.id}_${topAd.creative_id}`,
              type: "variation_opportunity",
              severity: "opportunity",
              title: `Your top creative has been running ${ageDays} days`,
              description: `"${campaign.name}": Your best ad (${(topAd.ctr ?? 0).toFixed(1)}% CTR) has been live for ${ageDays} days. Generating 2–3 variations now will prevent fatigue and give you test data.`,
              impactLabel: `${ageDays} days running`,
              campaignId: campaign.id,
              campaignName: campaign.name,
              creativeId: topAd.creative_id ?? undefined,
              ctaLabel: "Generate variations",
              ctaHref: `/ai-creative/studio?sourceCreativeId=${topAd.creative_id}&campaignId=${campaign.id}&mode=variation`,
            })
          }
        }
      }
    }

    // ── Signal 1: Advantage+ Creative (deferred) ──────────────────────────
    // Only emitted when the campaign already has warning/critical signals so
    // the card carries real context rather than appearing as standalone noise.
    if (campaign.advantage_plus_config?.creative === true) {
      const campaignInsights = insights.slice(campaignInsightsStart)
      const hasWarningOrCritical = campaignInsights.some(
        (i) => i.severity === "warning" || i.severity === "critical"
      )
      if (hasWarningOrCritical) {
        insights.push({
          id: `adv_creative_${campaign.id}`,
          type: "advantage_plus_creative",
          severity: "warning",
          title: "Meta is auto-modifying your creative",
          description: `Advantage+ Creative is active on "${campaign.name}". Meta may be adding music, adjusting colours, or cropping your image without your approval.`,
          impactLabel: "Auto-enhanced",
          campaignId: campaign.id,
          campaignName: campaign.name,
          ctaLabel: "Review in Ads Manager",
          ctaHref: `https://www.facebook.com/adsmanager/manage/campaigns`,
        })
      }
    }
  }

  // Sort: critical → warning → opportunity, deduplicate by id
  const seen = new Set<string>()
  return insights
    .filter((i) => {
      if (seen.has(i.id)) return false
      seen.add(i.id)
      return true
    })
    .sort((a, b) => {
      const order: Record<InsightSeverity, number> = {
        critical: 0,
        warning: 1,
        opportunity: 2,
      }
      return order[a.severity] - order[b.severity]
    })
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = key(item)
      ;(acc[k] ??= []).push(item)
      return acc
    },
    {} as Record<string, T[]>
  )
}
