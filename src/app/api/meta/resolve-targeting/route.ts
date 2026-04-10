/**
 * Phase 2 targeting resolution endpoint.
 *
 * Accepts AI-generated search keywords for each targeting category, fans out
 * to Meta search APIs to get real candidates (up to 5 per keyword), then uses
 * a single batched gpt-5.4-nano call (with ad copy as context) to pick the best
 * match per keyword. Returns resolved { id, name, resolved } objects.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";
import { getActiveOrgId } from "@/lib/active-org";
import OpenAI from "openai";
import { resolveLocalBehavior } from "@/lib/constants/meta-behaviors";
import { resolveLocalLifeEvent } from "@/lib/constants/meta-life-events";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  timeout: 12000,
  maxRetries: 0,
});

interface Candidate {
  id: string;
  name: string;
}

interface CategoryKeywords {
  interests: string[];
  behaviors: string[];
  lifeEvents: string[];
  workPositions: string[];
  industries: string[];
}

interface ResolvedItem {
  id: string;
  name: string;
  resolved: boolean;
}

/**
 * For a list of keywords, fan out to a search function and collect up to
 * `limit` candidates per keyword. Returns a map of keyword → candidates[].
 */
async function fetchCandidates(
  keywords: string[],
  searchFn: (query: string) => Promise<Candidate[]>,
  limit = 5,
): Promise<Map<string, Candidate[]>> {
  const results = await Promise.all(
    keywords.map(async (kw) => {
      try {
        const res = await searchFn(kw);
        return [kw, res.slice(0, limit)] as [string, Candidate[]];
      } catch {
        return [kw, []] as [string, Candidate[]];
      }
    }),
  );
  return new Map(results);
}

/**
 * Interest-specific variant that searches each keyword AND a compound form
 * ("${kw} products"), pools the results, deduplicates by id, and returns up
 * to 10 candidates per keyword. Wider candidate pool → better mini-AI picks.
 */
async function fetchInterestCandidatesWithVariants(
  keywords: string[],
  searchFn: (query: string) => Promise<Candidate[]>,
): Promise<Map<string, Candidate[]>> {
  const results = await Promise.all(
    keywords.map(async (kw) => {
      const variants = [kw, `${kw} products`];
      const allResults = await Promise.all(
        variants.map((v) => searchFn(v).catch(() => [] as Candidate[])),
      );
      const pooled = Array.from(
        new Map(allResults.flat().map((c) => [c.id, c])).values(),
      ).slice(0, 10);
      return [kw, pooled] as [string, Candidate[]];
    }),
  );
  return new Map(results);
}

/**
 * Uses gpt-5.4-nano to select the best candidates from the pooled list,
 * enforcing optimal B2C/B2B limits, given the ad copy and campaign context.
 * Returns a map of category → selected Candidate[].
 */
