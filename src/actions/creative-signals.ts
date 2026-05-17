"use server"

import { createClient } from "@/lib/supabase/server"
import { getActiveOrgId } from "@/lib/active-org"
import {
  evaluateCreativeSignals,
  type CreativeInsight,
  type InsightType,
  type InsightSeverity,
  type CampaignData,
  type AdData,
  type CreativeData,
  type DailyMetric,
} from "@/lib/creative-signals"

export async function getCreativeInsights(): Promise<CreativeInsight[]> {
  const supabase = await createClient()
  const orgId = await getActiveOrgId()
  if (!orgId) return []

  // ── 1. Read pre-computed signals from the materialized table ─────────────
  const { data: rows } = await supabase
    .from("creative_insights")
    .select("*")
    .eq("organization_id", orgId)
    .order("computed_at", { ascending: false })

  const materialized: CreativeInsight[] = (rows ?? []).map((row) => ({
    id: row.id,
    type: row.type as InsightType,
    severity: row.severity as InsightSeverity,
    title: row.title,
    description: row.description,
    impactLabel: row.impact_label,
    campaignId: row.campaign_id ?? undefined,
    campaignName: row.campaign_name ?? undefined,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
  }))

  // ── 2. On-demand signals not yet ported to the edge function ─────────────
  // (size_mismatch, missing_placement_creative, variation_opportunity)
  // These require joining across ads + creatives tables and are computed fresh.
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const [campaignsRes, adsRes, creativesRes, metricsRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, status, placement_cache, advantage_plus_config, creative_snapshot")
      .eq("organization_id", orgId)
      .in("status", ["active", "pending_review"]),

    supabase
      .from("ads")
      .select("id, campaign_id, creative_id, ctr, impressions, spend_cents, created_at")
      .not("campaign_id", "is", null),

    supabase
      .from("creatives")
      .select("id, width, height, name, thumbnail_url, created_at, campaign_id")
      .eq("organization_id", orgId)
      .is("parent_id", null),

    supabase
      .from("campaign_metrics")
      .select("campaign_id, date, ctr, impressions, spend_cents")
      .gte("date", fourteenDaysAgo)
      .in(
        "campaign_id",
        (
          await supabase
            .from("campaigns")
            .select("id")
            .eq("organization_id", orgId)
            .in("status", ["active", "pending_review"])
        ).data?.map((c) => c.id) ?? []
      ),
  ])

  const ONDEMAND_TYPES: InsightType[] = [
    "size_mismatch",
    "missing_placement_creative",
    "variation_opportunity",
  ]
  const onDemandAll = evaluateCreativeSignals(
    (campaignsRes.data ?? []) as CampaignData[],
    (adsRes.data ?? []) as AdData[],
    (creativesRes.data ?? []) as CreativeData[],
    (metricsRes.data ?? []) as DailyMetric[]
  )
  const onDemand = onDemandAll.filter((i) => ONDEMAND_TYPES.includes(i.type))

  // ── 3. Merge, deduplicate by id ──────────────────────────────────────────
  const seen = new Set<string>()
  const merged: CreativeInsight[] = []
  for (const insight of [...materialized, ...onDemand]) {
    if (!seen.has(insight.id)) {
      seen.add(insight.id)
      merged.push(insight)
    }
  }

  return merged.sort((a, b) => {
    const order: Record<InsightSeverity, number> = { critical: 0, warning: 1, opportunity: 2 }
    return order[a.severity] - order[b.severity]
  })
}
