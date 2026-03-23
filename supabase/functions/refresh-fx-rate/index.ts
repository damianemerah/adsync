import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════════════════
// Edge Function: Refresh FX Rate (USD → NGN)
// ═══════════════════════════════════════════════════════════════════════════
// Fetches latest USD→NGN exchange rate from ExchangeRate-API.com
// Runs daily via pg_cron at 01:00 UTC
// Falls back to static 1,600 if API fails
// ═══════════════════════════════════════════════════════════════════════════

const FALLBACK_RATE = 1600.0;
const EXCHANGERATE_API_BASE = "https://open.er-api.com/v6/latest/USD";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log("🔄 Fetching latest USD→NGN exchange rate...");

    // ─────────────────────────────────────────────────────────────────────
    // Fetch rate from ExchangeRate-API.com (Free tier, no key required)
    // ─────────────────────────────────────────────────────────────────────
    let newRate = FALLBACK_RATE;
    let source = "fallback";

    try {
      const response = await fetch(EXCHANGERATE_API_BASE, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.result === "success" && data.rates?.NGN) {
        newRate = parseFloat(data.rates.NGN);
        source = "exchangerate-api";
        console.log(`✅ Fetched rate: 1 USD = ${newRate} NGN`);
      } else {
        throw new Error("Invalid API response structure");
      }
    } catch (apiError) {
      console.error("⚠️ ExchangeRate-API fetch failed:", apiError);
      console.log(`Using fallback rate: ${FALLBACK_RATE}`);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Check if rate has changed significantly (>0.5% change)
    // ─────────────────────────────────────────────────────────────────────
    const { data: currentRate } = await supabase
      .from("fx_rates")
      .select("rate_ngn_per_usd")
      .eq("is_active", true)
      .single();

    if (currentRate) {
      const percentChange = Math.abs(
        ((newRate - currentRate.rate_ngn_per_usd) /
          currentRate.rate_ngn_per_usd) *
          100,
      );

      console.log(
        `Current: ${currentRate.rate_ngn_per_usd}, New: ${newRate}, Change: ${percentChange.toFixed(2)}%`,
      );

      // Skip update if change is negligible (<0.5%)
      if (percentChange < 0.5) {
        console.log("✓ Rate change negligible, skipping update");
        return new Response(
          JSON.stringify({
            success: true,
            message: "Rate unchanged (negligible change)",
            currentRate: currentRate.rate_ngn_per_usd,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Update FX rate using atomic function
    // ─────────────────────────────────────────────────────────────────────
    const { data: rateId, error: updateError } = await supabase.rpc(
      "update_fx_rate",
      {
        p_rate: newRate,
        p_source: source,
      },
    );

    if (updateError) {
      throw new Error(`Failed to update rate: ${updateError.message}`);
    }

    console.log(`✅ FX rate updated successfully (ID: ${rateId})`);

    return new Response(
      JSON.stringify({
        success: true,
        rateId,
        rate: newRate,
        source,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Error refreshing FX rate:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
