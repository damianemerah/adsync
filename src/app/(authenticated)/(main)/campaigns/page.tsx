"use client";

import { useState } from "react";
import Link from "next/link";
import { useCampaigns } from "@/hooks/use-campaigns"; // Import Hook
// import Image from "next/image"; // Removed Image as thumbnail is no longer in data
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
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Removed Avatar
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
  Loader2,
  AlertCircle,
  Eye,
  Edit,
  Copy,
  Pause,
  Trash,
  X,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Column, DataTable } from "@/components/ui/data-table";

interface Campaign {
  // Interface to match hook output
  id: string;
  name: string;
  platform: "meta" | "tiktok" | null; // Corrected type to include null
  status: "active" | "paused" | "draft" | "completed"; // Assuming these statuses
  budget: number;
  currency: string;
  createdAt: string;
  clicks: number;
  spend: number;
  ctr: number;
}

export default function CampaignsPage() {
  const { data: campaigns, isLoading, isError, syncCampaigns, isSyncing } = useCampaigns(); // Real Data
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid"); // Keep view mode state, though not used in prompt snippet
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]); // Changed to string[] for UUIDs

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen ml-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen ml-64 text-red-600">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-lg font-semibold">Error loading campaigns.</p>
        <p className="text-sm">Please try again later.</p>
      </div>
    );
  }

  // Handle Selection
  const toggleSelection = (id: string) => {
    setSelectedCampaigns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const columns: Column<Campaign>[] = [
    {
      key: "select",
      title: (
        <Checkbox
          checked={selectedCampaigns.length === (campaigns?.length || 0)}
          onCheckedChange={() => {
            if (selectedCampaigns.length === (campaigns?.length || 0)) {
              setSelectedCampaigns([]);
            } else {
              setSelectedCampaigns(campaigns?.map((c) => c.id) || []);
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
          {" "}
          {/* Removed Image component */}
          {/* Placeholder for thumbnail, or consider removing if not needed */}
          <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-200 relative shrink-0 flex items-center justify-center text-slate-500 text-xs font-medium uppercase">
            {campaign.name.substring(0, 2)}
          </div>
          <div>
            <p className="font-bold text-slate-900">{campaign.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {" "}
              {/* Badge for platform */}
              <Badge
                variant="secondary"
                className="px-1 py-0 text-[10px] h-4 uppercase"
              >
                {campaign.platform}
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
            {campaign.clicks} Clicks
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
              <DropdownMenuItem className="gap-2">
                <Eye className="h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Edit className="h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Copy className="h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-red-600">
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
      className={`group relative overflow-hidden border transition-all hover:shadow-xl hover:-translate-y-1 duration-300 ${
        campaign.status === "active"
          ? "border-t-4 border-t-green-500"
          : "border-t-4 border-t-slate-300"
      }`}
    >
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Checkbox
          checked={selectedCampaigns.includes(campaign.id)}
          onCheckedChange={() => toggleSelection(campaign.id)}
          // Removed className="bg-white border-slate-300 h-5 w-5"
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
              {campaign.platform === "tiktok" && (
                <div className="rounded-full bg-black p-1 ring-2 ring-white">
                  <svg
                    className="h-3 w-3 text-white fill-current"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </div>
              )}
              <Badge
                variant="secondary"
                className="px-2 py-0 text-[10px] h-4 uppercase"
              >
                {campaign.platform}
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
            value={(campaign.spend / campaign.budget) * 100} // Calculate progress dynamically
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
              {(campaign.spend / 1000).toFixed(1)}K
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
  const activeCampaigns =
    campaigns?.filter((c) => c.status === "active").length || 0;
  const pausedCampaigns =
    campaigns?.filter((c) => c.status === "paused").length || 0;

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

            {/* NEW SYNC BUTTON */}
            <Button
              variant="outline"
              className="border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 bg-white"
              onClick={() => syncCampaigns()}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
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
                {campaigns?.length || 0}
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
            {campaigns && campaigns.length > 0 ? (
              <DataTable
                columns={columns}
                data={campaigns}
                renderCard={renderCampaignCard}
                enableViewToggle={true}
                onRowClick={(row) => console.log("Row clicked:", row)}
                searchable={true}
                searchPlaceholder="Search campaigns..."
                onSearch={(term) => console.log("Search term:", term)}
              />
            ) : (
              <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed">
                <AlertCircle className="h-12 w-12 text-slate-400 mb-4 mx-auto" />{" "}
                {/* Added icon */}
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
        </Tabs>

        {/* Floating Action Bar (Unchanged) */}
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
