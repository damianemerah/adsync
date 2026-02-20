/**
 * CTA (Call-to-Action) Constants and Helpers
 * Platform-specific CTA options for Meta and TikTok ads
 */

import type { CTAOption, CTAIntent, PlatformCTACode } from "@/types/cta-types";
import type { AdSyncObjective } from "@/lib/constants";

// Meta WhatsApp CTAs
export const META_WHATSAPP_CTAS: CTAOption[] = [
  {
    code: "SEND_MESSAGE",
    label: "Send message",
    description: "Opens WhatsApp chat",
  },
  {
    code: "GET_QUOTE",
    label: "Get quote",
    description: "Request pricing info",
  },
  {
    code: "CONTACT_US",
    label: "Contact us",
    description: "General inquiry",
  },
];

// Meta Website/E-commerce CTAs
export const META_WEBSITE_CTAS: CTAOption[] = [
  {
    code: "SHOP_NOW",
    label: "Shop now",
    description: "Direct to product",
  },
  {
    code: "LEARN_MORE",
    label: "Learn more",
    description: "Visit landing page",
  },
  {
    code: "SIGN_UP",
    label: "Sign up",
    description: "Register account",
  },
  {
    code: "GET_OFFER",
    label: "Get offer",
    description: "Claim promotion",
  },
  {
    code: "BOOK_NOW",
    label: "Book now",
    description: "Make reservation",
  },
  {
    code: "DOWNLOAD",
    label: "Download",
    description: "Get the app",
  },
];

// TikTok CTAs
export const TIKTOK_CTAS: CTAOption[] = [
  { code: "SHOP_NOW", label: "Shop now", description: "Direct to product" },
  { code: "LEARN_MORE", label: "Learn more", description: "Learn more" },
  { code: "DOWNLOAD", label: "Download", description: "Get the app" },
  { code: "BOOK_NOW", label: "Book now", description: "Make reservation" },
  { code: "SIGN_UP", label: "Sign up", description: "Create account" },
  { code: "CONTACT_US", label: "Contact us", description: "Get in touch" },
];

// Intent to CTA code mapping
export const CTA_INTENT_MAP: Record<CTAIntent, PlatformCTACode[]> = {
  start_whatsapp_chat: ["SEND_MESSAGE", "CONTACT_US"],
  buy_now: ["SHOP_NOW", "GET_OFFER"],
  learn_more: ["LEARN_MORE"],
  book_appointment: ["BOOK_NOW"],
  get_quote: ["GET_QUOTE"],
  sign_up: ["SIGN_UP"],
  download: ["DOWNLOAD"],
};

/**
 * Get allowed CTAs based on platform and objective
 */
export function getAllowedCTAsForPlacement(
  platform: "meta" | "tiktok" | null,
  objective: AdSyncObjective | null,
): CTAOption[] {
  // WhatsApp campaigns use WhatsApp-specific CTAs
  if (objective === "whatsapp") {
    return META_WHATSAPP_CTAS;
  }

  // TikTok uses its own CTA set
  if (platform === "tiktok") {
    return TIKTOK_CTAS;
  }

  // Meta (Facebook/Instagram) uses website CTAs
  return META_WEBSITE_CTAS;
}

/**
 * Map AI-recommended intent to the best matching platform CTA
 */
export function mapIntentToCTA(
  intent: CTAIntent | string,
  platform: "meta" | "tiktok" | null,
  objective: AdSyncObjective | null,
): CTAOption {
  const allowedCTAs = getAllowedCTAsForPlacement(platform, objective);

  // Get CTA codes that match this intent
  const intentCodes =
    CTA_INTENT_MAP[intent as CTAIntent] || (["SHOP_NOW"] as PlatformCTACode[]);

  // Find first allowed CTA that matches the intent
  const match = allowedCTAs.find((cta) => intentCodes.includes(cta.code));

  // Return match or fallback to first allowed CTA
  return match || allowedCTAs[0];
}

/**
 * Generate WhatsApp pre-filled message from campaign data
 */
export function generateWhatsAppMessage(campaignData: {
  headline: string;
  campaignName?: string;
  locations?: Array<{ name: string }>;
}): string {
  const location = campaignData.locations?.[0]?.name || "your area";
  const subject =
    campaignData.headline || campaignData.campaignName || "your ad";

  return `Hi! I saw your ad about ${subject} in ${location}. I'd like to know more.`;
}

/**
 * Get display label for a CTA code
 */
export function getCTADisplayLabel(
  code: PlatformCTACode,
  platform: "meta" | "tiktok" | null,
  objective: AdSyncObjective | null,
): string {
  const allowedCTAs = getAllowedCTAsForPlacement(platform, objective);
  const cta = allowedCTAs.find((c) => c.code === code);
  return cta?.label || "Shop now";
}

/**
 * Get default CTA for a given platform and objective
 */
export function getDefaultCTA(
  platform: "meta" | "tiktok" | null,
  objective: AdSyncObjective | null,
): CTAOption {
  const allowedCTAs = getAllowedCTAsForPlacement(platform, objective);
  return allowedCTAs[0]; // First option is the default
}
