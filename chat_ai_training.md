# Audience Chat Step — User Behavior Research & AI Training Guide

## The Core Problem

The current `ADS_SYSTEM_PROMPT` assumes the user writes something like:

> _"I sell luxury frontal wigs targeting Lagos women aged 22-35"_

Real Nigerian SME users write:

> _"wigs"_
> _"I dey sell hair"_
> _"Fashion and accessories for Lagos babes"_
> _"My business is general merchandise"_
> _"I sell Ankara and asoebi for owambe"_
> _"Skincare products prices from 3k to 15k Lekki"_

The AI currently returns usable JSON on the first two patterns. It quietly fails on the last four — generating generic interests that won't convert.

---

## The 9 Real User Input Patterns

### Pattern 1 — The One-Word Drop

**Input:** `"wigs"` / `"clothes"` / `"food"` / `"shoes"`

**What happens now:** The AI guesses correctly (hair interests, fashion demographics) but the copy and targeting are extremely generic. No location, no price signal, no differentiation.

**What should happen:** AI asks ONE clarifying question to unblock the most valuable missing signal.

> _"Got it — wigs! Are you selling online and shipping across Nigeria, or walk-ins in a specific city?"_

This single answer unlocks: location targeting, delivery-vs-walkthrough CTA, and audience radius.

---

### Pattern 2 — The Pidgin Descriptor

**Input:** `"I dey sell fine hair wey no go shed"` / `"My jollof rice na the best for VI, I dey cook fresh every day"` / `"Ankara fabric and asoebi, e get different colours"`

**What happens now:** The current prompt says _"You may occasionally use light Nigerian/Pan-African flavor"_ but the parser is structured for clean English business descriptions. Pidgin inputs come through garbled — the AI extracts wrong age ranges or misses behavioral signals.

**What should happen:** The system prompt must explicitly normalize Pidgin inputs before processing. The AI should internally translate to structured English, then generate. The response must come back in Standard English (for the UI), never in Pidgin.

Key Pidgin vocabulary the AI must understand:

| Pidgin                      | Meaning                 | Targeting Signal                                   |
| --------------------------- | ----------------------- | -------------------------------------------------- |
| "no shedding"               | Hair quality claim      | Interests: natural hair care, lace wigs            |
| "owambe"                    | Nigerian party/event    | Interests: event planning, Owambe fashion, Aso-oke |
| "Oga / Madam"               | Customer reference      | Gender + formality signal                          |
| "wahala"                    | Problem/stress          | Pain-point product positioning                     |
| "runs" (business context)   | Side hustle / freelance | SME/entrepreneur audience                          |
| "pepper dem"                | Aspiration / show-off   | Status-driven targeting, premium positioning       |
| "sharp sharp"               | Fast / urgent           | Express delivery, instant results                  |
| "fresh"                     | New or high quality     | Recency signal, premium targeting                  |
| "Ankara / Asoebi / Aso-oke" | Nigerian fabric types   | Events, parties, fashion interests                 |
| "lace / frontal / closure"  | Wig types               | Hair care, beauty interests                        |
| "recharge card / airtime"   | Telecom top-up          | B2C, digital goods audience                        |

---

### Pattern 3 — The Price-First Drop

**Input:** `"I sell things from 5k"` / `"My products dey from 2500 to 10k"` / `"Affordable items, prices start at ₦1500"`

**What happens now:** The AI ignores or misses the price signal entirely. The budget estimator and copy never reflect the price point. A ₦2,500 product needs completely different copy than a ₦45,000 product.

**What should happen:** Price range is a first-class signal. The AI should extract it and use it to:

- Set copy tone (affordable = "save money", premium = "invest in quality")
- Adjust targeting (low price → broad + engagement, high price → interest-based + retargeting)
- Influence the budget recommendation (high-ticket items need longer decision cycles)

The AI should also recognize these as informal price formats:

- `"5k"` → ₦5,000
- `"15-20k"` → ₦15,000–₦20,000
- `"30 per piece"` → ₦30 (likely error, AI should clarify)
- `"₦2500"`, `"N2500"`, `"2,500 naira"`

---

### Pattern 4 — The Location-First Drop

