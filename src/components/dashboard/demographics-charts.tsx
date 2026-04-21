"use client";

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
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Use design-system chart tokens — never hardcode hex
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

// Shared tooltip style to prevent clipping and ensure visibility
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

const labelStyle: React.CSSProperties = {
  color: "var(--subtle-foreground)",
  fontSize: "12px",
};

/**
 * Normalize raw Meta gender data.
 * Meta API returns: { gender: "male"|"female"|"unknown", impressions: "1234", ... }
 * We need: { name: "Male", impressions: 1234 }
 */
function normalizeGenderData(
  raw: Array<{ gender?: string; name?: string; impressions?: string | number; value?: number }>
): Array<{ name: string; impressions: number }> {
  if (!raw || raw.length === 0) return [];

  return raw.map((entry) => {
    // Handle both raw Meta format ({ gender: "male" }) and pre-processed ({ name: "Male" })
    const rawName = entry.name || entry.gender || "Unknown";
    const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
    const impressions =
      typeof entry.impressions === "string"
        ? parseInt(entry.impressions, 10)
        : entry.impressions ?? entry.value ?? 0;
    return { name: displayName, impressions };
  });
}

/**
 * Normalize raw Meta age data.
 * Meta API returns: { age: "25-34", impressions: "5678", ... }
 * We need numeric impressions.
 */
function normalizeAgeData(
  raw: Array<{ age?: string; impressions?: string | number }>
): Array<{ age: string; impressions: number }> {
  if (!raw || raw.length === 0) return [];
  return raw.map((entry) => ({
    age: entry.age || "Unknown",
    impressions:
      typeof entry.impressions === "string"
        ? parseInt(entry.impressions, 10)
        : entry.impressions ?? 0,
  }));
}

/**
 * Normalize raw Meta region data.
 * Meta API returns: { region: "Lagos", impressions: "9012", ... }
 */
function normalizeRegionData(
  raw: Array<{ region?: string; impressions?: string | number }>
): Array<{ region: string; impressions: number }> {
  if (!raw || raw.length === 0) return [];
  return raw.map((entry) => ({
    region: entry.region || "Unknown",
    impressions:
      typeof entry.impressions === "string"
        ? parseInt(entry.impressions, 10)
        : entry.impressions ?? 0,
  }));
}

// Custom label for the Pie chart — shows percentage inside/near slices
function renderPieLabel({
  percent,
}: {
  percent: number;
}) {
  return percent > 0 ? `${(percent * 100).toFixed(0)}%` : "";
}

export function DemographicsCharts({ demographics }: { demographics: Record<string, unknown[]> }) {
  const rawAge = (demographics?.age as Array<{ age?: string; impressions?: string | number }>) || [];
  const rawGender = (demographics?.gender as Array<{ gender?: string; name?: string; impressions?: string | number; value?: number }>) || [];
  const rawRegion = (demographics?.region as Array<{ region?: string; impressions?: string | number }>) || [];

  const age = normalizeAgeData(rawAge);
  const gender = normalizeGenderData(rawGender);
  const region = normalizeRegionData(rawRegion);

  return (
    <>
      {/* Age Distribution */}
      <Card className="border border-border shadow-sm flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading font-semibold text-foreground">
            Age Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <div className="h-[280px] w-full overflow-visible">
            {age.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={age}
                  margin={{ top: 8, right: 8, bottom: 4, left: -8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="age"
                    fontSize={11}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--subtle-foreground)"
                  />
                  <YAxis
                    fontSize={11}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--subtle-foreground)"
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "var(--accent)", opacity: 0.3 }}
                    contentStyle={tooltipStyle}
                    labelStyle={labelStyle}
                    wrapperStyle={{ zIndex: 50 }}
                    formatter={(value: number) => [
                      value.toLocaleString(),
                      "People reached",
                    ]}
                  />
                  <Bar
                    dataKey="impressions"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                    name="People Reached"
                  />
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

      {/* Gender Distribution */}
      <Card className="border border-border shadow-sm flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading font-semibold text-foreground">
            Gender Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <div className="h-[280px] w-full overflow-visible">
            {gender.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gender}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="impressions"
                    nameKey="name"
                    stroke="var(--card)"
                    strokeWidth={2}
                    label={renderPieLabel}
                    labelLine={{ stroke: "var(--subtle-foreground)", strokeWidth: 1 }}
                  >
                    {gender.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    wrapperStyle={{ zIndex: 50 }}
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--foreground)",
                      paddingTop: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-subtle-foreground text-sm">
                No gender data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Regions */}
      <Card className="border border-border shadow-sm flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading font-semibold text-foreground">
            Top Regions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <div className="h-[280px] w-full overflow-visible">
            {region.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={region.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 4, right: 8, bottom: 4, left: 16 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    type="number"
                    fontSize={11}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--subtle-foreground)"
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <YAxis
                    dataKey="region"
                    type="category"
                    width={100}
                    fontSize={11}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--subtle-foreground)"
                  />
                  <Tooltip
                    cursor={{ fill: "var(--accent)", opacity: 0.3 }}
                    contentStyle={tooltipStyle}
                    labelStyle={labelStyle}
                    wrapperStyle={{ zIndex: 50 }}
                    formatter={(value: number) => [
                      value.toLocaleString(),
                      "People reached",
                    ]}
                  />
                  <Bar
                    dataKey="impressions"
                    fill="var(--chart-3)"
                    radius={[0, 4, 4, 0]}
                    name="People Reached"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-subtle-foreground text-sm">
                No region data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
