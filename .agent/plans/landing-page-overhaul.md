# Landing Page Overhaul — Implementation Plan

**Persona Target:** Nigerian small business owner selling via WhatsApp. Tried Meta Ads once. Got confused.
**Product Name:** Tenzu (never "Tenzu" in user-facing copy)
**Workflows Applied:** /fix-layout · /remodel · frontend-design SKILL
**Date:** 2026-02-19

---

## Audit Summary (What's Broken)

| #   | Issue                                                               | File                    | Severity    |
| --- | ------------------------------------------------------------------- | ----------------------- | ----------- |
| 1   | Product called "Tenzu" in hero sub-headline + image alt             | `hero-section.tsx`      | 🔴 Critical |
| 2   | "optimize your campaigns" — banned jargon                           | `hero-section.tsx`      | 🔴 Critical |
| 3   | Hero headline is generic, no WhatsApp or Naira sales promise        | `hero-section.tsx`      | 🔴 Critical |
| 4   | "Watch Demo" links to `#video-demo` which doesn't exist             | `hero-section.tsx`      | 🔴 Critical |
| 5   | Zero mention of WhatsApp anywhere in feature copy                   | `feature-deep-dive.tsx` | 🔴 Critical |
| 6   | "Social Proof" tag rendered literally on the page                   | `wall-of-love.tsx`      | 🟠 High     |
| 7   | Testimonials use fake DiceBear avatars                              | `wall-of-love.tsx`      | 🟠 High     |
| 8   | "Enterprise Security" card uses banned word                         | `features-section.tsx`  | 🟠 High     |
| 9   | "CTR and ROAS" jargon exposed to non-expert users                   | `feature-deep-dive.tsx` | 🟠 High     |
| 10  | TikTok UGC feature advertised (not built yet)                       | `feature-deep-dive.tsx` | 🟠 High     |
| 11  | PersonasGrid targets E-commerce & Agencies, not WhatsApp sellers    | `personas-grid.tsx`     | 🟡 Medium   |
| 12  | "Full Control" framing adds complexity, not relief                  | `features-section.tsx`  | 🟡 Medium   |
| 13  | `bg-[#0a071e]` hex code in CTASection                               | `cta-section.tsx`       | 🟡 Medium   |
| 14  | `text-gray-400` on CTA section (non-semantic)                       | `cta-section.tsx`       | 🟡 Medium   |
| 15  | Testimonial blockquote uses `text-muted-foreground` (too dim)       | `wall-of-love.tsx`      | 🟡 Medium   |
| 16  | "New: AI Creative Studio is here" pill — meaningless to the persona | `hero-section.tsx`      | 🟡 Medium   |
| 17  | FeatureDeepDive images are mostly missing placeholders              | `feature-deep-dive.tsx` | 🟡 Medium   |
| 18  | "Built to scale your business" — generic B2B copy                   | `features-section.tsx`  | 🟡 Medium   |
| 19  | Smart automation is framed as user-configured, not done-for-you     | `feature-deep-dive.tsx` | 🟡 Medium   |
| 20  | Nav menu: "About" links to `#about` which doesn't exist             | `hero-header.tsx`       | 🟡 Medium   |

---

## Phase 1 — Copy & Brand Fixes (No Layout Change)

> Focus: Fix all messaging, language, jargon, and brand name violations.
> Files: `hero-section.tsx`, `features-section.tsx`, `feature-deep-dive.tsx`, `personas-grid.tsx`, `wall-of-love.tsx`, `cta-section.tsx`, `hero-header.tsx`

### 1.1 `hero-section.tsx` — Rewrite Hero Copy

**Announcement Pill:**

```
Before: "New: AI Creative Studio is here"
After:  "New: Turn phone photos into professional ads in seconds"
```

**H1 Headline (keep short + punchy):**

```
Before: "Run Professional Ads. Pay in Naira."
After:  "More Sales From Your Ads. Pay in Naira."
```

_Rationale: "More Sales" is the outcome Emeka cares about. "Naira" is the instant relief. No jargon._

**Sub-headline:**

```
Before: "Stop struggling with dollar cards. Tenzu lets you launch, manage,
        and optimize your campaigns with AI-powered precision—at a flat Naira price."

After:  "Stop spending on ads and not knowing if they sold anything.
        Tenzu tells you who messaged, how many bought, and what you made — in Naira."
```

