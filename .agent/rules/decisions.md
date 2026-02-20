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
Reason: Produces clean `sellam.app/l/token` URLs that go inside Meta ads.
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

### [Feb 2026] Paystack usage

Decision: Paystack for all Naira collection — subscriptions AND ad budget top-ups
Reason: Already integrated, SMEs trust it, works natively in Nigeria

### [Feb 2026] Virtual card provider

Decision: Grey or Geegpay for virtual USD card provisioning per org
Reason: Both have API card issuance. Confirm programmatic card-per-user limits before Phase 2A.

### [Feb 2026] Ad budget model

Decision: Prepaid only — no credit, no post-billing
Reason: Eliminates refund risk and dispute risk entirely.
SME pays Adsync first → card is loaded → Meta charges the card.

### [Feb 2026] Meta card isolation

Decision: Each org gets their OWN virtual card attached to their OWN Meta ad account
Reason: Isolates ban risk. One org's policy violation cannot affect other orgs.
Sellam's infrastructure is never the payment method Meta sees.

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
Reason: Agency incentives (client dependency) are opposed to Sellam's value prop (SME ownership).

### [Feb 2026] "Mark as Sold" scope

Decision: Single button + amount input. No pipeline stages, no CRM.
Reason: CRM competes with WhatsApp's native features and adds onboarding complexity.

### [Feb 2026] Pixel for website owners

Decision: Optional — shown after campaign launch for website destination campaigns.
Never a gate or requirement to use Sellam.
Reason: 56% of users have no website. Pixel cannot be a blocker.

### [Feb 2026] FX rate

Decision: Read from `NEXT_PUBLIC_USD_NGN_RATE` env var, default 1600
Reason: Rate changes — hardcoding is technical debt. Phase 2A replaces this with
actual Naira billing so the FX calculation becomes irrelevant.
