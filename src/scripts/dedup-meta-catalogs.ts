/**
 * dedup-meta-catalogs.ts
 *
 * Removes duplicate entries from:
 *   - src/lib/constants/meta-behaviors.ts  (META_BEHAVIOR_SEEDS, META_LIFE_EVENT_SEEDS)
 *   - src/lib/constants/meta-interests.ts  (META_INTEREST_SEEDS)
 *
 * Deduplication key (priority order):
 *   1. metaId  — if present and non-empty string
 *   2. name    — fallback for entries without a metaId
 *
 * Scope: each FILE is one dedup namespace.
 *   META_BEHAVIOR_SEEDS + META_LIFE_EVENT_SEEDS share one seen-set,
 *   so cross-array duplicates are caught.
 *
 * Everything outside the array bodies (interfaces, helper functions, comments)
 * is left completely untouched — only the content between `[` and `]` of each
 * named export is rewritten.
 *
 * Usage (from project root):
 *   npx tsx src/scripts/dedup-meta-catalogs.ts
 *   npx tsx src/scripts/dedup-meta-catalogs.ts --dry-run
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes("--dry-run");

// ─── parser ──────────────────────────────────────────────────────────────────

/**
 * Find the open `[` and closing `]` of a named exported const array.
 *
 * We look for the literal text:
 *   export const <NAME>
 * followed (after optional type annotation) by `=` then whitespace then `[`.
 *
 * The regex is anchored to `export const` so it cannot accidentally match
 * interface or function declarations.
 */
function findArrayBounds(
  src: string,
  exportName: string
): { bodyStart: number; bodyEnd: number } | null {
  // Match: export const EXACT_NAME (optional `: SomeType[]`) = [
  const re = new RegExp(
    `export\\s+const\\s+${exportName}\\s*(?::[^=]+)?=\\s*\\[`,
    "s"
  );
  const m = re.exec(src);
  if (!m) return null;

  const bodyStart = m.index + m[0].length; // index just after the `[`

  // Walk character-by-character to find the matching `]`, respecting
  // nested braces and string literals.
  let depth = 0; // brace depth (we're already inside the `[`)
  let i = bodyStart;
  let inString: false | string = false;
  let escape = false;

  while (i < src.length) {
    const ch = src[i];

    if (escape) { escape = false; i++; continue; }
    if (ch === "\\") { escape = true; i++; continue; }

    if (inString) {
      if (ch === inString) inString = false;
      i++; continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch; i++; continue;
    }

    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === "]" && depth === 0) {
      return { bodyStart, bodyEnd: i };
    }

    i++;
  }

  return null; // unmatched — should never happen in valid TS
}

/** Split the text between `[` and `]` into individual `{ … }` object strings. */
function splitObjects(body: string): string[] {
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let i = 0;
  let inStr: false | string = false;
  let esc = false;

  while (i < body.length) {
    const ch = body[i];

    if (esc) { esc = false; i++; continue; }
    if (ch === "\\") { esc = true; i++; continue; }
    if (inStr) {
      if (ch === inStr) inStr = false;
      i++; continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch; i++; continue;
    }

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        objects.push(body.slice(start, i + 1));
        start = -1;
      }
    }
    i++;
  }

  return objects;
}

