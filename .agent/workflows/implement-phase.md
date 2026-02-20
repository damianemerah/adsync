---
description: Start implementing a Sellam phase from the plan. Loads the right skill files, checks decisions, and walks through the correct build order (DB → actions → hooks → UI).
---

# /implement-phase

Use this workflow when starting implementation of a plan phase.

## Steps

1. Read `.agent/rules/sellam-product.md` fully
2. Read `.agent/rules/decisions.md` fully
3. Ask which phase: 1A (attribution) | 1B (ROI dashboard) | 1C (AI context) |
   2A (Naira payments) | 2B (creative intelligence) | 3 (AI optimizer)
4. Load the relevant skill files for that phase
5. Check existing files before creating new ones — never duplicate
6. Create database migration first with RLS policies included
7. Create server actions next
8. Create hooks next
9. Create UI components last
10. After each file: confirm it follows code-conventions.md
11. End with: list of files changed + next step to implement
