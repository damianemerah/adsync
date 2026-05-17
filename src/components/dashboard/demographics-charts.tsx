"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6, var(--chart-1))",
];



const tooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  color: "var(--popover-foreground)",
  fontSize: "13px",
  fontWeight: 500,
  zIndex: 50,
};

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={tooltipStyle} className="px-3 py-2.5 flex flex-col gap-1.5">
      {label && <div className="text-xs font-medium text-foreground mb-0.5">{label}</div>}
      {payload.map((entry: any, index: number) => {
        const formatted = formatter ? formatter(entry.value, entry.name, entry) : [entry.value, entry.name];
        const displayValue = Array.isArray(formatted) ? formatted[0] : entry.value;
        const displayName = Array.isArray(formatted) ? formatted[1] : entry.name;
        const color = entry.color || entry.payload?.fill || entry.fill || "var(--chart-1)";
        return (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span 
              className="w-1 h-3 rounded-full shrink-0" 
              style={{ backgroundColor: color }} 
            />
            <span className="text-subtle-foreground">{displayName}</span>
            <span className="text-foreground font-semibold ml-auto pl-4">{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatSpend(n: number): string {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(1)}k`;
  return `₦${n.toFixed(0)}`;
}

type RawEntry = {
  gender?: string;
  age?: string;
  region?: string;
  name?: string;
  impressions?: string | number;
  spend?: string | number;
  value?: number;
};

function parseSpend(entry: RawEntry): number {
  const raw = entry.spend;
  if (typeof raw === "string") return parseFloat(raw) || 0;
  if (typeof raw === "number") return raw;
  return 0;
}

function parseImpressions(entry: RawEntry): number {
  const raw = entry.impressions ?? entry.value;
  if (typeof raw === "string") return parseInt(raw, 10) || 0;
  if (typeof raw === "number") return raw;
  return 0;
}

function normalizeGenderData(raw: RawEntry[]) {
  if (!raw?.length) return [];
  return raw
    .map((entry) => {
      const rawName = entry.name || entry.gender || "Unknown";
      const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
      return { name, impressions: parseImpressions(entry), spend: parseSpend(entry) };
    })
    .sort((a, b) => b.spend - a.spend);
}

function normalizeAgeData(raw: RawEntry[]) {
  if (!raw?.length) return [];
  return raw.map((entry) => ({
    age: entry.age || "Unknown",
    impressions: parseImpressions(entry),
    spend: parseSpend(entry),
  }));
}

function normalizeRegionData(raw: RawEntry[]) {
  if (!raw?.length) return [];
  return raw
    .map((entry) => ({
      region: entry.region || "Unknown",
      impressions: parseImpressions(entry),
      spend: parseSpend(entry),
    }))
    .sort((a, b) => b.spend - a.spend);
}

function topWithOthers(
  data: Array<{ region: string; spend: number; impressions: number }>,
  top = 5,
) {
  if (data.length <= top) return data;
  const leading = data.slice(0, top);
  const rest = data.slice(top);
  const othersSpend = rest.reduce((s, r) => s + r.spend, 0);
  const othersImpressions = rest.reduce((s, r) => s + r.impressions, 0);
  return [...leading, { region: "Others", spend: othersSpend, impressions: othersImpressions }];
}

// ─── Interactive legend ────────────────────────────────────────────────────────
type LegendItem = { key: string; label: string };

function InteractiveLegend({
  items,
  hidden,
  onToggle,
  colors,
}: {
  items: LegendItem[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
  colors: string[];
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 pt-1">
      {items.map((item, i) => {
        const isHidden = hidden.has(item.key);
        return (
          <button
            key={item.key}
            onClick={() => onToggle(item.key)}
            className="flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none"
          >
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{
                backgroundColor: colors[i % colors.length],
                opacity: isHidden ? 0.25 : 1,
                transition: "opacity 0.2s",
              }}
            />
            <span
              style={{
                color: isHidden ? "var(--muted-foreground)" : "var(--foreground)",
                transition: "color 0.2s",
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function DemographicsCharts({ demographics }: { demographics: Record<string, unknown[]> }) {
  const rawAge = (demographics?.age as RawEntry[]) || [];
  const rawGender = (demographics?.gender as RawEntry[]) || [];
  const rawRegion = (demographics?.region as RawEntry[]) || [];
  const age = normalizeAgeData(rawAge);
  const gender = normalizeGenderData(rawGender);
  const region = normalizeRegionData(rawRegion);
  const regionSlices = topWithOthers(region);

  const [hiddenGender, setHiddenGender] = useState<Set<string>>(new Set());
  const [hiddenRegion, setHiddenRegion] = useState<Set<string>>(new Set());

  const visibleGender = gender.filter((g) => !hiddenGender.has(g.name));
  const visibleRegion = regionSlices.filter((r) => !hiddenRegion.has(r.region));

  const totalRegionSpend = region.reduce((s, r) => s + r.spend, 0);
  const totalGenderSpend = gender.reduce((s, g) => s + g.spend, 0);

  function toggleGender(key: string) {
    setHiddenGender((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleRegion(key: string) {
    setHiddenRegion((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const genderLegendItems: LegendItem[] = gender.map((g) => ({ key: g.name, label: g.name }));
  const regionLegendItems: LegendItem[] = regionSlices.map((r) => ({
    key: r.region,
    label: r.region,
  }));

  return (
    <>
      {/* Spend By Age */}
      <Card className="min-w-[280px] shrink-0 md:min-w-0 border border-border flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading font-semibold text-foreground">
            Spend By Age
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <div className="h-[200px] sm:h-[260px] w-full overflow-visible">
            {age.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={age} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="age"
                    fontSize={12}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--subtle-foreground)"
                  />
                  <YAxis
                    fontSize={12}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--subtle-foreground)"
                    tickFormatter={(v: number) => formatSpend(v)}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--accent)", opacity: 0.3 }}
                    content={<ChartTooltip />}
                    wrapperStyle={{ outline: "none", zIndex: 50 }}
                    formatter={(value: number) => [formatSpend(value), "Ad Spend"]}
                  />
                  <Bar dataKey="spend" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="spend" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-subtle-foreground text-sm">
                No age data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Spend By Gender — aggregated donut, sorted by spend, interactive legend */}
      <Card className="min-w-[280px] shrink-0 md:min-w-0 border border-border flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading font-semibold text-foreground">
            Spend By Gender
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 h-[160px] sm:h-[210px] w-full overflow-visible">
            {gender.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visibleGender}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="spend"
                    nameKey="name"
                    stroke="var(--card)"
                    strokeWidth={2}
                    isAnimationActive
                    animationDuration={400}
                  >
                    {visibleGender.map((entry) => {
                      const originalIndex = gender.findIndex((g) => g.name === entry.name);
                      return (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={CHART_COLORS[originalIndex % CHART_COLORS.length]}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    content={<ChartTooltip />}
                    wrapperStyle={{ outline: "none", zIndex: 50 }}
                    formatter={(value: number, name: string) => [
                      `${formatSpend(value)} (${totalGenderSpend > 0 ? ((value / totalGenderSpend) * 100).toFixed(0) : 0}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-subtle-foreground text-sm">
                No gender data available
              </div>
            )}
          </div>
          {gender.length > 0 && (
            <InteractiveLegend
              items={genderLegendItems}
              hidden={hiddenGender}
              onToggle={toggleGender}
              colors={CHART_COLORS}
            />
          )}
        </CardContent>
      </Card>

      {/* Spend By Region — donut + interactive ranked list, sorted by spend */}
      <Card className="min-w-[280px] shrink-0 md:min-w-0 border border-border flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading font-semibold text-foreground">
            Spend By Region
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col gap-3">
          {regionSlices.length > 0 ? (
            <>
              {/* Donut with CSS-overlay center label */}
              <div className="relative h-[180px] sm:h-[200px] w-full shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={visibleRegion}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="spend"
                      nameKey="region"
                      stroke="var(--card)"
                      strokeWidth={2}
                      startAngle={90}
                      endAngle={-270}
                      isAnimationActive
                      animationDuration={400}
                    >
                      {visibleRegion.map((entry) => {
                        const originalIndex = regionSlices.findIndex(
                          (r) => r.region === entry.region,
                        );
                        return (
                          <Cell
                            key={`cell-${entry.region}`}
                            fill={CHART_COLORS[originalIndex % CHART_COLORS.length]}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltip />}
                      wrapperStyle={{ outline: "none", zIndex: 50 }}
                      formatter={(value: number, name: string) => [
                        `${formatSpend(value)} (${totalRegionSpend > 0 ? ((value / totalRegionSpend) * 100).toFixed(1) : 0}%)`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center leading-tight">
                    <p className="text-[10px] text-muted-foreground font-medium">Total</p>
                    <p className="text-xs font-bold text-foreground">
                      {formatSpend(totalRegionSpend)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ranked list — 2-column grid, click to toggle, deselected rows muted */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {regionSlices.map((r, index) => {
                  const isHidden = hiddenRegion.has(r.region);
                  const pct =
                    totalRegionSpend > 0
                      ? ((r.spend / totalRegionSpend) * 100).toFixed(1)
                      : "0";
                  return (
                    <button
                      key={r.region}
                      onClick={() => toggleRegion(r.region)}
                      className="flex items-center gap-1.5 min-w-0 text-left cursor-pointer"
                    >
                      <span
                        className="inline-block shrink-0 h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                          opacity: isHidden ? 0.25 : 1,
                          transition: "opacity 0.2s",
                        }}
                      />
                      <span
                        className="text-xs truncate flex-1 min-w-0"
                        style={{
                          color: isHidden ? "var(--muted-foreground)" : "var(--foreground)",
                          transition: "color 0.2s",
                        }}
                      >
                        {r.region}
                      </span>
                      <span
                        className="text-xs font-semibold shrink-0"
                        style={{
                          color: isHidden ? "var(--muted-foreground)" : "var(--foreground)",
                          transition: "color 0.2s",
                        }}
                      >
                        {pct}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-subtle-foreground text-sm">
              No region data available
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

/*
 * POST-MVP: Widget Registry Integration
 *
 * Each chart in this component (Age, Gender, Region) should become a registered
 * widget type so it can be added/removed from the dashboard widget grid.
 *
 * WIDGET REGISTRY (src/lib/widget-registry.ts)
 * ──────────────────────────────────────────────
 * Export a map of widget_type → { label, icon, component, defaultConfig }:
 *
 *   const WIDGET_REGISTRY = {
 *     age_distribution:    { label: "Age Distribution",    component: AgeChart,    defaultConfig: { metric: "impressions", chartType: "bar"   } },
 *     gender_distribution: { label: "Gender Distribution", component: GenderChart, defaultConfig: { metric: "impressions", chartType: "donut" } },
 *     top_regions:         { label: "Top Regions",         component: RegionChart, defaultConfig: { metric: "impressions", chartType: "bar"   } },
 *     // Add new widget types here without touching UnifiedDashboard
 *   };
 *
 * REFACTOR PLAN
 * ──────────────
 * 1. Extract each chart card into its own named component:
 *    - AgeChart     ({ config, data }: WidgetChartProps)
 *    - GenderChart  ({ config, data }: WidgetChartProps)
 *    - RegionChart  ({ config, data }: WidgetChartProps)
 *
 * 2. Each component accepts a `config` prop from its widget_type row:
 *    config: { metric: string, chartType: ChartType, colorPalette: PaletteKey }
 *    The metric determines which field is fetched and displayed (spend, impressions, reach, etc.)
 *
 * 3. <DemographicsCharts> becomes a thin wrapper that renders the 3 default instances
 *    with hardcoded configs — it stays rendered outside the widget grid as a permanent default.
 *
 * 4. The widget grid separately renders user-added instances of the same components
 *    using configs fetched from the `dashboard_widgets` table.
 *
 * WIDGET CONFIG SHAPE (per instance)
 * ────────────────────────────────────
 * {
 *   metric:       "impressions" | "spend" | "reach" | "clicks" | ... ,
 *   breakdown:    "age" | "gender" | "region",
 *   chartType:    "bar" | "column" | "donut" | "pie" | "timeseries" | "table",
 *   colorPalette: "mint" | "ocean" | "sunset" | "violet" | "default",
 * }
 *
 * DATA FETCHING
 * ──────────────
 * Demographic breakdowns come from Meta Insights with breakdown params:
 *   age → age, gender → gender, region → region
 * The `useInsights` hook must accept `breakdowns: string[]` and `fields: string[]`
 * so widget instances can request the exact combination they need.
 */