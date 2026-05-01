"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useInsights } from "@/hooks/use-insights";
import { useAdAccountsList } from "@/hooks/use-ad-account";
import { useCampaignsList } from "@/hooks/use-campaigns";
import { useDashboardStore } from "@/store/dashboard-store";
import { getAccountHealth } from "@/actions/account-health";
import { AccountHealthDialog } from "@/components/dashboard/account-health-dialog";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Check,
  NavArrowDown,
  Download,
  Building,
  Megaphone,
} from "iconoir-react";
import { MetaIcon } from "@/components/ui/meta-icon";
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
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { NotificationBell } from "@/components/layout/notification-bell";
import { HelpCenterSheet } from "@/components/layout/help-center-sheet";

function HealthCheckButton({
  hasProblems,
  onClick,
  className,
}: {
  hasProblems: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      title="Account Health Check"
      className={cn(
        "relative h-10 w-10 rounded-md transition-colors bg-card hover:bg-muted/50",
        hasProblems
          ? "text-status-warning hover:text-status-warning border-status-warning/40 hover:border-status-warning/60"
          : "text-muted-foreground hover:text-foreground border-border",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
        {hasProblems ? (
          <>
            <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
            <circle cx="12" cy="15" r="0.5" fill="currentColor" />
          </>
        ) : (
          <polyline points="9 12 11 14 15 10" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      {hasProblems && (
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-status-warning ring-2 ring-background" />
      )}
    </Button>
  );
}

export function GlobalContextBar() {
  // Self-managed account health — works on every page that renders this bar
  const { data: healthData } = useQuery({
    queryKey: ["account-health"],
    queryFn: getAccountHealth,
    staleTime: 5 * 60 * 1000,
  });
  const hasProblems = (healthData?.totalProblems ?? 0) > 0;

  // Dialog state — self-contained, no parent wiring needed
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);

  const handleHealthCheckClick = useCallback(() => {
    setHealthDialogOpen(true);
  }, []);
  const { data: accounts } = useAdAccountsList();
  const { data: campaigns } = useCampaignsList();

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
      const headers = ["Date", "Spend (₦)", "People Reached", "Clicks"];
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

  // Auto-select platform and account if missing
  useEffect(() => {
    if (!accounts?.length) return;

    // ✅ Reset stale account ID if it no longer exists (fixes disconnect/reconnect bug)
    if (selectedAccountId && !accounts.find((a) => a.id === selectedAccountId)) {
      setSelectedAccountId("");
    }

    if (!selectedPlatform) {
      setSelectedPlatform(accounts[0].platform);
    }

    if (!selectedAccountId) {
      const platformAccounts = accounts.filter(
        (a) => a.platform === (selectedPlatform || accounts[0].platform),
      );
      if (platformAccounts.length > 0) {
        setSelectedAccountId(platformAccounts[0].id);
      } else {
        setSelectedAccountId(accounts[0].id);
        setSelectedPlatform(accounts[0].platform);
      }
    }
  }, [
    accounts,
    selectedAccountId,
    selectedPlatform,
    setSelectedAccountId,
    setSelectedPlatform,
  ]);

  // Filter Accounts based on selected platform
  const filteredAccounts = accounts?.filter(
    (acc) => acc.platform === selectedPlatform,
  );

  const filteredCampaigns = campaigns?.filter((camp) => {
    if (camp.platform && camp.platform !== selectedPlatform) return false;
    if (selectedAccountId && camp.ad_account_id && camp.ad_account_id !== selectedAccountId) return false;
    if (selectedAccountId && !camp.ad_account_id && camp.status !== "draft") return false;
    return true;
  });

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeFilterSummary = (() => {
    const platformLabel = selectedPlatform === "meta" ? "Meta" : "TikTok";
    const accountName = selectedAccountId
      ? accounts?.find((a) => a.id === selectedAccountId)?.name
      : null;
    return accountName ? `${platformLabel} · ${accountName}` : platformLabel;
  })();

  const handlePlatformChange = useCallback((platform: "meta" | "tiktok") => {
    const currentAccount = accounts?.find((a) => a.id === selectedAccountId);
    if (currentAccount && currentAccount.platform !== platform) {
      setSelectedAccountId("");
    }
    setSelectedPlatform(platform);
  }, [accounts, selectedAccountId, setSelectedAccountId, setSelectedPlatform]);

  const toggleCampaign = useCallback((campId: string) => {
    const isAll = selectedCampaignIds.includes("all");
    let newIds = [...selectedCampaignIds];

    if (isAll) {
      newIds = [campId];
    } else {
      if (newIds.includes(campId)) {
        newIds = newIds.filter((id) => id !== campId);
      } else {
        newIds.push(campId);
      }
    }

    if (newIds.length === 0) newIds = ["all"];
    setSelectedCampaignIds(newIds);
  }, [selectedCampaignIds, setSelectedCampaignIds]);

  return (
    <div className="sticky top-0 z-40 backdrop-blur-md border-b border-border">
      <div className="mx-auto px-4 lg:px-8 py-2.5 flex flex-col lg:flex-row gap-3 items-center justify-between w-full">
        {/* Left Side: Filters */}
        <div className="flex items-center flex-row gap-2 flex-1 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 no-scrollbar snap-x">
          {/* 1. Ad Platform */}
          <div className="shrink-0 snap-start">
            <DropdownMenu open={openPlatform} onOpenChange={setOpenPlatform}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openPlatform}
                  className="h-auto py-1.5 flex justify-between w-auto rounded-md bg-card hover:bg-muted/50 transition-colors px-3 items-center border border-border gap-3 group"
                >
                  <div className="flex flex-col items-start gap-0.5 text-left">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none">
                      Platform
                    </span>
                    <div className="flex items-center gap-1.5">
                      {selectedPlatform === "meta" && (
                        <MetaIcon className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {selectedPlatform === "tiktok" && (
                        <div className="h-3 w-3 rounded-full bg-brand-tiktok text-brand-tiktok-foreground flex items-center justify-center text-[0.45rem] font-bold shrink-0">
                          T
                        </div>
                      )}
                      <span className="font-semibold text-foreground text-xs leading-none">
                        {selectedPlatform === "meta"
                          ? "Meta Ads"
                          : "TikTok Ads"}
                      </span>
                    </div>
                  </div>
                  <NavArrowDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[220px] rounded-md border border-border p-1"
                align="start"
              >
                <DropdownMenuCheckboxItem
                  checked={selectedPlatform === "meta"}
                  onCheckedChange={() => {
                    handlePlatformChange("meta");
                    setOpenPlatform(false);
                  }}
                  className="py-2.5 font-medium cursor-pointer rounded-md text-sm"
                >
                  Meta Ads
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={selectedPlatform === "tiktok"}
                  onCheckedChange={() => {
                    handlePlatformChange("tiktok");
                    setOpenPlatform(false);
                  }}
                  className="py-2.5 font-medium cursor-pointer rounded-md text-sm"
                >
                  TikTok Ads
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 2. Ad Account */}
          <div className="shrink-0 snap-start">
            <Popover open={openAccount} onOpenChange={setOpenAccount}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openAccount}
                  className="h-auto py-1.5 flex justify-between w-auto rounded-md bg-card hover:bg-muted/50 transition-colors px-3 items-center border border-border gap-3 group"
                >
                  <div className="flex flex-col items-start gap-0.5 text-left">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none">
                      Ad Account
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-foreground text-xs leading-none max-w-[140px] truncate">
                        {selectedAccountId && accounts
                          ? accounts.find((a) => a.id === selectedAccountId)?.name
                          : "Select Account"}
                      </span>
                    </div>
                  </div>
                  <NavArrowDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[280px] p-0 rounded-md border border-border"
                align="start"
              >
                <Command>
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
                          className="py-2.5 font-medium cursor-pointer text-sm"
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

          {/* 3. Campaigns */}
          <div className="shrink-0 snap-start">
            <Popover open={openCampaign} onOpenChange={setOpenCampaign}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCampaign}
                  className="h-auto py-1.5 flex justify-between w-auto rounded-md bg-card hover:bg-muted/50 transition-colors px-3 items-center border border-border gap-3 group"
                >
                  <div className="flex flex-col items-start gap-0.5 text-left">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none">
                      Campaigns
                      {!selectedCampaignIds.includes("all") && (
                        <span className="ml-1 text-primary">({selectedCampaignIds.length})</span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Megaphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-foreground text-xs leading-none max-w-[120px] truncate">
                        {selectedCampaignIds.includes("all")
                          ? "All Selected"
                          : `${selectedCampaignIds.length} Selected`}
                      </span>
                    </div>
                  </div>
                  <NavArrowDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[290px] p-0 rounded-md border border-border"
                align="start"
              >
                <Command>
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
                        className="py-2.5 font-medium cursor-pointer text-sm"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 text-primary",
                            selectedCampaignIds.includes("all")
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        All Ads
                      </CommandItem>
                      {filteredCampaigns?.map((camp) => (
                        <CommandItem
                          key={camp.id}
                          value={camp.name}
                          onSelect={() => {
                            toggleCampaign(camp.id);
                          }}
                          className="py-2.5 font-medium cursor-pointer text-sm"
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
        <div className="flex items-center flex-row gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 no-scrollbar snap-x shrink-0">
          {/* Account Health Button */}
          <div className="shrink-0 snap-start">
            <HealthCheckButton
              hasProblems={hasProblems}
              onClick={handleHealthCheckClick}
            />
          </div>

          <div className="shrink-0 snap-start">
            <NotificationBell />
          </div>

          <div className="shrink-0 snap-start">
            <DateRangePicker
              value={dateRange}
              onChange={(val) => setDateRange(val)}
            />
          </div>
          
          <div className="hidden lg:block shrink-0">
            <HelpCenterSheet />
          </div>

          <div className="shrink-0 snap-start">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting || !insightsForExport?.performance?.length}
              className="h-10 px-3 gap-1.5 rounded-md bg-card font-medium text-sm text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-subtle-foreground" />
              <span className="hidden sm:inline">
                {isExporting ? "Exporting..." : "Export"}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Account Health Dialog — rendered here so it works on every page */}
      <AccountHealthDialog
        open={healthDialogOpen}
        onOpenChange={setHealthDialogOpen}
      />
    </div>
  );
}
