---
name: copy-fashion-ng
version: "1.0.0"
description: >
  Load when generating ad copy for Nigerian fashion businesses. Triggers on:
  boutique, clothing, bags, shoes, gowns, dresses, wigs, lace, Ankara, Aso-ebi,
  Aso-oke, senator wear, agbada, thrift, second-hand fashion, unisex fashion,
  kids wear, men's fashion, women's fashion, accessories, jewelry, caps, or
  any apparel and style business. Applies Hook→Benefit→Proof→CTA skeleton with
  Nigerian fashion-specific hooks, price tier logic, and WhatsApp prefill.
---

# Nigerian Fashion Copy — Sellam

## The Non-Negotiable Copy Skeleton

Every primary text must follow this structure. No exceptions.
The vertical specifics below tell you WHAT to put in each layer.

```
LINE 1 — HOOK (max 12 words, stop the scroll)
LINES 2–3 — BENEFIT/SOLUTION (what they get, why this one)
LINE 4 — PROOF (mandatory — one credible signal)
LINE 5 — CTA (direct, tells buyer what happens next)
```

---

## HOOK — By Price Tier

The hook angle changes completely based on price tier. Get this right.

### LOW TIER (₦1k–₦10k) — Lead with price, lead with access

The buyer's main barrier is cost. Remove it immediately.

Strong hooks:

- "Lagos fashion from ₦3,500 only 👗"
- "Affordable Ankara sets — prices that won't stress your pocket"
- "Quality bags from ₦5,000. Yes, really."
- "You don't have to break bank to slay in Lagos"
- "Fashion for every budget — from ₦2,500"

Pattern: `[Product type] from [price]. No stress.`
Emoji that work: 👗 💃 🛍️ ✨

### MID TIER (₦10k–₦40k) — Lead with quality specificity or desire

The buyer has options. Make them want THIS one.

Strong hooks:

- "The gown Lagos ladies keep coming back for"
- "This bag style sold out twice — we restocked it"
- "The Ankara set that goes from office to owambe"
- "Why settle for ordinary when this exists?"
- "The wig that looks expensive because it is"
- "Your next favourite gown is waiting for you"

Pattern: Social proof hook OR desire hook. Never vague.

### HIGH TIER (₦40k+) — Lead with exclusivity, scarcity, or identity

The buyer is deciding between you and someone else at the same level.
Make them feel they'd be missing something by not buying.

Strong hooks:

- "Only 6 pieces available. This won't last."
- "Handpicked for the woman who knows what she wants"
- "Limited collection. Not for everyone — and that's the point."
- "For the Lagos woman who doesn't do ordinary"
- "Custom orders only. We make it specifically for you."

Pattern: Scarcity + identity. Never "experience" or "elevate."

---

## BENEFIT LINES (Lines 2–3)

Pick ONE primary differentiator and make it tangible. Do not list everything.

**For clothing/gowns/sets:**

- Event fit: "Perfect for owambe, church, office, or date night — one piece, many occasions"
- Fabric quality: "Premium Ankara fabric that holds colour wash after wash"
- Custom fit: "We do custom sizing — your measurements, your fit"
- Style range: "Over 30 styles in stock — traditional, modern, and everything between"

**For bags:**

- Durability: "Real leather handles, reinforced stitching — this bag lasts"
- Size: "Spacious enough for everything you carry, structured enough to look sharp"
- Versatility: "Casual or corporate — this bag does both"

**For wigs (if not using beauty skill):**

- Hair quality: "100% human hair — no shedding, no tangling, no wahala"
- Styling options: "Comes pre-styled. Wear it straight out of the pack."
- Longevity: "With proper care, this wig lasts 12–18 months"

**For shoes:**

- Comfort: "Heel height that looks tall, feels comfortable all day"
- Materials: "Genuine leather upper, cushioned insole — your feet will thank you"

**Location specificity (always include one):**

- "Lagos-based, ships nationwide in 2–3 days"
- "Pick up in Surulere or we deliver to your door"
- "Based in Abuja — same-day delivery within the city"

