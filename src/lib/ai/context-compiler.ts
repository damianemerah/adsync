// src/lib/ai/context-compiler.ts
// Production-ready context-aware prompt compiler for AdSync
// Solves underprompting by auto-enriching user input with campaign data

import { CreativeFormat } from "./prompts";

/**
 * Campaign context structure from ADS_SYSTEM and user wizard
 */
export interface CampaignContext {
  businessDescription: string;
  targeting: {
    interests: string[];
    behaviors: string[];
    locations: string[];
    demographics: {
      age_min: number;
      age_max: number;
      gender: "all" | "male" | "female";
    };
  };
  copy?: {
    headline: string;
    subHeadline?: string;
    bodyCopy: string;
  };
  platform?: "meta" | "tiktok" | "google";
  objective?: "whatsapp" | "traffic" | "awareness" | "engagement" | "leads" | "sales" | "app_promotion";
  metaSubPlacements?: Record<string, string[]>;
}

/**
 * Compiles a context-rich FLUX prompt from minimal user input + campaign data
 *
 * @param userPrompt - Minimal user input (e.g., "hoodie", "product shot")
 * @param context - Campaign context from wizard/ADS_SYSTEM
 * @param format - Creative format (product_image, social_ad, poster, auto)
 * @param aspectRatio - Target aspect ratio (1:1, 9:16, 4:5, 16:9)
 * @returns Enriched prompt ready for FLUX generation
 *
 * @example
 * ```typescript
 * compileContextPrompt("hoodie", {
 *   businessDescription: "Lagos streetwear brand",
 *   targeting: { locations: ["Lagos"], interests: ["Afrobeats"], ... }
 * }, "social_ad", "1:1")
 * // → "hoodie for Lagos streetwear brand. Target: unisex, 18-35 years, interested in Afrobeats..."
 * ```
 */
export function compileContextPrompt(
  userPrompt: string,
  context: CampaignContext,
  format: CreativeFormat = "auto",
  aspectRatio: string = "1:1",
): string {
  // SECTION 1: Core Subject (User Intent)
  let prompt = userPrompt.trim();

  // SECTION 2: Business Context
  if (context.businessDescription) {
    prompt += ` for ${context.businessDescription}`;
  }

  // SECTION 3: Audience Targeting
  const { demographics, interests, locations } = context.targeting;

  // Demographics
  const genderText =
    demographics.gender === "all"
      ? "unisex appeal"
      : `${demographics.gender} audience`;
  prompt += `. Target: ${genderText}, ${demographics.age_min}-${demographics.age_max} years`;

  // Interests (top 3 most relevant)
  if (interests && interests.length > 0) {
    const topInterests = interests.slice(0, 3).join(", ");
    prompt += `, interested in ${topInterests}`;
  }

  // SECTION 4: Audience Style Signal (derived, not raw targeting data)
  // ⚠️ Do NOT inject audience interest labels (e.g. "interested in Afrobeats") —
  // FLUX reads these as scene directives and generates thematic backgrounds.
  // Translate audience → a visual styling tone instead.
  if (locations && locations.length > 0) {
    prompt += `. Contemporary Nigerian aesthetic, modern aspirational styling`;
  }

  // SECTION 5: Copy Integration (if available)
  if (context.copy?.headline && format !== "product_image") {
    prompt += `. Ad headline: "${context.copy.headline}"`;
    if (context.copy.subHeadline) {
      prompt += `, tagline: "${context.copy.subHeadline}"`;
    }
  }

  // SECTION 6: Format-Specific Enhancements
  // Use positive scene description — FLUX does not support negative prompting.
  // Describe what IS there, not what to avoid.
  switch (format) {
    case "product_image":
      prompt +=
        ". Clean e-commerce product photography. Pure white seamless studio backdrop, soft box lighting, product centered and isolated on studio surface, commercial quality";
      break;
    case "social_ad": {
      const platform = context.platform || "Instagram";
      prompt += `. ${platform} social media ad. Clean minimal studio or solid color background, product-centered composition, scroll-stopping professional visual`;
      if (context.objective === "sales") {
        prompt += ", strong product focus, e-commerce quality";
      }
      break;
    }
    case "poster":
      prompt +=
        ". Graphic poster layout, bold typography, flat or gradient background, modern design aesthetic, clean typographic composition";
      break;
    case "auto":
      prompt += ". Professional ad creative, clean studio environment, product-focused composition, minimal props";
      break;
  }

  // SECTION 7: Technical Specs (Aspect Ratio)
  switch (aspectRatio) {
    case "9:16":
      prompt +=
        ". Vertical 9:16 composition optimized for Instagram Stories, TikTok, and Reels";
      break;
    case "16:9":
      prompt +=
        ". Horizontal 16:9 composition for video banners and website headers";
      break;
    case "4:5":
      prompt +=
        ". 4:5 portrait composition optimized for Instagram and Facebook mobile feeds";
      break;
    default: // 1:1
      prompt += ". Square 1:1 composition for Instagram and Facebook feeds";
  }

  // SECTION 8: Quality Anchors
  prompt +=
    ". Professional commercial photography, high resolution, 8K quality, sharp focus, studio lighting, clean composition";

  return prompt.trim();
}

