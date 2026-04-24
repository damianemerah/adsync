"use client";

import { NavArrowLeft, NavArrowRight } from "iconoir-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  /** Total number of items across all pages */
  total: number;
  /** Number of items per page */
  pageSize: number;
  /** Current page (1-based) */
  page: number;
  /** Called when the user changes page */
  onPageChange: (page: number) => void;
  className?: string;
}

/** Maximum number of page buttons to show before using ellipsis */
const MAX_VISIBLE = 5;

function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= MAX_VISIBLE) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  // Always show first, last, current and its neighbours
  const delta = 1; // neighbours on each side of current
  const range: Set<number> = new Set([1, total]);

  for (let i = current - delta; i <= current + delta; i++) {
    if (i > 1 && i < total) range.add(i);
  }

  const sorted = Array.from(range).sort((a, b) => a - b);

  // Insert ellipsis where there are gaps
  const result: (number | "...")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) result.push("...");
    result.push(n);
    prev = n;
  }
  return result;
}

export function Pagination({
  total,
  pageSize,
  page,
  onPageChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null; // Nothing to paginate

  const pages = getPageRange(page, totalPages);
  const isFirst = page === 1;
  const isLast = page === totalPages;

  return (
    <div className={cn("flex items-center justify-between gap-2 p-2", className)}>
      {/* Left: item count summary */}
      <p className="text-xs text-subtle-foreground hidden sm:block shrink-0">
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </p>

      {/* Right: page buttons */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Prev */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-border"
          disabled={isFirst}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <NavArrowLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1 text-subtle-foreground text-sm select-none"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg text-sm font-semibold",
                p === page
                  ? "border-primary"
                  : "border-border text-foreground hover:bg-muted",
              )}
              onClick={() => onPageChange(p as number)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          ),
        )}

        {/* Next */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-border"
          disabled={isLast}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <NavArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
