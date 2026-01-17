"use client";

import { useState } from "react";
import Link from "next/link";
import { useCampaigns } from "@/hooks/use-campaigns";
import { updateCampaignStatus } from "@/actions/campaigns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  Facebook,
  MoreVertical,
  AlertCircle,
  Eye,
  Edit,
  Copy,
  Pause,
  Trash,
  X,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Column, DataTable } from "@/components/ui/data-table";
import type { CampaignListItem } from "@/lib/api/campaigns";

interface CampaignsViewProps {
  campaigns: CampaignListItem[];
}

interface Campaign {
  id: string;
  name: string;
  platform: "meta" | "tiktok" | null;
  status: "active" | "paused" | "draft" | "completed";
  budget: number;
  currency: string;
  createdAt: string;
  clicks: number;
  spend: number;
  ctr: number;
}

export function CampaignsView({ campaigns: rawCampaigns }: CampaignsViewProps) {
  const { syncCampaigns, isSyncing } = useCampaigns();
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const router = useRouter();

  const handleAction = async (
    id: string,
    action: "PAUSED" | "ACTIVE" | "ARCHIVED",
  ) => {
    toast.promise(updateCampaignStatus(id, action), {
      loading: "Updating campaign...",
      success: () => {
        router.refresh();
        return "Campaign updated";
      },
      error: "Failed to update campaign",
    });
  };

  // Transform server data to display format
  const campaigns: Campaign[] = rawCampaigns.map((c) => ({
    id: c.id,
    name: c.name,
    platform: c.platform,
    status: c.status,
    budget: c.dailyBudgetCents / 100,
    currency: c.adAccount?.currency || "₦",
    createdAt: getRelativeTime(c.createdAt),
    clicks: c.clicks || 0,
    spend: c.spend || 0,
    ctr: c.ctr ? Number(c.ctr) : 0,
  }));

  // Handle Selection
  const toggleSelection = (id: string) => {
    setSelectedCampaigns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const columns: Column<Campaign>[] = [
    {
      key: "select",
      title: (
        <Checkbox
          checked={selectedCampaigns.length === campaigns.length}
          onCheckedChange={() => {
            if (selectedCampaigns.length === campaigns.length) {
              setSelectedCampaigns([]);
            } else {
              setSelectedCampaigns(campaigns.map((c) => c.id));
            }
          }}
        />
      ),
      className: "w-12",
      render: (campaign) => (
        <Checkbox
          checked={selectedCampaigns.includes(campaign.id)}
          onCheckedChange={() => toggleSelection(campaign.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "campaign",
      title: "Campaign",
      render: (campaign) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-200 relative shrink-0 flex items-center justify-center text-slate-500 text-xs font-medium uppercase">
            {campaign.name.substring(0, 2)}
          </div>
          <div>
            <Link
              href={`/campaigns/${campaign.id}`}
              className="font-bold text-slate-900 hover:text-blue-600"
            >
              {campaign.name}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge
                variant="secondary"
                className="px-1 py-0 text-[10px] h-4 uppercase"
              >
                {campaign.platform || "meta"}
              </Badge>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (campaign) => (
        <Badge
          variant={campaign.status === "active" ? "default" : "secondary"}
          className={
            campaign.status === "active"
              ? "bg-green-100 text-green-700 hover:bg-green-100"
              : "bg-yellow-50 text-yellow-700"
          }
        >
          {campaign.status}
        </Badge>
      ),
    },
    {
      key: "dailyBudget",
      title: "Budget/Day",
      render: (campaign) => (
        <span className="font-medium text-slate-600">
          {campaign.currency}
          {campaign.budget.toLocaleString()}
        </span>
      ),
    },
    {
      key: "spend",
      title: "Spend",
      render: (campaign) => (
        <span className="font-bold text-slate-900">
          {campaign.currency}
          {campaign.spend.toLocaleString()}
        </span>
      ),
    },
    {
      key: "results",
      title: "Results",
      render: (campaign) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">
            {(campaign.clicks || 0).toLocaleString()} Clicks
          </span>
          <span className="text-xs text-slate-500">{campaign.ctr}% CTR</span>
        </div>
      ),
    },
    {
      key: "action",
      title: "Action",
      className: "pr-6",
      render: (campaign) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-200"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2" asChild>
                <Link href={`/campaigns/${campaign.id}`}>
                  <Eye className="h-4 w-4" /> View Details
                </Link>
              </DropdownMenuItem>

              {/* Dynamic Actions based on status */}
              {campaign.status === "active" ? (
                <DropdownMenuItem
                  onClick={() => handleAction(campaign.id, "PAUSED")}
                  className="text-yellow-600 gap-2"
                >
                  <Pause className="h-4 w-4" /> Pause
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => handleAction(campaign.id, "ACTIVE")}
                  className="text-green-600 gap-2"
                >
                  <TrendingUp className="h-4 w-4" /> Resume
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-red-600"
                onClick={() => handleAction(campaign.id, "ARCHIVED")}
              >
                <Trash className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const renderCampaignCard = (campaign: Campaign) => (
    <Card
      key={campaign.id}
      className={`group relative overflow-hidden border transition-all hover:shadow-xl hover:-translate-y-1 duration-300 cursor-pointer ${
        campaign.status === "active"
          ? "border-t-4 border-t-green-500"
          : "border-t-4 border-t-slate-300"
      }`}
      onClick={() => (window.location.href = `/campaigns/${campaign.id}`)}
    >
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Checkbox
          checked={selectedCampaigns.includes(campaign.id)}
          onCheckedChange={() => toggleSelection(campaign.id)}
        />
      </div>

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1 pl-6">
            <h3 className="font-bold text-lg text-slate-900 truncate">
              {campaign.name}
            </h3>
            <div className="mt-2 flex items-center gap-2">
              {campaign.platform === "meta" && (
                <div className="rounded-full bg-blue-50 p-1 ring-2 ring-white">
                  <Facebook className="h-3 w-3 text-blue-600 fill-current" />
                </div>
              )}
              <Badge
                variant="secondary"
                className="px-2 py-0 text-[10px] h-4 uppercase"
              >
                {campaign.platform || "meta"}
              </Badge>
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-700"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit Campaign</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  Stop Campaign
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pb-6">
        <div>
          <div className="flex items-center justify-between text-xs font-medium mb-1.5">
            <span className="text-slate-500">Daily Budget</span>
            <span className="text-slate-900">
              {campaign.currency}
              {campaign.budget.toLocaleString()}
            </span>
          </div>
          <Progress
            value={(campaign.spend / campaign.budget) * 100}
            className="h-1.5 bg-slate-100"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-slate-50">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Spend
            </p>
            <p className="text-lg font-bold text-slate-900">
              {campaign.currency}
              {campaign.spend}
            </p>
          </div>
          <div className="text-center border-l border-slate-100">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Clicks
            </p>
            <p className="text-lg font-bold text-slate-900">
              {campaign.clicks}
            </p>
          </div>
          <div className="text-center border-l border-slate-100">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              CTR
            </p>
            <p className="text-lg font-bold text-slate-900">{campaign.ctr}%</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-slate-50 p-3 flex justify-between items-center text-xs text-slate-500 font-medium">
        <span className="flex items-center gap-1.5">
          <div
            className={`h-2 w-2 rounded-full ${
              campaign.status === "active"
                ? "bg-green-500 animate-pulse"
                : "bg-yellow-500"
            }`}
          />
          {campaign.status === "active" ? "Running" : "Paused"}
        </span>
        <span>Started {campaign.createdAt}</span>
      </CardFooter>
    </Card>
  );

  // Filter campaigns for tab counts
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const pausedCampaigns = campaigns.filter((c) => c.status === "paused").length;

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-8">
          <h1 className="text-xl font-heading font-bold text-slate-900">
            Campaigns
          </h1>
        </div>
      </header>

      {/* Toolbar */}
      <div className="sticky top-16 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl px-8 py-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 w-full items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name, ID or tag..."
                className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              />
            </div>
            <Button
              variant="outline"
              className="border-slate-200 text-slate-600"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>

            <Button
              variant="outline"
              className="border-slate-200 text-slate-600 bg-white hover:text-blue-600 hover:border-blue-200"
              onClick={() => syncCampaigns()}
              disabled={isSyncing}
            >
              <div className={`mr-2 ${isSyncing ? "animate-spin" : ""}`}>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              </div>
              {isSyncing ? "Syncing..." : "Sync"}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/campaigns/new">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 font-bold"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Campaign
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Workspace */}
      <main className="flex-1 p-8">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-11 inline-flex">
            <TabsTrigger value="all" className="rounded-lg px-4 h-9">
              All{" "}
              <Badge
                variant="secondary"
                className="ml-2 bg-slate-200 text-slate-600"
              >
                {campaigns.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg px-4 h-9">
              Active{" "}
              <Badge
                variant="secondary"
                className="ml-2 bg-green-100 text-green-700"
              >
                {activeCampaigns}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="paused" className="rounded-lg px-4 h-9">
              Paused{" "}
              <Badge
                variant="secondary"
                className="ml-2 bg-yellow-100 text-yellow-700"
              >
                {pausedCampaigns}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0 space-y-6">
            {campaigns.length > 0 ? (
              <DataTable
                columns={columns}
                data={campaigns}
                renderCard={renderCampaignCard}
                enableViewToggle={true}
                onRowClick={(row) =>
                  (window.location.href = `/campaigns/${row.id}`)
                }
                searchable={true}
                searchPlaceholder="Search campaigns..."
                onSearch={(term) => console.log("Search term:", term)}
              />
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed">
                <AlertCircle className="h-12 w-12 text-slate-400 mb-4 mx-auto" />
                <h3 className="font-bold text-slate-700">No campaigns yet</h3>
                <p className="text-slate-500 mb-4">
                  Launch your first ad in minutes.
                </p>
                <Link href="/campaigns/new">
                  <Button className="bg-blue-600">Create Campaign</Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-0 space-y-6">
            <DataTable
              columns={columns}
              data={campaigns.filter((c) => c.status === "active")}
              renderCard={renderCampaignCard}
              enableViewToggle={true}
              onRowClick={(row) =>
                (window.location.href = `/campaigns/${row.id}`)
              }
              searchable={true}
              searchPlaceholder="Search active campaigns..."
            />
          </TabsContent>

          <TabsContent value="paused" className="mt-0 space-y-6">
            <DataTable
              columns={columns}
              data={campaigns.filter((c) => c.status === "paused")}
              renderCard={renderCampaignCard}
              enableViewToggle={true}
              onRowClick={(row) =>
                (window.location.href = `/campaigns/${row.id}`)
              }
              searchable={true}
              searchPlaceholder="Search paused campaigns..."
            />
          </TabsContent>
        </Tabs>

        {/* Floating Action Bar */}
        {selectedCampaigns.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-6 z-40">
            <span className="font-medium text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              {selectedCampaigns.length} selected
            </span>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Pause className="w-4 h-4 mr-2" /> Pause
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-slate-800"
              >
                <Trash className="w-4 h-4 mr-2" /> Delete
              </Button>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSelectedCampaigns([])}
              className="ml-2 h-6 w-6 rounded-full hover:bg-slate-800"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

// Helper function for relative time
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}
