"use client";

import * as React from "react";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import your hooks if you want to populate the account list
import { useAdAccounts } from "@/hooks/use-ad-account";

export function GlobalFilter({ className }: { className?: string }) {
  const { data: accounts } = useAdAccounts();

  // Date State
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });

  return (
    <div
      className={cn(
        "sticky top-16 z-20 flex flex-col md:flex-row items-center gap-3 p-4 bg-white/80 backdrop-blur-md border-b border-slate-200",
        className
      )}
    >
      {/* 1. Account Selector */}
      <div className="w-full md:w-64">
        <label className="text-[10px] uppercase font-bold text-slate-400 pl-1 mb-1 block">
          Ad Account
        </label>
        <Select defaultValue={accounts?.[0]?.id || "all"}>
          <SelectTrigger className="h-9 border-slate-200 bg-white font-medium shadow-sm">
            <SelectValue placeholder="Select Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts?.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name} ({acc.platform === "meta" ? "FB" : "TK"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2. Platform Filter */}
      <div className="w-full md:w-40">
        <label className="text-[10px] uppercase font-bold text-slate-400 pl-1 mb-1 block">
          Platform
        </label>
        <Select defaultValue="all">
          <SelectTrigger className="h-9 border-slate-200 bg-white font-medium shadow-sm">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="meta">Meta Ads</SelectItem>
            <SelectItem value="tiktok">TikTok Ads</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1" />

      {/* 3. Date Range Picker (Shadcn Style) */}
      <div className="w-full md:w-auto">
        <label className="text-[10px] uppercase font-bold text-slate-400 pl-1 mb-1 block">
          Time Period
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-full md:w-[260px] h-9 justify-start text-left font-normal border-slate-200 shadow-sm",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
