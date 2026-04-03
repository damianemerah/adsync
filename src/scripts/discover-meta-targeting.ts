/**
 * discover-meta-targeting.ts
 *
 * Uses Meta's Browse & Search APIs to discover ALL available targeting options
 * (interests, behaviors, life events) and diff them against our local catalogs.
 *
 * Results → .agent/audits/meta-targeting-discovery.json
 *           .agent/audits/meta-targeting-diff.json
 *
 * Flags:
 *   --class=interests|behaviors|life_events|all   (default: all)
 *   --merge       Auto-append new entries to catalog TS files
 *   --enrich      Call gpt-4o-mini to generate aliases + relevantFor for empty entries
 *   --dry-run     Show what --merge would do without writing files
 *
 * Usage (from project root):
 *   node_modules/.bin/tsx src/scripts/discover-meta-targeting.ts
 *   node_modules/.bin/tsx src/scripts/discover-meta-targeting.ts --class=interests --merge
 *   node_modules/.bin/tsx src/scripts/discover-meta-targeting.ts --merge --enrich
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  loadEnvLocal,
  getMetaCredentials,
  metaGet,
} from "./lib/meta-script-utils";

loadEnvLocal(__dirname);

import { META_INTEREST_SEEDS } from "../lib/constants/meta-interests";
import { META_BEHAVIOR_SEEDS } from "../lib/constants/meta-behaviors";
import { META_LIFE_EVENT_SEEDS } from "../lib/constants/meta-life-events";

// ─── CLI Flags ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const classArg =
  args.find((a) => a.startsWith("--class="))?.split("=")[1] ?? "all";
const MERGE = args.includes("--merge");
const ENRICH = args.includes("--enrich");
const DRY_RUN = args.includes("--dry-run");
// --filter is auto-applied when --merge is used; pass --no-filter to disable
const FILTER = !args.includes("--no-filter");

// Optional: bypass DB credential lookup (useful when ENCRYPTION_KEY in .env.local
// doesn't match the key used to encrypt the stored token)
const TOKEN_ARG = args.find((a) => a.startsWith("--token="))?.split("=").slice(1).join("=");
const ACCOUNT_ARG = args.find((a) => a.startsWith("--account-id="))?.split("=")[1];

type TargetClass = "interests" | "behaviors" | "life_events";
const ALL_CLASSES: TargetClass[] = ["interests", "behaviors", "life_events"];
const classesToRun: TargetClass[] =
  classArg === "all"
    ? ALL_CLASSES
    : ([classArg] as TargetClass[]);

// ─── Types ──────────────────────────────────────────────────────────────────
interface BrowseEntry {
  id: string;
  name: string;
  type?: string;
  path?: string[];
  description?: string;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
}

interface DiscoveryResult {
  class: TargetClass;
  total: number;
  entries: BrowseEntry[];
}

interface DiffEntry {
  class: TargetClass;
  name: string;
  metaId: string;
  path: string;
  status: "new" | "id_mismatch";
  existingId?: string;
}

// ─── Browse API ─────────────────────────────────────────────────────────────
// Meta's targetingbrowse returns all entries for a given class without a query.
// Falls back to targetingsearch with broad terms if browse yields empty results.

async function browseTargeting(
  token: string,
  accountId: string,
  targetClass: TargetClass,
): Promise<BrowseEntry[]> {
  const allEntries: BrowseEntry[] = [];

  // Strategy 1: targetingbrowse — returns the full taxonomy for behaviors/life_events.
  // Interests use a completely different Meta API (adinterest / /search endpoint) and are
  // NOT taxonomy-based, so targetingbrowse returns only broad category buckets for them —
  // not the granular adinterest entries used in campaigns. Skipping Strategy 1 for interests
  // ensures Strategy 2 always runs and hits the correct /search?type=adinterest endpoint.
  if (targetClass !== "interests") {
    try {
      const params = new URLSearchParams({
        type: "adTargetingCategory",
        class: targetClass,
        limit: "1000",
      });
      let url = `/${accountId}/targetingbrowse?${params}`;
      let page = 1;

      while (url) {
        console.log(`   Page ${page}...`);
        const data = await metaGet(url, token);
        const entries = (data.data || []) as BrowseEntry[];
        allEntries.push(
          ...entries.map((e) => ({
            id: String(e.id),
            name: e.name,
            type: e.type,
            path: e.path,
            description: e.description,
            audience_size_lower_bound: e.audience_size_lower_bound,
            audience_size_upper_bound: e.audience_size_upper_bound,
          })),
        );

        // Cursor-based pagination
        url = data.paging?.next
          ? data.paging.next.replace(/^https:\/\/graph\.facebook\.com\/v[\d.]+/, "")
          : "";
        page++;

        // Rate limit safety
        if (url) await new Promise((r) => setTimeout(r, 300));
      }
    } catch (err: any) {
      console.log(`   ⚠️  targetingbrowse failed: ${err.message}`);
      console.log(`   Falling back to broad search...`);
    }
  }

  // Meta's targetingbrowse ignores the `class` parameter for `life_events` and returns
  // ALL adTargetingCategory entries (behaviors + interests + life events). Pre-filter
  // before the Strategy 2 check: keep only entries where one of the path segments is
  // exactly "Life events" (e.g. ["Demographics","Life events","Family","Parents"]).
  // This lets Strategy 2 run if browse yielded nothing genuinely life-event-related.
  if (targetClass === "life_events") {
    const genuine = allEntries.filter((e) =>
      (e.path ?? []).some((seg) => /^life events?$/i.test(seg.trim())),
    );
    allEntries.length = 0;
    allEntries.push(...genuine);
  }

  // Class purity guard for behaviors: Meta's browse API returns entries from ALL
  // classes when queried with class=behaviors. Drop anything that is clearly an
  // interest (path starts with "Interests >") or a demographic/life event
  // (path starts with "Demographics >"). Only genuine behavior entries — those
  // whose top-level path segment is NOT "Interests" or "Demographics" — are kept.
  if (targetClass === "behaviors") {
    const filtered = allEntries.filter((e) => {
      const topSegment = (e.path ?? [])[0]?.trim().toLowerCase() ?? "";
      return topSegment !== "interests" && topSegment !== "demographics";
    });
    allEntries.length = 0;
    allEntries.push(...filtered);
  }

  // Strategy 2: If browse returned nothing (or was skipped for interests),
  // use broad search terms against the correct endpoint for each class.
  if (allEntries.length === 0) {
    console.log("Using broad search terms...")
    const broadTerms = getBroadSearchTerms(targetClass);
    const seen = new Set<string>();

    for (const term of broadTerms) {
      try {
        const params = new URLSearchParams({
          type: targetClass === "interests" ? "adinterest" : "adTargetingCategory",
          ...(targetClass !== "interests" && { class: targetClass }),
          q: term,
          limit: "100",
        });
        const endpoint =
          targetClass === "interests"
            ? `/search?${params}`
            : `/${accountId}/targetingsearch?${params}`;

        const data = await metaGet(endpoint, token);
        for (const e of data.data || []) {
          const key = String(e.id);
          if (!seen.has(key)) {
            seen.add(key);
            allEntries.push({
              id: key,
              name: e.name,
              type: e.type,
              path: e.path,
              description: e.description,
              audience_size_lower_bound: e.audience_size_lower_bound,
              audience_size_upper_bound: e.audience_size_upper_bound,
            });
          }
        }
        await new Promise((r) => setTimeout(r, 350));
      } catch {
        // Skip failed terms
      }
    }
  }

  // Strategy 2 results for life_events also need path filtering (same API bug).
  if (targetClass === "life_events") {
    return allEntries.filter((e) =>
      (e.path ?? []).some((seg) => /^life events?$/i.test(seg.trim())),
    );
  }

  return allEntries;
}

function getBroadSearchTerms(targetClass: TargetClass): string[] {
  if (targetClass === "interests") {
    return [
      "fashion", "beauty", "food", "technology", "fitness", "travel",
      "education", "business", "entertainment", "sports", "music",
      "shopping", "cooking", "photography", "art", "design", "health",
      "finance", "real estate", "automotive", "pets", "parenting",
      "gaming", "electronics", "luxury", "jewelry", "shoes", "hair",
      "skin care", "makeup", "wedding", "event", "restaurant",
      "interior design", "furniture", "yoga", "running", "marketing",
      "entrepreneurship", "e-commerce", "agriculture", "construction",
    ];
  }
  if (targetClass === "behaviors") {
    return [
      "shoppers", "mobile", "travel", "business", "gaming", "digital",
      "facebook", "instagram", "purchase", "device", "smartphone",
      "tablet", "android", "ios", "apple", "samsung", "admin",
      "decision", "new active", "food", "console",
    ];
  }
  // life_events
  return [
    "relationship", "engaged", "married", "parents", "birthday",
    "anniversary", "moved", "new job", "newlywed", "long distance",
    "children", "toddler", "preschool", "school", "teenager",
  ];
}

// ─── SME Relevance Filter ──────────────────────────────────────────────────
// Keeps only entries that are useful for Nigerian SMEs (fashion, beauty, food,
// events, fitness, electronics, general consumer behaviors, life events).
// Drops US-only demographics, political/election content, unrelated verticals.

// Path segments that are ALWAYS kept (case-insensitive substring match on path)
const SME_ALLOW_PATHS: string[] = [
  // Interests — keep
  "shopping and fashion",
  "food and drink",
  "fitness and wellness",
  "hobbies and activities",
  "family and relationships",
  "entertainment",
  "business and industry",
  "technology",
  "sports and outdoors",

  // Behaviors — keep
  "purchase behavior",
  "digital activities",
  "digital activitiesteam",  // Meta's oddly cased duplicate
  "mobile device user",
  "consumer classification",
  "travel",
  "anniversary",
  "expats",

  // Demographics — keep
  "life events",
  "parents",
  "relationship",
];

// Path segments that are ALWAYS dropped (takes priority over allow list)
const SME_DENY_PATHS: string[] = [
  // Education level — not useful for audience targeting for SMEs
  "education level",
  "education field of study",
  "undergrad years",

  // Job titles / employers — too niche for SME ad campaigns
  "employers",
  "job title",
  "job field",
  "office type",
  "industries",

  // Political / news / unrelated
  "politics and social issues",
  "soccer",           // Meta-internal category, not useful
  "more categories",  // Catch-all with low signal
];

function isPathSMERelevant(path: string): boolean {
  const lower = path.toLowerCase();

  // Deny list takes priority
  for (const deny of SME_DENY_PATHS) {
    if (lower.includes(deny)) return false;
  }

  // Must match at least one allow segment
  for (const allow of SME_ALLOW_PATHS) {
    if (lower.includes(allow)) return true;
  }

  // Behaviors with no path (empty string) — keep, they're usually generic
  if (!path) return true;

  return false;
}

function filterForSMERelevance(entries: DiffEntry[]): DiffEntry[] {
  return entries.filter((e) => isPathSMERelevant(e.path));
}

// ─── Diff Against Local Catalog ─────────────────────────────────────────────

function getLocalNames(
  targetClass: TargetClass,
): Map<string, { name: string; metaId?: string }> {
  const map = new Map<string, { name: string; metaId?: string }>();

  const seeds =
    targetClass === "interests"
      ? META_INTEREST_SEEDS
      : targetClass === "behaviors"
        ? META_BEHAVIOR_SEEDS
        : META_LIFE_EVENT_SEEDS;

  for (const seed of seeds) {
    map.set(seed.name.toLowerCase(), {
      name: seed.name,
      metaId: seed.metaId,
    });
  }
  return map;
}

function computeDiff(
  targetClass: TargetClass,
  discovered: BrowseEntry[],
): DiffEntry[] {
  const local = getLocalNames(targetClass);
  const diff: DiffEntry[] = [];

  for (const entry of discovered) {
    const key = entry.name.toLowerCase();
    const existing = local.get(key);

    if (!existing) {
      diff.push({
        class: targetClass,
        name: entry.name,
        metaId: entry.id,
        path: entry.path?.join(" > ") ?? "",
        status: "new",
      });
    } else if (existing.metaId && existing.metaId !== entry.id) {
      diff.push({
        class: targetClass,
        name: entry.name,
        metaId: entry.id,
        path: entry.path?.join(" > ") ?? "",
        status: "id_mismatch",
        existingId: existing.metaId,
      });
    }
  }

  return diff;
}

// ─── Merge into Catalog Files ───────────────────────────────────────────────

function mergeIntoFile(
  targetClass: TargetClass,
  newEntries: DiffEntry[],
): number {
  if (newEntries.length === 0) return 0;

  const filePath =
    targetClass === "interests"
      ? path.join(__dirname, "../lib/constants/meta-interests.ts")
      : targetClass === "behaviors"
        ? path.join(__dirname, "../lib/constants/meta-behaviors.ts")
        : path.join(__dirname, "../lib/constants/meta-life-events.ts");

  let source = fs.readFileSync(filePath, "utf8");

  // Find the closing `];` of the appropriate array
  const arrayName =
    targetClass === "interests"
      ? "META_INTEREST_SEEDS"
      : targetClass === "behaviors"
        ? "META_BEHAVIOR_SEEDS"
        : "META_LIFE_EVENT_SEEDS";

  // Find the array declaration and its closing bracket
  const arrayStart = source.indexOf(`export const ${arrayName}`);
  if (arrayStart === -1) {
    console.log(`   ❌ Could not find ${arrayName} in ${filePath}`);
    return 0;
  }

  // Find the matching closing `];` by counting brackets from the array LITERAL `= [`
  // (not the type annotation bracket in `MetaInterestSeed[]`)
  let depth = 0;
  let closingIdx = -1;
  const eqBracket = source.indexOf("= [", arrayStart);
  const searchFrom = eqBracket !== -1 ? eqBracket + 2 : source.indexOf("[", arrayStart);

  for (let i = searchFrom; i < source.length; i++) {
    if (source[i] === "[") depth++;
    if (source[i] === "]") {
      depth--;
      if (depth === 0) {
        closingIdx = i;
        break;
      }
    }
  }

  if (closingIdx === -1) {
    console.log(`   ❌ Could not find closing bracket for ${arrayName}`);
    return 0;
  }

  // Build new entries as TS source
  const today = new Date().toISOString().slice(0, 10);
  const entriesSource = newEntries
    .map((e) => {
      const pathStr = e.path || `Discovered ${today}`;
      if (targetClass === "interests") {
        return `  {
    name: "${escapeStr(e.name)}",
    metaId: "${e.metaId}", // discovered ${today}
    path: "${escapeStr(pathStr)}",
    aliases: [],
    relevantFor: [],
  }`;
      }
      if (targetClass === "behaviors") {
        return `  {
    name: "${escapeStr(e.name)}",
    metaId: "${e.metaId}", // discovered ${today}
    path: "${escapeStr(pathStr)}",
    aliases: [],
    relevantFor: [],
  }`;
      }
      // life_events
      return `  {
    name: "${escapeStr(e.name)}",
    metaId: "${e.metaId}", // discovered ${today}
    path: "${escapeStr(pathStr)}",
    relevantFor: [],
    aliases: [],
  }`;
    })
    .join(",\n");

  // Insert before the closing `];`
  const before = source.slice(0, closingIdx);
  const after = source.slice(closingIdx);
  const needsComma = before.trimEnd().endsWith(",") || before.trimEnd().endsWith("{") ? "" : ",";
  source = `${before}${needsComma}\n  // ── Discovered via browse API (${today}) ────────────────────────────────\n${entriesSource},\n${after}`;

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, source);
  }
  return newEntries.length;
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// ─── Enrich with AI ─────────────────────────────────────────────────────────

async function enrichEmptyEntries(targetClass: TargetClass): Promise<number> {
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI();

  const filePath =
    targetClass === "interests"
      ? path.join(__dirname, "../lib/constants/meta-interests.ts")
      : targetClass === "behaviors"
        ? path.join(__dirname, "../lib/constants/meta-behaviors.ts")
        : path.join(__dirname, "../lib/constants/meta-life-events.ts");

  let source = fs.readFileSync(filePath, "utf8");

  // Find entries with empty aliases: []
  // life_events have `relevantFor` before `aliases` (different field order from behaviors/interests)
  const emptyAliasPattern =
    targetClass === "life_events"
      ? /name: "([^"]+)",\n\s+metaId: "[^"]*",.*\n\s+path: "([^"]*)",\n\s+relevantFor: \[\],\n\s+aliases: \[\],/g
      : /name: "([^"]+)",\n\s+metaId: "[^"]*",.*\n\s+path: "([^"]*)",\n\s+aliases: \[\],/g;
  const matches: Array<{ name: string; path: string; fullMatch: string }> = [];

  let match;
  while ((match = emptyAliasPattern.exec(source)) !== null) {
    matches.push({
      name: match[1],
      path: match[2],
      fullMatch: match[0],
    });
  }

  if (matches.length === 0) {
    console.log(`   No empty aliases found for ${targetClass}`);
    return 0;
  }

  console.log(`   Found ${matches.length} entries with empty aliases`);
  let enriched = 0;

  // Batch in groups of 10
  for (let i = 0; i < matches.length; i += 10) {
    const batch = matches.slice(i, i + 10);
    const batchPrompt = batch
      .map(
        (m, idx) =>
          `${idx + 1}. Name: "${m.name}" | Path: "${m.path}"`,
      )
      .join("\n");

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.4-nano",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `You generate aliases and business categories for Meta Ads targeting options. Focus on the Nigerian market.

For each targeting option, provide:
- aliases: 3-5 common names an LLM/marketer might use instead (lowercase, short)
- relevantFor: 3-6 business categories this is most useful for (lowercase, e.g. "fashion", "beauty", "food", "electronics", "events", "b2b", "home", "fitness", "general")

Respond as a JSON array matching the input order:
[{ "aliases": ["..."], "relevantFor": ["..."] }, ...]`,
          },
          {
            role: "user",
            content: `Generate aliases and relevantFor for these Meta ${targetClass} targeting options:\n${batchPrompt}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) continue;

      const parsed = JSON.parse(content);
      const results = parsed.results || parsed.data || parsed;

      if (!Array.isArray(results) || results.length !== batch.length) continue;

      for (let j = 0; j < batch.length; j++) {
        const entry = batch[j];
        const result = results[j];
        if (!result?.aliases?.length) continue;

        const aliasesStr = result.aliases
          .slice(0, 5)
          .map((a: string) => `"${escapeStr(a.toLowerCase())}"`)
          .join(", ");
        const relevantStr = (result.relevantFor || [])
          .slice(0, 6)
          .map((r: string) => `"${escapeStr(r.toLowerCase())}"`)
          .join(", ");

        // Replace empty aliases with generated ones
        const oldAliases = `aliases: []`;
        const newAliases = `aliases: [${aliasesStr}]`;

        // Find this specific entry's aliases: [] and replace it
        const entryIdx = source.indexOf(entry.fullMatch);
        if (entryIdx !== -1) {
          const entryEnd = entryIdx + entry.fullMatch.length;
          const entrySlice = source.slice(entryIdx, entryEnd);
          const updatedSlice = entrySlice.replace(oldAliases, newAliases);
          source = source.slice(0, entryIdx) + updatedSlice + source.slice(entryEnd);

          // Replace relevantFor: [] — search a window around the entry to handle both
          // field orders (aliases-first for behaviors/interests, relevantFor-first for life_events)
          const searchStart = Math.max(0, entryIdx - 200);
          const searchEnd = entryIdx + entry.fullMatch.length + 200;
          const relevantIdx = source.indexOf("relevantFor: []", searchStart);
          if (relevantIdx !== -1 && relevantIdx < searchEnd) {
            source =
              source.slice(0, relevantIdx) +
              `relevantFor: [${relevantStr}]` +
              source.slice(relevantIdx + "relevantFor: []".length);
          }

          enriched++;
        }
      }

      console.log(
        `   Enriched batch ${Math.floor(i / 10) + 1}/${Math.ceil(matches.length / 10)}`,
      );
      await new Promise((r) => setTimeout(r, 500));
    } catch (err: any) {
      console.log(`   ⚠️  Enrich batch failed: ${err.message}`);
    }
  }

  if (!DRY_RUN && enriched > 0) {
    fs.writeFileSync(filePath, source);
  }

  return enriched;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔍 Tenzu — Meta Targeting Discovery");
  console.log("=========================================================");
  console.log(`Classes: ${classesToRun.join(", ")}`);
  console.log(
    `Mode: ${DRY_RUN ? "DRY-RUN" : MERGE ? "MERGE" : "DISCOVERY ONLY"}${ENRICH ? " + ENRICH" : ""}`,
  );
  let token: string;
  let accountId: string;

  if (TOKEN_ARG && ACCOUNT_ARG) {
    token = TOKEN_ARG;
    accountId = ACCOUNT_ARG.startsWith("act_") ? ACCOUNT_ARG : `act_${ACCOUNT_ARG}`;
    console.log(`\nUsing CLI-provided credentials (account: ${accountId})`);
  } else {
    console.log("\nFetching Meta credentials from DB...");
    ({ token, accountId } = await getMetaCredentials());
  }
  console.log(
    `✅ Got token (${token.substring(0, 8)}…) for account ${accountId}\n`,
  );

  const allDiscovery: DiscoveryResult[] = [];
  const allDiffs: DiffEntry[] = [];

  for (const cls of classesToRun) {
    console.log(`\n📦 Discovering ${cls}...`);
    const entries = await browseTargeting(token, accountId, cls);
    console.log(`   Found ${entries.length} entries`);

    allDiscovery.push({ class: cls, total: entries.length, entries });

    const diff = computeDiff(cls, entries);
    allDiffs.push(...diff);

    const newCount = diff.filter((d) => d.status === "new").length;
    const mismatchCount = diff.filter((d) => d.status === "id_mismatch").length;
    const relevantNew = FILTER
      ? diff.filter((d) => d.status === "new" && isPathSMERelevant(d.path)).length
      : newCount;
    console.log(
      `   New: ${newCount} | ID mismatches: ${mismatchCount}${FILTER ? ` | SME-relevant: ${relevantNew}` : ""}`,
    );
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n=========================================================");
  console.log("📊 Discovery Summary\n");
  for (const d of allDiscovery) {
    const newCount = allDiffs.filter(
      (x) => x.class === d.class && x.status === "new",
    ).length;
    console.log(
      `   ${d.class}: ${d.total} discovered, ${newCount} new (not in local catalog)`,
    );
  }

  const totalNew = allDiffs.filter((d) => d.status === "new").length;
  const totalMismatch = allDiffs.filter(
    (d) => d.status === "id_mismatch",
  ).length;
  console.log(
    `\n   Total new: ${totalNew} | Total ID mismatches: ${totalMismatch}`,
  );

  if (totalMismatch > 0) {
    console.log("\n⚠️  ID Mismatches (local metaId differs from discovered):");
    allDiffs
      .filter((d) => d.status === "id_mismatch")
      .forEach((d) => {
        console.log(
          `   - [${d.class}] "${d.name}" local=${d.existingId} discovered=${d.metaId}`,
        );
      });
  }

  // ── Write Audit Files ─────────────────────────────────────────────────────
  const auditDir = path.join(__dirname, "../../.agent/audits");
  fs.mkdirSync(auditDir, { recursive: true });

  const discoveryPath = path.join(auditDir, "meta-targeting-discovery.json");
  fs.writeFileSync(discoveryPath, JSON.stringify(allDiscovery, null, 2));
  console.log(`\n📄 Discovery → ${discoveryPath}`);

  const diffPath = path.join(auditDir, "meta-targeting-diff.json");
  fs.writeFileSync(diffPath, JSON.stringify(allDiffs, null, 2));
  console.log(`📄 Diff → ${diffPath}`);

  // ── Merge ──────────────────────────────────────────────────────────────────
  if (MERGE || DRY_RUN) {
    console.log(
      `\n${DRY_RUN ? "🔍 DRY-RUN" : "📝"} Merging new entries into catalog files...\n`,
    );

    for (const cls of classesToRun) {
      let newEntries = allDiffs.filter(
        (d) => d.class === cls && d.status === "new",
      );
      if (FILTER) {
        const before = newEntries.length;
        newEntries = filterForSMERelevance(newEntries);
        console.log(
          `   ${cls}: filtered ${before} → ${newEntries.length} SME-relevant entries`,
        );
      }
      if (newEntries.length === 0) {
        console.log(`   ${cls}: nothing new to merge`);
        continue;
      }
      const merged = mergeIntoFile(cls, newEntries);
      console.log(
        `   ${cls}: ${DRY_RUN ? "would merge" : "merged"} ${merged} entries`,
      );
    }
  } else {
    console.log(
      "\n💡 Run with --merge to append new entries to catalog files",
    );
  }

  // ── Enrich ─────────────────────────────────────────────────────────────────
  if (ENRICH) {
    console.log("\n🤖 Enriching entries with AI-generated aliases...\n");

    for (const cls of classesToRun) {
      console.log(`   Enriching ${cls}...`);
      const count = await enrichEmptyEntries(cls);
      console.log(
        `   ${cls}: ${DRY_RUN ? "would enrich" : "enriched"} ${count} entries`,
      );
    }
  } else if (MERGE) {
    console.log(
      "\n💡 Run with --enrich to generate aliases for new entries via AI",
    );
  }

  console.log("\n✅ Done!\n");
}

main().catch((err) => {
  console.error("\n💥 Script failed:", err.message);
  process.exit(1);
});
