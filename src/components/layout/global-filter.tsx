import * as React from "react";
import { Search } from "iconoir-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useDashboardStore } from "@/store/dashboard-store";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GlobalFilter({ className }: { className?: string }) {
  const { searchQuery, setSearchQuery, status, setStatus } =
    useDashboardStore();

  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between w-full",
        className,
      )}
    >
      {/* 1. Search */}
      <div className="relative max-w-md w-full md:w-80 group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search campaigns..."
          className="pl-10 bg-background border-border focus:border-primary/50 rounded-xl shadow-sm transition-all h-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 2. Filter Group */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status */}
        <Select value={status} onValueChange={(val) => setStatus(val)}>
          <SelectTrigger className="w-[140px] bg-background border-border rounded-xl h-10 shadow-sm hover:border-primary/50 transition-colors">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border shadow-soft">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
