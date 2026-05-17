# Decisions Log — Settled, Do Not Revisit

## Architecture

### [Feb 2026] Attribution token length

Decision: 8 characters via nanoid
Reason: Short enough for clean URLs, collision probability negligible at our scale

### [Feb 2026] Attribution redirect status code

Decision: 302 (temporary) not 301 (permanent)
Reason: Campaign destinations can change mid-flight. 301 causes browser caching
that would break destination updates.

### [Feb 2026] Click recording pattern

Decision: Fire-and-forget with .then() — never await
Reason: The redirect must be imperceptible to end users (<50ms).
Analytics must never block the user experience.

### [Feb 2026] Pixel implementation

Decision: 1x1 transparent GIF endpoint, not JS fetch
Reason: Works on all Nigerian website builders (Wix, WordPress, Paystack Storefront)
without CORS issues. No framework dependency.

### [Feb 2026] Attribution link placement

Decision: `src/app/l/[token]/route.ts` — not under `/api/`
Reason: Produces clean `tenzu.africa/l/token` URLs that go inside Meta ads.
`/api/` in the URL is an implementation detail that users and Meta both see.
In Next.js App Router, route.ts files are valid anywhere in the app directory.

### [Feb 2026] Attribution fallback

Decision: If attribution link creation fails at launch → fall back to raw destination URL
Reason: Never block a campaign launch for an analytics side-effect.
The ad running is more important than perfect tracking.

### [Feb 2026] Multi-destination attribution

Decision: ALL destination types (WhatsApp AND website) wrapped in attribution links
Reason: Unified architecture for all Nigerian SME segments.
Never send raw wa.me or raw https:// URLs to Meta directly.

### [Feb 2026] destination_type enum

Decision: TEXT column `destination_type` with values `'whatsapp'` | `'website'`
Reason: TEXT enum in Postgres — no CREATE TYPE overhead. Two values today,
extensible if new destination types are added later.

### [Feb 2026] Per-destination click counters

Decision: Campaigns table has `whatsapp_clicks`, `website_clicks`, `total_link_clicks` — three counters
Reason: `increment_campaign_clicks(p_campaign_id, p_destination_type)` branches on
destination_type to increment the right counter + total. Avoids subqueries.

### [Feb 2026] Event tracking in link_clicks

Decision: Add `event_type` ('click' | 'purchase') and `event_value_ngn` columns to `link_clicks`
Reason: The pixel endpoint records purchase events with a sale amount in the same table
as click events. Avoids a separate events table at this scale.

### [Feb 2026] Pixel token namespace

Decision: 12-char nanoid for pixel tokens, separate from 8-char attribution tokens
Reason: Both live in `attribution_links` but serve different purposes.
Longer pixel token reduces collision risk for a longer-lived credential.
Pixel token is embedded in a JS snippet on the SME's website and stays active indefinitely.

## Payments

### [May 2026] Subscription & Credits Are Per-User, Not Per-Org

Decision: A user has ONE active subscription and ONE credit balance shared across all their organizations. There is no per-org billing, per-org credit pool, or per-org subscription tier.
Reason: Tenzu bills the person, not the business entity. A Nigerian SME owner running two brands should not pay twice or manage separate credit pools.
Implementation impact:
- `subscription_status`, `subscription_tier`, and credit balance are stored/checked at the user level, never per org.
- Gate checks (e.g. `subscription_status === 'active'`, credit deduction) must look up the user's subscription — not the org record.
- The `organizations` table does NOT have `subscription_status` or `subscription_tier` columns; do not select or reference them.
- When displaying the plan badge or credit count, source from the user's subscription record (via `useSubscription()`), not from org fields.

### [May 2026] Ad Spend Model

Decision: Direct payment to Meta only — Tenzu does not manage ad spend funds.
Reason: SMEs use Meta's native Naira payment options (Card, Bank Transfer).
Eliminates the complexity and risk of managing virtual cards or Naira wallets.
SMEs pay for Tenzu's platform access via Paystack subscription.

### [Feb 2026] Paystack usage

Decision: Paystack for all Naira collection for Tenzu platform subscriptions.
Reason: Already integrated, SMEs trust it, works natively in Nigeria.

### [Feb 2026] Ad budget wallet (DEPRECATED)

Decision: The proposed Naira wallet and virtual USD card system (Phase 2A) has been dropped.
Reason: Meta now supports multiple native payment methods for Nigerian advertisers.
Direct payment is more reliable and reduces Tenzu's financial overhead.


## Database

### [Feb 2026] Monetary values

Decision: INTEGER in kobo (×100) for all new NGN columns except whatsapp_sales.amount_ngn
Reason: Consistent with existing schema (spend_cents pattern).
Exception: whatsapp_sales uses whole Naira because users type it directly.

### [Feb 2026] Org AI context storage

Decision: Extend `organizations` table with new columns — not a separate table
Reason: Org profile is 1:1 with organizations. Separate table adds unnecessary joins.

### [Feb 2026] CampaignContext extension

Decision: Add `org?: OrgProfile` as optional Layer 1 to existing CampaignContext interface
Reason: Backward compatible — existing code that passes CampaignContext without org still works.
Do NOT replace the existing interface — extend it.

## Product

### [Feb 2026] TikTok

Decision: Deferred. Remove from UI. Already gated in backend (campaigns.ts returns error).
Reason: Nigerian SMEs advertise on Facebook/Instagram. TikTok splits roadmap focus.

