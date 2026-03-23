---
name: attribution
description: Manages Tenzu's smart link attribution system and Meta Conversions API (CAPI) offline conversion integration. Use when working on `/l/[token]` redirect route, `/api/pixel` endpoint, `attribution_links` or `link_clicks` tables, `generateAttributionToken`, `buildAttributionUrl`, WhatsApp/website click counters on campaigns, ROI dashboard, `useCampaignROI` hook, Mark as Sold, `whatsapp_sales` table, `fbclid` capture, `updateAdAccountCapi`, CAPI event firing, Meta Pixel ID, or CAPI access token settings.
---

# Attribution Layer Skill

## When to Load

Load this skill when working on:

- `src/app/l/[token]/route.ts` — the redirect route
- `src/app/api/pixel/route.ts` — the pixel endpoint for website owners
- `src/actions/campaigns.ts` — destination URL wrapping section
- `src/lib/attribution.ts` — token generation utilities
- `attribution_links` or `link_clicks` tables
- Any `whatsapp_clicks`, `website_clicks`, `total_link_clicks` tracking
- ROI dashboard, Mark as Sold, `whatsapp_sales` table
- `src/actions/sales.ts`
- `src/hooks/use-campaign-roi.ts`
- `src/components/campaigns/roi-metrics-card.tsx`
- `src/components/campaigns/mark-as-sold-button.tsx`
- `src/actions/ad-accounts.ts` — `updateAdAccountCapi()` action (CAPI credential management)
- `src/app/(authenticated)/(main)/settings/business-tab.tsx` — `CapiConfigPanel` component
- `src/lib/api/meta.ts` — `MetaService.sendCAPIEvent()` method
- `link_clicks.fbclid` — Meta click ID captured at redirect for CAPI matching
- `ad_accounts.meta_pixel_id`, `ad_accounts.capi_access_token` — CAPI credentials (encrypted)

## Implementation Status

| Item                                                                                            | Status      |
| ----------------------------------------------------------------------------------------------- | ----------- |
| `attribution_links` + `link_clicks` tables (with destination_type, pixel_token, event tracking) | ✅ Migrated |
| `/l/[token]` redirect route                                                                     | ✅ Built    |
| `generateAttributionToken()` + `buildAttributionUrl()` + `generatePixelToken()`                 | ✅ Built    |
| WhatsApp URL wrapping in `campaigns.ts`                                                         | ✅ Built    |
| Website URL wrapping in `campaigns.ts` (else branch)                                            | ✅ Built    |
| `/api/pixel` route (1x1 GIF endpoint)                                                           | ✅ Built    |
| Pixel snippet display in campaign detail                                                        | ✅ Built    |
| `whatsapp_sales` table + `recordSale` action                                                    | ✅ Built    |
| Mark as Sold button + ROI metrics card                                                          | ✅ Built    |
| `useCampaignROI` hook                                                                           | ✅ Built    |
| `increment_campaign_clicks` RPC (multi-destination)                                             | ✅ Migrated |
| `update_campaign_sales_summary` RPC                                                             | ✅ Migrated |
| `link_clicks.fbclid` column (capture Meta click IDs at redirect time)                           | ✅ Migrated |
| `ad_accounts.meta_pixel_id` + `capi_access_token` columns                                       | ✅ Migrated |
| `fbclid` capture in `/l/[token]` redirect route                                                  | ✅ Built    |
| `updateAdAccountCapi()` server action + `CapiConfigPanel` settings UI                           | ✅ Built    |
| `MetaService.sendCAPIEvent()` — server-to-server CAPI event helper                              | ✅ Built    |
| `fireCAPIWhatsAppSale()` in `sales.ts` — offline Purchase event after WhatsApp sale             | ✅ Built    |
| `fireCAPIWebsitePurchase()` in `pixel/route.ts` — website Purchase event via CAPI               | ✅ Built    |

## Reference Implementation

Full SQL, code, and file-by-file specs are in:
`.agent/skills/attribution/references/phase-1a-attribution.md` — Phase 1A
`.agent/skills/attribution/references/phase-1b-roi-dashboard.md` — Phase 1B

Read the relevant reference file before writing any code for this feature.

## Architecture Summary

### The Problem

Every ad Tenzu launches currently sends raw URLs to Meta:

- WhatsApp: raw `wa.me/234...` link
- Website: raw `https://...` link
  When someone clicks, Tenzu sees nothing. Zero attribution.

### The Solution

Wrap every destination in a Tenzu smart link: `tenzu.africa/l/[token]`
The token lookup is instant. The redirect is imperceptible. The data is captured.

### Nigerian SME Segments (all served by same architecture)

- WhatsApp-only (~56%): `destination_type = 'whatsapp'`
- Website, no pixel (~30%): `destination_type = 'website'` + optional pixel snippet
- Website with pixel (~10%): attribution link + pixel snippet auto-credits purchases

### Flow

