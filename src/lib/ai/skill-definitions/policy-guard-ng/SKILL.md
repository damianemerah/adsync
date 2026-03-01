---
name: policy-guard-ng
version: "1.0.0"
description: >
  Load when the business type involves regulated or high-risk advertising categories
  on Meta. Triggers on: finance, loan, investment, crypto, forex, trading signals,
  pension, insurance, health supplements, weight loss, slimming, fat burner,
  detox, diabetes, blood pressure, HIV, fertility, pregnancy, herbal cure,
  cancer treatment, betting, gambling, casino, sports prediction, or any business
  making health outcomes or financial returns claims. Applies Meta ad policy
  compliance rules on top of the vertical copy skill already loaded.
---

# Policy Guard — Sellam Ad Compliance for High-Risk Verticals

## Purpose

This skill does NOT replace the vertical copy skill. It runs alongside it.
Its job is to catch and rewrite anything in the copy that would get
the ad rejected by Meta's review system or create legal risk for the seller.

Apply these rules AFTER generating copy with the vertical skill.
Scan every line of copy and every headline before returning the JSON.

---

## Finance & Investment — Hard Rules

These apply to: loans, investment platforms, forex trading, crypto, stocks, pension products,
insurance, fintech, savings apps, money transfers, or any "make money" offering.

**NEVER write:**

- "Earn ₦X per month guaranteed"
- "Double your money in [timeframe]"
- "Risk-free investment"
- "100% returns"
- "Guaranteed profit"
- "Passive income guaranteed"
- "[X]% ROI in [timeframe]"
- "Never lose money"
- Any specific income figure as a promise

**SAFE alternatives:**

- Instead of "earn ₦100k/month" → "Grow your savings with competitive interest rates"
- Instead of "double your money" → "Investment options designed to build long-term wealth"
- Instead of "100% returns" → "Returns vary — speak to us about what's right for your goals"
- Instead of "risk-free" → "We'll walk you through the risk profile before you commit"

**What IS allowed:**

- Factual product descriptions: "Fixed-term savings account with [X]% interest p.a."
- Service descriptions: "We help Nigerians invest in verified real estate opportunities"
- Educational framing: "Learn how to grow your money with structured investment plans"
- Social proof without income claims: "Thousands of Nigerians trust us to manage their savings"

**CTA rules for finance:**

- Prefer `learn_more` or `get_quote` over `buy_now`
- Do NOT use urgency language like "offer ends tonight" for investment products
- Do NOT use scarcity language for financial products ("only 5 slots left")

---

## Health, Supplements & Medical — Hard Rules

These apply to: vitamins, supplements, herbal products, weight loss products, slimming teas,
fitness products with health claims, clinics, hospitals, traditional medicine, fertility products.

**NEVER write:**

- "Cures [disease]"
- "Treats diabetes / blood pressure / HIV / cancer"
- "Clinically proven to..." (unless you have the actual study and it's cited)
- "Guaranteed to..." (any health outcome)
- "Reverses [condition]"
- "Lose [X kg] in [X days] guaranteed"
- Before/after framing in ANY form ("before you were struggling, now you're not")
- Personal testimonial framing that implies medical outcomes ("I was diabetic, now I'm not")
- "FDA approved" unless literally true and documented
- NAFDAC claims unless seller provided NAFDAC registration number

**SAFE alternatives:**

- Instead of "cures diabetes" → "Supports healthy blood sugar levels as part of a balanced diet"
- Instead of "lose 10kg in 2 weeks" → "Supports your weight management journey"
- Instead of "treats blood pressure" → "Formulated with ingredients traditionally used for cardiovascular wellness"
- Instead of "guaranteed results" → "Consistent use alongside a healthy lifestyle supports better outcomes"

**Weight loss specifically:**

- No specific weight/kg claims unless user provided them AND they're from verified testimonials
- No body-shaming language: never "get rid of your fat", "flatten your belly fast"
- No before/after language even indirectly
- Safe: "supports your fitness and wellness goals", "designed to complement your active lifestyle"

**What IS allowed for health:**

- "Supports immune health" / "promotes energy" / "aids digestion"
- "Formulated with natural ingredients"
- "Thousands of Nigerians use it as part of their daily routine"
- Specific, factual product descriptions (ingredients, directions)
- Service descriptions for clinics: "General practice clinic serving [location] — appointments available"

**CTA rules for health:**

- Avoid urgency/scarcity for medical products
- Prefer `learn_more` or `book_appointment`
- "Consult with our team before purchasing" is a safe addition for supplement sellers

---

## Betting, Gambling & Gaming — Hard Rules

These apply to: sports betting, casino, prediction sites, odds platforms, lottery,
fantasy sports with cash prizes, or any wagering product.

**NEVER write:**

- "Win guaranteed"
- "Never lose with our tips"
- "100% accurate predictions"
- "This weekend's banker" presented as a certainty
- Any suggestion of guaranteed financial outcome from gambling

**MUST include (for every betting ad):**

- A responsible gambling disclaimer in the copy or headline
- "18+ only" — explicitly
- "Gamble responsibly" or equivalent

**SAFE patterns for betting:**

- "Sports betting tips and analysis — bet responsibly"
- "Enhance your sports knowledge. 18+. Play responsibly."
- "Join [X] Nigerians who use our platform for sports analysis. 18+ only."

**CTA rules for betting:**

- Prefer `sign_up` or `learn_more`
- Never use WhatsApp for betting products where individual tips are sent (could be construed as a tipping service)

---

## Scan Checklist (Apply Before Returning JSON)

Before finalising copy for ANY high-risk vertical, check each line:

1. Does any line make a specific income or returns promise? → Rewrite to remove it
2. Does any line make a health outcome claim? → Soften to "supports" / "helps" / "promotes"
3. Does the word "guaranteed" appear in ANY context? → Remove or qualify it
4. Does "clinically proven" appear without a cited source? → Remove it
5. Is there any before/after framing? → Rewrite without it
6. For betting: does "18+" appear? Does "gamble responsibly" appear? → Add if missing
7. For finance: is any specific ROI or income figure stated as a promise? → Remove it
8. Does any line use a superlative ("best", "only", "#1") without verifiable proof? → Remove or qualify

If any check fails, rewrite that line before including it in the JSON output.
Never return copy that fails these checks.

---

## Rewriting Examples

| Original (failing)                        | Rewritten (compliant)                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| "Earn ₦500k/month guaranteed"             | "Build a new income stream — speak to us about how"                                             |
| "Lose 15kg in 30 days"                    | "Supports your weight loss journey — results vary with consistency"                             |
| "Cures diabetes naturally"                | "A supplement formulated to support healthy blood sugar levels"                                 |
| "100% accurate betting tips"              | "Data-driven sports analysis to inform your bets. 18+. Bet responsibly."                        |
| "Risk-free investment, double your money" | "Competitive investment returns — speak to our team about options that match your risk profile" |
| "Before I was sick, now I'm cured"        | "Many of our customers report feeling better — speak to us about what's right for you"          |
