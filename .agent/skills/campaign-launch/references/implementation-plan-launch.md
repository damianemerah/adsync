# 2A.5 Ad Policy Pre-Screen

**New file:** `src/lib/ai/policy-guard.ts`

Run before every campaign launch to catch high-risk Nigerian ad copy patterns.

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const HIGH_RISK_PATTERNS = [
  /\b(loan|borrow|lend|credit|interest rate)\b/i,
  /\b(crypto|bitcoin|invest|guaranteed return|double your money)\b/i,
  /\b(cure|treatment|heal|miracle|100% effective)\b/i,
  /\b(make money|earn daily|passive income|work from home)\b/i,
  /\b(before and after|weight loss guarantee|lose \d+ kg)\b/i,
];

export interface PolicyCheckResult {
  passed: boolean;
  riskLevel: "low" | "medium" | "high";
  flags: string[];
  suggestion?: string;
}

export async function checkAdPolicy(copy: {
  headline: string;
  primaryText: string;
}): Promise<PolicyCheckResult> {
  const fullText = `${copy.headline} ${copy.primaryText}`;
  const flags: string[] = [];

  // 1. Fast pattern check (no API call)
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(fullText)) {
      const match = fullText.match(pattern)?.[0];
      if (match) flags.push(match);
    }
  }

  if (flags.length === 0) {
    return { passed: true, riskLevel: "low", flags: [] };
  }

  // 2. If patterns flagged, use AI for nuanced assessment
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `You are a Meta ad policy expert. Assess this Nigerian SME ad copy for policy violations.
        
Headline: "${copy.headline}"
Body: "${copy.primaryText}"

Flagged terms: ${flags.join(", ")}

Reply in JSON: { "riskLevel": "low|medium|high", "willLikelyGetRejected": boolean, "suggestion": "brief rewrite suggestion if needed" }`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      passed: result.riskLevel === "low" || !result.willLikelyGetRejected,
      riskLevel: result.riskLevel || "medium",
      flags,
      suggestion: result.suggestion,
    };
  } catch {
    // If AI check fails, flag as medium and let user proceed with warning
    return {
      passed: true,
      riskLevel: "medium",
      flags,
      suggestion: "Review your copy before launching",
    };
  }
}
```

**Wire into `campaigns.ts` launch action** — add before Step D (Meta API chain):

```typescript
// Policy pre-screen
const policyCheck = await checkAdPolicy({
  headline: config.adCopy.headline,
  primaryText: config.adCopy.primary,
});

if (policyCheck.riskLevel === "high") {
  return {
    success: false,
    error: `Your ad copy may violate Meta's policies. ${policyCheck.suggestion || "Please review and edit before launching."}`,
    policyFlags: policyCheck.flags,
  };
}

// For medium risk, continue but warn (returned in success response)
```

---

### 1.4 Inject Attribution Link at Campaign Launch

**Modified file:** `src/actions/campaigns.ts`

In the `launchCampaign` function, after building `finalUrl` for WhatsApp objective, replace the raw `wa.me` link with an Tenzu attribution link.

**Find this section (~line 85 in campaigns.ts):**

```typescript
finalUrl = generateWhatsAppLink(rawPhone, defaultMessage);
```

**Replace with:**

```typescript
const whatsappUrl = generateWhatsAppLink(rawPhone, defaultMessage);

// Create attribution link that wraps the WhatsApp URL
const token = generateAttributionToken();
const { data: attrLink } = await supabase
  .from("attribution_links")
  .insert({
    token,
    organization_id: orgId,
    destination_url: whatsappUrl,
    // campaign_id will be updated after campaign is inserted below
  })
  .select("id, token")
  .single();

finalUrl = attrLink ? buildAttributionUrl(attrLink.token) : whatsappUrl; // Fallback to raw link if insert fails

// Store token for later linking to campaign
const attributionLinkId = attrLink?.id;
```

Then after `insertedCampaign` is created, link back:

```typescript
if (attributionLinkId && dbCampaignId) {
  await supabase
    .from("attribution_links")
    .update({ campaign_id: dbCampaignId })
    .eq("id", attributionLinkId);
}
```