**Input:** `"Lekki Phase 1 skincare"` / `"VI restaurant and lounge"` / `"I'm in Surulere, I sell provisions"`

**What happens now:** The location is captured but the targeting search uses the full string, which often returns no results from the Meta location API (it doesn't know "Lekki Phase 1" as a district — it knows "Lagos" or "Lagos Island").

**What should happen:** The AI must normalize Nigerian location formats to Meta-compatible geo targets:

| User Input                                | Meta Target                  |
| ----------------------------------------- | ---------------------------- |
| "Lekki", "Lekki Phase 1", "Lekki Phase 2" | Lagos (city)                 |
| "VI", "Victoria Island"                   | Lagos (city)                 |
| "Yaba", "Surulere", "Ikeja", "Oshodi"     | Lagos (city)                 |
| "Wuse", "Maitama", "Gwarinpa"             | Abuja FCT (city)             |
| "GRA", "Ada George", "Rumuola"            | Port Harcourt (city)         |
| "Aba", "Onitsha", "Enugu"                 | Enugu State or Anambra State |
| "Mainland", "Island"                      | Lagos (city)                 |

The AI should also infer delivery scope from the location context:

- Walk-in business (`"at VI"`, `"my shop in Surulere"`) → tight geo radius, local targeting
- Online/delivery (`"I ship"`, `"nationwide delivery"`) → Lagos + Abuja + PH defaults

---

### Pattern 5 — The Rambling Paragraph

**Input:** `"I sell skincare products like body lotion, face wash, serum and toning products, I have been in business for 3 years, my customers are mostly working class women, I am based in Ikeja Lagos, I also do home delivery and I work with bloggers and influencers, my prices are not too expensive"`

**What happens now:** The AI handles this reasonably well but extracts too many interests (10+) that are too scattered. The copy is unfocused.

**What should happen:** The AI should extract a hierarchy:

1. **Primary product** → skincare (body lotion, serum = beauty/skincare)
2. **Customer profile** → working class women, Lagos
3. **Business model** → delivery + influencer marketing
4. **Price positioning** → affordable
5. **Channel hint** → influencer collab → Interests should include "Beauty bloggers", "Instagram beauty"

Then generate focused output with max 6-8 tight interests, not 15 scattered ones.

---

### Pattern 6 — The Unrelated Question Mid-Flow

**Input (after seeing interest suggestions):** `"How much will I spend on ads?"` / `"Is Facebook or Instagram better?"` / `"What time should I post?"` / `"Can I pause the ad?"` / `"I don't understand what targeting means"`

**What happens now:** The current chat sends the question to the same `/api/ai/generate` endpoint, which processes it as a business description and returns nonsense JSON (interests for "How much will I spend" or location targets for "Is Facebook better").

**What should happen:** The AI must first classify the input before routing it:

- **Business description** → normal flow (generate strategy JSON)
- **Campaign question** → answer inline, don't generate strategy, nudge back to flow
- **Confusion/frustration signal** → simplify, don't ask more questions
- **Off-topic** → brief answer, redirect

Classification can be done with a pre-check or by adding classification logic to the system prompt.

---

### Pattern 7 — The Refinement Request

**Input (after seeing copy suggestion):** `"Add more urgency"` / `"Make it shorter"` / `"I want to include a discount"` / `"Change it to female only"` / `"Remove the WhatsApp part"`

**What happens now:** `handleCopyRefinement` in `audience-chat-step.tsx` works for the 3 hardcoded buttons (Shorter, More Spicy, Regenerate). But freeform refinement instructions sent via the chat input go to the strategy generator, not the copy refiner.

**What should happen:** The AI must detect refinement intent and route to `COPY_COMPLETION_SYSTEM_PROMPT` with the existing copy + the instruction. The current code has no branching for this.

---

### Pattern 8 — The Competitor/Comparison Mention

**Input:** `"Like Zaron cosmetics but cheaper"` / `"I sell similar things to Veetee Rice but local brand"` / `"We are the best alternative to Jumia in Ibadan"`

**What happens now:** The AI doesn't recognize competitive positioning and generates generic interests.

**What should happen:** Competitive mentions are strong targeting signals:

- `"like Zaron"` → skincare beauty, cosmetics audiences
- `"like Jumia"` → e-commerce shoppers, online buyers, "Engaged Shoppers" behavior
- `"cheaper/local alternative"` → price-sensitive copy, "value for money" positioning

---

### Pattern 9 — The Multi-Product Business

**Input:** `"I sell wigs, skincare, and Ankara fabrics"` / `"General store — food, drinks, provisions, electronics"` / `"Fashion boutique: clothes, shoes, bags, accessories"`

**What happens now:** The AI picks one product and generates targeting for it. Copy covers only one category.

**What should happen:** For 2-3 products, ask the user which one they want to advertise NOW. Don't try to target all of them — Meta campaigns work best with single-product focus.

> _"You have a few different products — for this campaign, which should we focus on? Wigs, skincare, or Ankara?"_

For 4+ products ("general store"), classify as **General Merchandise** and use broader interest clusters.

---

## How to Fix: Updated System Prompt

Replace `ADS_SYSTEM_PROMPT` in `lib/ai/prompts.ts` with this:

```typescript
export const ADS_SYSTEM_PROMPT = `
You are AdSync's AI Campaign Strategist, specialized in Nigerian and West African SMEs.
Your job is to analyze a business description and return precise, API-ready targeting + copy for Meta (Facebook/Instagram).

### STEP 0: INPUT CLASSIFICATION (run this first, silently)
Before generating any output, classify the input:

TYPE_A: Clear product/service description → Generate full strategy JSON.
TYPE_B: Ambiguous (one word, price only, location only) → Set "needs_clarification": true in output and ask ONE question.
TYPE_C: Question about advertising (budget, platform, timing) → Set "is_question": true and answer inline.
TYPE_D: Refinement of existing copy → Set "is_refinement": true and improve only the copy fields.

Always return valid JSON. Use the "meta" field to signal the type.

### STEP 1: PIDGIN + INFORMAL INPUT NORMALIZATION
These inputs must be understood correctly:
- "I dey sell X" → "I sell X"
- "fine X", "correct X", "original X" → "premium/authentic X"
- "no shedding", "no wahala" → quality claim → use in copy
- "Ankara/Asoebi/Aso-oke" → Nigerian event fashion
- "lace/frontal/closure" → wig types → beauty/hair interests
- "owambe" → Nigerian parties → event/social interests
- "pepper dem" → aspiration → premium positioning
- "sharp sharp / fast delivery" → convenience → logistics/speed copy
- "5k / 10k / 2.5k" → Nigerian Naira amounts (₦5,000 etc.)
- "VI/Lekki/Yaba/Surulere/Ikeja" → Lagos city
- "Wuse/Maitama/Gwarinpa/Asokoro" → Abuja FCT
- "GRA/Rumuola/Ada George" → Port Harcourt

### STEP 2: PRICE SIGNAL EXTRACTION
If user mentions price, extract and apply:
- Low (< ₦5,000): Broad targeting, affordability copy, "value for money" tone
- Mid (₦5,000–₦25,000): Interest-based targeting, quality + value copy
- High (> ₦25,000): Tight interest targeting, premium/luxury tone, aspiration copy

### STEP 3: BUSINESS TYPE → TARGETING LOGIC
Apply this mapping when classifying the business:

Fashion/Clothing → Interests: Fashion, Style, Nigerian fashion brands, Aso-ebi
                   Behaviors: Engaged Shoppers (if e-commerce)
Wigs/Hair → Interests: Natural hair, Hair care, Weave, Lace wigs, Beauty
            Behaviors: Engaged Shoppers
Skincare/Beauty → Interests: Skincare, Beauty, Self-care, Organic beauty
                  Behaviors: Engaged Shoppers, High-end mobile device users (if premium)
Food/Restaurant → Interests: Food, Nigerian cuisine, Restaurants, Eating out
                  Behaviors: (none usually)
Electronics/Gadgets → Interests: Technology, Gadgets, Electronics
                       Behaviors: High-end mobile device users, Frequent online buyers
Real Estate/Rentals → Interests: Real estate Nigeria, Investment, Home ownership
                       Behaviors: Frequent Travelers (sometimes)
B2B/Agency/Marketing → Interests: Entrepreneurship, Digital marketing, Business
                        Behaviors: Facebook Page Admins, Small business owners
Events/Aso-ebi → Interests: Nigerian parties, Owambe, Event planning, Aso-oke, Weddings

### STEP 4: LOCATION NORMALIZATION → META TARGETS
Map informal locations to Meta-compatible targets:
- Any Lekki, VI, Yaba, Surulere, Ikeja, Mainland, Island, Mushin → Lagos (city, key: 2420605)
- Any Wuse, Maitama, Gwarinpa, Asokoro → Abuja FCT (region, key: 2566)
- Any GRA, Rumuola, Old GRA → Port Harcourt (city)
- "Nationwide" or "I ship everywhere" → Lagos + Abuja + Port Harcourt
- Unknown city → Default Lagos

### STEP 5: MULTI-PRODUCT HANDLING
If user mentions 3+ distinct product categories:
- Set "needs_clarification": true
- Ask: "You have a few products — which one should this campaign focus on?"
- Include "clarification_options" array with their products

If user mentions 2 related products (e.g., "wigs and hair care") → treat as one niche, proceed.

### CONTEXT & MARKET ASSUMPTIONS:
- Platform: Mobile-first (Instagram Feed + Stories, Facebook Feed)
- Audience: Nigerian consumers primarily, 18-55, smartphone users
- Currency: Naira (₦) in copy
- Cultural reference: Lagos urban aesthetic is default
- Competition signals: Recognize Nigerian brand mentions (Zaron, Jumia, Konga, etc.) as targeting hints

### OUTPUT FORMAT:
Return ONLY raw JSON, no markdown, no commentary.

{
  "meta": {
    "input_type": "TYPE_A | TYPE_B | TYPE_C | TYPE_D",
    "needs_clarification": false,
    "clarification_question": null,
    "clarification_options": null,
    "is_question": false,
    "question_answer": null,
    "price_signal": "low | mid | high | unknown",
    "detected_business_type": "fashion | beauty | food | electronics | events | b2b | general | unknown",
    "confidence": 0.0
  },
  "interests": ["String"],
  "behaviors": ["String"],
  "demographics": {
    "age_min": 18,
    "age_max": 65,
    "gender": "all | male | female"
  },
  "suggestedLocations": ["String"],
  "estimatedReach": 0,
  "copy": ["String", "String"],
  "headline": ["String", "String"],
  "ctaIntent": "start_whatsapp_chat | buy_now | learn_more | book_appointment | get_quote | sign_up",
  "whatsappMessage": "Pre-filled message if ctaIntent is start_whatsapp_chat, else omit",
  "reasoning": "String"
}
`;
```

---

## How to Fix: Chat Input Router

The `handleSend` function in `audience-chat-step.tsx` currently blindly sends every message to `/api/ai/generate`. Add intent detection before the API call:

```typescript
// Add this before the fetch call in handleSend:
function classifyUserInput(
  input: string,
): "strategy" | "question" | "refinement" | "ambiguous" {
  const lower = input.toLowerCase().trim();

  // Question patterns
  const questionPatterns = [
    /how much/i,
    /how do/i,
    /what is/i,
    /what are/i,
    /which is better/i,
    /\?$/,
    /can i/i,
    /should i/i,
    /what time/i,
    /when should/i,
    /is it/i,
    /what does.*mean/i,
    /explain/i,
    /help me understand/i,
  ];
  if (questionPatterns.some((p) => p.test(lower))) return "question";

  // Copy refinement patterns
  const refinementPatterns = [
    /make it/i,
    /change it/i,
    /add more/i,
    /remove the/i,
    /shorter/i,
    /longer/i,
    /more urgent/i,
    /different/i,
    /try again/i,
    /regenerate/i,
    /include/i,
    /without/i,
    /instead of/i,
  ];
  if (refinementPatterns.some((p) => p.test(lower))) return "refinement";

  // Ambiguous: too short
  if (input.trim().split(" ").length <= 1) return "ambiguous";

  return "strategy";
}
```

Then branch inside `handleSend`:

```typescript
const intent = classifyUserInput(inputValue);

if (intent === "question") {
  // Answer the question inline using a lightweight prompt, don't generate strategy
  // Add to messages, then nudge back
  const answer = await answerCampaignQuestion(inputValue);
  setMessages((prev) => [
    ...prev,
    {
      id: Date.now().toString(),
      role: "ai",
      content:
        answer +
        "\n\nNow, back to your campaign — what product are you promoting?",
      type: "text",
    },
  ]);
  return;
}

if (intent === "refinement" && adCopy.headline) {
  // Route to copy refinement
  await handleCopyRefinement(inputValue);
  return;
}

if (intent === "ambiguous") {
  // Ask clarifying question instead of generating bad strategy
  setMessages((prev) => [
    ...prev,
    {
      id: Date.now().toString(),
      role: "ai",
      content: `Tell me a bit more — what are you selling, and who are your typical customers?`,
      type: "text",
    },
  ]);
  setIsTyping(false);
  return;
}

// Default: strategy generation
```

---

## How to Fix: Handle AI `needs_clarification` Response

When the AI returns `needs_clarification: true`, the chat should render a clarification bubble instead of interest chips:

```typescript
// In handleSend, after getting AI result:
if (result.meta?.needs_clarification) {
  setIsTyping(false);

  const clarificationMsg: Message = {
    id: (Date.now() + 1).toString(),
    role: "ai",
    content: result.meta.clarification_question,
    type: result.meta.clarification_options ? "clarification_choice" : "text",
    data: {
      options: result.meta.clarification_options,
    },
  };
  setMessages((prev) => [...prev, clarificationMsg]);
  return; // Don't proceed to audience update
}
```

Add a new message type `'clarification_choice'` to the `ChatBubble` renderer that shows the user's products as tappable chips to select from.

---

## How to Fix: Handle AI `is_question` Response

When the AI detects an advertising question, extract the answer from `result.meta.question_answer` and show it as a regular text message followed by a nudge:

```typescript
if (result.meta?.is_question) {
  const questionAnswer =
    result.meta.question_answer ||
    "I'm not sure about that one. Let's focus on building your audience first — what product are you promoting?";

  setMessages((prev) => [
    ...prev,
    {
      id: Date.now().toString(),
      role: "ai",
      content: questionAnswer,
      type: "text",
    },
  ]);
  return;
}
```

---

## The Initial Greeting — Fix It

Currently the chat opens with:

> _"Let's build your audience! What are you promoting with your {objective} campaign?"_

This is fine for a developer. For a Nigerian SME who just clicked "WhatsApp Campaign" and got dropped into a chat with an AI, it creates friction. They don't know what "promoting" means in this context.

**New opening message:**

```typescript
const initialMessage = {
  content:
    objective === "whatsapp"
      ? `Hey! Let's set up your WhatsApp campaign. Start simple — what are you selling? (e.g. "Wigs in Lagos" or "Jollof rice catering Abuja")`
      : objective === "traffic"
        ? `Let's build your campaign. What product or service are you driving traffic to?`
        : `What are you promoting? Tell me about your product or business in any way — even one sentence works.`,
  type: "text",
};
```

---

## Confidence Score Thresholds

Use the `meta.confidence` field returned by the AI to decide whether to proceed or ask for clarification:

| Confidence  | Action                                                   |
| ----------- | -------------------------------------------------------- |
| `>= 0.8`    | Proceed directly, show interests                         |
| `0.5 – 0.8` | Show interests but add: _"Is this the right direction?"_ |
| `< 0.5`     | Show clarification question, don't show interests yet    |

---

## Summary: What Changes Where

| File                                       | Change                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `lib/ai/prompts.ts`                        | Replace `ADS_SYSTEM_PROMPT` with the new version above                    |
| `audience-chat-step.tsx` → `handleSend`    | Add `classifyUserInput()` router before API call                          |
| `audience-chat-step.tsx` → `handleSend`    | Handle `needs_clarification` and `is_question` meta fields                |
| `audience-chat-step.tsx` → initial message | More conversational opening per objective                                 |
| `audience-chat-step.tsx` → `ChatBubble`    | Add `'clarification_choice'` message type renderer                        |
| `lib/ai/types.ts`                          | Add `meta` object + `ctaIntent` + `whatsappMessage` to `AIStrategyResult` |

None of these changes require backend infrastructure. Only the system prompt and frontend routing logic.
