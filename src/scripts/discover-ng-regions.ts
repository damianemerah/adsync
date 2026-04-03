/**
 * discover-ng-regions.ts
 *
 * Fetches the canonical region names Meta uses for all 36 Nigerian states + FCT
 * from the /search?type=adgeolocation API and prints a ready-to-paste mapping
 * table for targeting-resolver.ts.
 *
 * Usage (from project root):
 *   npx tsx src/scripts/discover-ng-regions.ts
 *   npx tsx src/scripts/discover-ng-regions.ts --token=EAAxxxx (skip DB lookup)
 */

import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  loadEnvLocal,
  getMetaCredentials,
  metaGet,
} from "./lib/meta-script-utils";

loadEnvLocal(__dirname);

// Optional --token= to bypass DB lookup
const TOKEN_ARG = process.argv
  .find((a) => a.startsWith("--token="))
  ?.split("=")
  .slice(1)
  .join("=");

// ─── State inputs ─────────────────────────────────────────────────────────────
// All 36 states + FCT, plus neighbourhoods/city aliases the AI might emit.
// Each is searched both bare and with " Nigeria" suffix to find what resolves.

const NG_QUERIES = [
  // States bare (what AI might output if it ignores the prompt)
  "Lagos",
  "Abuja",
  "Federal Capital Territory",
  "Rivers",
  "Kano",
  "Oyo",
  "Delta",
  "Anambra",
  "Ogun",
  "Edo",
  "Kaduna",
  "Enugu",
  "Abia",
  "Imo",
  "Borno",
  "Cross River",
  "Akwa Ibom",
  "Osun",
  "Ekiti",
  "Ondo",
  "Kwara",
  "Niger",
  "Kogi",
  "Benue",
  "Plateau",
  "Nasarawa",
  "Jigawa",
  "Bauchi",
  "Gombe",
  "Adamawa",
  "Taraba",
  "Yobe",
  "Zamfara",
  "Kebbi",
  "Sokoto",
  "Bayelsa",
  "Ebonyi",

  // With "Nigeria" suffix (our current convention — test which work)
  "Lagos Nigeria",
  "Abuja Nigeria",
  "Federal Capital Territory Nigeria",
  "Rivers State Nigeria",
  "Rivers Nigeria",
  "Kano Nigeria",
  "Oyo Nigeria",
  "Delta Nigeria",
  "Anambra Nigeria",
  "Ogun Nigeria",
  "Edo Nigeria",
  "Kaduna Nigeria",
  "Enugu Nigeria",
  "Abia Nigeria",
  "Imo Nigeria",
  "Borno Nigeria",
  "Cross River Nigeria",
  "Akwa Ibom Nigeria",
  "Osun Nigeria",
  "Ekiti Nigeria",
  "Ondo Nigeria",

  // Common city/neighbourhood aliases the AI might emit
  "Port Harcourt",
  "Ibadan",
  "Benin City",
  "Onitsha",
  "Aba",
  "Uyo",
  "Calabar",
  "Owerri",
  "Oshogbo",
  "Maiduguri",
  "Warri",
  "Ikeja",
];

// ─── API call ─────────────────────────────────────────────────────────────────

interface GeoResult {
  key: string;
  name: string;
  type: string;
  country_code: string;
  country_name: string;
  region?: string;
  supports_city?: boolean;
}

async function searchGeo(
  token: string,
  query: string,
): Promise<GeoResult[]> {
  try {
    // No location_types filter — let Meta return everything, we'll filter to NG regions
    const data = await metaGet(
      `/search?type=adgeolocation&q=${encodeURIComponent(query)}&limit=10`,
      token,
    );
    return (data.data || []) as GeoResult[];
  } catch (e: any) {
    console.error(`  ❌ Query "${query}" failed: ${e.message}`);
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌍 Tenzu — Nigerian Region Discovery from Meta API");
  console.log("=".repeat(60));

  let token: string;

  if (TOKEN_ARG) {
    token = TOKEN_ARG;
    console.log("\nUsing CLI-provided token");
  } else {
    console.log("\nFetching Meta credentials from DB...");
    ({ token } = await getMetaCredentials());
  }

  console.log(`✅ Got token (${token.substring(0, 8)}…)\n`);
  console.log("Querying Meta adgeolocation API for each state...\n");

  // Track unique results by key
  const seen = new Map<
    string,
    { key: string; name: string; type: string; queries: string[] }
  >();

  // Also track which query → which canonical name (for building the mapping table)
  const queryToCanonical: Array<{
    query: string;
    key: string;
    name: string;
    type: string;
  }> = [];

  for (const query of NG_QUERIES) {
    const results = await searchGeo(token, query);

    // Only keep Nigerian results
    const ngResults = results.filter(
      (r) => r.country_code === "NG" || r.country_name === "Nigeria",
    );

    if (ngResults.length === 0) {
      console.log(`  ⚠️  "${query}" → no Nigerian results`);
    } else {
      const best = ngResults[0]; // First result is the best match
      const key = best.key || String(best.key);

      if (seen.has(key)) {
        seen.get(key)!.queries.push(query);
      } else {
        seen.set(key, {
          key,
          name: best.name,
          type: best.type,
          queries: [query],
        });
      }

      queryToCanonical.push({
        query,
        key,
        name: best.name,
        type: best.type,
      });

      console.log(
        `  ✅ "${query}" → "${best.name}" (key: ${key}, type: ${best.type})`,
      );
    }

    // Respect rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`\nFound ${seen.size} unique Nigerian regions:\n`);

  const unique = Array.from(seen.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  for (const r of unique) {
    console.log(
      `  "${r.name}" (key: ${r.key}, type: ${r.type})`,
    );
    for (const q of r.queries) {
      console.log(`    ← query: "${q}"`);
    }
  }

  // ─── Mapping table output ──────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(
    "\n// PASTE THIS into NG_AREA_TO_SEARCH_FORMAT in targeting-resolver.ts:\n",
  );

  // Group by canonical name for readable output
  const byCanonical = new Map<string, string[]>();
  for (const entry of queryToCanonical) {
    const list = byCanonical.get(entry.name) ?? [];
    list.push(entry.query);
    byCanonical.set(entry.name, list);
  }

  // Sorted by canonical name
  const sortedCanonical = Array.from(byCanonical.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [canonical, queries] of sortedCanonical) {
    const regionEntry = unique.find((r) => r.name === canonical);
    console.log(`  // ${canonical} (key: ${regionEntry?.key ?? "?"})`);
    for (const q of queries) {
      console.log(`  "${q.toLowerCase()}": "${canonical}",`);
    }
  }

  console.log("\n✅ Done!\n");
}

main().catch((err) => {
  console.error("\n💥 Script failed:", err.message);
  process.exit(1);
});
