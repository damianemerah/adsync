/**
 * Pure helper functions for the audience chat flow.
 * No React / store imports — safe to import from both
 * `audience-chat-step.tsx` and `use-audience-chat.ts` without circular deps.
 */

import type { Message } from "@/stores/campaign-store";
import type { TriageMessage } from "@/lib/ai/service";
import {
  estimateBudget,
  getObjectiveOutcomeLabel,
  getObjectiveOutcomeRange,
} from "@/lib/intelligence/estimator";
import type { AdSyncObjective } from "@/lib/constants";

// ─── Rotating placeholders ────────────────────────────────────────────────────

export const CHAT_PLACEHOLDERS = [
  "What do you sell? (e.g. 'Ankara bags Lagos')",
  "What do you sell? (e.g. 'Shawarma delivery Lekki')",
  "What do you sell? (e.g. 'Wigs and hair care Abuja')",
  "What do you sell? (e.g. 'Skincare products, nationwide delivery')",
  "What do you sell? (e.g. 'Men's shoes Port Harcourt')",
  "What do you sell? (e.g. 'Cakes and small chops Yaba')",
  "What do you sell? (e.g. 'Thrift fashion Surulere')",
  "Analyse jumia.com.ng for ad ideas",
] as const;

// ─── Pure helpers ──────────────────────────────────────────────────────────────

export function buildTriageHistory(messages: Message[]): TriageMessage[] {
  return messages
    .filter((m) => typeof m.content === "string" && m.content.length > 0)
    .map((m) => ({
      role: m.role === "user" ? "user" : "ai",
      content: m.content as string,
    }));
}

export function generateCampaignName(
  prompt: string,
  interests: Array<{ id?: string; name: string } | string>,
): string {
  if (interests && interests.length > 0) {
    const first = interests[0];
    const main = typeof first === "string" ? first : first.name;
    return `${main} Campaign`;
  }
  if (prompt) {
    const words = prompt.split(" ").slice(0, 3).join(" ");
    return `${words.charAt(0).toUpperCase() + words.slice(1)} Campaign`;
  }
  return `Campaign - ${new Date().toLocaleDateString()}`;
}

/**
 * Build the location string sent to the AI.
 * Joins ALL stored locations so the AI has full geographic context.
 * Fallback: "Nigeria" (AI uses this as the broadest default).
 */
export function buildLocationString(locs: { name: string }[]): string {
  return locs.length > 0 ? locs.map((l) => l.name).join(", ") : "Nigeria";
}

export function buildOutcomePreview(
  objective: string | null,
  budget: number,
): { label: string; range: string } {
  const est = estimateBudget(
    budget,
    (objective || "whatsapp") as AdSyncObjective,
  );
  const label = getObjectiveOutcomeLabel(objective);
  const { low, high } = getObjectiveOutcomeRange(est, objective);
  const range =
    objective === "whatsapp" || objective === "traffic"
      ? `${low}–${high}`
      : `${low.toLocaleString()}–${high.toLocaleString()}`;
  return { label: `${label}/day`, range };
}

export function normalizeAmounts(input: string): string {
  return input
    .replace(/(\d+(?:\.\d+)?)k\b/gi, (_, n) => `₦${parseFloat(n) * 1000}`)
    .replace(
      /(\d+(?:\.\d+)?)m\b/gi,
      (_, n) => `₦${parseFloat(n) * 1_000_000}`,
    );
}
