---
description: Perform a strict and safe refactor on a target file, directory, or module boundary, applying Tenzu architecture rules.
---

# Workflow: /refactor

Trigger this workflow whenever you want to clean up, optimize, or reorganize code safely without altering its public behavior.

## Execution Steps

1. **Target Selection**
   - Identify the specific file(s) or directory you want to refactor.
   - Example: `/refactor src/actions/account-health.ts`

2. **Load Governance Rules**
   - The AI must explicitly review `.agent/rules/refactor.md` to ensure all architectural rules (Next.js limits, Supabase client sharing, DRY principles) are top of mind before analyzing the code.

3. **Analysis Phase (Read-Only)**
   - Use `view_file` or `grep_search` to understand the target's current state, imports, exports, and logic.
   - Look for duplication, overly large components, mixed server/client boundaries, and redundant database operations.

4. **Propose the Plan**
   - The AI will output a Refactoring Plan using the structured format requested in `refactor.md` (Findings, Plan, Files to change, Risks, Checklist).
   - **Crucial:** No code is written at this stage unless it's a trivial 1-line formatting change. This requires User Approval.

5. **Execution (After Approval)**
   - The AI will carefully apply structural and DRY changes point by point.
   - Smaller chunks are preferred. Focus on minimal safe changes.
   - Ensure you run `npx tsc --noemit` if TypeScript files are manipulated significantly.

6. **Verification**
   - Ensure imports aren't broken.
   - Explain any move between Client and Server boundaries.
