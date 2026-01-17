"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  TrendingUp,
  DollarSign,
  MousePointer,
  Eye,
  MoreVertical,
  Facebook,
  Sparkles,
  Target,
  ArrowUpRight,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InsightsData } from "@/lib/api/insights";
import { GlobalFilter } from "@/components/layout/global-filter";

interface DashboardViewProps {
  insights: InsightsData;
  campaigns: Array<{
    id: string;
    name: string;
    platform: "meta" | "tiktok";
    status: "active" | "paused" | "draft" | "completed";
    dailyBudgetCents: number;
    createdAt: Date;
    adAccount: {
      platform: string;
      currency: string;
    } | null;
  }>;
  hasAccounts: boolean;
}

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
          <div className="h-5 w-5 rounded border border-slate-300 bg-white flex items-center justify-center cursor-pointer hover:border-slate-400"></div>
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

export function DashboardView({
  insights,
  campaigns,
  hasAccounts,
}: DashboardViewProps) {
  // Format helpers
  const formatMoney = (val: string) =>
    `₦${parseFloat(val || "0").toLocaleString()}`;
  const formatNumber = (val: string) => parseInt(val || "0").toLocaleString();

  // Metrics array
  const metrics = [
    {
      label: "Total Spend (30d)",
      value: formatMoney(insights.spend),
      change: "--",
      trend: "up" as const,
      icon: DollarSign,
      theme: "blue" as const,
    },
    {
      label: "Impressions",
      value: formatNumber(insights.impressions),
      change: "--",
      trend: "up" as const,
      icon: Eye,
      theme: "purple" as const,
    },
    {
      label: "Clicks",
      value: formatNumber(insights.clicks),
      change: "--",
      trend: "up" as const,
      icon: MousePointer,
      theme: "green" as const,
    },
    {
      label: "Avg. CPC",
      value: `₦${parseFloat(insights.cpc || "0").toFixed(2)}`,
      change: "--",
      trend: "down" as const,
      icon: Coins,
      theme: "orange" as const,
    },
    {
      label: "CTR",
      value: `${parseFloat(insights.ctr || "0").toFixed(2)}%`,
      change: "--",
      trend: "up" as const,
      icon: Target,
      theme: "purple" as const,
    },
  ];

  // Format campaign data for display
  const displayCampaigns = campaigns.map((campaign) => {
    const currency = campaign.adAccount?.currency || "NGN";
    const currencySymbol = currency === "NGN" ? "₦" : "$";

    return {
      ...campaign,
      createdAt: getRelativeTime(campaign.createdAt),
      spend: `${currencySymbol}${(
        campaign.dailyBudgetCents / 100
      ).toLocaleString()}`,
      thumbnail: campaign.platform === "meta" ? "bg-blue-100" : "bg-black",
    };
  });

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-8">
          <h1 className="text-xl font-heading font-bold text-slate-900">
            Overview
          </h1>

          {hasAccounts && (
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
                <div className="flex flex-col h-full justify-center items-center text-slate-500 mt-10">
                  <p>Chat interface coming in Phase 2...</p>
                  <p className="text-xs">"Analyze my December Campaign"</p>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>

      {/* Global Filter */}
      {hasAccounts && <GlobalFilter />}

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-700">Performance</h2>
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
              {displayCampaigns.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p>No campaigns yet. Create your first campaign!</p>
                </div>
              ) : (
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
                        Daily Budget
                      </TableHead>
                      <TableHead className="text-right pr-6 font-semibold text-slate-600">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayCampaigns.map((campaign) => (
                      <TableRow
                        key={campaign.id}
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
                              <Link
                                href={`/campaigns/${campaign.id}`}
                                className="font-bold text-slate-900 hover:text-blue-600"
                              >
                                {campaign.name}
                              </Link>
                              <p className="text-xs text-slate-500">
                                Created {campaign.createdAt}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-2">
                            {campaign.platform === "meta" && (
                              <div
                                className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200"
                                title="Meta"
                              >
                                <Facebook className="h-4 w-4 text-blue-600 fill-current" />
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
                              <DropdownMenuItem asChild>
                                <Link href={`/campaigns/${campaign.id}`}>
                                  View Report
                                </Link>
                              </DropdownMenuItem>
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
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Helper function for relative time
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}
