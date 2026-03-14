---
name: policy-guard-ng
version: "2.0.0"
description: Load for finance,loan,investment,crypto,forex,health supplements,weight loss,slimming,medical claims,betting,gambling,insurance.
---

# Policy Guard — Meta Ad Compliance

Runs AFTER vertical skill. Scan every copy line before returning JSON.

## Finance hard blocks → rewrite

❌ "guaranteed returns/profit","double your money","risk-free","[X]% ROI","passive income guaranteed"
✅ "competitive interest rates" / "build long-term wealth" / "returns vary — speak to us" / "risk profile consultation"
CTA: prefer learn_more/get_quote | no urgency/scarcity language for investment products

## Health hard blocks → rewrite

❌ "cures [disease]","clinically proven" (no citation),"guaranteed results","lose Xkg in Y days","before/after framing","NAFDAC" (no reg number)
✅ "supports healthy [X] levels" / "aids/promotes/helps [outcome]" / "formulated for [benefit]" / "consistent use supports better outcomes"
Weight loss: no kg claims, no body-shaming, no "flatten belly fast"
Supplements: "consult our team before purchasing" is safe addition

## Betting must-haves (every bet ad)

"18+ only" + "Gamble responsibly" — both required
❌ "guaranteed win","100% accurate","never lose"
✅ "sports analysis to inform your bets" / "enhance your sports knowledge"

## Scan checklist (run before returning JSON)

1. Specific income/returns promise? → remove
2. Health outcome claim? → soften to "supports/helps/promotes"
3. "guaranteed" anywhere? → remove or qualify
4. "clinically proven" without citation? → remove
5. Before/after framing? → rewrite
6. Betting: 18+ and "gamble responsibly" present? → add if missing
7. Superlatives without proof ("best","#1")? → remove

| Original                      | Compliant                                            |
| ----------------------------- | ---------------------------------------------------- |
| "Earn ₦500k/month guaranteed" | "Build a new income stream — speak to us"            |
| "Lose 15kg in 30 days"        | "Supports your weight loss journey — results vary"   |
| "Cures diabetes naturally"    | "Formulated to support healthy blood sugar levels"   |
| "100% accurate betting tips"  | "Data-driven sports analysis. 18+. Bet responsibly." |