_Removes: "Tenzu", "optimize", "campaigns". Adds: outcome, WhatsApp implicit, Naira._

**Hero Image alt text:**

```
Before: alt="Tenzu Dashboard Interface"
After:  alt="Tenzu Dashboard — WhatsApp Sales Tracking"
```

**Primary CTA:**

```
Before: "Get Started Free"
After:  "Start Selling with Ads →"
```

**Secondary CTA:**

```
Before: "Watch Demo" (broken link to #video-demo)
After:  Remove entirely OR replace with "See How It Works →" linking to #features
```

_The `#video-demo` anchor does not exist. Remove the button until a demo video section is built._

---

### 1.2 `features-section.tsx` — Rewrite 6 Feature Cards

**Section Headline:**

```
Before: "Built to scale your business"
After:  "Everything You Need To Sell More"
```

**Section Sub-headline:**

```
Before: "Everything you need to launch, manage, and optimize your ads
        without the complexity of traditional tools."
After:  "No agency. No designer. No dollar card. Just you, your phone, and results."
```

**Card 1 — "Instant Launch" (kept, copy refined):**

```
Before: "Launch professional campaigns in minutes, not hours."
After:  "Launch your first ad in 2 minutes. Just chat with AI — it does the rest."
```

**Card 2 — "Full Control" → REPLACED with "Sales Tracking":**

```
Icon: HandCash (move from card 4)
Title: "See Your Sales in Naira"
Description: "Know exactly how many people messaged from your ad,
              and how much you made. Not clicks — actual sales."
```

_"Full Control" signals complexity. Replace with the revenue visibility pillar._

**Card 3 — "AI Creative Studio" (kept, copy refined):**

```
Before: "Turn amateur product photos into studio-quality ad creatives with one click."
After:  "Take a photo of your product. AI turns it into a professional ad. No designer needed."
```

**Card 4 — "Naira Payments" (kept, copy refined):**

```
Before: "Pay for all your advertising costs in Naira. No dollar cards or black market rates."
After:  "Pay your monthly plan in Naira via Paystack. Your local card works every time."
```

**Card 5 — "Enterprise Security" → REPLACED with "WhatsApp-Native":**

```
Icon: ChatBubble (iconoir)
Title: "Built for WhatsApp Sellers"
Description: "Tenzu wraps every ad with a smart link that tracks who
              messaged you from that ad. Know which ad drove sales."
```

_"Enterprise" is banned. Replace with our biggest differentiator for the persona._

**Card 6 — "Smart Automation" (reframed as done-for-you):**

```
Before: "Set rules to automatically pause losing ads and scale winning ones 24/7."
After:  "Tenzu watches your ads 24/7 and pauses the ones wasting money — automatically."
```

---

### 1.3 `feature-deep-dive.tsx` — Rewrite 5 Feature Rows, Remove TikTok

**Section Headline:**

```
Before: "Spend Less, Get More Customers"
After:  "Every Feature Built for How You Actually Sell"
```

**Feature 1 — "Create and Customize Your Optimization Rules" (reframe):**

```
Badge:  "Auto-Pilot" (was "Smart Automation")
Title:  "Tenzu Stops Wasted Ad Spend Automatically"
Description: "If an ad isn't bringing messages or sales, Tenzu pauses it.
             If one is working, it gets more budget. You set your goal once —
             Tenzu handles the rest."
Remove: "duplicate ad sets" (jargon)
```

**Feature 2 — "Analyze Your Creative with AI" (remove ROAS/CTR):**

```
Title:  "Know Exactly What's Working in Your Ad — Before You Waste Money"
Description: "Tenzu's AI looks at your ad image and copy, then tells you
             what to fix to get more people messaging you. Plain English. No jargon."
Remove: "CTR and ROAS" — replace with "people reaching out" and "sales"
```

**Feature 3 — "Create Ad Images with Templates" (localize):**

```
Title:  "Professional Ad Images — No Designer, No Agency"
Description: "Pick a template made for Nigerian sellers — fashion, beauty,
             food, skincare. Add your product photo and price. Done.
             Looks like you paid ₦150k for it."
```

**Feature 4 — "Create UGC Ad Videos" (REMOVE TikTok reference):**

```
Title:  "Turn Photos Into Scroll-Stopping Video Ads"
Description: "Bring your product to life with short video ads for
             Instagram Reels and Facebook. Captions and music added automatically.
             No video editing skills needed."
Remove: All mention of TikTok (not built for Phase 1)
```

