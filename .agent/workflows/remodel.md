---
description: Remodel UI to match Wask.co's "Soft Modern" aesthetic
---

1. [Perform comprehensive UI analysis] Identify deviations from Wask.co styling guidelines in the target components or pages. Look specifically for:
   - Color palette mismatches (ensure `bg-primary` (Emerald) and `text-foreground` (Deep Navy) are used via semantic tokens).
   - Border radius inconsistencies (should be `rounded-3xl` / 1.5rem).
   - Shadow usage (replace standard shadows with "Soft Lift" custom shadows).
   - Layout density (aim for "Bento Grid" density).

2. [Verify Global Theme] Check `src/app/globals.css` and `resources/theme-presets.json` to confirm that semantic color tokens and radius variables are correctly defined and available.

3. [Refactor Components] Systematically apply "Soft Modern" styling to the identified components:
   - **Colors**: Override generic colors with semantic tokens. Use `bg-primary` for primary actions. Use `bg-background` or specific surface tokens for backgrounds.
     - **CRITICAL:** Search for and **REMOVE** all hex codes (e.g., `bg-[#12e193]`) and replace them with their `globals.css` variable equivalents (e.g., `bg-primary`).
   - **Shapes**: Apply `rounded-3xl` border radius to cards, buttons, and containers.
   - **Shadows**: Replace standard Tailwind shadows (e.g., `shadow-md`) with custom "Soft Lift" shadows (`shadow-soft` or `shadow-xs`).
   - **Typography**: Ensure fonts and hierarchy align with the "Soft Modern" aesthetic.
   - **Icons**: Replace all `lucide-react` icons with `iconoir-react` equivalents.

4. [Remove Defaults] proactively identify and remove any standard Tailwind utility classes that conflict with the new design system (e.g., `bg-blue-600`, `text-gray-900`, `shadow-lg`).

5. [Verify Changes] Run `npx tsc --noemit` to check for type errors introduced during refactoring.

6. [Visual Confirmation] Conduct a visual review to ensure alignment with Wask.co reference screenshots or mockups. Verify correct implementation of "Soft Lift" depth and information density.