### [Feb 2026] Team/agency dashboard

Decision: Not in Phase 1
Reason: Agency incentives (client dependency) are opposed to Tenzu's value prop (SME ownership).

### [Feb 2026] "Mark as Sold" scope

Decision: Single button + amount input. No pipeline stages, no CRM.
Reason: CRM competes with WhatsApp's native features and adds onboarding complexity.

### [Feb 2026] Pixel for website owners

Decision: Optional — shown after campaign launch for website destination campaigns.
Never a gate or requirement to use Tenzu.
Reason: 56% of users have no website. Pixel cannot be a blocker.

### [May 2026] All Features Accessible to All Tiers

Decision: All three subscription tiers (Starter, Growth, Agency) get identical AI features and platform capabilities. The only difference between tiers is the monthly credit quota (50 / 150 / 250 credits).
Reason: Simplifies positioning for Nigerian SMEs who don't understand feature matrices. Credit quota is a tangible, understandable limit. Feature gates caused confusion and support overhead.
Implementation impact:
- `TIER_CONFIG` in `src/lib/constants.ts` has identical `ai` and `limits` values across all tiers (except `adSpendCeilingKobo` and `anomalyBufferKobo`, which drive auto-upgrade logic).
- `useSkills: true` for all tiers. `maxCopyVariations: 5`, `maxRefinementsPerCampaign: Infinity` for all.
- Never add feature gates that check `subscription_tier`. Only check `credits_balance` and `subscription_status`.

### [May 2026] Spend-Based Automatic Tier Upgrade

Decision: The system automatically enforces a minimum (floor) tier based on the SME's 30-day Meta ad spend. Users can upgrade freely but cannot downgrade below the floor.
Thresholds: ≤ ₦100K/mo → Starter floor; ≤ ₦300K/mo → Growth floor; > ₦300K/mo → Agency floor.
Anomaly buffers: ₦20K (Starter), ₦50K (Growth) to prevent one-off spikes from triggering upgrades.
Grace window: 7 days after threshold + buffer is crossed before the tier actually changes.
Reason: Pricing reflects value delivered — higher spenders extract more platform value. Auto-upgrade removes manual friction (SME doesn't need to remember to upgrade). The buffers prevent bad UX from one-time campaigns.
Implementation: `src/lib/tier-resolver.ts` + `src/actions/spend-sync.ts`.

### [May 2026] 7-Day Free Trial Replaces Free Dashboard Model

Decision: The "Connect for Free, Pay to Launch" read-only dashboard model (Feb 2026 decision below) is superseded and was never built. Entry is now a **7-day free trial** with full Growth-tier features (50 credits). After the trial, users select a paid plan.
Reason: The three-friction-layer model (read-only dashboard, date range limits, blurred AI) was complex to build and never shipped. Trial converts better — users experience full product value before paying.
Implementation impact:
- `subscription_status = 'trialing'` for trial users — full access, not read-only.
- `incomplete` status = Meta not yet connected; trial hasn't started.
- `expired` = trial ended without payment, or subscription lapsed → full paywall (not read-only).
- There is no perpetual free tier or read-only state. See `skills/growth-strategy/SKILL.md`.

### [Feb 2026] Free Dashboard — "Connect for Free, Pay to Launch" ~~SUPERSEDED by May 2026 decision above~~

~~Decision: Users connect their Meta Ad Account for free and get a read-only dashboard
of their existing campaigns. Paid actions (create, edit, pause, AI) require a subscription.
Three friction layers: Time Machine Block (date range limit), Panic Button Block (action gating),
Blurred Consultant (blurred AI insights).~~
This model was never implemented and has been replaced by the 7-day trial approach.

### [May 2026] "Incomplete" vs. "Expired" distinction

Decision: `incomplete` is the state before Meta is connected (trial not started). `expired` is the lapsed state (trial ended without payment, or subscription cancelled/lapsed).
`incomplete` users need onboarding completion (connect Meta). `expired` users need a reactivation nudge.
Reason: Different emotional states require different UX. Never show `incomplete` users a reactivation CTA — they haven't experienced the product yet.

### [Feb 2026] FX rate & spend_cents interpretation

Decision: Read from `NEXT_PUBLIC_USD_NGN_RATE` env var, default 1600.
`spend_cents` from Meta API is **local-currency minor units** for the ad account's billing
currency — it is NOT NGN-converted kobo. For NGN accounts the correct formula is:
`spendNgn = spend_cents / 100` (no FX_RATE multiplication). `FX_RATE` is intentionally
NOT applied to spend today because all accounts are NGN, which is 1:1 by definition.

Reason: A prior implementation incorrectly multiplied `spend_cents` by `FX_RATE` (1600),
which produced wildly inflated ROI figures. The env var is retained for future 
multi-currency support. Direct native payment makes the manual FX calculation 
irrelevant for current ad spend reporting, but the env var stays for estimation purposes.

**Multi-currency expansion path (when non-NGN ad accounts are added):**

1. Add `currency` to the `ad_accounts` join in `use-campaign-roi`.
2. Replace the `FX_RATE` constant with a `FX_RATES: Record<string, number>` map
   (USD → 1600, GHS → 110, KES → 12, ZAR → 85, etc.).
3. Apply: `spendNgn = currency === "NGN" ? spend_cents / 100 : (spend_cents / 100) * getFxRate(currency, "NGN")`.
   Do NOT apply any FX multiplier to NGN accounts.