**Feature 5 — "Redesign Your Ad Creatives with AI" (simplify):**

```
Title:  "Give Old Ads a Fresh New Look"
Description: "Tired of your current ad? AI reimagines your product
             in a new setting — new background, new mood, new creative.
             Unlimited redesigns included."
Remove: "Magic Redesign" internal label from user-facing copy
```

---

### 1.4 `personas-grid.tsx` — Replace 3 Personas

**Section Headline:**

```
Before: "Who uses Tenzu?" / "Designed for All Marketers"
After:  "Made For You If..."
```

**Replace all 3 persona cards:**

| OLD                                 | NEW                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Small Business Owners (generic)     | **WhatsApp Sellers** — "You sell daily on WhatsApp and want more people finding you"                     |
| E-commerce Managers (wrong persona) | **Fashion & Beauty Vendors** — "Your products are visual. AI turns your photos into ads that sell."      |
| Digital Agencies (wrong persona)    | **First-Time Advertisers** — "You've never run an ad. Tenzu's AI sets everything up — you just approve." |

_Remove: all Shopify/WooCommerce/cart references. Remove: "Agency" persona._

---

### 1.5 `wall-of-love.tsx` — Fix Testimonials

**Section eyebrow:**

```
Before: "Social Proof" (literal internal label — REMOVE)
After:  "Real Results"
```

**Section count claim (align with CTA claim):**

```
Before: "Join thousands of marketers who are scaling their businesses with Tenzu."
After:  "Join 2,000+ Nigerian businesses already selling more with Tenzu."
```

**Replace testimonial copy (keep realistic, Nigeria-grounded, WhatsApp-specific):**

| Person    | Role                  | New Quote                                                                                                                                          |
| --------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chisom O. | Fashion Vendor, Lagos | "I took a photo of my ankara bags, uploaded it, and the AI turned it into a proper ad. People were messaging me asking for prices within an hour." |
| Ahmed I.  | Dropshipper, Abuja    | "I tried paying for Wask — card declined twice. Tenzu I paid with my Opay card. No stress. The ad was live the same day."                          |
| Grace U.  | Skincare Vendor       | "I used to spend on ads and never know if they sold anything. Now I see exactly who messaged me from the ad and record my sales right there."      |
| Tunde A.  | Electronics Reseller  | "The Naira payment is the main thing for me. I don't want to be thinking about exchange rates when I just want to sell my phones."                 |
| Sarah O.  | Food Vendor, PH       | "I don't understand targeting at all. I just typed what I sell and who buys from me. The AI figured out the rest."                                 |
| Emeka N.  | Clothing Store, Kano  | "My old ads were running for 3 days spending money with no messages. Tenzu paused it and told me why. That alone saved me ₦18,000."                |

**Fix avatar strategy:** Remove DiceBear API avatars (they break offline/look fake). Use static initials avatars (`AvatarFallback`) with styled colored backgrounds instead — e.g. `bg-primary/10 text-primary`.

---

### 1.6 `cta-section.tsx` — Fix Brand + Hex Codes

```
Before: "Join 2,000+ Nigerian businesses scaling with Tenzu. cancel anytime."
After:  "Join 2,000+ Nigerian sellers already running ads with Tenzu. Cancel anytime."
```

**Design token violations:**

```
Before: bg-[#0a071e]  →  After: bg-foreground (deep navy semantic token)
Before: text-gray-400  →  After: text-foreground/50 (or text-subtle-foreground)
```

---

### 1.7 `hero-header.tsx` — Fix Broken Nav Link

```
Before: { name: "About", href: "#about" }   // anchor doesn't exist
After:  Remove "About" entirely OR change to { name: "Pricing", href: "#pricing" }
```

---

## Phase 2 — Layout & Spacing Fixes (/fix-layout)

> Focus: Apply container consistency, vertical axis alignment, whitespace standards.

### 2.1 Container Audit

