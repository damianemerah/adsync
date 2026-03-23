/**
 * Test script for FX Rate system
 *
 * Tests:
 * 1. Database query for current FX rate
 * 2. Server helper (getFxRate) with caching
 * 3. Static helper (getStaticFxRate) for client-side
 *
 * Run: npx tsx scripts/test-fx-rate.ts
 */

import { getFxRate, getStaticFxRate, clearFxRateCache } from "../src/lib/fx-rate";

async function testFxRateSystem() {
  console.log("🧪 Testing FX Rate System\n");

  // Test 1: Server-side dynamic rate (first call)
  console.log("1️⃣ Testing getFxRate() (first call - DB fetch)...");
  const start1 = Date.now();
  const rate1 = await getFxRate();
  const elapsed1 = Date.now() - start1;
  console.log(`   ✅ Rate: ${rate1} NGN/USD (took ${elapsed1}ms)`);

  // Test 2: Server-side dynamic rate (second call - cached)
  console.log("\n2️⃣ Testing getFxRate() (second call - should be cached)...");
  const start2 = Date.now();
  const rate2 = await getFxRate();
  const elapsed2 = Date.now() - start2;
  console.log(`   ✅ Rate: ${rate2} NGN/USD (took ${elapsed2}ms)`);
  console.log(`   ${elapsed2 < 10 ? "✅ Cached!" : "⚠️ Not cached (should be <10ms)"}`);

  // Test 3: Clear cache and fetch again
  console.log("\n3️⃣ Testing cache clear + re-fetch...");
  clearFxRateCache();
  const start3 = Date.now();
  const rate3 = await getFxRate();
  const elapsed3 = Date.now() - start3;
  console.log(`   ✅ Rate: ${rate3} NGN/USD (took ${elapsed3}ms)`);

  // Test 4: Client-side static rate
  console.log("\n4️⃣ Testing getStaticFxRate() (env var fallback)...");
  const staticRate = getStaticFxRate();
  console.log(`   ✅ Static rate: ${staticRate} NGN/USD`);

  // Test 5: Verify consistency
  console.log("\n5️⃣ Verifying rate consistency...");
  if (rate1 === rate2 && rate2 === rate3) {
    console.log("   ✅ All dynamic rates match");
  } else {
    console.log("   ⚠️ Rate mismatch detected");
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Summary:");
  console.log(`   • Dynamic rate (DB): ${rate1} NGN/USD`);
  console.log(`   • Static rate (env): ${staticRate} NGN/USD`);
  console.log(`   • Cache performance: ${elapsed1}ms → ${elapsed2}ms (${Math.round((1 - elapsed2 / elapsed1) * 100)}% faster)`);
  console.log("=".repeat(60));
}

testFxRateSystem().catch(console.error);
