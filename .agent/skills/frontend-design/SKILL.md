---
name: frontend-design
description: Create production-grade, "Soft Modern" dashboards following the Wask/AdSync aesthetic. Uses Nano Banana Pro for visual mockups and Browser Agent for layout verification.
---

## Core Strategy

You are a lead frontend engineer. Your mission is to refactor existing code into UIs that match the "Soft Modern" style of Wask.co, characterized by high-contrast emerald actions, deep navy foundations, and layered, tactile surfaces.

## Resource Utilization

1. **Design Tokens**: Read `resources/theme-presets.json` before writing any code. Apply these as the absolute source of truth for colors and radius.
2. **Visual Baseline**: Reference the screenshots in `resources/wask_ss/`. Mirror the spacing, "Soft Lift" depth, and information density seen in these reference images.
3. **Mockup Workflow**: For complex requests, use native **Nano Banana Pro** to generate a high-fidelity mockup. Present this as an **Artifact** for approval before implementing code.

## Visual Standards (The Wask Look)

- **Palette**:
  - **Primary Action**: Emerald Green (Token: `bg-primary`)
  - **Foundation Text/Headers**: Deep Navy (Token: `text-foreground`) - Use heavily as _background_ on Landing Page (`src/app/page.tsx`), but _sparingly_ as background on Dashboard (`src/app/(authenticated)`).
  - **Secondary Text**: State Slate (Token: `text-subtle-foreground`) - Use for sidebar links, metadata, and descriptions. **Do not use `muted-foreground` for text you want people to read.**
  - **Subtle Scaffolding**: Marketing Gray (Token: `text-muted-foreground`) - Use only for disabled states, placeholders, or tertiary info.
  - **AI Features**: AI Purple (Token: `text-ai` / `bg-ai`) - **ALWAYS** use for AI-powered tools, links, and "Generate" buttons.
- **Shape & Depth**: Use `rounded-3xl` (1.5rem) and "Soft Lift" shadows.
- **Layout Architecture**:
  - **Sidebar**: Fixed left sidebar with a `bg-sidebar` background and subtle border (`border-sidebar-border`).
  - **Active Items**: Use a `bg-accent` or `bg-primary` pill for the current active state.
  - **Account Footer**: MUST include a "Micro Plan" section with a credit progress bar.

## Shadows & Elevation (The "Anti-Bold" Rule)

- **Neutralize Defaults**: Automatically identify and remove any standard Tailwind shadows (e.g., `shadow-md`, `shadow-lg`) that use high-opacity black.
- **Color Sanitization**: Proactively remove generic Tailwind color classes (e.g., `bg-blue-600`, `text-gray-900`) and replace them with the semantic tokens or hex codes defined in the "Visual Standards" section and global.css.
- **The Wask Shadow**: Apply a custom "Soft Lift" shadow using the `--shadow-soft` and `--shadow-xs` token.
  - **Formula**: `0 4px 20px -2px rgba(3, 0, 24, 0.05)` (Navy-tinted black at 5% opacity).
  - **Crisp Edges**: Always use a negative spread (e.g., `-2px`) to prevent a "dirty" or blurry look.

## Technical Execution (Tailwind v4 + Shadcn)

- **Overrides**: Heavily override default Shadcn components via `className` to match the 1.5rem radius and emerald palette.
- **Empty States**: Use centered, light-gray icons with an "Improve with AI" emerald CTA.
- **Data Density**: Use "Bento Grid" layouts (`grid-cols-12`) for complex dashboard metrics.

## Design System & Theming (Strict)

Adhere to the `.cursor/rules/shadcn-theme.mdc` rules:

- **Semantic Tokens Only**: **NEVER** use hex codes (e.g., `#12E193`, `bg-[#030018]`) or arbitrary tailwind colors (`bg-blue-500`) in code.
  - **ALWAYS** use semantic tokens: `bg-primary`, `text-foreground`, `border-input`, `bg-sidebar`, etc. refer to `src/app/globals.css`.
- **Icons**: Use `iconoir-react`. Never use Lucide.
- **Radius**: Use `rounded-lg` (maps to `1.5rem`) for cards/containers.
- **Typography**:
  - **Headings**: `font-heading`, `text-foreground`, `font-bold`.
  - **Body**: `font-sans`, `text-foreground` (or `text-subtle-foreground` for non-critical text).
  - **Links/Actions**: `text-subtle-foreground` -> `hover:text-foreground`.

## The "Gary Simon" Polish Protocol

To avoid "messy" amateur UIs, apply these 3 golden rules during refinement:

1.  **Visual Hierarchy (The Squint Test)**
    - **Rule:** If everything is bold, nothing is bold.
    - **Fix:** Ensure the primary action is the _only_ thing that screams for attention. Demote everything else using `text-subtle-foreground`, smaller font sizes, or `font-normal`.

2.  **Whitespace (Let it Breathe)**
    - **Rule:** Amateur designs are cramped. Professional designs are spacious.
    - **Fix:** Double your margins. Use `py-24` or `py-32` for section spacing. Ensure cards have ample internal padding (`p-8`+).

3.  **Contrast & Readability**
    - **Rule:** Never place gray text on a dark background if it's meant to be read.
    - **Fix:** Use `text-white` or `text-foreground` on contrasting backgrounds. Check specifically for `text-muted-foreground` on dark cards—it's often too dim.

## Registry & Pattern Integration

- **Tailark / Shadcn Blocks:** When building landing page sections (Heroes, Features, Pricing), mimic the structure of **Tailark** or **Shadcn Blocks**.
  - _Concept:_ Clean, modular `section > container > grid` architecture.
  - _Pattern:_ Use `bg-background` for the page and `bg-card` with `border-border` for isolated components.
  - _Glassmorphism:_ Use `bg-white/5 backdrop-blur-sm border-white/10` for premium overlays.

## Validation Protocol

After implementation:

- Use the **Browser Agent** to capture a screenshot of the rendered UI.
- **Squint Test:** Can you identify the #1 action immediately?
- **Spacing Check:** Is there at least 100px (py-24) between major sections?
- **Dummy Data Check:** If the UI relies on hardcoded data, **EXPLICITLY** ask the user: _"The UI is polished, but it's using static mock data. Should I connect this to real data?"_
- Run `npx tsc --noemit` for code error and fix.
