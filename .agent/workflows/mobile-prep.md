---
description: Prepare Tenzu UI components for mobile view using the Impeccable skill chain. Produces high-fidelity, token-pure, 375px-first layouts without rewriting existing component logic.
---

# /mobile-prep — Impeccable Mobile Preparation Workflow

**Philosophy**: "Mobile Is Canon." 375px is the real screen. This workflow
systematically walks every component through the Impeccable skill chain to
produce a high-fidelity mobile layout that honours the Tenzu Crisp Modern
aesthetic. Existing business logic is **never touched** — only layout,
spacing, interaction, and visual tokens.

---

## Pre-Flight Checklist

Before starting, confirm all three anchors are available:

1. [ ] `.impeccable.md` exists in project root (run `/teach-impeccable` if not)
2. [ ] `src/app/globals.css` has all token definitions
3. [ ] Target component(s) are identified (page, step, or standalone component)

---

## Step 1 — Scope & Triage (skill: /audit)

> **Goal**: Know what you're dealing with before touching any code.

1. Open the target component(s) and run a **mobile-focused `/audit`** pass.
   Concentrate the audit on two dimensions only:

   - **Responsive Design** (score 0–4) — fixed widths, touch targets < 44px,
     horizontal scroll, missing `sm:` breakpoints
   - **Anti-Patterns** (score 0–4) — nested cards, desktop-only patterns,
     `shadow-lg` on surfaces, hex codes in JSX

2. Produce a triage table:

   | Component | Responsive | Anti-Pattern | Priority |
   |-----------|------------|--------------|----------|
   | `foo.tsx` | 1/4        | 2/4          | P0       |

3. Fix order: P0 first, then P1, P2. Do not work on P3 items in this workflow.

**Skills used**: `/audit`  
**Outputs**: Scored triage table, ordered fix list

---

## Step 2 — Simplify for Small Screen (skill: /distill)

> **Goal**: Remove desktop assumptions and progressive-disclosure gaps.

For each P0/P1 component, apply `/distill` with the mobile context:

- Identify desktop-only panels, sidebars, or multi-column layouts that collapse
  badly at 375px.
- Remove or defer any element that is not essential to the primary mobile task.
  Ask: *"Can this SME on an Android complete their goal without this?"*
- Replace complex nested layouts with a **linear vertical flow**.
- Apply progressive disclosure: collapse secondary content behind accordions,
  sheets, or step-through flows rather than hiding it with `hidden md:block`.

**Rules**:
- Never remove core functionality — only restructure access to it.
- `hidden md:block` is a last resort, not a default. If it matters, make it
  work on mobile first.

**Skills used**: `/distill`

---

## Step 3 — Layout & Rhythm (skill: /arrange)

> **Goal**: Establish clean vertical rhythm and correct spacing at 375px.

1. Switch to a **single-column layout** as the default for the component.
2. Apply the Tenzu spacing canon for mobile:
   - Component internal padding: `p-4` (16px)
   - Section gaps: `gap-4` or `gap-6`
   - Inter-group spacing: `mt-6` or `mt-8` — never arbitrary px values
3. Touch target audit: every `<button>`, `<a>`, and interactive `<div>` must be
   **at minimum `min-h-11`** (`44px`) tall. Use `min-h-11 flex items-center`
   pattern.
4. Use `clamp()` for fluid font sizes where content density varies between phone
   and tablet — but only via a CSS token in `globals.css`, never inline.
5. Squint test: blur your eyes at the 375px preview — can you identify the
   primary action within 2 seconds?

**Rules**:
- No nested cards. If hierarchy is needed inside a card, use a `border-t
  border-border` divider, not another `<div className="bg-card rounded-lg">`.
- Grid is only for 2D layouts. Use Flexbox + column direction for mobile lists.

**Skills used**: `/arrange`

---

## Step 4 — Token Purity Pass (skill: /normalize)

> **Goal**: Zero hex codes, zero Tailwind grey scales, zero shadow-lg.

Run `/normalize` on every file touched in Steps 2–3:

1. **Color sweep**: `grep -r "text-gray\|text-slate\|bg-\[#\|shadow-md\|shadow-lg"` — fix every hit:
   - `text-gray-*` → `text-subtle-foreground` (secondary) or `text-foreground`
   - `bg-[#hex]` → add token to `globals.css`, use semantic class
   - `shadow-md` / `shadow-lg` on surfaces → `border border-border`
2. **Icon sweep**: Replace all `lucide-react` imports with `iconoir-react`
   equivalents.
3. **Radius sweep**: `rounded-2xl` / `rounded-3xl` → `rounded-lg`.
4. **Font sweep**: Verify all headings use `font-heading`, all body text uses
   `font-sans`.
5. Run `npx tsc --noemit` — zero errors before proceeding.

**Tenzu anti-pattern reference**: See `.impeccable.md § Strict Anti-Patterns`

**Skills used**: `/normalize`

---

## Step 4b — Typography (skill: /typeset)

> **Goal**: Intentional type hierarchy that reads clearly at 375px.

Apply `/typeset` to every component touched:

1. **Size floor**: No text smaller than `text-xs` (12px) on mobile. Chart axis
   labels using inline `fontSize: 11` are the primary offender — replace with
   `fontSize={12}` at minimum.
