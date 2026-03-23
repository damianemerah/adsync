/**
 * validate-meta-interests.ts
 *
 * Fetches the real Meta access token + ad account ID from the Supabase
 * `ad_accounts` table, then validates every seed in META_INTEREST_SEEDS
 * against the live Meta API.
 *
 * Results -> .agent/audits/meta-interests-audit.json
 * --patch  -> also rewrites meta-interests.ts with confirmed numeric IDs
 *
 * Usage (from project root):
 *   node_modules/.bin/tsx src/scripts/validate-meta-interests.ts
 *   node_modules/.bin/tsx src/scripts/validate-meta-interests.ts --patch
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Load .env.local ─────────────────────────────────────────────────────────
function loadEnvLocal() {
  const envPath = path.join(__dirname, "../../.env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

import { META_INTEREST_SEEDS } from "../lib/constants/meta-interests";

const PATCH = process.argv.includes("--patch");
const API_VERSION = "v25.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// ─── AES-256 Decrypt (mirrors src/lib/crypto.ts) ─────────────────────────────
function decrypt(text: string): string {
  const key = process.env.ENCRYPTION_KEY!;
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift()!, "hex");
  const encryptedText = Buffer.from(parts.join(":"), "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// ─── Fetch token + account ID from DB ────────────────────────────────────────
async function getMetaCredentials(): Promise<{
  token: string;
  accountId: string;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const encKey = process.env.ENCRYPTION_KEY;

  if (!supabaseUrl || !serviceKey || !encKey) {
    console.error(
      "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data, error } = await supabase
    .from("ad_accounts")
    .select("access_token, platform_account_id, health_status, platform")
    .eq("platform", "meta")
    .eq("health_status", "healthy")
    .order("is_default", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error(
      "No healthy Meta ad account found in DB:",
      error?.message ?? "no row",
    );
    process.exit(1);
  }

  const token = decrypt(data.access_token);
  const accountId = data.platform_account_id.startsWith("act_")
    ? data.platform_account_id
    : `act_${data.platform_account_id}`;

  return { token, accountId };
}

// ─── Meta API ─────────────────────────────────────────────────────────────────
async function metaGet(endpoint: string, token: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.code}: ${json.error.message}`);
  return json;
}

async function searchInterests(token: string, query: string) {
  const params = new URLSearchParams({
    type: "adinterest",
    q: query,
    limit: "10",
  });
  const data = await metaGet(`/search?${params}`, token);
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
    process.stdout.write(`  -> "${seed.name}" ... `);
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
        const icon = entry.status === "exact_match" ? "ok" : "~~";
        console.log(
          `${icon} ${entry.status} -> ID: ${entry.metaId}  "${entry.metaName}"`,
        );
      } else {
        const top =
          apiResults
            .slice(0, 2)
            .map((r) => `"${r.name}"`)
            .join(", ") || "none";
        console.log(`XX no_match  (top returned: ${top})`);
      }
    } catch (err: any) {
      entry.status = "api_error";
      entry.error = err.message;
      console.log(`!! api_error: ${err.message}`);
    }

    results.push(entry);
    await new Promise((r) => setTimeout(r, delay));
  }

  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\nTenzu — Meta Interests Validator");
  console.log("=========================================================");
  console.log(
    `Mode: ${PATCH ? "PATCH (will rewrite meta-interests.ts)" : "DRY-RUN (read-only)"}`,
  );
  console.log("\nFetching Meta credentials from DB...");

  const { token } = await getMetaCredentials();
  console.log(`Got token (${token.substring(0, 8)}...) \n`);

  console.log(`Validating ${META_INTEREST_SEEDS.length} interests...\n`);
  const results = await validateSeeds(META_INTEREST_SEEDS, (q) =>
    searchInterests(token, q),
  );

  // ── Summary ─────────────────────────────────────────────────────────────────
  const exact = results.filter((r) => r.status === "exact_match").length;
  const fuzzy = results.filter((r) => r.status === "fuzzy_match").length;
  const noMatch = results.filter((r) => r.status === "no_match").length;
  const errors = results.filter((r) => r.status === "api_error").length;
  const total = results.length;

  console.log("\n=========================================================");
  console.log("Summary");
  console.log(`   Exact match : ${exact}/${total}`);
  console.log(
    `   Fuzzy match : ${fuzzy}/${total} — confirmed ID, different display name`,
  );
  console.log(
    `   No match    : ${noMatch}/${total} — seed name may be invalid`,
  );
  console.log(`   API errors  : ${errors}/${total}`);

  if (noMatch > 0) {
    console.log(
      "\n  Unmatched seeds (review + fix these names in meta-interests.ts):",
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
            `     -> Consider renaming the seed to one of the above names`,
          );
        } else {
          console.log(
            `     -> No results at all — this interest may not exist in Meta's catalog`,
          );
        }
      });
  }

  if (fuzzy > 0) {
    console.log(
      "\n  Fuzzy-matched seeds (Meta uses a slightly different display name):",
    );
    results
      .filter((r) => r.status === "fuzzy_match")
      .forEach((r) => {
        console.log(
          `   - "${r.seedName}" -> Meta name: "${r.metaName}" (ID: ${r.metaId})`,
        );
        console.log(
          `     -> Consider updating the seed name to match Meta's exact display name`,
        );
      });
  }

  // ── Write audit JSON ─────────────────────────────────────────────────────────
  const auditDir = path.join(__dirname, "../../.agent/audits");
  fs.mkdirSync(auditDir, { recursive: true });
  const auditPath = path.join(auditDir, "meta-interests-audit.json");
  fs.writeFileSync(auditPath, JSON.stringify(results, null, 2));
  console.log(`\nFull audit -> ${auditPath}`);

  // ── Patch ────────────────────────────────────────────────────────────────────
  if (PATCH) {
    patchMetaInterests(results);
  } else {
    console.log(
      "Run with --patch to bake confirmed IDs into meta-interests.ts\n",
    );
  }
}

function patchMetaInterests(audit: AuditEntry[]) {
  const filePath = path.join(__dirname, "../lib/constants/meta-interests.ts");
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
  console.log(`\nPatched meta-interests.ts — ${patchCount} IDs baked in.`);
  console.log("   Unmatched seeds left unchanged for manual review.\n");
}

main().catch((err) => {
  console.error("\nScript failed:", err.message);
  process.exit(1);
});
