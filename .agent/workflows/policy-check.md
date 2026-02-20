---
description: Check ad copy against Meta's Nigerian policy risk patterns before launch. Returns risk level (LOW/MEDIUM/HIGH), flagged terms, and a rewrite suggestion if needed.
---

# /policy-check

Use when reviewing ad copy before testing campaign launch.

## Steps

1. Load .agent/skills/campaign-launch/SKILL.md
2. Paste the ad headline and primary text
3. Check against HIGH risk Nigerian patterns:
   - Financial: loan, borrow, guaranteed return, double your money
   - Crypto: bitcoin, crypto, invest, passive income
   - Health: cure, miracle, 100% effective, before/after weight loss
   - Income: make money fast, earn daily, work from home
   - Restricted: before/after images, misleading claims
4. Rate: LOW (pass) | MEDIUM (warn) | HIGH (block)
5. If MEDIUM or HIGH: suggest specific rewrite
6. Output: { riskLevel, flags, suggestion, willLikelyGetRejected }
