"use client";

import * as React from "react";
import { useState } from "react";
import { LayoutGrid, List, Search, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  title: string | React.ReactNode;
  className?: string;
  headerClassName?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  /** Optional: Custom renderer for the Grid/Card view. If not provided, falls back to a simple list. */
  renderCard?: (row: T) => React.ReactNode;
  /** Enables the toggle between Table (List) and Grid (Card) views */
  enableViewToggle?: boolean;
  defaultView?: "table" | "grid";
  onRowClick?: (row: T) => void;
  /** Adds a search bar if provided (You can handle the logic in parent) */
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  emptyState,
  isLoading,
  renderCard,
  enableViewToggle = false,
  defaultView = "table",
  onRowClick,
  searchable = false,
  searchPlaceholder = "Search...",
  onSearch,
}: DataTableProps<T>) {
  const [viewMode, setViewMode] = useState<"table" | "grid">(defaultView);

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Toolbar (Search & Toggle) */}
      {(enableViewToggle || searchable) && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Search Input */}
          {searchable && (
            <div className="relative w-full max-w-sm">
              {/* Note: You can replace this with your Shadcn Input component if you prefer */}
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
                onChange={(e) => onSearch?.(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          )}

          {/* View Toggles */}
          {enableViewToggle && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-8 w-8 rounded-md transition-all",
                    viewMode === "grid"
                      ? "bg-white text-blue-600 shadow-sm hover:bg-white"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "h-8 w-8 rounded-md transition-all",
                    viewMode === "table"
                      ? "bg-white text-blue-600 shadow-sm hover:bg-white"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- GRID VIEW --- */}
      {viewMode === "grid" && (
        <div
          className={cn(
            "grid gap-6",
            renderCard ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
          )}
        >
          {data.length === 0 ? (
            <div className="col-span-full">
              {emptyState || <DefaultEmptyState />}
            </div>
          ) : (
            data.map((row, i) => (
              <React.Fragment key={row.id || i}>
                {renderCard ? (
                  // 1. Use Custom Card Renderer (Complex Cards)
                  renderCard(row)
                ) : (
                  // 2. Fallback: Simple Key-Value Card
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5 space-y-3">
                      {columns.map((column) => (
                        <div
                          key={column.key}
                          className="flex justify-between items-center border-b border-slate-50 last:border-0 pb-2 last:pb-0"
                        >
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {column.title}
                          </span>
                          <span className="text-sm font-medium text-slate-900">
                            {column.render
                              ? column.render(row)
                              : (row as any)[column.key]}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </React.Fragment>
            ))
          )}
        </div>
      )}

      {/* --- TABLE VIEW --- */}
      {viewMode === "table" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-100">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "h-12 font-semibold text-slate-600",
                      column.headerClassName
                    )}
                  >
                    {column.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-start"
                  >
                    {emptyState || <DefaultEmptyState />}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, i) => (
                  <TableRow
                    key={row.id || i}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-slate-50 transition-colors hover:bg-slate-50/80",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={`${i}-${column.key}`}
                        className={cn("py-4", column.className)}
                      >
                        {column.render
                          ? column.render(row)
                          : (row as any)[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function DefaultEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
        <Search className="h-6 w-6 text-slate-400" />
      </div>
      <p className="font-medium text-slate-900">No results found</p>
      <p className="text-sm text-slate-500">
        Try adjusting your filters or search query.
      </p>
    </div>
  );
}