```
Campaign launch
  → generateAttributionToken() → 8-char nanoid
  → insert attribution_links row { token, destination_url, destination_type }
  → finalUrl = tenzu.africa/l/[token]  ← this goes to Meta, not the raw URL
  → after campaign inserted, update attribution_links.campaign_id

User clicks ad
  → hits tenzu.africa/l/[token]
  → route.ts looks up token → gets destination_url + destination_type
  → fire-and-forget: insert link_clicks row + call increment_campaign_clicks RPC
  → 302 redirect to destination_url immediately

Website owner (optional)
  → Tenzu shows pixel snippet in campaign detail after launch
  → SME pastes 4-line script into site <head> once
  → Script calls /api/pixel?t=[pixel_token]&e=purchase&v=15000
  → Auto-credits revenue to campaign — same as "Mark as Sold" but automatic
```

## Key Tables

- `attribution_links`: token, campaign_id, organization_id, destination_url, destination_type, pixel_token
- `link_clicks`: link_id, campaign_id, organization_id, clicked_at, device_type, destination_type, event_type, event_value_ngn, **fbclid** (Meta click ID for CAPI match quality)
- `whatsapp_sales`: campaign_id, organization_id, amount_ngn, note, recorded_by
- `ad_accounts`: ..., **meta_pixel_id** (Meta Pixel / Dataset ID for CAPI), **capi_access_token** (AES-256-CBC encrypted, same helper as OAuth token)

## Campaigns Table Columns Added

```sql
whatsapp_clicks   INTEGER DEFAULT 0  -- destination_type = 'whatsapp'
website_clicks    INTEGER DEFAULT 0  -- destination_type = 'website'
total_link_clicks INTEGER DEFAULT 0  -- all types combined
whatsapp_click_rate NUMERIC(5,2)
last_click_at     TIMESTAMPTZ
sales_count       INTEGER DEFAULT 0
revenue_ngn       INTEGER DEFAULT 0
```

## CAPI Integration (Phase 2)

Meta Conversions API lets Tenzu send conversion signals **server-to-server**, bypassing browser limitations. This is especially important for Nigerian SMEs because most sales happen on WhatsApp (offline), not on a website.

### How It Works

```
User clicks Meta ad → tenzu.africa/l/[token]?fbclid=XXXXX
  → fbclid saved in link_clicks row (fire-and-forget)
  → redirect to WhatsApp/website

[WhatsApp sale] SME taps "Sold! 🎉"
  → recordSale() inserts whatsapp_sales row
  → fireCAPIWhatsAppSale() fires in background:
      - looks up campaign's ad account CAPI credentials
      - fetches most recent fbclid for this campaign (for match quality)
      - POSTs Purchase event to Meta CAPI (action_source: "other")
      - Meta algorithm now knows this click led to a real sale

[Website pixel fire] /api/pixel?t=TOKEN&e=purchase&v=15000
  → auto-credits revenue (same as Mark as Sold)
  → fireCAPIWebsitePurchase() fires in background:
      - same CAPI credential lookup pattern
      - POSTs Purchase event to Meta CAPI (action_source: "website")
```

### CAPI Setup (Settings → Business)

Each Meta ad account row in Settings → Business has a collapsible `CapiConfigPanel`:
- **Meta Pixel ID (Dataset ID):** Found in Meta Events Manager. Required even for WhatsApp-only sellers — just create a pixel, no website needed.
- **CAPI Access Token:** Generated in Meta Events Manager → Settings → Generate access token.

### Why `createAdminClient()` Is Used for CAPI

CAPI credential reads happen inside public routes (`/api/pixel`) and server actions (`sales.ts`) that may not have a user session. The admin client (service role) bypasses RLS to read `ad_accounts.capi_access_token` safely — this is intentional and the only acceptable use of the admin client in this codebase.

### CAPI Event Deduplication

- WhatsApp sales use `whatsapp_sales.id` as the `event_id` deduplication key
- Website pixel fires rely on Meta's default deduplication (no explicit event_id)
- The `fbclid` creates an `fbc` cookie value in the format `fb.1.{click_ts_ms}.{fbclid}` for better match quality

## Critical Rules

- Attribution link creation failure → fall back to raw URL, never block launch
- Redirect is always 302, never 301
- Click recording is always fire-and-forget — never block the redirect
- Pixel endpoint always returns 1x1 GIF immediately, analytics is side-effect
- `increment_campaign_clicks` branches on destination_type for correct counter
- ALL destination types (WhatsApp AND website) must be wrapped — no raw URLs to Meta
- Website attribution links get a `pixel_token` (12-char nanoid) for the pixel snippet
- WhatsApp attribution links do NOT get a `pixel_token`
- CAPI fires are always fire-and-forget — they must never block sale recording or redirect
- CAPI silently skips if `meta_pixel_id` or `capi_access_token` is null — most users initially
- `capi_access_token` is encrypted at rest with `encrypt()` — always `decrypt()` before use
- Never expose `createAdminClient()` or its key to the browser — server-side only
