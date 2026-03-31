/**
 * validate-meta-behaviors.ts
 *
 * Fetches the real Meta access token + ad account ID from the Supabase
 * `ad_accounts` table, then validates every seed in META_BEHAVIOR_SEEDS
 * against the live Meta API.
 *
 * Results → .agent/audits/meta-behaviors-audit.json
 * --patch  → also rewrites meta-behaviors.ts with confirmed numeric IDs
 *
 * See also: validate-meta-life-events.ts — same workflow for life events
 *
 * Usage (from project root):
 *   node_modules/.bin/tsx src/scripts/validate-meta-behaviors.ts
 *   node_modules/.bin/tsx src/scripts/validate-meta-behaviors.ts --patch
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

import { META_BEHAVIOR_SEEDS } from "../lib/constants/meta-behaviors";

const PATCH = process.argv.includes("--patch");

// ─── Meta API ─────────────────────────────────────────────────────────────────
async function searchBehaviors(
  token: string,
  accountId: string,
  query: string,
) {
  const params = new URLSearchParams({
    type: "adTargetingCategory",
    class: "behaviors",
    q: query,
    limit: "10",
  });
  const data = await metaGet(`/${accountId}/targetingsearch?${params}`, token);
  return (data.data || []) as Array<{ id: string; name: string }>;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuditEntry {
  seedName: string;
  status: "exact_match" | "fuzzy_match" | "no_match" | "api_error";
  metaId: string | null;
  metaName: string | null;
  rawResults: Array<{ id: string; name: string }>;
  error?: string;
}

// ─── Matching ─────────────────────────────────────────────────────────────────
function findBestMatch(
  seedName: string,
  results: Array<{ id: string; name: string }>,
): { id: string; name: string } | null {
  if (results.length === 0) return null;
  const exact = results.find(
    (r) => r.name.toLowerCase() === seedName.toLowerCase(),
  );
  if (exact) return exact;
  const partial = results.find(
    (r) =>
      r.name.toLowerCase().includes(seedName.toLowerCase()) ||
      seedName.toLowerCase().includes(r.name.toLowerCase()),
  );
  return partial ?? null;
}

async function validateSeeds(
  seeds: Array<{ name: string }>,
  searchFn: (query: string) => Promise<Array<{ id: string; name: string }>>,
  delay = 350,
): Promise<AuditEntry[]> {
  const results: AuditEntry[] = [];

  for (const seed of seeds) {
    process.stdout.write(`  → "${seed.name}" ... `);
    const entry: AuditEntry = {
      seedName: seed.name,
      status: "no_match",
      metaId: null,
      metaName: null,
      rawResults: [],
    };

    try {
      const apiResults = await searchFn(seed.name);
      entry.rawResults = apiResults.map((r) => ({
        id: String(r.id),
        name: r.name,
      }));
      const match = findBestMatch(seed.name, apiResults);
      if (match) {
        entry.status =
          match.name.toLowerCase() === seed.name.toLowerCase()
            ? "exact_match"
            : "fuzzy_match";
        entry.metaId = String(match.id);
        entry.metaName = match.name;
        const icon = entry.status === "exact_match" ? "✅" : "🟡";
        console.log(
          `${icon} ${entry.status} → ID: ${entry.metaId}  "${entry.metaName}"`,
        );
      } else {
        const top =
          apiResults
            .slice(0, 2)
            .map((r) => `"${r.name}"`)
            .join(", ") || "none";
        console.log(`❌ no_match  (top returned: ${top})`);
      }
    } catch (err: any) {
      entry.status = "api_error";
      entry.error = err.message;
      console.log(`💥 api_error: ${err.message}`);
    }

    results.push(entry);
    await new Promise((r) => setTimeout(r, delay));
  }

  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🔍 Tenzu — Meta Behaviors Validator");
  console.log("=========================================================");
  console.log(
    `Mode: ${PATCH ? "PATCH (will rewrite meta-behaviors.ts)" : "DRY-RUN (read-only)"}`,
  );
  console.log("\nFetching Meta credentials from DB...");

  const { token, accountId } = await getMetaCredentials();
  console.log(
    `✅ Got token (${token.substring(0, 8)}…) for account ${accountId}\n`,
  );

  console.log(`📦 Validating ${META_BEHAVIOR_SEEDS.length} behaviors...\n`);
  const results = await validateSeeds(
    META_BEHAVIOR_SEEDS,
    (q) => searchBehaviors(token, accountId, q),
  );

  // ── Summary ─────────────────────────────────────────────────────────────────
  const exact = results.filter((r) => r.status === "exact_match").length;
  const fuzzy = results.filter((r) => r.status === "fuzzy_match").length;
  const noMatch = results.filter((r) => r.status === "no_match").length;
  const errors = results.filter((r) => r.status === "api_error").length;
  const total = results.length;

  console.log("\n=========================================================");
  console.log("📊 Summary");
  console.log(`   ✅ Exact match : ${exact}/${total}`);
  console.log(
    `   🟡 Fuzzy match : ${fuzzy}/${total} — confirmed ID, different display name`,
  );
  console.log(
    `   ❌ No match    : ${noMatch}/${total} — seed name may be invalid`,
  );
  console.log(`   💥 API errors  : ${errors}/${total}`);

  if (noMatch > 0) {
    console.log(
      "\n⚠️  Unmatched seeds (review + fix these names in meta-behaviors.ts):",
    );
    results
      .filter((r) => r.status === "no_match")
      .forEach((r) => {
        console.log(`   - "${r.seedName}"`);
        if (r.rawResults.length > 0) {
          console.log(
            `     API returned: ${r.rawResults
              .slice(0, 3)
              .map((x) => `"${x.name}" (${x.id})`)
              .join(", ")}`,
          );
          console.log(
            `     → Consider renaming the seed to one of the above names`,
          );
        } else {
          console.log(
            `     → No results at all — this behavior may not exist in Meta's catalog`,
          );
        }
      });
  }

  if (fuzzy > 0) {
    console.log(
      "\n🟡 Fuzzy-matched seeds (Meta uses a slightly different display name):",
    );
    results
      .filter((r) => r.status === "fuzzy_match")
      .forEach((r) => {
        console.log(
          `   - "${r.seedName}" → Meta name: "${r.metaName}" (ID: ${r.metaId})`,
        );
        console.log(
          `     → Consider updating the seed name to match Meta's exact display name`,
        );
      });
  }

  // ── Write audit JSON ─────────────────────────────────────────────────────────
  const auditDir = path.join(__dirname, "../../.agent/audits");
  fs.mkdirSync(auditDir, { recursive: true });
  const auditPath = path.join(auditDir, "meta-behaviors-audit.json");
  fs.writeFileSync(auditPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Full audit → ${auditPath}`);

  // ── Patch ────────────────────────────────────────────────────────────────────
  if (PATCH) {
    patchMetaBehaviors(results);
  } else {
    console.log(
      "💡 Run with --patch to bake confirmed IDs into meta-behaviors.ts\n",
    );
  }
}

function patchMetaBehaviors(audit: AuditEntry[]) {
  const filePath = path.join(__dirname, "../lib/constants/meta-behaviors.ts");
  let source = fs.readFileSync(filePath, "utf8");
  let patchCount = 0;

  for (const entry of audit) {
    if (!entry.metaId) continue;

    const nameLine = `name: "${entry.seedName}",`;
    const metaIdLine = `metaId: "${entry.metaId}", // confirmed ${new Date().toISOString().slice(0, 10)}`;

    if (
      source.includes(nameLine) &&
      !source.includes(`metaId: "${entry.metaId}"`)
    ) {
      const nameIdx = source.indexOf(nameLine);
      const lineStart = source.lastIndexOf("\n", nameIdx) + 1;
      const indent = source.slice(lineStart, nameIdx).replace(/[^\s]/g, "");
      source = source.replace(nameLine, `${nameLine}\n${indent}${metaIdLine}`);
      patchCount++;
    }
  }

  fs.writeFileSync(filePath, source);
  console.log(`\n✅ Patched meta-behaviors.ts — ${patchCount} IDs baked in.`);
  console.log("   Unmatched seeds left unchanged for manual review.\n");
}

main().catch((err) => {
  console.error("\n💥 Script failed:", err.message);
  process.exit(1);
});
