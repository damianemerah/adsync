/**
 * upload-skills.ts
 * Run with:
 *   export OPENAI_API_KEY="sk-..."
 *
 *
 * Reads all skill folders from src/lib/ai/skill-definitions/,
 * uploads each to OpenAI's Skills API (/v1/skills).
 * Cleans up existing skills by deleting them first, then recreating.
 * Prints the env vars to paste into your .env.local file.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKILLS_DIR = path.join(__dirname, "../lib/ai/skill-definitions");

async function walk(
  dir: string,
  baseDir: string,
  skillName: string,
  files: any[],
) {
  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await walk(fullPath, baseDir, skillName, files);
    } else {
      if (entry === ".DS_Store") continue; // Avoid hidden files causing multiple roots
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      const content = fs.readFileSync(fullPath);

      const mimeType = entry.endsWith(".md")
        ? "text/markdown"
        : "application/octet-stream";

      files.push({
        name: `${skillName}/${relativePath}`,
        content,
        mimeType,
      });
    }
  }
}

async function uploadSkill(
  skillDir: string,
): Promise<{ name: string; id: string }> {
  const skillName = path.basename(skillDir);
  const skillMdPath = path.join(skillDir, "SKILL.md");

  console.log("Uploading skill:", skillName, skillMdPath);

  if (!fs.existsSync(skillMdPath)) {
    throw new Error(`No SKILL.md found in ${skillDir}`);
  }

  const fileObjects: { name: string; content: Buffer; mimeType: string }[] = [];
  await walk(skillDir, skillDir, skillName, fileObjects);

  const formData = new FormData();
  for (const fileObj of fileObjects) {
    const blob = new Blob([new Uint8Array(fileObj.content)], {
      type: fileObj.mimeType,
    });
    formData.append("files[]", blob, fileObj.name);
  }

  const response = await fetch("https://api.openai.com/v1/skills", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to upload ${skillName}: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = await response.json();
  return { name: skillName, id: data.id };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not set.");
    console.error(
      '   Run: export OPENAI_API_KEY="sk-..." && npx ts-node src/scripts/upload-skills.ts',
    );
    process.exit(1);
  }

  console.log("Cleaning up existing skills...");
  try {
    const listResponse = await fetch("https://api.openai.com/v1/skills", {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });

    if (listResponse.ok) {
      const existingSkillsList = await listResponse.json();

      for (const skill of existingSkillsList.data || []) {
        if (skill.id) {
          process.stdout.write(`Deleting ${skill.name || skill.id}... `);
          try {
            const delRes = await fetch(
              `https://api.openai.com/v1/skills/${skill.id}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
              },
            );
            if (delRes.ok) {
              console.log("✅");
            } else {
              console.log(`❌ ${delRes.status} ${delRes.statusText}`);
            }
          } catch (delErr: any) {
            console.error(
              `\n   ⚠️ Failed to delete: ${delErr.message || delErr}`,
            );
          }
        }
      }
    } else {
      console.log(
        `⚠️ Could not fetch skills list. Status: ${listResponse.status}`,
      );
    }
  } catch (e: any) {
    console.log(`⚠️ Could not clean existing skills. Error: ${e.message || e}`);
    console.log("   Continuing with upload...");
  }

  const skillDirs = fs
    .readdirSync(SKILLS_DIR)
    .map((d) => path.join(SKILLS_DIR, d))
    .filter((d) => fs.statSync(d).isDirectory());

  console.log(`\nFound ${skillDirs.length} skills to upload...\n`);

  const results: { name: string; id: string }[] = [];

  for (const dir of skillDirs) {
    const skillName = path.basename(dir);
    process.stdout.write(`Uploading ${skillName}... `);
    try {
      const result = await uploadSkill(dir);
      results.push(result);
      console.log(`✅ ${result.id}`);
    } catch (err: any) {
      console.log(`❌ Failed: ${err?.message || err}`);
      if (err?.status) console.log(`   Status: ${err.status}`);
      if (err?.error) console.log(`   Detail: ${JSON.stringify(err.error)}`);
    }
  }

  if (results.length > 0) {
    console.log("\n--- Paste these into your .env.local file ---\n");
    for (const { name, id } of results) {
      const envKey = `SKILL_ID_${name.toUpperCase().replace(/-/g, "_")}`;
      console.log(`${envKey}=${id}`);
    }
  }
}

main();