---

## PROOF LINE (Line 4 — Mandatory, No Exceptions)

**If the seller gave real proof — use their exact words or numbers:**

- "Over 300 Lagos orders this month alone"
- "Rated 4.9 stars by our customers"
- "Trusted by brides and event guests across Nigeria"

**If no proof was given — use SAFE REGIONAL FRAMING only:**
Do NOT fabricate numbers. Use these patterns:

✅ Safe proof patterns for fashion:

- "Trusted by Lagos ladies from the Island to the Mainland"
- "Popular with Abuja event guests and Lagos party-goers alike"
- "Our customers keep coming back — and bring their friends"
- "A favourite for owambe season in Lagos and Abuja"
- "Hundreds of satisfied customers across Nigeria"
- "Only [X] pieces remaining this week" (urgency — use when appropriate)
- "This style keeps selling out. We restock because of demand."

❌ Never fabricate:

- "Over 500 orders" (if user didn't say this)
- "4.8 stars" (if not stated)
- "Nigeria's #1 fashion brand" (unless literally true)

---

## CTA LINE (Final Line)

Must tell the buyer exactly what happens next. Be direct.

**For WhatsApp (`start_whatsapp_chat`):**

- "Send us a message — we'll show you the full collection and prices in minutes"
- "WhatsApp us to place your order. We deliver fast."
- "DM us today — same-day response, fast delivery across Lagos"
- "Chat us now — sizes, prices, and delivery info waiting for you"

**For Buy Now (`buy_now`):**

- "Tap to shop now — delivery to your door across Nigeria"
- "Order online — we ship nationwide in 2–3 days"

**For Book Appointment (`book_appointment`):**

- "Book your styling session — slots are limited this week"

---

## WhatsApp Pre-fill Template

When `ctaIntent = start_whatsapp_chat`, generate a message that sounds like
a real Nigerian customer, not a bot.

**Fashion/Clothing Template:**
"Hi! I saw your ad for your [gowns/bags/Ankara sets] in [location].
What styles do you currently have, how much do they go for, and can you deliver to me?"

**Wigs Template (if handled by this skill):**
"Hi! I saw your ad for your wigs in [location].
What lengths and styles do you have? How much and do you deliver?"

Customise [product] and [location] from the user's input.

---

## Headlines (40 Characters Max Each)

Generate 2 headlines. One benefit-led, one curiosity/urgency-led.

**Benefit-led examples:**

- "Lagos Fashion, Prices You'll Love"
- "Style That Fits Your Life & Budget"
- "Quality Ankara. Fast Lagos Delivery"
- "Custom Gowns. Your Size, Your Style"

**Curiosity/urgency-led examples:**

- "This Style Keeps Selling Out"
- "Only 6 Pieces Left — Don't Wait"
- "Lagos Ladies Are Talking About This"
- "Your Next Favourite Outfit Is Here"

---

## Banned Phrases — Never Write These

- "Elevate your wardrobe" — consistently underperforms
- "Experience fashion differently"
- "Discover the joy of style"
- "Take your fashion to the next level"
- "Unleash your inner fashionista"
- Any phrase that could apply to ANY fashion brand anywhere

---

## Pidgin Copy Signals → Copy Angle

When user input contains these signals, adjust copy angle:

| Input signal                    | Copy response                                               |
| ------------------------------- | ----------------------------------------------------------- |
| "e fine well well" / "correct"  | Premium quality emphasis in benefit lines                   |
| "e cheap" / "affordable"        | Price-led hook (LOW tier), price mentioned in line 1        |
| "sharp sharp" / "fast delivery" | Speed emphasis: "delivered to your door fast"               |
| "no wahala"                     | Convenience emphasis: "order, pay, receive — no stress"     |
| "pepper dem"                    | Aspiration/status copy: "turn heads at every event"         |
| "owambe"                        | Event-fit emphasis in benefits: "perfect for owambe season" |
| "Ankara set" / "lace gown"      | Specific fabric named in copy                               |