2. **Heading hierarchy**: H1 (`text-2xl font-heading font-bold`), H2
   (`text-lg font-heading font-bold`), H3 (`text-sm font-heading font-semibold`).
   Audit that these three levels are actually distinct at 375px.
3. **Weight contrast**: Labels above values should be `font-medium` or
   `font-semibold`; the value itself `font-bold` — never the same weight for both.
4. **Line height**: Body copy `leading-relaxed`, compact UI rows `leading-none`
   or `leading-tight`. Never default `leading-normal` on small text.
5. **Letter spacing**: `font-heading` headings get `tracking-tight` (`-0.025em`
   — already applied globally). Labels in ALL-CAPS get `tracking-wide`.
6. **`text-muted-foreground` audit**: Replace any instance used on readable
   content with `text-subtle-foreground`.

**Skills used**: `/typeset`

---
## Step 5 — Touch & Interaction (skill: /adapt)

> **Goal**: Make every interaction feel native on a phone.

Apply `/adapt` for mobile touch context:

1. **Hover → tap parity**: Remove any UX that only reveals on hover
   (tooltips as primary info, hover menus). Replace with:
   - Long-press affordances or tap-to-expand
   - Inline labels instead of hover-only labels
2. **Bottom-anchored CTAs**: Primary action buttons should be reachable by
   the thumb. On full-screen flows, use a sticky bottom bar pattern:
   ```tsx
   <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border safe-area-inset-bottom">
     <Button className="w-full">Primary Action</Button>
   </div>
   ```
3. **Navigation**: On mobile, replace any inline horizontal tab navigation
   wider than 375px with a scrollable tab row (`overflow-x-auto flex`
   with `flex-shrink-0` on each tab).
4. **Form inputs**: `text-base` minimum on mobile inputs to prevent iOS zoom.
   Minimum height `min-h-11`. Use `inputmode` attribute for numeric/email.
5. **Swipe affordances**: List items that support delete/archive should have
   a visible action (swipe gesture or trailing icon) — not just hidden swipe.

**Skills used**: `/adapt`

---

## Step 6 — Final Polish (skill: /polish)

> **Goal**: Ship-ready. Every state handled, every pixel intentional.

Work through the Polish checklist, mobile-weighted:

- [ ] All buttons ≥ 44×44px touch target at 375px
- [ ] No horizontal scroll at 375px (use `overflow-hidden` on root containers)
- [ ] Text ≥ 14px on mobile (never smaller)
- [ ] All interactive states: default, hover (desktop), focus-visible, active,
      disabled, loading, error, success
- [ ] Empty states are welcoming — not blank divs
- [ ] Loading skeletons match real content dimensions at 375px
- [ ] `safe-area-inset-*` applied on bottom CTAs and nav bars for notch phones
- [ ] No `console.log` or debug code
- [ ] `npx tsc --noemit` passes clean

**Skills used**: `/polish`

---

## Step 7 — Verification

> **Goal**: Human eyes on real pixels before declaring done.

1. Open browser DevTools → Device Toolbar → **iPhone SE (375×667)** as primary.
2. Also test: **Pixel 7 (412×915)** and **Galaxy S21 (360×800)**.
3. Walk the entire user flow in the target component from start to finish.
4. Check both light mode and dark mode at 375px.
5. Run the Tenzu Impeccable audit one final time (`/audit`) — target score ≥ 16/20.

---

## Skill Chain Summary

```
/audit     → Know what's broken (mobile triage)
/distill   → Remove desktop assumptions
/arrange   → Single-column rhythm + touch targets
/normalize → Token purity (no hex, no shadows, no lucide)
/adapt     → Native mobile interaction patterns
/polish    → Final states, safe areas, zero console errors
```

## Quick Reference — Tenzu Mobile Tokens

| Token              | Use case                          |
|--------------------|-----------------------------------|
| `p-4`              | Standard card internal padding    |
| `gap-4` / `gap-6`  | Vertical stacking between items   |
| `min-h-11`         | Touch target minimum height       |
| `text-sm`          | Body text (14px — mobile floor)   |
| `rounded-lg`       | Cards and containers              |
| `rounded-md`       | Inputs, badges                    |
| `border-border`    | All surface separation            |
| `bg-muted`         | Subtle section background         |
| `text-subtle-foreground` | Secondary/supporting text  |
| `font-heading`     | All H1–H3                         |
| `font-sans`        | All body, labels, buttons         |

## Do Not / Never

- ❌ `hidden md:block` as a lazy mobile-fix — if it matters, make it work
- ❌ `shadow-lg` / `shadow-md` on any card or panel surface
- ❌ Any hex code or `bg-[#...]` in JSX — use `globals.css` tokens
- ❌ `import { X } from 'lucide-react'` — use `iconoir-react`
- ❌ `rounded-2xl` or `rounded-3xl` — use `rounded-lg`
- ❌ Touch targets < 44px — always `min-h-11` on interactive elements
- ❌ Desktop-only hover states with no touch equivalent
- ❌ Nested `bg-card rounded-lg` inside another `bg-card rounded-lg`
