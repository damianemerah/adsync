"use client";

import * as React from "react";
import {
  addDays,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { Calendar as CalendarIcon, NavArrowDown } from "iconoir-react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateRangeValue {
  from: Date | undefined;
  to: Date | undefined;
}

interface PresetDef {
  id: string;
  label: string;
  range: () => { from: Date; to: Date };
}

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const PRESETS: PresetDef[] = [
  {
    id: "yesterday",
    label: "Yesterday",
    range: () => {
      const y = startOfDay(subDays(new Date(), 1));
      return { from: y, to: y };
    },
  },
  {
    id: "last7",
    label: "Last 7 Days",
    range: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: startOfDay(new Date()),
    }),
  },
  {
    id: "thisWeek",
    label: "This week",
    range: () => ({
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: startOfDay(new Date()),
    }),
  },
  {
    id: "lastWeek",
    label: "Last week",
    range: () => {
      const lastWeekStart = startOfWeek(subDays(new Date(), 7), {
        weekStartsOn: 1,
      });
      return { from: lastWeekStart, to: addDays(lastWeekStart, 6) };
    },
  },
  {
    id: "last14",
    label: "Last 14 Days",
    range: () => ({
      from: startOfDay(subDays(new Date(), 13)),
      to: startOfDay(new Date()),
    }),
  },
  {
    id: "last30",
    label: "Last 30 Days",
    range: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: startOfDay(new Date()),
    }),
  },
  {
    id: "thisMonth",
    label: "This month",
    range: () => ({
      from: startOfMonth(new Date()),
      to: startOfDay(new Date()),
    }),
  },
  {
    id: "lastMonth",
    label: "Last month",
    range: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    },
  },
];

function matchPreset(range: DateRangeValue): string | null {
  if (!range.from || !range.to) return null;
  for (const preset of PRESETS) {
    const { from, to } = preset.range();
    if (isSameDay(from, range.from) && isSameDay(to, range.to)) {
      return preset.id;
    }
  }
  return null;
}

function formatTriggerLabel(range: DateRangeValue): string {
  if (!range.from) return "Last 30 Days";
  if (!range.to) return format(range.from, "MMM d, yyyy");
  return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  /** Compact icon-only trigger (used on mobile) */
  compact?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  compact = false,
  align = "end",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRangeValue>(value);

  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const activePreset = matchPreset(draft);

  const handleSelectPreset = (preset: PresetDef) => {
    setDraft(preset.range());
  };

  const handleSelect = () => {
    onChange(draft);
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-10 w-10 shrink-0 rounded-md bg-card",
              className,
            )}
            title="Date range"
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        ) : (
          <Button
            variant="outline"
            className={cn(
              "w-full lg:w-auto h-10 justify-start text-left border-border rounded-md bg-card hover:bg-muted/50 transition-colors px-3 gap-2",
              className,
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-foreground text-xs font-semibold">
              {formatTriggerLabel(value)}
            </span>
            <NavArrowDown className="ml-1 h-3 w-3 text-muted-foreground opacity-50 shrink-0" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 rounded-lg border border-border shadow-lg"
        align={align}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Preset rail — vertical on desktop, horizontal scroll on mobile */}
          <div
            className={cn(
              "shrink-0 border-border",
              "flex sm:flex-col",
              "overflow-x-auto sm:overflow-visible",
              "border-b sm:border-b-0 sm:border-r",
              "p-2 sm:p-3 sm:w-44",
              "no-scrollbar",
            )}
          >
            {PRESETS.map((preset) => {
              const active = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={cn(
                    "shrink-0 sm:w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    "whitespace-nowrap sm:whitespace-normal",
                    active
                      ? "bg-muted font-semibold text-foreground"
                      : "text-subtle-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Calendar + footer */}
          <div className="flex flex-col">
            <Calendar
              mode="range"
              defaultMonth={draft.from ?? new Date()}
              selected={draft.from ? { from: draft.from, to: draft.to } : undefined}
              onSelect={(val) =>
                setDraft({
                  from: val?.from,
                  to: val?.to,
                })
              }
              numberOfMonths={2}
              className="hidden sm:block"
            />
            <Calendar
              mode="range"
              defaultMonth={draft.from ?? new Date()}
              selected={draft.from ? { from: draft.from, to: draft.to } : undefined}
              onSelect={(val) =>
                setDraft({
                  from: val?.from,
                  to: val?.to,
                })
              }
              numberOfMonths={1}
              className="sm:hidden"
            />

            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
              <div className="text-xs text-subtle-foreground">
                {draft.from && draft.to ? (
                  <>
                    {format(draft.from, "MMM d, yyyy")} –{" "}
                    {format(draft.to, "MMM d, yyyy")}
                  </>
                ) : draft.from ? (
                  format(draft.from, "MMM d, yyyy")
                ) : (
                  "Pick a range"
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-8"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={handleSelect}
                  disabled={!draft.from || !draft.to}
                  className="h-8"
                >
                  Select
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