async function selectBestCandidates(
  categoryMap: Record<string, Candidate[]>,
  context: { adCopy: string; ctaIntent: string; businessType: string; targetingMode?: string; locations?: string[] },
): Promise<Record<string, Candidate[]>> {
  const isB2B = context.targetingMode === "b2b";

  const limits = {
    interests: isB2B ? "2 to 4" : "4 to 8",
    behaviors: isB2B ? "1 to 3" : "2 to 4",
    lifeEvents: "0 to 4",
    workPositions: isB2B ? "2 to 5" : "0",
    industries: isB2B ? "1 to 3" : "0",
  };

  const slotsText = Object.entries(categoryMap)
    .filter(([_, candidates]) => candidates.length > 0)
    .map(([cat, candidates]) => {
      const limitText = limits[cat as keyof typeof limits];
      const list = candidates.map((c, i) => `  ${i}. ${c.name} (id: ${c.id})`).join("\n");
      return `[${cat}] - Select ${limitText} items:\n${list}`;
    })
    .join("\n\n");

  if (!slotsText) {
    const empty: Record<string, Candidate[]> = {};
    for (const cat of Object.keys(categoryMap)) empty[cat] = [];
    return empty;
  }

  const modeGuidance = context.targetingMode === "b2b"
    ? "This is a B2B campaign targeting businesses or professionals. Prefer options that signal professional intent, job roles, or industry affiliation."
    : context.targetingMode === "broad"
    ? "This is a broad awareness campaign. Only select options with very strong, direct relevance."
    : "This is a B2C campaign targeting individual consumers. Prefer options that match consumer interests, lifestyle, and purchase intent.";

  const locationContext = context.locations && context.locations.length > 0
    ? `Target locations: ${context.locations.join(", ")}`
    : "";

  const locationRule = locationContext
    ? `\nLocation rule: Only select options relevant to users in the target locations above. Avoid brand pages or company-specific interests unless they are well-established in the region.`
    : "";

  const prompt = `You are selecting Meta Ads targeting options for an ad campaign.

Ad copy: "${context.adCopy.slice(0, 300)}"
CTA intent: ${context.ctaIntent}
Business type: ${context.businessType}
Targeting mode: ${context.targetingMode ?? "b2c"}
${locationContext}

Selection guidance: ${modeGuidance}${locationRule}

IMPORTANT ON LATENT INTENT: Options might include related end-goals or proxy interests (e.g. "Gift Card", "Amazon" for a virtual number ad, or "Mortgage" for a real estate ad). You must highly prioritize these latent intent matches over generic terms. If an option feels like the actual end-goal the user wants to achieve with the product, select it.

For each category below, select the BEST matching options up to the specified limit.
If a category says "Select 0", output an empty array for it.

${slotsText}

Reply ONLY with a JSON object mapping the category name to an array of selected indices (0-based).
Example:
{
  "interests": [0, 4, 12],
  "behaviors": [1, 3],
  "lifeEvents": [],
  "workPositions": [2, 5],
  "industries": [0]
}`;

  try {
    const res = await openai.responses.create({
      model: "gpt-5.4-nano",
      input: prompt,
    } as any);

    const raw = ((res as any)?.output_text || "").trim();
    // Extract JSON object from response
    const match = raw.match(/\{[\s\S]*\}/);
    const picks: Record<string, number[]> = match ? JSON.parse(match[0]) : {};

    const result: Record<string, Candidate[]> = {};
    for (const [cat, candidates] of Object.entries(categoryMap)) {
      const selectedIndices = picks[cat] || [];
      result[cat] = selectedIndices
        .filter((i: number) => i >= 0 && i < candidates.length)
        .map((i: number) => candidates[i]);
    }

    return result;
  } catch (error) {
    console.error("[selectBestCandidates] Selection failed:", error);
    const fallback: Record<string, Candidate[]> = {};
    for (const cat of Object.keys(categoryMap)) fallback[cat] = [];
    return fallback;
  }
}

/**
 * Pools, deduplicates, and incorporates local fast-paths for search candidates,
 * preparing a clean flat list of candidates for the AI selector.
 */
function poolCandidates(
  keywords: string[],
  kwMap: Map<string, Candidate[]>,
  localResolver?: (kw: string) => { metaId?: string; name: string } | null,
): Candidate[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const pooled: Candidate[] = [];

  const tryPush = (id: string, name: string) => {
    const nn = name.toLowerCase().trim();
    if (seenIds.has(id) || seenNames.has(nn)) return;
    seenIds.add(id);
    seenNames.add(nn);
    pooled.push({ id, name });
  };

  // 1. Resolve exact local matches first to guarantee their inclusion
  if (localResolver) {
    for (const kw of keywords) {
      const local = localResolver(kw);
      if (local?.metaId) {
        tryPush(local.metaId, local.name);
      }
    }
  }

  // 2. Add all remaining candidates
  for (const candidates of kwMap.values()) {
    for (const c of candidates) {
      tryPush(c.id, c.name);
    }
  }

  return pooled;
}

