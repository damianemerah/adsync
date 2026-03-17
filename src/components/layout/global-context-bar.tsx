"use client";

import { useState, useCallback } from "react";
import { useInsights } from "@/hooks/use-insights";
import { useAdAccounts } from "@/hooks/use-ad-account";
import { useCampaigns } from "@/hooks/use-campaigns";
import { useDashboardStore } from "@/store/dashboard-store";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Check,
  NavArrowDown,
  Calendar as CalendarIcon,
  Facebook,
  Download,
} from "iconoir-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { NotificationBell } from "@/components/layout/notification-bell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GlobalContextBarProps {
  onHealthCheckClick?: () => void;
  hasProblems?: boolean;
}

export function GlobalContextBar({
  onHealthCheckClick,
  hasProblems = false,
}: GlobalContextBarProps = {}) {
  const { data: accounts } = useAdAccounts();
  const { data: campaigns } = useCampaigns();

  // Store
  const {
    selectedPlatform,
    setSelectedPlatform,
    selectedAccountId,
    setSelectedAccountId,
    selectedCampaignIds,
    setSelectedCampaignIds,
    dateRange,
    setDateRange,
    status,
    setStatus,
  } = useDashboardStore();

  const [openAccount, setOpenAccount] = useState(false);
  const [openCampaign, setOpenCampaign] = useState(false);
  const [openPlatform, setOpenPlatform] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Use live insights for export
  const { data: insightsForExport } = useInsights({
    accountId: selectedAccountId || undefined,
    campaignIds: selectedCampaignIds,
    platform: selectedPlatform,
  });

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const performance = insightsForExport?.performance ?? [];
      if (performance.length === 0) {
        // Nothing to export
        setIsExporting(false);
        return;
      }

      // Build CSV
      const headers = ["Date", "Spend (₦)", "Impressions", "Clicks"];
      const rows = performance.map((row: any) => [
        row.date ?? "",
        row.spend ?? 0,
        row.impressions ?? 0,
        row.clicks ?? 0,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((r: any[]) => r.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = `adsync-performance-${new Date().toISOString().split("T")[0]}.csv`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [insightsForExport]);

  // Filter Accounts based on selected platform
  const filteredAccounts = accounts?.filter(
    (acc) => acc.platform === selectedPlatform,
  );

  const filteredCampaigns = campaigns?.filter((camp) => {
    if (camp.platform !== selectedPlatform) return false;
    if (selectedAccountId && camp.ad_account_id !== selectedAccountId)
      return false;
    return true;
  });

  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 lg:px-8 py-4 flex flex-col lg:flex-row gap-6 items-end justify-between">
        {/* Left Side: Filters */}
        <div className="flex items-end gap-3 flex-1 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
          {/* 1. Ad Platform */}
          <div className="flex-1 min-w-[180px] max-w-[220px] space-y-1.5">
            <DropdownMenu open={openPlatform} onOpenChange={setOpenPlatform}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openPlatform}
                  className="w-full h-14 justify-between rounded-2xl border-border bg-card hover:border-primary/50 transition-all px-4 py-2 items-center shadow-soft group"
                >
                  <div className="flex flex-col items-start gap-0.5 overflow-hidden text-left">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none group-hover:text-primary transition-colors">
                      Ad Platform
                    </span>
                    <div className="flex items-center gap-2 truncate w-full">
                      {selectedPlatform === "meta" && (
                        <Facebook className="h-3.5 w-3.5 text-[#1877f2] shrink-0" />
                      )}
                      {selectedPlatform === "tiktok" && (
                        <div className="h-3.5 w-3.5 rounded-full bg-black text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                          T
                        </div>
                      )}
                      <span className="truncate font-bold text-foreground text-sm leading-tight">
                        {selectedPlatform === "meta"
                          ? "Meta Ads"
                          : "TikTok Ads"}
                      </span>
                    </div>
                  </div>
                  <NavArrowDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[220px] rounded-2xl border-border shadow-soft"
                align="start"
              >
                <DropdownMenuCheckboxItem
                  checked={selectedPlatform === "meta"}
                  onCheckedChange={() => {
                    const currentAccount = accounts?.find(
                      (a) => a.id === selectedAccountId,
                    );
                    if (currentAccount && currentAccount.platform !== "meta") {
                      setSelectedAccountId("");
                    }
                    setSelectedPlatform("meta");
                    setOpenPlatform(false);
                  }}
                  className="py-2.5 font-medium cursor-pointer rounded-xl"
                >
                  Meta Ads
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedPlatform === "tiktok"}
                  onCheckedChange={() => {
                    const currentAccount = accounts?.find(
                      (a) => a.id === selectedAccountId,
                    );
                    if (
                      currentAccount &&
                      currentAccount.platform !== "tiktok"
                    ) {
                      setSelectedAccountId("");
                    }
                    setSelectedPlatform("tiktok");
                    setOpenPlatform(false);
                  }}
                  className="py-2.5 font-medium cursor-pointer rounded-xl"
                >
                  TikTok Ads
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 2. Ad Account */}
          <div className="flex-1 min-w-[180px] max-w-[220px] space-y-1.5">
            <Popover open={openAccount} onOpenChange={setOpenAccount}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openAccount}
                  className="w-full h-14 justify-between rounded-2xl border-border bg-card hover:border-primary/50 transition-all px-4 py-2 items-center shadow-soft group"
                >
                  <div className="flex flex-col items-start gap-0.5 overflow-hidden text-left">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none group-hover:text-primary transition-colors">
                      Ad Account
                    </span>
                    <span className="truncate font-bold text-foreground text-sm leading-tight w-full">
                      {selectedAccountId && accounts
                        ? accounts.find((a) => a.id === selectedAccountId)?.name
                        : "Select Account"}
                    </span>
                  </div>
                  <NavArrowDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[280px] p-0 rounded-2xl border-border shadow-soft"
                align="start"
              >
                <Command>
                  {/* ... content remains same ... */}
                  <CommandInput
                    placeholder="Search account..."
                    className="h-11 border-b-border"
                  />
                  <CommandList>
                    <CommandEmpty>No account found.</CommandEmpty>
                    <CommandGroup>
                      {filteredAccounts?.map((account) => (
                        <CommandItem
                          key={account.id}
                          value={account.name}
                          onSelect={() => {
                            setSelectedAccountId(
                              account.id === selectedAccountId
                                ? ""
                                : account.id,
                            );
                            setOpenAccount(false);
                          }}
                          className="py-3 font-medium cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 text-primary",
                              selectedAccountId === account.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {account.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* 4. Campaigns */}
          <div className="flex-1 min-w-[180px] max-w-[220px] space-y-1.5">
            <Popover open={openCampaign} onOpenChange={setOpenCampaign}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCampaign}
                  className="w-full h-14 justify-between rounded-2xl border-border bg-card hover:border-primary/50 transition-all px-4 py-2 items-center shadow-soft group"
                >
                  <div className="flex flex-col items-start gap-0.5 overflow-hidden text-left">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none group-hover:text-primary transition-colors">
                      Campaigns
                    </span>
                    <span className="truncate font-bold text-foreground text-sm leading-tight w-full">
                      {selectedCampaignIds.includes("all")
                        ? "All Selected"
                        : `${selectedCampaignIds.length} Selected`}
                    </span>
                  </div>
                  <NavArrowDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[290px] p-0 rounded-2xl border-border shadow-soft"
                align="start"
              >
                <Command>
                  {/* ... content remains same ... */}
                  <CommandInput
                    placeholder="Search campaigns..."
                    className="h-11 border-b-border"
                  />
                  <CommandList>
                    <CommandEmpty>No campaign found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all_campaigns_reset_value"
                        onSelect={() => {
                          setSelectedCampaignIds(["all"]);
                          setOpenCampaign(false);
                        }}
                        className="py-3 font-medium cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 text-primary",
                            selectedCampaignIds.includes("all")
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        All Campaigns
                      </CommandItem>
                      {filteredCampaigns?.map((camp) => (
                        <CommandItem
                          key={camp.id}
                          value={camp.name}
                          onSelect={() => {
                            const isAll = selectedCampaignIds.includes("all");
                            let newIds = [...selectedCampaignIds];

                            if (isAll) {
                              newIds = [camp.id];
                            } else {
                              if (newIds.includes(camp.id)) {
                                newIds = newIds.filter((id) => id !== camp.id);
                              } else {
                                newIds.push(camp.id);
                              }
                            }

                            if (newIds.length === 0) newIds = ["all"];
                            setSelectedCampaignIds(newIds);
                          }}
                          className="py-3 font-medium cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 text-primary",
                              selectedCampaignIds.includes(camp.id)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {camp.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Right Side: Filters & Date */}
        <div className="flex items-center gap-3 w-full lg:w-auto mt-4 lg:mt-0">
          {/* Status Filter */}
          <div className="hidden md:block">
            <Select value={status} onValueChange={(val) => setStatus(val)}>
              <SelectTrigger className="w-[140px] h-11 border-border bg-card rounded-xl font-medium text-foreground shadow-sm hover:border-primary/50 transition-colors">
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

          {/* Account Health Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onHealthCheckClick}
            title="Account Health Check"
            className={cn(
              "relative h-11 w-11 rounded-full transition-colors",
              hasProblems
                ? "text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {/* Shield / warning icon from iconoir */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                strokeLinejoin="round"
              />
              {hasProblems && (
                <>
                  <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
                  <circle cx="12" cy="15" r="0.5" fill="currentColor" />
                </>
              )}
              {!hasProblems && (
                <polyline
                  points="9 12 11 14 15 10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
            {hasProblems && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-background" />
            )}
          </Button>

          <NotificationBell />

          <div className="space-y-1.5 flex-1 lg:flex-none">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full lg:w-[220px] h-11 justify-start text-left font-semibold border-border rounded-xl bg-card hover:bg-muted/50 transition-colors shadow-sm"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM dd")} -{" "}
                          {format(dateRange.to, "MMM dd")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM dd, y")
                      )
                    ) : (
                      <span>Last 30 Days</span>
                    )}
                  </span>
                  <NavArrowDown className="ml-auto h-4 w-4 text-muted-foreground opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 rounded-2xl border-border shadow-soft"
                align="end"
              >
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange as any}
                  onSelect={(val: any) => setDateRange(val)}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || !insightsForExport?.performance?.length}
            className="h-11 px-5 gap-2 border-border rounded-xl bg-card font-bold text-subtle-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isExporting ? "Exporting..." : "Export"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
