/**
 * Dynamic FX Rate Helper
 *
 * Fetches the current active USD→NGN exchange rate from the database.
 * Includes in-memory caching to reduce DB queries (1-hour TTL).
 *
 * Usage:
 *   const fxRate = await getFxRate();
 *   const usdAmount = ngnAmount / fxRate;
 */

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────
// In-memory cache (Node.js server-side only)
// ─────────────────────────────────────────────────────────────────────────
let cachedRate: number | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ─────────────────────────────────────────────────────────────────────────
// Server-side: Get current active FX rate (with 1-hour cache)
// ─────────────────────────────────────────────────────────────────────────
export async function getFxRate(): Promise<number> {
  const now = Date.now();

  // Return cached rate if still valid
  if (
    cachedRate !== null &&
    cacheTimestamp !== null &&
    now - cacheTimestamp < CACHE_TTL_MS
  ) {
    return cachedRate;
  }

  // Fetch fresh rate from DB
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("fx_rates")
      .select("rate_ngn_per_usd")
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.warn("⚠️ Failed to fetch FX rate from DB, using fallback:", error);
      return getFallbackRate();
    }

    // Update cache
    cachedRate = parseFloat(data.rate_ngn_per_usd);
    cacheTimestamp = now;

    return cachedRate;
  } catch (err) {
    console.error("❌ Error fetching FX rate:", err);
    return getFallbackRate();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Fallback rate (matches migration seed + old static FX_RATE)
// ─────────────────────────────────────────────────────────────────────────
function getFallbackRate(): number {
  // Check for static env var as ultimate fallback
  const envRate = Number(process.env.NEXT_PUBLIC_USD_NGN_RATE);
  return envRate || 1600;
}

// ─────────────────────────────────────────────────────────────────────────
// Client-side: Get static FX rate (for UI estimates, non-critical)
// ─────────────────────────────────────────────────────────────────────────
export function getStaticFxRate(): number {
  if (typeof window !== "undefined") {
    // Client-side: use env var
    return Number(process.env.NEXT_PUBLIC_USD_NGN_RATE) || 1600;
  }
  // Server-side: should use getFxRate() instead
  return getFallbackRate();
}

// ─────────────────────────────────────────────────────────────────────────
// Clear cache (for testing or manual refresh)
// ─────────────────────────────────────────────────────────────────────────
export function clearFxRateCache(): void {
  cachedRate = null;
  cacheTimestamp = null;
}
