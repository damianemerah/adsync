"use client";

import { useState } from "react";

// Hook: detects '@' typed in an input/textarea and manages mention state
export function useAtMention(
  value: string,
  onChange: (v: string) => void,
  imageUrls: string[],
) {
  const [open, setOpen] = useState(false);
  const [atPos, setAtPos] = useState<number | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;

    // Bug 1 fix: use look-behind — check if the character just before
    // the cursor is '@' AND it's either at position 0 or preceded by
    // whitespace (so mid-word '@' inside an existing tag doesn't re-open).
    const charBefore = val[cursor - 1];
    const charBeforeThat = cursor >= 2 ? val[cursor - 2] : null;
    const isAtTrigger =
      charBefore === "@" &&
      (charBeforeThat === null || charBeforeThat === " " || charBeforeThat === "\n");

    if (imageUrls.length > 0 && isAtTrigger) {
      setAtPos(cursor - 1);
      setOpen(true);
    } else if (open) {
      // Any other keystroke closes the picker
      setOpen(false);
      setAtPos(null);
    }

    onChange(val);
  };

  // Called when user picks an image from the popup.
  // Replaces the triggering '@' with the full tag, then restores focus + cursor.
  const handleSelect = (
    tag: string,
    inputEl: HTMLInputElement | HTMLTextAreaElement | null,
  ) => {
    if (atPos === null) return;
    const before = value.slice(0, atPos);
    const after = value.slice(atPos + 1); // skip the '@'
    const spaceAfter = after.length && !after.startsWith(" ") ? " " : "";
    onChange(`${before}${tag}${spaceAfter}${after}`);
    const newCursor = atPos + tag.length + (spaceAfter ? 1 : 0);
    requestAnimationFrame(() => {
      if (!inputEl) return;
      inputEl.focus();
      inputEl.setSelectionRange(newCursor, newCursor);
    });
    setOpen(false);
    setAtPos(null);
  };

  const close = () => {
    setOpen(false);
    setAtPos(null);
  };

  return { mentionOpen: open, handleChange, handleSelect, closeMention: close };
}

// Absolute-positioned dropdown rendered directly in the textarea's relative container.
// `imageIndexOffset` shifts the @imageN label — use 1 in edit/refine mode because
// @image1 is reserved for the currentImage being edited (it comes first in imageInputs).
export function AtMentionDropdown({
  imageUrls,
  onSelect,
  imageIndexOffset = 0,
}: {
  imageUrls: string[];
  onSelect: (tag: string) => void;
  imageIndexOffset?: number;
}) {
  return (
    <div className="absolute z-50 top-full left-0 mt-1 w-52 rounded-md border border-border bg-popover shadow-md p-2">
      <p className="text-[10px] text-subtle-foreground mb-2 px-1">
        Click to insert into prompt
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {imageUrls.map((url, i) => {
          const label = `@image${i + 1 + imageIndexOffset}`;
          return (
            <button
              key={i}
              type="button"
              // onMouseDown + preventDefault keeps focus on the textarea
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(label);
              }}
              className="relative aspect-square rounded-md overflow-hidden border border-border hover:border-primary group cursor-pointer transition-colors"
            >
              <img
                src={url}
                alt={`Reference ${i + 1 + imageIndexOffset}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px] font-mono font-bold">
                  {label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Legacy alias — keeps campaign files compiling during migration
export { AtMentionDropdown as ReferenceImageMentionGrid };
