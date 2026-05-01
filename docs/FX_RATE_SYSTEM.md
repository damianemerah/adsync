# FX Rate System Documentation

## Overview

The FX Rate system provides **real-time USD→NGN exchange rates** for accurate budget calculations and ROI metrics across the Tenzu platform.

Previously, the system used a static `FX_RATE = 1600` hardcoded in [`src/lib/intelligence/benchmarks.ts`](../src/lib/intelligence/benchmarks.ts). This has been upgraded to a **dynamic, database-backed system** with automatic daily updates.

---

## Architecture

### 1. Database Layer

**Table: `fx_rates`**
- Stores historical exchange rates with audit trail
- Single-row active pattern: only ONE rate has `is_active = true` at any time
- Columns:
  - `rate_ngn_per_usd` (DECIMAL): Exchange rate (e.g., 1377.2100)
  - `source_provider` (TEXT): `'exchangerate-api'` | `'manual'` | `'cbn'`
  - `is_active` (BOOLEAN): Current active rate
  - `fetched_at` (TIMESTAMPTZ): When the rate was fetched

**Helper Functions:**
- `get_current_fx_rate()`: Returns active rate (fallback: 1600)
- `update_fx_rate(p_rate, p_source)`: Atomically deactivates old rate and activates new one

---

### 2. Edge Function (Cron Job)

**Function: `refresh-fx-rate`**
- **Location:** [`supabase/functions/refresh-fx-rate/index.ts`](../supabase/functions/refresh-fx-rate/index.ts)
- **Schedule:** Daily at 01:00 UTC (via `pg_cron`)
- **API:** ExchangeRate-API.com (free tier, no key required)
- **Endpoint:** `https://open.er-api.com/v6/latest/USD`
- **Logic:**
  1. Fetch USD→NGN rate from API
  2. Check if rate changed >0.5% (skip negligible updates)
  3. Call `update_fx_rate()` to activate new rate
  4. Fallback to 1600 if API fails

**Cron Schedule:**
```sql
-- supabase/migrations/20260325000001_fx_rate_cron.sql
SELECT cron.schedule('refresh-fx-rate', '0 1 * * *', ...);
```

---

### 3. Application Layer

**Server-side (Dynamic):**
```ts
import { getFxRate } from "@/lib/fx-rate";

const fxRate = await getFxRate(); // Fetches from DB, cached for 1 hour
const usdAmount = ngnAmount / fxRate;
```

**Client-side (Static):**
```ts
import { getStaticFxRate } from "@/lib/fx-rate";

const fxRate = getStaticFxRate(); // Uses NEXT_PUBLIC_USD_NGN_RATE env var
```

**Legacy (Deprecated):**
```ts
import { FX_RATE } from "@/lib/intelligence";
// Still works, but static (1600 or NEXT_PUBLIC_USD_NGN_RATE)
```

---

## File Inventory

### New Files
| File | Purpose |
|------|---------|
| [`supabase/migrations/20260325000000_fx_rates_table.sql`](../supabase/migrations/20260325000000_fx_rates_table.sql) | Creates `fx_rates` table + helper functions |
| [`supabase/migrations/20260325000001_fx_rate_cron.sql`](../supabase/migrations/20260325000001_fx_rate_cron.sql) | Schedules daily cron job |
| [`supabase/functions/refresh-fx-rate/index.ts`](../supabase/functions/refresh-fx-rate/index.ts) | Edge function to fetch & update rate |
| [`src/lib/fx-rate.ts`](../src/lib/fx-rate.ts) | Server/client helpers with caching |
| [`docs/FX_RATE_SYSTEM.md`](FX_RATE_SYSTEM.md) | This file |

