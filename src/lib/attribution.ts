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
 * Builds the full Tenzu redirect URL for an attribution token.
 * Example: "https://Tenzu.app/l/xK9mZ2pR"
 */
export function buildAttributionUrl(token: string, baseUrl?: string): string {
  const base =
    baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://Tenzu.app";
  return `${base}/l/${token}`;
}
