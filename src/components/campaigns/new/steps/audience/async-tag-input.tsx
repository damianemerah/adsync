"use client";

import { useState, useEffect, useRef } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

interface AsyncTagInputProps {
  placeholder: string;
  searchType: "location" | "interest" | "behavior" | "life-events" | "work-position" | "industry";
  onAdd: (value: any) => void;
  /** Extra query-string params appended to the search API call (e.g. { type: "region" }) */
  searchParams?: Record<string, string>;
}

export function AsyncTagInput({
  placeholder,
  searchType,
  onAdd,
  searchParams,
}: AsyncTagInputProps) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (value.length > 2) {
        setLoading(true);
        setOpen(true);
        try {
          const extraParams = searchParams
            ? "&" + new URLSearchParams(searchParams).toString()
            : "";
          const res = await fetch(
            `/api/meta/search-${searchType}?query=${encodeURIComponent(value)}${extraParams}`,
          );
          const data = await res.json();
          // The API sometimes returns data inside a data object depending on the route
          const resultsArray = Array.isArray(data)
            ? data
            : data?.data && Array.isArray(data.data)
              ? data.data
              : [];
          setResults(resultsArray);
        } catch {
          // silent
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setOpen(false);
      }
    }, 400);
    return () => clearTimeout(delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, searchType, JSON.stringify(searchParams)]);

  return (
    <div ref={containerRef} className="relative w-full">
      <Command
        shouldFilter={false}
        className="h-auto overflow-visible border border-border rounded-lg bg-muted/30 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all **:[[cmdk-input-wrapper]]:border-0 **:[[cmdk-input-wrapper]]:px-2"
      >
        <CommandInput
          placeholder={placeholder}
          value={value}
          onValueChange={(val) => setValue(val)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          className="h-8 text-xs"
        />
        {open && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1">
            {loading ? (
              <div className="bg-popover text-xs p-2 border border-border rounded-lg shadow-sm text-center text-subtle-foreground">
                Searching...
              </div>
            ) : results.length > 0 ? (
              <CommandList className="bg-popover text-popover-foreground rounded-lg shadow-sm border border-border overflow-hidden p-1 max-h-[200px]">
                <CommandGroup heading="Results">
                  {results.map((item) => (
                    <CommandItem
                      key={item.id || item.key}
                      onSelect={() => {
                        onAdd(item);
                        setValue("");
                        setOpen(false);
                      }}
                      className="text-xs cursor-pointer aria-selected:bg-primary/10 aria-selected:text-primary"
                    >
                      {searchType === "location" ? (
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          <span className="text-xs text-subtle-foreground capitalize">
                            {item.type} • {item.country_name}
                          </span>
                        </div>
                      ) : (
                        <span>{item.name}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            ) : null}
          </div>
        )}
      </Command>
    </div>
  );
}