| Section                     | Current                                                                   | Correct?                          |
| --------------------------- | ------------------------------------------------------------------------- | --------------------------------- |
| `hero-section.tsx`          | `container px-6`                                                          | ✅                                |
| `feature-deep-dive.tsx`     | `container px-6`                                                          | ✅                                |
| `features-section.tsx`      | `container px-6`                                                          | ✅                                |
| `personas-grid.tsx`         | `container px-6`                                                          | ✅                                |
| `wall-of-love.tsx`          | `container px-6`                                                          | ✅                                |
| `cta-section.tsx`           | `container px-6`                                                          | ✅                                |
| `hero-header.tsx` nav inner | `max-w-6xl px-6 lg:px-12` (unscrolled) contracting to `max-w-4xl lg:px-5` | ⚠️ Nav width mismatch vs sections |

**Fix 2.1a:** The header's nav pill uses `max-w-4xl` when scrolled and `max-w-6xl` when unscrolled. This creates a visual jump. Standardize to `max-w-5xl` at all times.

### 2.2 Section Vertical Spacing Audit

| Section         | Current py                      | Standard?         | Fix                          |
| --------------- | ------------------------------- | ----------------- | ---------------------------- |
| HeroSection     | `pt-32 pb-20 md:pt-48 md:pb-32` | ✅ Generous       | —                            |
| FeatureDeepDive | `py-20 md:py-32`                | ✅                | —                            |
| FeaturesSection | `py-16 md:py-32`                | ✅                | —                            |
| PersonasGrid    | `py-16 md:py-24`                | ⚠️ Slightly tight | Increase to `py-20 md:py-32` |
| WallOfLove      | `py-16 md:py-32`                | ✅                | —                            |
| CTASection      | `py-24`                         | ✅                | —                            |

### 2.3 Feature Cards Internal Spacing

- `FeatureCard` → `CardHeader` uses `pb-4` with icon in a `size-20` decorator. Add `p-8` to `CardContent` for breathing room.
- `FeatureDeepDive` rows: `gap-12 lg:gap-24` — fine on desktop, but the `space-y-6` in content div is cramped on mobile. Add `space-y-8`.

### 2.4 Whitespace — Gary Simon Rule

- Section subtitles (`max-w-3xl`) feel cramped at `mb-16`. Increase to `mb-20 md:mb-24`.
- Feature card descriptions: `leading-relaxed` is present ✅. Ensure `text-subtle-foreground` (not `muted-foreground`) is used. **Audit all description `p` tags in features.**

---

## Phase 3 — Visual / Design System Fixes (/remodel)

> Focus: Remove hex codes, fix semantic token violations, apply Soft Modern polish.

### 3.1 Token Violations to Fix

| File                        | Violation                                        | Fix                        |
| --------------------------- | ------------------------------------------------ | -------------------------- |
| `cta-section.tsx:9`         | `bg-[#0a071e]`                                   | `bg-foreground`            |
| `cta-section.tsx:21`        | `text-gray-400`                                  | `text-foreground/60`       |
| `cta-section.tsx:39`        | `text-gray-400`                                  | `text-foreground/60`       |
| `wall-of-love.tsx:88`       | `text-muted-foreground` for readable subtitle    | `text-subtle-foreground`   |
| `wall-of-love.tsx:115`      | `text-muted-foreground` for role text            | `text-subtle-foreground`   |
| `wall-of-love.tsx:120`      | `text-muted-foreground` for quote text           | `text-subtle-foreground`   |
| `feature-deep-dive.tsx:156` | `text-muted-foreground` for readable description | `text-subtle-foreground`   |
| `personas-grid.tsx:75`      | `text-muted-foreground` for description          | `text-subtle-foreground`   |
| `hero-header.tsx:95`        | `text-muted-foreground` for nav links            | OK (metadata-level intent) |

### 3.2 Shadow Violations

| File                   | Violation                                             | Fix                                |
| ---------------------- | ----------------------------------------------------- | ---------------------------------- |
| `hero-section.tsx:115` | `hover:shadow-lg` (generic)                           | `hover:shadow-soft`                |
| `cta-section.tsx:30`   | `shadow-lg shadow-primary/20 hover:shadow-primary/40` | Keep — primary glow is intentional |
| `wall-of-love.tsx:100` | `shadow-none` on cards                                | Fine — intentional flat card look  |

### 3.3 Border Radius Audit

The design system standardizes on `rounded-3xl` for cards and containers.

