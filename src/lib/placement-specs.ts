export type AspectRatioCategory =
  | "landscape" // ~16:9 or 1.91:1
  | "square"    // 1:1
  | "portrait"  // 4:5
  | "vertical"  // 9:16

export interface PlacementSpec {
  name: string
  optimalAspectRatio: AspectRatioCategory
  /** width / height, e.g. 1.0 for square, 0.5625 for 9:16 */
  targetRatio: number
  /** Tolerance before we flag a mismatch (0.15 = 15% off) */
  tolerance: number
  recommendedDimensions: string
}

// Keyed by `${publisher_platform}:${platform_position}` as returned by Meta API
export const PLACEMENT_SPECS: Record<string, PlacementSpec> = {
  // ── Facebook ─────────────────────────────────────────────────────────────
  "facebook:feed": {
    name: "Facebook Feed",
    optimalAspectRatio: "square",
    targetRatio: 1.0,
    tolerance: 0.2,
    recommendedDimensions: "1080 × 1080 px (1:1)",
  },
  "facebook:story": {
    name: "Facebook Stories",
    optimalAspectRatio: "vertical",
    targetRatio: 9 / 16,
    tolerance: 0.1,
    recommendedDimensions: "1080 × 1920 px (9:16)",
  },
  "facebook:reels": {
    name: "Facebook Reels",
    optimalAspectRatio: "vertical",
    targetRatio: 9 / 16,
    tolerance: 0.1,
    recommendedDimensions: "1080 × 1920 px (9:16)",
  },
  "facebook:right_hand_column": {
    name: "Facebook Right Column",
    optimalAspectRatio: "square",
    targetRatio: 1.0,
    tolerance: 0.2,
    recommendedDimensions: "1080 × 1080 px (1:1)",
  },
  "facebook:marketplace": {
    name: "Facebook Marketplace",
    optimalAspectRatio: "square",
    targetRatio: 1.0,
    tolerance: 0.2,
    recommendedDimensions: "1080 × 1080 px (1:1)",
  },
  "facebook:video_feeds": {
    name: "Facebook In-stream Video",
    optimalAspectRatio: "landscape",
    targetRatio: 16 / 9,
    tolerance: 0.2,
    recommendedDimensions: "1920 × 1080 px (16:9)",
  },

  // ── Instagram ─────────────────────────────────────────────────────────────
  "instagram:feed": {
    name: "Instagram Feed",
    optimalAspectRatio: "portrait",
    targetRatio: 4 / 5,
    tolerance: 0.2,
    recommendedDimensions: "1080 × 1350 px (4:5)",
  },
  "instagram:story": {
    name: "Instagram Stories",
    optimalAspectRatio: "vertical",
    targetRatio: 9 / 16,
    tolerance: 0.1,
    recommendedDimensions: "1080 × 1920 px (9:16)",
  },
  "instagram:reels": {
    name: "Instagram Reels",
    optimalAspectRatio: "vertical",
    targetRatio: 9 / 16,
    tolerance: 0.1,
    recommendedDimensions: "1080 × 1920 px (9:16)",
  },
  "instagram:explore": {
    name: "Instagram Explore",
    optimalAspectRatio: "square",
    targetRatio: 1.0,
    tolerance: 0.2,
    recommendedDimensions: "1080 × 1080 px (1:1)",
  },
  "instagram:explore_home": {
    name: "Instagram Explore Home",
    optimalAspectRatio: "square",
    targetRatio: 1.0,
    tolerance: 0.2,
    recommendedDimensions: "1080 × 1080 px (1:1)",
  },
  "instagram:profile_feed": {
    name: "Instagram Profile Feed",
    optimalAspectRatio: "square",
    targetRatio: 1.0,
    tolerance: 0.2,
    recommendedDimensions: "1080 × 1080 px (1:1)",
  },

  // ── Audience Network ───────────────────────────────────────────────────────
  "audience_network:classic": {
    name: "Audience Network",
    optimalAspectRatio: "square",
    targetRatio: 1.0,
    tolerance: 0.2,
    recommendedDimensions: "1080 × 1080 px (1:1)",
  },
  "audience_network:rewarded_video": {
    name: "Audience Network Rewarded Video",
    optimalAspectRatio: "vertical",
    targetRatio: 9 / 16,
    tolerance: 0.15,
    recommendedDimensions: "1080 × 1920 px (9:16)",
  },

  // ── Messenger ────────────────────────────────────────────────────────────
  "messenger:messenger_home": {
    name: "Messenger Inbox",
    optimalAspectRatio: "square",
    targetRatio: 1.0,
    tolerance: 0.2,
    recommendedDimensions: "1080 × 1080 px (1:1)",
  },
  "messenger:story": {
    name: "Messenger Stories",
    optimalAspectRatio: "vertical",
    targetRatio: 9 / 16,
    tolerance: 0.1,
    recommendedDimensions: "1080 × 1920 px (9:16)",
  },
}

export function getPlacementSpec(
  publisher_platform: string,
  platform_position: string
): PlacementSpec | null {
  const key = `${publisher_platform}:${platform_position}`
  return PLACEMENT_SPECS[key] ?? null
}

/** Returns the ratio mismatch severity for a given creative and placement.
 *  0 = perfect, >0 = distortion percentage (0.44 = 44% mismatch). */
export function getRatioMismatch(
  width: number,
  height: number,
  spec: PlacementSpec
): number {
  if (!width || !height) return 0
  const actualRatio = width / height
  const diff = Math.abs(actualRatio - spec.targetRatio) / spec.targetRatio
  return diff
}

export function isMismatched(
  width: number,
  height: number,
  spec: PlacementSpec
): boolean {
  return getRatioMismatch(width, height, spec) > spec.tolerance
}

/** Returns the % of creative area that would be lost when Meta crops to the target ratio. */
export function estimateCropLoss(
  width: number,
  height: number,
  spec: PlacementSpec
): number {
  if (!width || !height) return 0
  const actualRatio = width / height
  const targetRatio = spec.targetRatio

  if (actualRatio > targetRatio) {
    // Wider than target — horizontal crop
    const keptWidth = height * targetRatio
    return 1 - keptWidth / width
  } else {
    // Taller than target — vertical crop
    const keptHeight = width / targetRatio
    return 1 - keptHeight / height
  }
}
