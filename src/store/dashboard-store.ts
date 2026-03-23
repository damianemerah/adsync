import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays } from "date-fns";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DashboardState {
  selectedPlatform: string;
  selectedAccountId: string;
  selectedCampaignIds: string[];
  status: string; // "all" | "active" | "paused" | "completed" | "draft"
  searchQuery: string;
  dateRange: DateRange;

  // Actions
  setSelectedPlatform: (platform: string) => void;
  setSelectedAccountId: (accountId: string) => void;
  setSelectedCampaignIds: (campaignIds: string[]) => void;
  setStatus: (status: string) => void;
  setSearchQuery: (query: string) => void;
  setDateRange: (range: DateRange) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      selectedPlatform: "meta",
      selectedAccountId: "",
      selectedCampaignIds: ["all"],
      status: "all",
      searchQuery: "",
      dateRange: {
        from: addDays(new Date(), -30),
        to: new Date(),
      },

      setSelectedPlatform: (platform) => set({ selectedPlatform: platform }),
      setSelectedAccountId: (accountId) =>
        set({ selectedAccountId: accountId }),
      setSelectedCampaignIds: (campaignIds) =>
        set({ selectedCampaignIds: campaignIds }),
      setStatus: (status) => set({ status }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setDateRange: (range) => set({ dateRange: range }),
    }),
    {
      name: "tenzu-dashboard-context",
    },
  ),
);
