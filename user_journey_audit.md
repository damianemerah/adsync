# Tenzu — User Journey Code Inspection Report

> **Date:** 2026-03-22  
> **Scope:** Signup → Onboarding → Free Trial → Connect Account → Create Campaign → Creatives → Launch  
> Including all cron jobs, edge functions, and Supabase RPC/function calls.

---

## Stage 1 — Signup ([actions/auth.ts](file:///home/chisom/projects/adsync/src/actions/auth.ts))

### What happens:
1. `signupSchema` validates email, password, `full_name` via Zod
2. `supabase.auth.signUp()` creates the `auth.users` record
3. User is redirected to `/verify-email`
4. On email verification, Supabase redirects to `emailRedirectTo`

### 🔴 DISCREPANCY #1 — Hardcoded `localhost` in `emailRedirectTo`

```ts
// auth.ts line 79, 97
emailRedirectTo: "http://localhost:3000/onboarding",
```

**Impact:** In production, email verification links point to `localhost:3000`. Real users clicking the confirmation email will land on their own machine (which has nothing running), and **never complete signup**.

**Fix:** Use env var:
```ts
emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
```

---

## Stage 2 — Onboarding ([actions/organization.ts](file:///home/chisom/projects/adsync/src/actions/organization.ts))

### What happens:
1. User fills business profile form (name, industry, selling method, price tier, customer gender, description)
2. [createOrganization(formData, { isOnboarding: true })](file:///home/chisom/projects/adsync/src/actions/organization.ts#127-379) is called
3. On first run: inserts `organizations` row with `subscription_tier: 'growth'`, `subscription_status: 'trialing'`
4. Inserts `organization_members` row as `owner`
5. Sets `subscription_expires_at` = 14 days from now
6. Stamps `trial_expires_at` on `auth.users.user_metadata`
7. Sets active-org cookie
8. Calls [grantFreeTrialCredits(userId, orgId)](file:///home/chisom/projects/adsync/src/actions/paystack.ts#163-197)

### ✅ Organization insert is solid. RLS is respected via server client.

### 🔴 DISCREPANCY #2 — Trial field name mismatch (`trial_ends_at` vs `subscription_expires_at`)

The `organizations` table has **one** field for trial expiry: **`subscription_expires_at`**.

| Location | Field used |
|---|---|
| [createOrganization()](file:///home/chisom/projects/adsync/src/actions/organization.ts#127-379) — sets trial | `subscription_expires_at` ✅ |
| [launchCampaign()](file:///home/chisom/projects/adsync/src/actions/campaigns.ts#70-683) — checks expiry | `subscription_expires_at` ✅ |
| `subscription-lifecycle` edge fn — queries expired trials | **`trial_ends_at`** ❌ |

```sql
-- subscription-lifecycle/index.ts line 86
.lte("trial_ends_at", nowIso)  -- ❌ This column does NOT exist in the DB
```

**Impact:** The nightly cron that is supposed to flip `trialing → expired` **never works**. Trial users never get blocked even after 14 days.

**Fix:** Change to:
```ts
.lte("subscription_expires_at", nowIso)
```

---

## Stage 3 — Free Trial Grant ([actions/paystack.ts](file:///home/chisom/projects/adsync/src/actions/paystack.ts) → [grantFreeTrialCredits](file:///home/chisom/projects/adsync/src/actions/paystack.ts#163-197))

### What happens:
1. Calls `supabase.rpc("add_credits", { p_user_id, p_credits: 50, p_reason: "free_trial", p_org_id })`
2. Inserts a `₦0` transaction record into `transactions`

### 🔴 DISCREPANCY #3 — Wrong `type` value in `transactions` insert

```ts
// paystack.ts line 191
type: "subscription",  // ❌
```

The `transactions.type` column has a DB `CHECK` constraint:
```
type = ANY (ARRAY['subscription_payment', 'addon_purchase', 'refund', 'credit_pack_purchase'])
```

`"subscription"` is **not in the enum**. This insert **will fail with a DB constraint violation**, silently logged but non-fatal (the `if (error) console.error` block).

**Fix:** Change to:
```ts
type: "subscription_payment",
```

---

## Stage 4 — Connect Ad Account

### What happens (Meta OAuth):
- **No dedicated OAuth route was found in `src/app`**. The Meta connect flow likely lives in an API route or is handled inline in a page.
- `ad-accounts.ts` has `disconnectAdAccount()`, `updateAdAccountCapi()`, `setAsDefaultAccount()` — but **no `connectAdAccount()` / OAuth callback handler found in actions**.
- The OAuth callback must exist somewhere (page route or API route) that writes to `ad_accounts` with encrypted `access_token`.

### 🟡 DISCREPANCY #4 — No `connectAdAccount` server action in `actions/ad-accounts.ts`

The disconnect/CAPI actions are there, but the initial **connect action is missing from the file**. This means connect logic is either embedded in a page or an API route. This is an **architectural gap** — the connect flow should be a server action or API route for consistency and auditability.

### DB Note:
- `ad_accounts.health_status` check: `ANY (ARRAY['healthy', 'payment_issue', 'token_expired', 'disabled'])` 
- The `account-health` edge function also writes `health_status: "paused_by_system"` ⬇️

### 🔴 DISCREPANCY #5 — `paused_by_system` is not a valid `health_status` enum value

```ts
// account-health/index.ts line 282
health_status: "paused_by_system",  // ❌ Not in DB CHECK constraint
```

The DB only allows: `healthy | payment_issue | token_expired | disabled`.

**Impact:** Every time the account-health cron tries to auto-pause a low-balance account, the `UPDATE` **fails with a DB constraint violation**. The campaigns are not paused, and the `paused_by_system` flag never gets set.

**Fix (migration required):**
```sql
ALTER TABLE ad_accounts DROP CONSTRAINT ad_accounts_health_status_check;
ALTER TABLE ad_accounts ADD CONSTRAINT ad_accounts_health_status_check
  CHECK (health_status = ANY (ARRAY[
    'healthy', 'payment_issue', 'token_expired', 'disabled', 'paused_by_system'
  ]));
```

---

## Stage 5 — Create Campaign (Wizard)

### What happens:
1. User fills the wizard (name, objective, budget, targeting, creatives, ad copy, destination)
2. Draft state saved to `targeting_profiles` or localStorage
3. `launchCampaign(config)` called on submit

### Subscription gate in `launchCampaign`:
- Checks `subscription_status === 'active' || 'trialing'`
- Checks `subscription_expires_at < now()` for trialing users

### 🟡 DISCREPANCY #6 — `campaigns.objective` DB enum missing values

The `campaigns.objective` column check constraint allows:
```
'whatsapp', 'traffic', 'awareness', 'engagement', 'video_views', 'messages'
```

But `launchCampaign` supports objectives like `sales`, `leads`, and `app_promotion` exist in other parts of the code (lead-form actions, `AdSyncObjective` constants). If any of these are passed, the DB `INSERT` will fail.

**Needs verified:** Check `AdSyncObjective` type in constants for full list, then expand the DB constraint.

### ✅ Subscription gating is correct
### ✅ Budget is correctly converted to cents
### ✅ Attribution link wraps WhatsApp/website URLs before Meta submission
### ✅ Attribution skipped in `localhost` dev to prevent Meta rejection
### ✅ AI context saved to `campaigns.ai_context` post-launch (non-blocking)

---

## Stage 6 — Creatives (Upload & AI Generation)

### Upload:
- `creatives.ts` only has `deleteCreatives()` — this removes DB rows and storage files correctly.
- The actual **upload/insert** server action is handled elsewhere (likely `ai-images.ts` which is the main creative generation action).

### `ai-images.ts` (340KB file — largest action):
- Handles Fal.ai image generation, OpenAI copy generation
- Calls `supabase.rpc("deduct_credits", ...)` or similar for credit gating
- Stores result in `creatives` table

### 🟡 DISCREPANCY #7 — No explicit save action for manually uploaded creatives

The `creatives.ts` action only has a `deleteCreatives()` function. There is no `saveCreative()` or `uploadCreative()` server action that inserts a row into `creatives`. Upload is handled directly in the browser (client-side Supabase storage upload), then likely a direct client call to insert the DB row — which bypasses server-side org ownership validation.

**Risk:** A user could insert a `creative` row referencing another org's `organization_id` if RLS is not tight enough. The migration `20260320192200_fix_creatives_rls_update_policy.sql` suggests this was recently patched but worth confirming RLS covers INSERT too.

---

## Stage 7 — Launch Campaign (`actions/campaigns.ts`)

### Meta API chain (1:1:1):
1. `MetaService.createCampaign()` → Campaign container
2. `MetaService.createAdSet()` → Budget + targeting
3. `MetaService.createAdImage()` → Upload binary image
4. `MetaService.createAd()` → Ad creative + destination URL

### ✅ Correct steps, correct attribution wrapping
### ✅ `_attributionLinkId` backfill is fire-and-forget (non-blocking)
### ✅ Meta error code `1359188` (no payment method) triggers notification + marks `payment_issue`
### ✅ Policy guard called via `validatePreLaunch()` and `validateDestinationUrl()`

### 🟡 DISCREPANCY #8 — `launchCampaign` uses `status: "active"` but Meta creates ads as `PAUSED`

```ts
// campaigns.ts line 498
status: "active",  // Comment says: "created as PAUSED on FB"
```

This is intentional per the comment, but it means the DB says `active` while Meta says `PAUSED`. When `sync-campaign-insights` later reads `status IN ('active', 'paused')`, it syncs both correctly. But the UI shows "Active" when the ad is actually pending review on Meta. **Consider using `pending` or `pending_review` status until first sync.**

### 🔴 DISCREPANCY #9 — `post-launch-rules` uses wrong `notifications` column name

```ts
// post-launch-rules/index.ts line 169
read: false,   // ❌ Column is `is_read` in the DB
```

The `notifications` table schema confirms the column is `is_read boolean DEFAULT false`. Other edge functions (`refresh-meta-tokens`, `account-health`) correctly use `is_read: false`. Only `post-launch-rules` uses the wrong column name.

**Impact:** Every notification inserted by `post-launch-rules` (low CTR, high CPC, ad fatigue, waste detection) **fails silently** — no notification is ever shown.

**Fix in `post-launch-rules/index.ts`:**
```ts
// line 169
is_read: false,  // ✅ fix
```

---

## Cron Jobs & Edge Functions Summary

| Function | Schedule | Trigger | Status |
|---|---|---|---|
| `sync-campaign-insights` | Every 6h | pg_cron → pg_net → edge fn | ⚠️ Inlines AES decrypt (not DRY), but functional |
| `subscription-lifecycle` | Daily 22:00 UTC | pg_cron → pg_net → edge fn | 🔴 Queries `trial_ends_at` (non-existent column) |
| `account-health` | Every 4h | pg_cron → pg_net → edge fn | 🔴 Sets `health_status: 'paused_by_system'` (invalid enum) |
| `post-launch-rules` | Every 12h | pg_cron → pg_net → edge fn | 🔴 Uses `read` instead of `is_read` in notifications |
| `refresh-meta-tokens` | Daily 3:00 AM UTC | pg_cron → pg_net → edge fn | ✅ Correct AES-GCM, 50-day staleness threshold |
| `weekly-report` | Weekly | pg_cron → pg_net → edge fn | Not fully audited |

### Cron Setup:
- All crons use `service_role_key` from **Supabase Vault** ✅ (secure)
- Authorization header uses `Bearer <vault_secret>` — this is the service role key, not an anon key ✅
- pg_net fires HTTP POST to the edge function URL ✅

---

## Verify Payment / Paystack Webhook

### `verify-payment.ts` (`verifyAndActivate`):
- Uses **service-role client** (bypasses RLS) — ✅ correct for fallback activation
- Checks if webhook already processed (idempotent via `provider_reference` lookup) ✅
- Updates `subscription_status: 'active'`, sets `subscription_expires_at` ✅
- Calls `add_credits` RPC ✅

### 🟡 DISCREPANCY #10 — Webhook vs Callback race condition not fully safe

`verifyAndActivate` returns `{ success: true, alreadyProcessed: false }` if there's no `org_id` in Paystack metadata, but does NOT set subscription to active in that case. The function returns success but the user is NOT activated. The UI must not show "payment successful" in this scenario, but since the function returns `success: true`, the UI client may behave incorrectly.

---

## Supabase RPC Calls

| RPC | Called from | Purpose | Status |
|---|---|---|---|
| `add_credits` | `paystack.ts`, `verify-payment.ts`, `subscription-lifecycle` edge fn | Atomic credit grant | ✅ |
| `deduct_credits` | `ai-images.ts` (assumed) | Atomic credit deduction for AI | Not directly verified in this audit |
| Direct table writes | Most actions | All use server client (respects RLS) | ✅ |

---

## Missing: Connect Ad Account OAuth Flow

No `/api/meta/callback` or equivalent route was found in `src/app`. The Meta OAuth flow must exist somewhere. **This should be audited separately** to verify:
1. Token is AES-encrypted before storing
2. `organization_id` is correctly attached from the active org cookie
3. `health_status` defaults to `healthy`
4. `token_refreshed_at` is NOT set on initial connect (so the 50-day refresh cron will immediately pick it up)

---

## Prioritized Fix List

| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | 🔴 Critical | `emailRedirectTo` hardcoded to `localhost` | Use `NEXT_PUBLIC_APP_URL` env var |
| 2 | 🔴 Critical | `trial_ends_at` field doesn't exist — trials never expire | Change to `subscription_expires_at` in `subscription-lifecycle` |
| 3 | 🔴 Critical | `post-launch-rules` uses `read:` vs `is_read:` — all post-launch notifications silently fail | Fix column name |
| 4 | 🔴 Critical | `paused_by_system` not in `ad_accounts.health_status` enum — auto-pause never works | Add to DB constraint via migration |
| 5 | 🔴 High | `grantFreeTrialCredits` inserts `type: "subscription"` — violates DB constraint | Change to `"subscription_payment"` |
| 6 | 🟡 Medium | No server-side `saveCreative()` action — creative insert bypasses server validation | Add a `saveCreative` server action |
| 7 | 🟡 Medium | `campaigns.objective` DB enum missing `sales`, `leads`, `app_promotion` | Expand DB constraint via migration |
| 8 | 🟡 Medium | Campaign launched as `status: "active"` while Meta has it `PAUSED` | Use `pending_review` until first insight sync |
| 9 | 🟡 Low | `verifyAndActivate` returns `success: true` even when org_id is missing | Return `{ success: false }` in that case |
| 10 | 🟡 Low | AES decrypt logic is copy-pasted across 3 edge functions | Extract to shared Deno module |
