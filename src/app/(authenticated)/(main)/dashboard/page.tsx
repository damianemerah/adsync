"use client";

import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { useAdAccounts } from "@/hooks/use-ad-account";
import { useInsights } from "@/hooks/use-insights"; // Import Hook
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { GlobalFilter } from "@/components/layout/global-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Plus,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  MousePointer,
  Eye,
  MoreVertical,
  Facebook,
  Sparkles,
  Calendar,
  Loader2,
  Target,
  ArrowUpRight,
  Coins,
} from "lucide-react";

import { cn } from "@/lib/utils";

// 1. Updated Colored Metric Card Component
function MetricCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  theme = "blue",
}: {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: any;
  theme: "blue" | "green" | "purple" | "orange";
}) {
  // Theme Styles map
  const themes = {
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-100",
      icon: "text-blue-600",
      fill: "bg-blue-100",
    },
    green: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-100",
      icon: "text-green-600",
      fill: "bg-green-100",
    },
    purple: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-100",
      icon: "text-purple-600",
      fill: "bg-purple-100",
    },
    orange: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-100",
      icon: "text-orange-600",
      fill: "bg-orange-100",
    },
  };

  const style = themes[theme];

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md border",
        style.border,
        style.bg
      )}
    >
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("p-2.5 rounded-xl", style.fill)}>
            <Icon className={cn("h-5 w-5", style.icon)} />
          </div>
          {/* Checkbox for chart toggling (WASK style) */}
          <div className="h-5 w-5 rounded border border-slate-300 bg-white flex items-center justify-center cursor-pointer hover:border-slate-400">
            {/* <Check className="h-3 w-3" /> */}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-500 mb-1">{label}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
              trend === "up"
                ? "bg-white/80 text-green-700"
                : "bg-white/80 text-red-700"
            )}
          >
            {trend === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowUpRight className="h-3 w-3 rotate-90" />
            )}
            {change}
          </span>
          <span className="text-xs text-slate-500">vs last 30 days</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  // 1. Fetch Ad Accounts (Real Data)
  const { data: accounts, isLoading: isAuthLoading } = useAdAccounts();
  const { data: insights, isLoading: isStatsLoading } = useInsights(); // Fetch Data

  const isLoading = isAuthLoading || isStatsLoading;

  // Logic: New User if no accounts connected
  const isNewUser = !isAuthLoading && (!accounts || accounts.length === 0);

  // Format Helper
  const formatMoney = (val: string) =>
    `₦${parseFloat(val || "0").toLocaleString()}`;
  const formatNumber = (val: string) => parseInt(val || "0").toLocaleString();

  // // Mock Data for Dashboard (In V2, use useDashboardMetrics hook)
  // const metrics = [
  //   {
  //     icon: DollarSign,
  //     label: "Ad Spend (MTD)",
  //     value: "₦127,450",
  //     change: "+12.3%",
  //     trend: "up",
  //     color: "text-blue-600",
  //     bg: "bg-blue-50",
  //     sublabel: "Budget cap: ₦200,000",
  //   },
  //   {
  //     icon: TrendingUp,
  //     label: "Active Campaigns",
  //     value: "8",
  //     sublabel: "3 paused",
  //     trend: null,
  //     color: "text-purple-600",
  //     bg: "bg-purple-50",
  //   },
  //   {
  //     icon: MousePointer,
  //     label: "Total Clicks",
  //     value: "2,847",
  //     change: "+8.1%",
  //     trend: "up",
  //     color: "text-green-600",
  //     bg: "bg-green-50",
  //     sublabel: "Avg CPC: ₦45",
  //   },
  //   {
  //     icon: Eye,
  //     label: "Total Reach",
  //     value: "45.2K",
  //     change: "-2.3%",
  //     trend: "down",
  //     color: "text-orange-600",
  //     bg: "bg-orange-50",
  //     sublabel: "CPM: ₦1,200",
  //   },
  // ];

  const campaigns = [
    {
      name: "December Holiday Sale",
      createdAt: "2 days ago",
      platforms: ["meta", "tiktok"],
      status: "active",
      spend: "₦12,450",
      clicks: "847",
      ctr: "2.8%",
      thumbnail: "bg-blue-100",
    },
    {
      name: "New Product Launch",
      createdAt: "5 days ago",
      platforms: ["meta"],
      status: "active",
      spend: "₦8,200",
      clicks: "532",
      ctr: "3.2%",
      thumbnail: "bg-green-100",
    },
  ];

  // Added CPC metric
  // Map Real API Data to Cards
  const metrics = [
    {
      label: "Total Spend (30d)",
      value: insights ? formatMoney(insights.spend) : "...",
      change: "--", // Calculating change requires 2 API calls (This month vs Last). Skipping for MVP.
      trend: "up" as const,
      icon: DollarSign,
      theme: "blue" as const,
    },
    {
      label: "Impressions",
      value: insights ? formatNumber(insights.impressions) : "...",
      change: "--",
      trend: "up" as const,
      icon: Eye,
      theme: "purple" as const,
    },
    {
      label: "Clicks",
      value: insights ? formatNumber(insights.clicks) : "...",
      change: "--",
      trend: "up" as const,
      icon: MousePointer,
      theme: "green" as const,
    },
    {
      label: "Avg. CPC",
      value: insights
        ? `₦${parseFloat(insights.cpc || "0").toFixed(2)}`
        : "...",
      change: "--",
      trend: "down" as const,
      icon: Coins,
      theme: "orange" as const,
    },
    {
      label: "CTR",
      value: insights
        ? `${parseFloat(insights.ctr || "0").toFixed(2)}%`
        : "...",
      change: "--",
      trend: "up" as const,
      icon: Target,
      theme: "purple" as const,
    },
  ];

  // Loading Screen
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar />
        <div className="ml-64 flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 1. Header with AI Button */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-8">
          <h1 className="text-xl font-heading font-bold text-slate-900">
            Overview
          </h1>

          {/* AI Assistant Trigger */}
          {!isNewUser && (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-900 font-bold shadow-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  Ask AI Assistant
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    AdSync AI Consultant
                  </SheetTitle>
                </SheetHeader>
                {/* Placeholder for Chat Interface */}
                <div className="flex flex-col h-full justify-center items-center text-slate-500 mt-10">
                  <p>Chat interface coming in Phase 2...</p>
                  <p className="text-xs">"Analyze my December Campaign"</p>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      {/* Global Filter (NEW) */}
      {!isNewUser && <GlobalFilter />}

      {/* Main Dashboard Body */}
      <main className="flex-1 p-8 overflow-y-auto">
        {isNewUser ? (
          <DashboardEmptyState />
        ) : (
          <div className="mx-auto max-w-7xl space-y-8">
            {/* 1. Alerts Section (Critical) */}
            {/* <Alert
              variant="destructive"
              className="bg-red-50 border-red-100 text-red-900"
            >
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800 font-bold">
                Payment Method Failed
              </AlertTitle>
              <AlertDescription className="text-red-700">
                Your Meta ad account payment was declined. Update your card on
                Facebook to resume ads.
                <Link
                  href="/ad-accounts"
                  className="ml-2 font-bold underline underline-offset-2"
                >
                  Check Status →
                </Link>
              </AlertDescription>
            </Alert> */}
            {/* 2. Welcome & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-700">
                  Performance
                </h2>
                <p className="text-sm text-slate-500">
                  Real-time metrics from your campaigns.
                </p>
              </div>
              <Link href="/campaigns/new">
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 font-bold">
                  <Plus className="h-5 w-5 mr-2" />
                  New Campaign
                </Button>
              </Link>
            </div>
            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {metrics.map((m, i) => (
                <MetricCard key={i} {...m} />
              ))}
            </div>
            {/* Recent Campaigns Table */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 py-5 bg-white rounded-t-xl">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-bold text-lg text-slate-900">
                    Recent Campaigns
                  </CardTitle>
                  <Link href="/campaigns">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View All Campaigns →
                    </Button>
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="pl-6 font-semibold text-slate-600">
                        Campaign Name
                      </TableHead>
                      <TableHead className="font-semibold text-slate-600">
                        Platform
                      </TableHead>
                      <TableHead className="font-semibold text-slate-600">
                        Status
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-600">
                        Spend
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-600">
                        Clicks
                      </TableHead>
                      <TableHead className="text-right pr-6 font-semibold text-slate-600">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign, index) => (
                      <TableRow
                        key={index}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-lg ${campaign.thumbnail} flex items-center justify-center`}
                            >
                              <TrendingUp className="h-5 w-5 text-slate-500 opacity-50" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">
                                {campaign.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                Created {campaign.createdAt}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-2">
                            {campaign.platforms.includes("meta") && (
                              <div
                                className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200"
                                title="Meta"
                              >
                                <Facebook className="h-4 w-4 text-blue-600 fill-current" />
                              </div>
                            )}
                            {campaign.platforms.includes("tiktok") && (
                              <div
                                className="h-8 w-8 rounded-full bg-black flex items-center justify-center border border-slate-700"
                                title="TikTok"
                              >
                                <svg
                                  className="h-4 w-4 text-white fill-current"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`rounded-full px-3 py-1 font-semibold ${
                              campaign.status === "active"
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            <span
                              className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                                campaign.status === "active"
                                  ? "bg-green-600 animate-pulse"
                                  : "bg-slate-500"
                              }`}
                            ></span>
                            {campaign.status === "active" ? "Active" : "Paused"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right font-mono font-medium text-slate-700">
                          {campaign.spend}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-600">
                          {campaign.clicks}
                        </TableCell>

                        <TableCell className="text-right pr-6">
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
                              <DropdownMenuItem>View Report</DropdownMenuItem>
                              <DropdownMenuItem>Edit Budget</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 font-medium">
                                {campaign.status === "active"
                                  ? "Pause Campaign"
                                  : "Delete Campaign"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