| File                        | Element          | Current        | Fix                                     |
| --------------------------- | ---------------- | -------------- | --------------------------------------- |
| `features-section.tsx:80`   | CardDecorator    | `rounded-2xl`  | OK — inner decorator can stay           |
| `feature-deep-dive.tsx:183` | Image container  | `rounded-3xl`  | ✅                                      |
| `feature-deep-dive.tsx:197` | Inner image      | `rounded-2xl`  | OK                                      |
| `hero-section.tsx:148`      | Hero image frame | `rounded-4xl`  | ✅                                      |
| `personas-grid.tsx:60`      | Card             | default shadcn | Override to `rounded-3xl` via className |
| `cta-section.tsx`           | CTA buttons      | `rounded-full` | ✅                                      |

### 3.4 Typography Hierarchy (Squint Test)

Run the squint test per the Gary Simon protocol:

- **H2 section labels** should be `text-foreground font-bold` (they are — ✅)
- **Eyebrow labels** (e.g., "Social Proof", "Full Suite of Tools") should be `text-primary font-bold uppercase tracking-widest text-sm` — currently mixed. Standardize.
- **Descriptions** must all use `text-subtle-foreground` (not `muted-foreground`). See 3.1 above.
- **Feature Deep Dive titles** use `text-3xl md:text-4xl font-bold font-heading` — ✅ correct.

### 3.5 Icons — Verify No Lucide Leaks

Quick grep for any `lucide-react` imports across home components. All icons should be `iconoir-react`.

```bash
grep -r "lucide-react" src/components/home/
```

Expected: 0 results. If any found, replace with iconoir equivalent.

### 3.6 Placeholder "Visual Preview" Text in Feature Deep Dive

The `feature-deep-dive.tsx` renders `<p>Visual Preview</p>` as a fallback when images are missing. This should not be user-visible. Replace with a branded placeholder:

```
Before: <p className="...">Visual Preview</p>
After:  <p className="...opacity-30">Coming soon</p>
```

Or better — generate real mockup images for at least 2 of the 5 features using the `generate_image` tool.

---

## Phase 4 — Content Section (currently unused)

> The `ContentSection` component is imported in `page.tsx` but **never rendered**. Either use it or remove the import.

Check `content-section.tsx` — if it's a "How It Works" 3-step section, insert it between `HeroSection` and `FeatureDeepDive`. This is a critical missing piece: the persona needs to understand the flow _before_ seeing features.

**Proposed page order (revised):**

```
HeroSection       → What is it + CTA
HowItWorks        → 3 simple steps: Chat → Launch → See Sales  ← INSERT ContentSection here
FeatureDeepDive   → Deep feature explanations
FeaturesSection   → 6-card grid
PersonasGrid      → Who it's for
WallOfLove        → Testimonials
CTASection        → Sign up
```

---

## Execution Order

```
Step 1  hero-section.tsx        — Copy rewrite + remove broken Watch Demo CTA
Step 2  features-section.tsx    — Rewrite 6 cards, swap "Enterprise" + "Full Control"
Step 3  feature-deep-dive.tsx   — Rewrite 5 features, remove TikTok UGC row
Step 4  personas-grid.tsx       — Replace 3 personas with WhatsApp-aligned ones
Step 5  wall-of-love.tsx        — Fix "Social Proof" tag, rewrite 6 testimonials, fix avatars
Step 6  cta-section.tsx         — Fix brand name, fix hex codes, fix token violations
Step 7  hero-header.tsx         — Remove broken "About" nav link
Step 8  All files               — /remodel token pass (muted-foreground → subtle-foreground)
Step 9  All files               — /fix-layout spacing/container pass
Step 10 page.tsx                — Insert ContentSection into correct position
Step 11 npx tsc --noemit        — Type check
Step 12 Browser agent           — Visual verification + squint test
```

---

## Definition of Done

- [ ] No instance of "Tenzu" in user-facing copy
- [ ] No banned words: optimize, campaign, impressions, CTR, ROAS, Enterprise, bot, dollar
- [ ] "WhatsApp" mentioned at least 3 times across the page
- [ ] "₦" symbol visible in hero/sub-headline
- [ ] "Social Proof" text no longer visible to users
- [ ] `#video-demo` broken link resolved
- [ ] `#about` broken link resolved
- [ ] All `text-muted-foreground` replaced with `text-subtle-foreground` for readable content
- [ ] `bg-[#0a071e]` replaced with `bg-foreground`
- [ ] TikTok removed from feature copy
- [ ] No Lucide icons (all iconoir-react)
- [ ] `npx tsc --noemit` returns 0 errors
- [ ] PersonasGrid targets only WhatsApp/Lagos seller personas