/** Converts the final AI selections into the standard Output list format. */
function buildResolved(candidates: Candidate[]): ResolvedItem[] {
  return candidates.map((c) => ({ id: c.id, name: c.name, resolved: true }));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeOrgId = await getActiveOrgId();
  if (!activeOrgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    adCopy = "",
    ctaIntent = "buy_now",
    businessType = "general",
    targetingMode,
    locations,
    interests: rawInterests = [],
    behaviors: rawBehaviors = [],
    lifeEvents: rawLifeEvents = [],
    workPositions: rawWorkPositions = [],
    industries: rawIndustries = [],
  }: {
    adCopy: string;
    ctaIntent: string;
    businessType: string;
    targetingMode?: string;
    locations?: string[];
  } & CategoryKeywords = body;

  // Deduplicate input keywords (case-insensitive) before fanning out to Meta
  // search APIs — avoids redundant calls when the AI emits repeated terms.
  const dedup = (arr: string[]) =>
    Array.from(new Map(arr.map((s) => [s.toLowerCase().trim(), s])).values());

  const interests = dedup(rawInterests);
  const behaviors = dedup(rawBehaviors);
  const lifeEvents = dedup(rawLifeEvents);
  const workPositions = dedup(rawWorkPositions);
  const industries = dedup(rawIndustries);

  // Fetch ad account with both access_token and platform_account_id
  const { data: adAccount } = await supabase
    .from("ad_accounts")
    .select("access_token, platform_account_id")
    .eq("organization_id", activeOrgId)
    .eq("platform", "meta")
    .eq("health_status", "healthy")
    .order("is_default", { ascending: false })
    .limit(1)
    .single();

  if (!adAccount?.access_token) {
    return NextResponse.json(
      { error: "No connected Meta ad account found" },
      { status: 400 },
    );
  }

  try {
    const accessToken = decrypt(adAccount.access_token);
    const accountId = adAccount.platform_account_id;

    // ── Fan out all Meta searches in parallel ─────────────────────────────────
    const [
      interestCandidates,
      behaviorCandidates,
      lifeEventCandidates,
      workPositionCandidates,
      industryCandidates,
    ] = await Promise.all([
      fetchInterestCandidatesWithVariants(interests, (q) =>
        MetaService.searchInterests(accessToken, q),
      ),
      fetchCandidates(behaviors, (q) =>
        MetaService.searchBehaviors(accessToken, accountId, q), 10,
      ),
      fetchCandidates(lifeEvents, (q) =>
        MetaService.searchLifeEvents(accessToken, accountId, q), 8,
      ),
      fetchCandidates(workPositions, (q) =>
        MetaService.searchWorkPositions(accessToken, q), 8,
      ),
      fetchCandidates(industries, (q) =>
        MetaService.searchIndustries(accessToken, accountId, q), 8,
      ),
    ]);

    // ── Single batched mini call for contextual selection ─────────────────────
    const pooledInterests = poolCandidates(interests, interestCandidates);
    const pooledBehaviors = poolCandidates(behaviors, behaviorCandidates, resolveLocalBehavior);
    const pooledLifeEvents = poolCandidates(lifeEvents, lifeEventCandidates, resolveLocalLifeEvent);
    const pooledWorkPositions = poolCandidates(workPositions, workPositionCandidates);
    const pooledIndustries = poolCandidates(industries, industryCandidates);

    const selections = await selectBestCandidates(
      {
        interests: pooledInterests,
        behaviors: pooledBehaviors,
        lifeEvents: pooledLifeEvents,
        workPositions: pooledWorkPositions,
        industries: pooledIndustries,
      },
      { adCopy, ctaIntent, businessType, targetingMode, locations },
    );

    // ── Assemble final resolved items ─────────────────────────────────────────
    const resolvedInterests = buildResolved(selections.interests || []);
    const resolvedBehaviors = buildResolved(selections.behaviors || []);
    const resolvedLifeEvents = buildResolved(selections.lifeEvents || []);
    const resolvedWorkPositions = buildResolved(selections.workPositions || []);
    const resolvedIndustries = buildResolved(selections.industries || []);

    return NextResponse.json({
      interests: resolvedInterests,
      behaviors: resolvedBehaviors,
      lifeEvents: resolvedLifeEvents,
      workPositions: resolvedWorkPositions,
      industries: resolvedIndustries,
    });
  } catch (error: any) {
    console.error("[resolve-targeting] error:", error?.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
