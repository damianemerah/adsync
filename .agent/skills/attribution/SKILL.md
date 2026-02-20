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

## Reference Implementation

Full SQL, code, and file-by-file specs are in:
`.agent/skills/attribution/references/phase-1a-attribution.md` — Phase 1A
`.agent/skills/attribution/references/phase-1b-roi-dashboard.md` — Phase 1B

Read the relevant reference file before writing any code for this feature.

## Architecture Summary

### The Problem

Every ad Sellam launches currently sends raw URLs to Meta:

- WhatsApp: raw `wa.me/234...` link
- Website: raw `https://...` link
  When someone clicks, Sellam sees nothing. Zero attribution.

### The Solution

Wrap every destination in a Sellam smart link: `sellam.app/l/[token]`
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
  → finalUrl = sellam.app/l/[token]  ← this goes to Meta, not the raw URL
  → after campaign inserted, update attribution_links.campaign_id

User clicks ad
  → hits sellam.app/l/[token]
  → route.ts looks up token → gets destination_url + destination_type
  → fire-and-forget: insert link_clicks row + call increment_campaign_clicks RPC
  → 302 redirect to destination_url immediately

Website owner (optional)
  → Sellam shows pixel snippet in campaign detail after launch
  → SME pastes 4-line script into site <head> once
  → Script calls /api/pixel?t=[pixel_token]&e=purchase&v=15000
  → Auto-credits revenue to campaign — same as "Mark as Sold" but automatic
```

## Key Tables

- `attribution_links`: token, campaign_id, organization_id, destination_url, destination_type, pixel_token
- `link_clicks`: link_id, campaign_id, organization_id, clicked_at, device_type, destination_type, event_type, event_value_ngn
- `whatsapp_sales`: campaign_id, organization_id, amount_ngn, note, recorded_by

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

## Critical Rules

- Attribution link creation failure → fall back to raw URL, never block launch
- Redirect is always 302, never 301
- Click recording is always fire-and-forget — never block the redirect
- Pixel endpoint always returns 1x1 GIF immediately, analytics is side-effect
- `increment_campaign_clicks` branches on destination_type for correct counter
- ALL destination types (WhatsApp AND website) must be wrapped — no raw URLs to Meta
- Website attribution links get a `pixel_token` (12-char nanoid) for the pixel snippet
- WhatsApp attribution links do NOT get a `pixel_token`
