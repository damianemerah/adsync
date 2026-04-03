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
 * Uses gpt-5.4-nano to select the best candidate from each keyword's list,
 * given the ad copy and campaign context. Returns a map of keyword → selected Candidate.
 */
async function selectBestCandidates(
  categoryMap: Record<string, Map<string, Candidate[]>>,
  context: { adCopy: string; ctaIntent: string; businessType: string },
): Promise<Record<string, Map<string, Candidate | null>>> {
  // Build a flat list of all (category, keyword, candidates) triples that need selection
  type Slot = {
    category: string;
    keyword: string;
    candidates: Candidate[];
  };
  const slots: Slot[] = [];

  for (const [category, kwMap] of Object.entries(categoryMap)) {
    for (const [keyword, candidates] of kwMap.entries()) {
      if (candidates.length > 0) {
        slots.push({ category, keyword, candidates });
      }
    }
  }

  if (slots.length === 0) {
    const empty: Record<string, Map<string, Candidate | null>> = {};
    for (const cat of Object.keys(categoryMap)) {
      empty[cat] = new Map();
    }
    return empty;
  }

  // Build the batched prompt
  const slotsText = slots
    .map((slot, i) => {
      const candidateLines = slot.candidates
        .map((c, ci) => `  ${ci + 1}. ${c.name} (id: ${c.id})`)
        .join("\n");
      return `[${i}] Category: ${slot.category} | Keyword: "${slot.keyword}"\n${candidateLines}`;
    })
    .join("\n\n");

  const prompt = `You are selecting Meta Ads targeting options for an ad campaign.

Ad copy: "${context.adCopy.slice(0, 300)}"
CTA intent: ${context.ctaIntent}
Business type: ${context.businessType}

For each numbered slot below, pick the ONE best-matching option (1-based index) or 0 if none are relevant to this business.

${slotsText}

Reply ONLY with a JSON array of integers (one per slot, in order). Example: [1, 2, 0, 1, 3]`;

  try {
    const res = await openai.responses.create({
      model: "gpt-5.4-nano",
      input: prompt,
    } as any);

    const raw = ((res as any)?.output_text || "").trim();
    // Extract JSON array from response (may have surrounding text)
    const match = raw.match(/\[[\d,\s]+\]/);
    const picks: number[] = match ? JSON.parse(match[0]) : [];

    // Map picks back to selected candidates
    const result: Record<string, Map<string, Candidate | null>> = {};
    for (const cat of Object.keys(categoryMap)) {
      result[cat] = new Map();
    }

    slots.forEach((slot, i) => {
      const pick = picks[i] ?? 0;
      const selected =
        pick > 0 && pick <= slot.candidates.length
          ? slot.candidates[pick - 1]
          : null;
      if (!result[slot.category]) result[slot.category] = new Map();
      result[slot.category].set(slot.keyword, selected);
    });

    return result;
  } catch {
    // On failure, return null for all (graceful degradation)
    const fallback: Record<string, Map<string, Candidate | null>> = {};
    for (const cat of Object.keys(categoryMap)) {
      fallback[cat] = new Map(
        Array.from(categoryMap[cat].keys()).map((kw) => [kw, null]),
      );
    }
    return fallback;
  }
}

/**
 * Build ResolvedItem[] for a category, using local catalog fast-path where
 * possible and mini-selected candidates otherwise.
 *
 * Deduplication is enforced on both `id` (Meta ID) and normalised `name`
 * so that semantically-identical entries with different IDs don't both appear.
 */
function buildResolved(
  keywords: string[],
  candidateMap: Map<string, Candidate[]>,
  selectionMap: Map<string, Candidate | null>,
  localResolver?: (kw: string) => { metaId?: string; name: string } | null,
): ResolvedItem[] {
  const results: ResolvedItem[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>(); // normalised lower-case name guard

  const normName = (n: string) => n.toLowerCase().trim();

  const tryPush = (id: string, name: string): boolean => {
    const nn = normName(name);
    if (seenIds.has(id) || seenNames.has(nn)) return false;
    seenIds.add(id);
    seenNames.add(nn);
    results.push({ id, name, resolved: true });
    return true;
  };

  for (const kw of keywords) {
    // Fast path: local catalog hit with confirmed Meta ID
    if (localResolver) {
      const local = localResolver(kw);
      if (local?.metaId) {
        if (tryPush(local.metaId, local.name)) continue;
      }
    }

    // Mini-selected candidate
    const selected = selectionMap.get(kw);
    if (selected && tryPush(selected.id, selected.name)) continue;

    // Fallback: use top candidate from search if mini returned nothing
    const candidates = candidateMap.get(kw) || [];
    if (candidates.length > 0) {
      tryPush(candidates[0].id, candidates[0].name);
    }
  }

  return results;
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
    interests: rawInterests = [],
    behaviors: rawBehaviors = [],
    lifeEvents: rawLifeEvents = [],
    workPositions: rawWorkPositions = [],
    industries: rawIndustries = [],
  }: {
    adCopy: string;
    ctaIntent: string;
    businessType: string;
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
      fetchCandidates(interests, (q) =>
        MetaService.searchInterests(accessToken, q),
      ),
      fetchCandidates(behaviors, (q) =>
        MetaService.searchBehaviors(accessToken, accountId, q),
      ),
      fetchCandidates(lifeEvents, (q) =>
        MetaService.searchLifeEvents(accessToken, accountId, q),
      ),
      fetchCandidates(workPositions, (q) =>
        MetaService.searchWorkPositions(accessToken, q),
      ),
      fetchCandidates(industries, (q) =>
        MetaService.searchIndustries(accessToken, accountId, q),
      ),
    ]);

    // ── Single batched mini call for contextual selection ─────────────────────
    const selections = await selectBestCandidates(
      {
        interests: interestCandidates,
        behaviors: behaviorCandidates,
        lifeEvents: lifeEventCandidates,
        workPositions: workPositionCandidates,
        industries: industryCandidates,
      },
      { adCopy, ctaIntent, businessType },
    );

    // ── Assemble final resolved items ─────────────────────────────────────────
    const resolvedInterests = buildResolved(
      interests,
      interestCandidates,
      selections.interests || new Map(),
    );
    const resolvedBehaviors = buildResolved(
      behaviors,
      behaviorCandidates,
      selections.behaviors || new Map(),
      resolveLocalBehavior,
    );
    const resolvedLifeEvents = buildResolved(
      lifeEvents,
      lifeEventCandidates,
      selections.lifeEvents || new Map(),
      resolveLocalLifeEvent,
    );
    const resolvedWorkPositions = buildResolved(
      workPositions,
      workPositionCandidates,
      selections.workPositions || new Map(),
    );
    const resolvedIndustries = buildResolved(
      industries,
      industryCandidates,
      selections.industries || new Map(),
    );

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
