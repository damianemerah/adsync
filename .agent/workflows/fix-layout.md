---
description: Fix layout and spacing issues to ensure consistent UI alignment
---

1. [Analyze Container Usage] Check if the page uses the `container` utility or `max-w-7xl mx-auto` pattern.
   - **Rule:** All main page content MUST be constrained by a container to prevent it from stretching infinitely on large screens.
   - **Exception:** Full-width sections like Hero areas or Bento Grids that are explicitly designed to be edge-to-edge.

2. [Check Header Alignment] Verify that the page header (H1, actions) aligns perfectly with the main content body on the left and right axes.
   - **Violation:** A header that has `px-4` while the content has `px-0` (or vice versa), causing a visual "step".
   - **Fix:** Ensure both share the same padding strategy. If the content is in a `p-6` card, the header should likely be aligned with that padding or within the same container.

3. [Verify Spacing Consistency] Check vertical spacing between elements.
   - **Standard:** Use standard Tailwind spacing steps (e.g., `gap-6`, `space-y-6`, `my-8`).
   - **Avoid:** Arbitrary values like `mt-[33px]`.

4. [Refactor for Alignment] If misalignments are found:
   - Wrap the header and content in a shared parent `div` with `container mx-auto p-4` (or appropriate padding).
   - Alternatively, ensure both independent containers have identical `max-w` and `px` classes.

5. [Apply Visual Polish] Run `view_file .agent/skills/frontend-design/SKILL.md` to load the "Gary Simon" protocols.
   - **Check:** Is there enough whitespace? (Double it if unsure).
   - **Check:** Is the contrast sufficient?

6. [Visual Verification] Run `npx tsc --noemit` to ensure no breakages, then inspect the page to confirm elements share a Strong Vertical Axis.
