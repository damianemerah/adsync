"use client";

import * as React from "react";
import { useState } from "react";
import { ViewGrid, List, Search } from "iconoir-react";
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
import { Pagination } from "@/components/ui/pagination";
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
  renderCard?: (row: T) => React.ReactNode;
  enableViewToggle?: boolean;
  defaultView?: "table" | "grid";
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  striped?: boolean;
  /** Number of rows per page. Omit (or 0) to disable pagination. */
  pageSize?: number;
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
  striped = true,
  pageSize,
}: DataTableProps<T>) {
  const [viewMode, setViewMode] = useState<"table" | "grid">(defaultView);
  const [page, setPage] = useState(1);

  // Calculate total pages
  const totalPages =
    pageSize && pageSize > 0 ? Math.ceil(data.length / pageSize) : 1;

  // Reset page if it exceeds likely range (e.g. data filtered down)
  // We use a layout effect or effect to correct "out of bounds" page
  React.useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1);
    }
  }, [data.length, page, totalPages]);

  // Slice data for current page when pagination is enabled
  const paginated =
    pageSize && pageSize > 0
      ? data.slice((page - 1) * pageSize, page * pageSize)
      : data;

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-12 w-64 rounded-lg" />
          <Skeleton className="h-12 w-24 rounded-lg" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Toolbar (Search & Toggle) */}
      {(enableViewToggle || searchable) && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          {searchable && (
            <div className="relative w-full max-w-sm">
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="w-full h-12 pl-12 pr-4 rounded-lg border border-border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all placeholder:text-muted-foreground"
                onChange={(e) => onSearch?.(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
          )}

          {enableViewToggle && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex bg-muted p-1.5 rounded-lg border border-border">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-9 w-9 rounded-md transition-all",
                    viewMode === "grid"
                      ? "bg-background text-primary shadow-sm border border-border hover:bg-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ViewGrid className="h-5 w-5" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "h-9 w-9 rounded-md transition-all",
                    viewMode === "table"
                      ? "bg-background text-primary shadow-sm border border-border hover:bg-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <List className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === "grid" && (
        <>
          <div
            className={cn(
              "grid gap-6",
              renderCard ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1",
            )}
          >
            {paginated.length === 0 ? (
              <div className="col-span-full">
                {emptyState || <DefaultEmptyState />}
              </div>
            ) : (
              paginated.map((row, i) => (
                <React.Fragment key={row.id || i}>
                  {renderCard ? (
                    renderCard(row)
                  ) : (
                    <Card className="rounded-lg border-border shadow-sm border border-border hover:shadow-md transition-all duration-300">
                      <CardContent className="p-6 space-y-4">
                        {columns.map((column) => (
                          <div
                            key={column.key}
                            className="flex justify-between items-center border-b border-border last:border-0 pb-3 last:pb-0"
                          >
                            <span className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
                              {column.title}
                            </span>
                            <span className="text-sm font-semibold text-foreground">
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

          {pageSize && pageSize > 0 && data.length > pageSize && (
            <Pagination
              total={data.length}
              pageSize={pageSize}
              page={page}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <>
          <div className="rounded-lg border border-border bg-card shadow-sm border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-border">
                  {columns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={cn(
                        "h-14 font-bold text-xs uppercase tracking-wider bg-primary-foreground text-subtle-foreground border-x border-border first:border-l-0 last:border-r-0",
                        column.headerClassName,
                      )}
                    >
                      {column.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-48 text-center"
                    >
                      {emptyState || <DefaultEmptyState />}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((row, i) => (
                    <TableRow
                      key={row.id || i}
                      onClick={() => onRowClick?.(row)}
                      className={cn(
                        "border-border transition-colors hover:bg-muted/40",
                        onRowClick && "cursor-pointer",
                        striped && "even:bg-sidebar-border",
                      )}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={`${i}-${column.key}`}
                          className={cn(
                            "py-5 text-sm font-medium text-foreground border-x border-border/50 first:border-l-0 last:border-r-0",
                            column.className,
                          )}
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

          {pageSize && pageSize > 0 && data.length > pageSize && (
            <Pagination
              total={data.length}
              pageSize={pageSize}
              page={page}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function DefaultEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12">
      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="font-heading font-semibold text-foreground text-lg mb-1">
        No results found
      </p>
      <p className="text-sm text-muted-foreground">
        Try adjusting your filters or search query.
      </p>
    </div>
  );
}