/** Return the dedup key for an object string: `id:<metaId>` or `name:<name>`. */
function getKey(obj: string): string | null {
  const idMatch = obj.match(/metaId\s*:\s*["'`]([^"'`]+)["'`]/);
  if (idMatch?.[1]?.trim()) return `id:${idMatch[1].trim()}`;

  const nameMatch = obj.match(/name\s*:\s*["'`]([^"'`]+)["'`]/);
  if (nameMatch?.[1]) return `name:${nameMatch[1].trim()}`;

  return null;
}

// ─── dedup ───────────────────────────────────────────────────────────────────

function dedupArrayInFile(
  src: string,
  arrayName: string,
  seenSet: Set<string>
): { result: string; removed: number; kept: number } {
  const bounds = findArrayBounds(src, arrayName);
  if (!bounds) {
    console.warn(`  ⚠  Could not locate array "${arrayName}" — skipping.`);
    return { result: src, removed: 0, kept: 0 };
  }

  const { bodyStart, bodyEnd } = bounds;
  const body = src.slice(bodyStart, bodyEnd);
  const objects = splitObjects(body);

  const kept: string[] = [];
  let removed = 0;

  for (const obj of objects) {
    const key = getKey(obj);

    if (key === null) {
      console.warn(`  ⚠  Could not extract a key from object, keeping it.`);
      kept.push(obj);
      continue;
    }

    if (seenSet.has(key)) {
      removed++;
      const label = key.replace(/^(id|name):/, "");
      const kind = key.startsWith("id:") ? "metaId" : "name";
      console.log(`  ✂  [${arrayName}] duplicate ${kind} "${label}" — removed`);
      continue;
    }

    seenSet.add(key);
    kept.push(obj);
  }

  // Re-join preserving the 2-space indent style used throughout these files
  const newBody = "\n  " + kept.join(",\n  ") + ",\n";
  const result = src.slice(0, bodyStart) + newBody + src.slice(bodyEnd);

  return { result, removed, kept: kept.length };
}

// ─── main ────────────────────────────────────────────────────────────────────

interface FileJob {
  filePath: string;
  /** Processed in order; all arrays in the same file share one seen-set. */
  arrays: string[];
}

const ROOT = path.resolve(__dirname, "../../");

const jobs: FileJob[] = [
  {
    filePath: path.join(ROOT, "src/lib/constants/meta-behaviors.ts"),
    arrays: ["META_BEHAVIOR_SEEDS"],
  },
  {
    // META_LIFE_EVENT_SEEDS lives in its own file — NOT in meta-behaviors.ts
    filePath: path.join(ROOT, "src/lib/constants/meta-life-events.ts"),
    arrays: ["META_LIFE_EVENT_SEEDS"],
  },
  {
    filePath: path.join(ROOT, "src/lib/constants/meta-interests.ts"),
    arrays: ["META_INTEREST_SEEDS"],
  },
];

let grandTotal = 0;

// Global seen-set shared across behaviors + life-events jobs so that cross-file
// duplicates (same metaId in both catalogs) are caught and removed from the
// second file processed.
const globalSeenSet = new Set<string>();

for (const job of jobs) {
  const rel = path.relative(ROOT, job.filePath);
  console.log(`\n📄 ${rel}`);

  if (!fs.existsSync(job.filePath)) {
    console.error(`  ❌ File not found: ${job.filePath}`);
    continue;
  }

  let src = fs.readFileSync(job.filePath, "utf8");
  const originalSize = src.length;
  let totalRemoved = 0;

  // behaviors + life-events share the global set; interests get a fresh one
  const seenSet =
    job.filePath.includes("meta-interests.ts") ? new Set<string>() : globalSeenSet;

  for (const arrayName of job.arrays) {
    console.log(`  🔍 Checking ${arrayName}…`);
    const { result, removed, kept } = dedupArrayInFile(src, arrayName, seenSet);
    src = result;
    totalRemoved += removed;
    console.log(`     kept ${kept}, removed ${removed} duplicates`);
  }

  grandTotal += totalRemoved;

  if (totalRemoved === 0) {
    console.log("  ✅ No duplicates found.");
    continue;
  }

  if (DRY_RUN) {
    console.log(
      `  🔎 DRY RUN — would remove ${totalRemoved} entries (${originalSize} → ~${src.length} bytes)`
    );
  } else {
    fs.writeFileSync(job.filePath, src, "utf8");
    console.log(
      `  💾 Written — removed ${totalRemoved} duplicates (${originalSize} → ${src.length} bytes)`
    );
  }
}

console.log(
  `\n${DRY_RUN ? "🔎 DRY RUN complete" : "✅ Done"} — ${grandTotal} total duplicates ${DRY_RUN ? "found" : "removed"} across all files.\n`
);