/**
 * Analyzes user prompt quality and provides enhancement suggestions
 * Used for progressive enhancement modal (future feature)
 *
 * @param prompt - User's input prompt
 * @returns Quality analysis with confidence score and suggestions
 */
export function analyzePrompt(prompt: string): {
  confidence: number;
  missing: string[];
  suggestions: string[];
} {
  const checks = {
    hasLocation: /lagos|abuja|nigeria|port harcourt|kano|ibadan/i.test(prompt),
    hasStyle: /modern|clean|bold|minimal|vibrant|professional|casual/i.test(
      prompt,
    ),
    hasLighting:
      /lighting|studio|natural|golden hour|5600k|3200k|daylight/i.test(prompt),
    hasSubject: prompt.length > 10,
    hasContext: /for |audience|target|customer/i.test(prompt),
  };

  const score =
    Object.values(checks).filter(Boolean).length / Object.keys(checks).length;

  const missing: string[] = [];
  const suggestions: string[] = [];

  if (!checks.hasLocation) {
    missing.push("location");
    suggestions.push("Add location context (e.g., Lagos, Abuja, Nigeria)");
  }
  if (!checks.hasStyle) {
    missing.push("style");
    suggestions.push("Specify visual style (modern, bold, minimal, vibrant)");
  }
  if (!checks.hasLighting) {
    missing.push("lighting");
    suggestions.push(
      "Include lighting preference (studio, natural, golden hour)",
    );
  }
  if (!checks.hasContext) {
    missing.push("context");
    suggestions.push("Describe the target audience or use case");
  }

  return {
    confidence: score,
    missing,
    suggestions,
  };
}

/**
 * Helper: Determine if campaign context is available and valid
 *
 * @param context - Campaign context to validate
 * @returns True if context has minimum required data
 */
export function hasValidContext(
  context: CampaignContext | null | undefined,
): boolean {
  if (!context) return false;

  return !!(
    context.businessDescription &&
    context.targeting?.locations?.length > 0 &&
    context.targeting?.demographics
  );
}

/**
 * Cache key generator for compiled prompts (performance optimization)
 * Future: Use for Redis/in-memory caching
 *
 * @param prompt - User prompt
 * @param contextId - Campaign or profile ID
 * @param format - Creative format
 * @param aspectRatio - Aspect ratio
 * @returns Cache key string
 */
export function generateCacheKey(
  prompt: string,
  contextId: string,
  format: CreativeFormat,
  aspectRatio: string,
): string {
  // Truncate prompt for key size
  const promptKey = prompt.substring(0, 20).replace(/\s+/g, "_");
  return `context:${contextId}:${promptKey}:${format}:${aspectRatio}`;
}
