"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Target,
  ImageIcon,
  Activity,
  ChevronRight,
  Edit,
  MoreVertical,
  DollarSign,
  Eye,
  MousePointer,
  TrendingUp,
  Facebook,
  Instagram,
  CheckCircle2,
  Wallet,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { Campaign } from "@/lib/api/campaigns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CampaignDetailViewProps {
  campaign: Campaign;
}

// Configuration for Metrics
const METRIC_CONFIG = {
  spend: { label: "Spend", color: "#2563EB", icon: DollarSign, theme: "blue" },
  impressions: {
    label: "Impressions",
    color: "#9333EA",
    icon: Eye,
    theme: "purple",
  },
  clicks: {
    label: "Clicks",
    color: "#16A34A",
    icon: MousePointer,
    theme: "green",
  },
  ctr: { label: "CTR", color: "#EA580C", icon: Target, theme: "orange" },
};

type MetricKey = keyof typeof METRIC_CONFIG;

export function CampaignDetailView({ campaign }: CampaignDetailViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>([
    "spend",
    "clicks",
  ]);
  const [status, setStatus] = useState(campaign.status);

  // Destructure with safe defaults
  const {
    summary,
    performance,
    ads = [],
    demographics = { age: [], gender: [] },
    accountBalance = null,
    currency,
  } = campaign as any;

  const currencySymbol = currency === "NGN" ? "₦" : "$";

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <div>
      {/* Header Area */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-8 py-6">
          {/* Breadcrumbs */}
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
            <Link
              href="/campaigns"
              className="hover:text-slate-900 transition-colors"
            >
              Campaigns
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900">{campaign.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              {/* Platform Icon */}
              <div className="flex -space-x-3">
                {campaign.platform === "meta" && (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-md ring-4 ring-white z-10">
                      <Facebook className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 shadow-md ring-4 ring-white">
                      <Instagram className="h-6 w-6 text-white" />
                    </div>
                  </>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {campaign.name}
                </h1>
                <div className="mt-1.5 flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize px-2.5 py-0.5",
                      status === "active"
                        ? "bg-green-100 text-green-700"
                        : status === "paused"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-slate-100 text-slate-600",
                    )}
                  >
                    <span
                      className={cn(
                        "mr-1.5 h-1.5 w-1.5 rounded-full",
                        status === "active" && "animate-pulse bg-green-500",
                      )}
                    />
                    {status}
                  </Badge>
                  <span className="text-sm font-medium text-slate-500">
                    {campaign.objective
                      ? `${campaign.objective} Objective`
                      : "Campaign"}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-sm text-slate-500">
                    {campaign.launchedAt
                      ? `Started ${campaign.launchedAt.toLocaleDateString()}`
                      : "Not launched"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Pause/Resume Toggle */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <span className="text-sm font-semibold text-slate-700">
                  {status === "active" ? "Active" : "Paused"}
                </span>
                <Switch
                  checked={status === "active"}
                  onCheckedChange={() =>
                    setStatus(status === "active" ? "paused" : "active")
                  }
                />
              </div>

              <Button
                variant="outline"
                className="gap-2 bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                <Edit className="h-4 w-4" /> Edit
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white border-slate-200"
                  >
                    <MoreVertical className="h-4 w-4 text-slate-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem>Export CSV</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-slate-100 bg-white px-8">
          <div className="mx-auto max-w-7xl">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="h-12 bg-transparent p-0 w-full justify-start gap-8">
                <CustomTabTrigger
                  value="overview"
                  icon={BarChart3}
                  label="Overview"
                />
                <CustomTabTrigger
                  value="ads"
                  icon={ImageIcon}
                  label="Ads"
                  count={ads.length}
                />
                <CustomTabTrigger
                  value="audience"
                  icon={Users}
                  label="Audience"
                />
                <CustomTabTrigger
                  value="activity"
                  icon={Activity}
                  label="Activity Log"
                />
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 mx-auto max-w-7xl w-full">
        {/* Balance Alert */}
        {accountBalance !== null && accountBalance < 5000 && (
          <div className="mb-8">
            <Alert className="bg-yellow-50 text-yellow-900 border-yellow-200">
              <Wallet className="h-4 w-4" />
              <AlertTitle>Low Ad Account Balance</AlertTitle>
              <AlertDescription>
                You have {currencySymbol}
                {accountBalance.toLocaleString()} remaining.
                <a
                  href="https://facebook.com/ads/manager/billing"
                  target="_blank"
                  className="underline font-bold ml-1"
                >
                  Top up on Facebook
                </a>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {/* --- OVERVIEW TAB --- */}
          <TabsContent value="overview" className="mt-0 space-y-6">
            {/* 1. Interactive Metric Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {(Object.entries(METRIC_CONFIG) as [MetricKey, any][]).map(
                ([key, config]) => {
                  const isActive = activeMetrics.includes(key);
                  const Icon = config.icon;
                  let value = summary?.[key]?.toLocaleString() || "0";
                  if (key === "spend") value = `${currencySymbol}${value}`;
                  if (key === "ctr")
                    value = `${summary?.[key]?.toFixed(2) || 0}%`;

                  return (
                    <Card
                      key={key}
                      onClick={() => toggleMetric(key)}
                      className={cn(
                        "cursor-pointer transition-all border-2",
                        isActive
                          ? `border-${config.theme}-500 bg-${config.theme}-50/30`
                          : "border-slate-200 hover:border-slate-300",
                      )}
                    >
                      <CardContent className="p-5 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                isActive
                                  ? `bg-${config.theme}-600 border-${config.theme}-600`
                                  : "border-slate-300 bg-white",
                              )}
                            >
                              {isActive && (
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <p className="text-sm font-semibold text-slate-500">
                              {config.label}
                            </p>
                          </div>
                          <p className="text-2xl font-bold text-slate-900 mt-1">
                            {value}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "p-3 rounded-xl",
                            isActive
                              ? `bg-${config.theme}-100 text-${config.theme}-700`
                              : "bg-slate-100 text-slate-400",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                },
              )}
            </div>

            {/* 2. Dynamic Chart */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  {performance && performance.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={performance}
                        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f1f5f9"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          dx={-10}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Legend />
                        {activeMetrics.map((key) => (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={METRIC_CONFIG[key].label}
                            stroke={METRIC_CONFIG[key].color}
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6 }}
                            animationDuration={1000}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 flex-col gap-2">
                      <TrendingUp className="h-10 w-10 opacity-20" />
                      <p>No performance data available yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- ADS TAB --- */}
          <TabsContent value="ads" className="mt-0">
            {ads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ads.map((ad: any) => (
                  <Card
                    key={ad.id}
                    className="overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-video relative bg-slate-100">
                      <img
                        src={ad.image || "/placeholder.svg"}
                        className="object-cover w-full h-full"
                        alt={ad.name}
                      />
                      <Badge
                        className={cn(
                          "absolute top-2 right-2",
                          ad.status === "active"
                            ? "bg-green-500"
                            : "bg-slate-500",
                        )}
                      >
                        {ad.status}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3
                        className="font-bold text-slate-900 mb-2 truncate"
                        title={ad.name}
                      >
                        {ad.name}
                      </h3>
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
                        <div>
                          <span className="block text-slate-400">Spend</span>
                          <span className="font-semibold">
                            {currencySymbol}
                            {ad.spend}
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Clicks</span>
                          <span className="font-semibold">{ad.clicks}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400">CTR</span>
                          <span className="font-semibold">
                            {parseFloat(ad.ctr).toFixed(2)}%
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-400">CPC</span>
                          <span className="font-semibold">
                            {currencySymbol}
                            {(ad.spend / (ad.clicks || 1)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">No ads found</p>
                <p className="text-sm text-slate-400">
                  Sync your campaign to see ads
                </p>
              </div>
            )}
          </TabsContent>

          {/* --- AUDIENCE TAB --- */}
          <TabsContent value="audience" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Age Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Age Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full flex items-center justify-center">
                    {demographics?.age?.length > 0 ? (
                      <div className="relative w-full h-full">
                        <BarChart3 className="w-full h-full text-slate-200 absolute opacity-10" />
                        {/* Simplified visual representation */}
                        <div className="flex flex-col gap-3 w-full z-10 pt-4 relative">
                          {demographics.age.map((item: any) => (
                            <div
                              key={item.name}
                              className="flex items-center gap-2"
                            >
                              <span className="w-12 text-sm text-slate-500">
                                {item.name}
                              </span>
                              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500"
                                  style={{
                                    width: `${(item.value / Math.max(...demographics.age.map((i: any) => i.value))) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500">No age data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Gender Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Gender Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full flex items-center justify-center">
                    {demographics?.gender?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={demographics.gender}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {demographics.gender.map(
                              (entry: any, index: number) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    ["#3b82f6", "#ec4899", "#a855f7"][index % 3]
                                  }
                                />
                              ),
                            )}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-slate-500">No gender data available</p>
                    )}
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    {demographics?.gender?.map((item: any, index: number) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: ["#3b82f6", "#ec4899", "#a855f7"][
                              index % 3
                            ],
                          }}
                        />
                        <span className="text-sm text-slate-600 capitalize">
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* --- ACTIVITY LOG TAB --- */}
          <TabsContent value="activity" className="mt-0">
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
              <Activity className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">Activity Log</p>
              <p className="text-sm text-slate-400">
                No recent changes detected.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// --- Sub-Components ---

function CustomTabTrigger({ value, icon: Icon, label, count }: any) {
  return (
    <TabsTrigger
      value={value}
      className="gap-2 px-0 h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none bg-transparent font-medium text-slate-500 hover:text-slate-800 transition-colors"
    >
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && count > 0 && (
        <Badge
          variant="secondary"
          className="ml-1 bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          {count}
        </Badge>
      )}
    </TabsTrigger>
  );
}
