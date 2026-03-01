---
name: copy-beauty-ng
version: "1.0.0"
description: >
  Load when generating ad copy for Nigerian beauty businesses. Triggers on:
  skincare, serum, cream, glow, facial, toner, moisturiser, SPF, sunscreen,
  makeup, foundation, lipstick, lash extensions, lash bar, eyebrow threading,
  nail salon, nail art, organic beauty, natural hair care, hair growth products,
  body scrub, body butter, hair oil, cosmetics, spa, waxing, facials,
  beauty supply, gele, or any personal care and beauty product or service.
  Applies glow-focused copy rules and avoids prohibited health/skin claims.
---

# Nigerian Beauty Copy — Sellam

## The Non-Negotiable Copy Skeleton

```
LINE 1 — HOOK (visible result or identity statement, max 12 words)
LINES 2–3 — BENEFIT/SOLUTION (specific outcome, what it does, who it's for)
LINE 4 — PROOF (mandatory — one credible signal)
LINE 5 — CTA (how to buy or book right now)
```

---

## HOOK — Lead with the Visible Result

Beauty hooks are about what the customer will LOOK or FEEL like, not ingredients.
Nobody buys serum for "antioxidants" — they buy it for the glow.

**For skincare products:**

- "The glow your skin has been asking for 💆‍♀️"
- "Darker skin isn't the problem — your routine is"
- "In 4 weeks, your friends will ask what changed"
- "The skincare Lagos women keep reordering"
- "You have one face. Give it the right care."
- "Hyperpigmentation, uneven skin, dark spots — let's fix that"

**For makeup:**

- "The foundation that matches your skin, not theirs"
- "Full coverage. Doesn't feel like anything on your face."
- "Built for melanin. Finally."
- "Lipstick that stays through Lagos heat and Lagos life"

**For lash/nail services:**

- "Lashes that make people ask 'are those real?'"
- "Nails done right — in [location], by appointment"
- "The lash set that lasted my client 4 weeks"

**For hair care products:**

- "Your natural hair IS growing. You're just using the wrong products."
- "Length retention starts here 🌿"
- "Strong, moisturised natural hair — it's possible"

**For organic/natural beauty:**

- "No chemicals. No compromise on results."
- "What goes on your skin matters. This is clean."

---

## BENEFIT LINES (Lines 2–3)

Specific outcomes. Not vague claims. Not ingredient lists (unless explaining one clearly).

**For skincare:**

- "Our brightening serum tackles hyperpigmentation and uneven tone — specifically formulated for melanin-rich skin"
- "Lightweight, non-greasy, absorbs fast — suitable for Nigerian weather"
- "No skin-bleaching, no harsh chemicals — just real glow, safely"
- "For oily, dry, combination, or acne-prone skin — we have the right formula"

**For makeup:**

- "Full coverage that doesn't crack, fade, or turn ashy by afternoon"
- "Shades starting from deep brown to ebony — if you've struggled to find your shade, this is it"
- "Sweat-resistant, humidity-tested — made for Lagos heat"

**For lash services:**

- "Classic, volume, or mega — we do all styles. You leave looking exactly how you wanted."
- "Full set takes 90 minutes. Fills available. We're in [location]."

**For nail services:**

- "Gel, acrylic, press-on, or nail art — your nail vision, our hands"
- "Appointment-based only — so you're never waiting"

**For hair products:**

- "Seals moisture, prevents breakage, promotes growth — the full package in one bottle"
- "Works on type 4a, 4b, 4c hair — the kinkier the better"

---

## PROOF LINE (Line 4 — Mandatory)

**If seller gave real proof:**

- "Reordered by over 200 Lagos customers this month"
- "Clients see visible difference in 3 weeks — many have shared their before photos"

**If no proof given — SAFE patterns only:**

✅ Safe proof for beauty:

- "Trusted by Lagos women with melanin-rich skin"
- "Our customers come back every month — that's the real review"
- "A favourite in the Lagos beauty community for [product type]"
- "Nigerian skin, Nigerian formula — tested here, not imported"
- "Customers have seen real results — and they've told their friends"
- "This formula was built specifically for African skin tones"

❌ HARD RESTRICTIONS — Never write these for beauty:

- "Lightens your skin in X days" — prohibited claim
- "Clinically proven to..." — requires actual clinical data
- "Removes stretch marks permanently"
- "Guaranteed to grow your hair X inches"
- "Cures acne" — medical claim
- "Dermatologist-recommended" — unless stated by user with proof
- Before/after framing in copy ("before you used this, your skin...")

**Note on bleaching/lightening products:**
If user sells a skin-lightening product, write copy focused on "even tone," "brightening,"
"fade dark spots" — never "lighten your complexion" or "become fairer."
If user explicitly requests bleaching copy, use policy-guard-ng rules.

---

## CTA LINE (Final Line)

**WhatsApp CTAs:**

- "Send us a message — we'll match you to the right product for your skin type"
- "DM us with your skin concern and we'll recommend your routine"
- "WhatsApp us to order — delivery across Lagos in 24–48 hours"

**Booking CTAs (for services):**

- "Book your lash appointment via WhatsApp — slots fill every week"
- "DM us to book — we confirm same day"

**Buy Now CTAs:**

- "Tap to shop — delivered to your door in Lagos"
- "Order now — nationwide delivery available"

---

## WhatsApp Pre-fill Template

**For skincare products:**
"Hi! I saw your ad for your [serum/cream/products].
I have [skin concern] and I'm looking for the right product. What do you recommend and how much?"

**For makeup:**
"Hi! I saw your ad. I need a foundation/[product] that works for [skin tone/type].
What do you have and how much?"

**For lash/nail services:**
"Hi! I saw your ad for your [lash/nail] services in [location].
Do you have availability this week and what's the price for [service]?"

**For hair products:**
"Hi! I saw your ad. I have type [hair type] natural hair and I'm looking for [product].
What do you have and how much?"

Use the template that best fits the detected business type.

---

## Headlines (40 Characters Max Each)

**Benefit-led:**

- "Skincare Built for Nigerian Skin"
- "Your Glow Starts Here"
- "Lashes That Turn Heads in Lagos"
- "Natural Hair Products That Work"

**Curiosity/urgency-led:**

- "Why Lagos Women Keep Reordering This"
- "Book Before This Week Fills Up"
- "Your Skin Has Been Asking for This"
- "The Shade You've Been Looking For"

---

## Banned Phrases — Never Write These

- "Elevate your beauty routine"
- "Experience the difference"
- "Discover your best skin"
- "Unleash your glow" — too generic
- "Transform yourself" — vague
- "Feel beautiful" — hollow without specifics
- Any bleaching/skin-whitening language
- Any medical claims ("treats", "cures", "heals")