### Updated Files
| File | Change |
|------|--------|
| [`src/lib/intelligence/benchmarks.ts:16`](../src/lib/intelligence/benchmarks.ts#L16) | Re-exports `getFxRate()` + `getStaticFxRate()` |
| [`supabase/functions/post-launch-rules/index.ts:195`](../supabase/functions/post-launch-rules/index.ts#L195) | Fetches dynamic FX rate from DB on startup |
| [`src/hooks/use-campaign-roi.ts`](../src/hooks/use-campaign-roi.ts) | Removed unused `FX_RATE` import |

### Client-side Files (Still Use Static FX_RATE)
These files **cannot** be made async (client components/hooks), so they continue using the static `FX_RATE`:
- [`src/lib/intelligence/roas-predictor.ts:64`](../src/lib/intelligence/roas-predictor.ts#L64)
- [`src/lib/intelligence/estimator.ts:63`](../src/lib/intelligence/estimator.ts#L63)
- [`src/lib/intelligence/post-launch-rules.ts:86`](../src/lib/intelligence/post-launch-rules.ts#L86)
- [`src/hooks/use-org-roi.ts:52`](../src/hooks/use-org-roi.ts#L52)

**Why?** These are called from React client components (e.g., `budget-launch-step.tsx`). The static rate is "good enough" for UI estimates.

---

## Usage Patterns

// src/actions/campaigns.ts
import { getFxRate } from "@/lib/fx-rate";

export async function estimateRoi(ngnBudget: number) {
  const fxRate = await getFxRate(); // ✅ Dynamic, cached
  const usdEquivalent = ngnBudget / fxRate;
  // ... predict ROAS based on USD benchmarks
}

### Pattern 2: Edge Functions (Background Jobs)
```ts
// supabase/functions/*/index.ts
const supabase = createClient(...);

// Fetch rate at function startup
const { data } = await supabase
  .from("fx_rates")
  .select("rate_ngn_per_usd")
  .eq("is_active", true)
  .single();

const FX_RATE = data?.rate_ngn_per_usd || 1600;
```

### Pattern 3: Client Components (Static Fallback)
```ts
// Client component
import { FX_RATE } from "@/lib/intelligence";

// Use static rate for UI estimates (non-critical)
const estimatedUsd = budget / FX_RATE;
```

---

## Caching Strategy

**Server-side cache (in-memory):**
- TTL: 1 hour
- Reduces DB queries from thousands/hour to 1/hour
- Cleared on server restart (Next.js dev mode)

**Why 1 hour?**
- FX rates update daily (01:00 UTC)
- 1-hour cache is fresh enough for budget calculations
- Balances accuracy vs. performance

---

## Fallback Strategy

| Level | Fallback | Trigger |
|-------|----------|---------|
| **1. Database** | Query `fx_rates` table | Primary source |
| **2. Env Var** | `NEXT_PUBLIC_USD_NGN_RATE` | DB query fails |
| **3. Hardcoded** | `1600` | Env var missing |

**Result:** System NEVER fails. Even if API is down and DB is empty, calculations use 1600 (reasonable for Nigeria).

---

## API Provider: ExchangeRate-API.com

**Endpoint:** `https://open.er-api.com/v6/latest/USD`

**Response:**
```json
{
  "result": "success",
  "time_last_update_unix": 1711324800,
  "time_next_update_unix": 1711411200,
  "base_code": "USD",
  "rates": {
    "NGN": 1377.21,
    ...
  }
}
```

**Rate Limits:**
- Free tier: 1,500 requests/month
- We use: ~30 requests/month (1/day)
- **No API key required** for free tier

**Why ExchangeRate-API?**
- ✅ Reliable (same data source as xe.com)
- ✅ Free tier sufficient (we need <50 requests/month)
- ✅ No auth required (simplifies setup)
- ✅ Accurate Nigerian forex data
- ❌ CBN official API: Not publicly available

**Alternative (if needed):**
- currencyapi.com (100 requests/month free, requires key)
- fixer.io (100 requests/month free, requires key)

---

## Monitoring & Debugging

### Check Current Rate
```sql
SELECT rate_ngn_per_usd, source_provider, fetched_at
FROM fx_rates
WHERE is_active = true;
```

### View Rate History
```sql
SELECT rate_ngn_per_usd, source_provider, fetched_at
FROM fx_rates
ORDER BY fetched_at DESC
LIMIT 10;
```

### Check Cron Job Status
```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'refresh-fx-rate';
```

### Manual Update (Emergency)
```sql
SELECT update_fx_rate(1380.0000, 'manual');
```

### Clear Server Cache (Next.js)
```ts
import { clearFxRateCache } from "@/lib/fx-rate";
clearFxRateCache(); // Forces fresh DB fetch
```

---

## Deployment Checklist

- [x] Apply migration: `20260325000000_fx_rates_table.sql`
- [x] Apply migration: `20260325000001_fx_rate_cron.sql`
- [x] Deploy edge function: `refresh-fx-rate`
- [x] Verify cron schedule: `SELECT * FROM cron.job WHERE jobname = 'refresh-fx-rate';`
- [x] Seed initial rate: `INSERT INTO fx_rates (...) VALUES (1377.21, 'manual', true, NOW());`
- [x] Test API fetch: `curl https://open.er-api.com/v6/latest/USD`
- [x] Test server helper: `const rate = await getFxRate(); console.log(rate);`
- [x] Monitor logs: Check edge function logs for "✅ FX rate updated successfully"

---

## Future Enhancements

1. **Admin UI:** Allow manual rate override from dashboard
2. **Rate change notifications:** Alert users when rate changes >5%
3. **Multi-currency:** Extend to support other base currencies (EUR, GBP)
4. **Webhook integration:** Real-time rate updates via webhook (if provider supports)
5. **Rate history chart:** Visualize NGN/USD trend over time

---

## Related Files

- [Naira Payments Skill](.agent/skills/naira-payments/SKILL.md)
- [FX Rate Utility](../src/lib/utils/fx-rate.ts)
- [Active Org Pattern](../CLAUDE.md#active-organization-pattern)
