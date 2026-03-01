# Deferred Tier Features — Phase 2 & 3

Features designed during tier strategy planning that are deferred beyond MVP.

---

## Phase 2: Feature Gates & Credit Controls

### A/B Copy Testing

- **Starter:** 2 copy variations per campaign
- **Growth:** 3 variations with auto-split
- **Agency:** 5 variations with performance-based selection
- **Implementation:** `audience-chat-step.tsx` respects `tierConfig.ai.maxCopyVariations`, shows upgrade prompt when hitting limit

### Soft Cap / Overage Logic

- **0–80% credits:** Full tier model
- **80–100%:** Warning banner: "Running low on credits"
- **100% depleted (Growth/Agency):** Downgrade images to FLUX Dev (not hard block), keep generating
- **120% overage:** Hard pause — "Top up credits or wait for monthly reset"
- **Starter:** Hard stop at 100% (no overage)
- **Implementation:** `requireCredits()` in `credits.ts` checks overage percent from `TIER_CONFIG.limits.overageAllowedPercent`

### Copy Refinement Limits

- **Starter:** 3 refinements per campaign
- **Growth/Agency:** Unlimited
- **Implementation:** Counter in `campaign_contexts` table, checked in `refineAdCopyWithOpenAI`

### Ad Account Limits Enforcement

- **Starter:** 1 connected account
- **Growth:** 3 accounts
- **Agency:** Unlimited
- **Implementation:** `connect-account-dialog.tsx` checks count vs `tierConfig.limits.maxAdAccounts`

### Team Member Limits

- **Starter:** 1 user (solo)
- **Growth:** 3 users
- **Agency:** 10 users
- **Implementation:** Invitation flow checks `organization_members` count vs limit

### Link Analytics Time-Windowing

- **Starter:** Last 7 days
- **Growth:** 30 days
- **Agency:** Lifetime
- **Implementation:** `link_clicks` queries add `WHERE clicked_at > NOW() - interval '${days} days'`

### Custom Link Slugs

- **Starter:** Random slugs (`/s/x7z9`)
- **Growth/Agency:** Custom slugs (`/s/promo`) + QR codes (Agency)
- **Implementation:** Attribution link creation form shows slug input only for Growth+

---

## Phase 3: Premium & Upsell

### Nano Banana Pro (Premium Image)

- **Agency only:** Optional premium image model at 8 credits/image
- **fal.ai endpoint:** `fal-ai/nano-banana-pro` ($0.15/image)
- **UI:** Toggle in creative studio: "Use Premium Model (8 credits)"
- **Profitability:** 40% margin at ₦50/credit

### Upsell Triggers (Soft Prompts)

1. **"Better AI" trigger** — Starter sees: _"Upgrade to Growth for AI-powered ad copy with industry expertise"_
2. **"Analytics" trigger** — Starter viewing 7-day-old link data: _"Your data expires soon. Upgrade to keep 30 days"_
3. **"Optimization" trigger** — Starter with active campaign: _"We found 3 ways to improve your ad. Upgrade for AI optimization"_
4. **"Team" trigger** — Starter shares campaign link: _"Want your team to manage ads too? Upgrade for multi-user access"_

### WhatsApp Alerts

- **Growth:** Weekly report + payment alerts
- **Agency:** Real-time alerts + custom notifications
- **Implementation:** Notification service checks `tierConfig.features.whatsappAlerts`

### Post-Launch Auto-Optimization

- **Starter:** Basic rules (pause if overspend)
- **Growth:** Full optimization suggestions
- **Agency:** Auto-optimization (rules execute automatically)
- **Implementation:** `post-launch-rules.ts` checks tier for rule execution mode

### FLUX Schnell Free Preview

- Allow all tiers to generate low-res previews for free before committing credits
- **Implementation:** Preview mode in creative studio using `fal-ai/flux/schnell` at $0.003/image, 0 credits
