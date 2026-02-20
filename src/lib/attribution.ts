import { nanoid } from "nanoid";

/**
 * Generates a short, URL-safe attribution token.
 * Length: 8 chars (per decisions.md).
 * Example: "xK9mZ2pR"
 */
export function generateAttributionToken(length = 8): string {
  return nanoid(length);
}

/**
 * Generates a longer pixel token for website owners.
 * Length: 12 chars — used in the pixel snippet, not the redirect URL.
 */
export function generatePixelToken(): string {
  return nanoid(12);
}

/**
 * Builds the full Adsync redirect URL for an attribution token.
 * Example: "https://adsync.app/l/xK9mZ2pR"
 */
export function buildAttributionUrl(token: string, baseUrl?: string): string {
  const base =
    baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://adsync.app";
  return `${base}/l/${token}`;
}
