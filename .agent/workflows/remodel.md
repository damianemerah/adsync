---
description: Remodel UI to match Tenzu's premium "Crisp Modern" flat aesthetic
---

1. [Perform comprehensive UI analysis] Identify deviations from the Tenzu "Crisp Modern" styling guidelines in the target components or pages. Look specifically for:
   - Color palette mismatches (ensure `bg-primary` (Emerald) and `text-foreground` (Deep Navy / Sharp Black) are used via semantic tokens).
   - Border radius inconsistencies (should be `rounded-md` or `rounded-lg`, NEVER `rounded-2xl` or `rounded-3xl` which look too bubbly).
   - Shadow usage (remove big floating shadows, use crisp 1px borders `border-border` and very subtle `shadow-sm` only if necessary for floating elements).
   - Layout density (aim for structured "Bento Grid" density with sharp, aligned edges).

2. [Verify Global Theme] Check `src/app/globals.css` to confirm that semantic color tokens and radius variables are correctly defined and available.

3. [Refactor Components] Systematically apply "Crisp Modern" styling to the identified components:
   - **Colors**: Override generic colors with semantic tokens. Use `bg-primary` for primary actions. Use `bg-background` or specific surface tokens for backgrounds.
     - **CRITICAL:** Search for and **REMOVE** all hex codes (e.g., `bg-[#12e193]`) and replace them with their `globals.css` variable equivalents (e.g., `bg-primary`).
   - **Shapes**: Apply `rounded-md` or `rounded-lg` border radius to cards, buttons, and containers. Remove `rounded-full` unless explicitly used for avatars.
   - **Depth**: Replace standard Tailwind shadows with crisp borders (`border border-border`) and completely flat surfaces.
   - **Typography**: Ensure fonts and hierarchy align with the clean, precise aesthetic.
   - **Icons**: Replace all `lucide-react` icons with `iconoir-react` equivalents.

4. [Remove Defaults] proactively identify and remove any standard Tailwind utility classes that conflict with the new design system (e.g., `bg-blue-600`, `text-gray-900`, `shadow-lg`, `rounded-3xl`, `shadow-soft`).

5. [Verify Changes] Run `npx tsc --noemit` to check for type errors introduced during refactoring.

6. [Visual Confirmation] Conduct a visual review to ensure alignment with Tenzu reference standards. Verify correct implementation of crisp borders and precise information density.
