# Sellam Product Rules

## What Sellam Is

Sellam (formerly Adsync) is an AI-powered Meta ads tool for Nigerian SMEs.
Core loop: SME pays ₦ → Sellam creates Meta ad → ad drives WhatsApp conversations
or website visits → SME closes sales → Sellam shows ₦ ROI.

The name "Sellam" is Nigerian Pidgin for "sell it." It repositions from B2B SaaS
to a hustle/commerce tool for everyday Nigerian business owners.

## The User

28-year-old Lagos hustler. Phone only, no laptop. Sells fashion/beauty/food/services.
Uses WhatsApp Business daily. Has never opened Meta Ads Manager.
Cannot install a pixel. May or may not have a website.

## Full Implementation Plan

The complete implementation plan with SQL, code, and file paths is split across:

- `.agent/skills/attribution/references/` — Phase 1A (attribution) + Phase 1B (ROI dashboard)
- `.agent/skills/ai-context/references/` — Phase 1C (org-level AI context)
- `.agent/skills/naira-payments/references/` — Phase 2A (Naira wallet)
- `.agent/skills/campaign-launch/references/` — Campaign launch flow + policy guard

Always read the relevant reference file for the phase being implemented before writing any code.

## Non-Negotiable Product Decisions

- Every ad destination MUST be wrapped in a Sellam smart link (sellam.app/l/[token])
  regardless of type — WhatsApp URL, website URL, or any other destination.
  Never send raw wa.me links or raw website URLs to Meta directly.
- "Mark as Sold" is the only manual revenue input. No full CRM.
- Naira-first always. SMEs never see a dollar amount.
- Per-org isolated virtual cards for Meta spend. NEVER a shared Sellam card on Meta.
- 1 campaign → 1 ad set → 1 ad. Never break this structure.
- TikTok is deferred. It is gated in backend. Remove from UI if visible.
- No agency dashboard, no web store builder in Phase 1.
- Optional pixel snippet for website owners — never a gate or requirement.

## Nigerian SME Segment Reality

- WhatsApp-only (~56%): wrap wa.me link in attribution link
- Website, no pixel (~30%): wrap website URL in attribution link + offer pixel snippet
- Website with pixel (~10%): attribution link still wraps, pixel snippet optional
  All segments use the same attribution link architecture. Destination type differs.

## UI Language Rules

- Never say "campaign" when "sale" or "ad" works
- Never say "impressions" in user-facing copy — say "people reached"
- Never say "optimize" — say "improve"
- WhatsApp clicks = "people who messaged"
- Website clicks = "people who visited"
- Record Sale button = "Sold! 🎉"
- Always show monetary values in ₦ — never USD to the user

## AI Context Layer Order (never flatten these)

Layer 1: Org profile → organizations.business_description, business_category, business_location
Layer 2: Targeting profile → targeting_profiles.business_description
Layer 3: Campaign context → campaigns.ai_context
Layer 4: User's chat message
Always inject Layer 1 first via useOrgContext() hook before any AI call.

## North Star Metric

% of launched campaigns where the SME records at least one sale.
Target: >30% by month 6. >50% by month 12.
