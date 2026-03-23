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

// Use HSL colors where possible, or specific palette colors
const COLORS = [
  "hsl(var(--primary))",
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#f59e0b", // Amber
  "#ec4899", // Pink
];

export function DemographicsCharts({ demographics }: { demographics: any }) {
  const { age = [], gender = [], region = [] } = demographics || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Age Chart */}
      <Card className="shadow-sm border border-border">
        <CardHeader>
          <CardTitle>Age Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {age && age.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={age}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="age"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "var(--shadow-sm border border-border)",
                      color: "hsl(var(--popover-foreground))",
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Bar
                    dataKey="impressions"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Impressions"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No age data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gender Chart */}
      <Card className="shadow-sm border border-border">
        <CardHeader>
          <CardTitle>Gender Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {gender && gender.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gender}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="impressions"
                    stroke="hsl(var(--card))"
                  >
                    {gender.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "var(--shadow-sm border border-border)",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No gender data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Region Chart (Full Width) */}
      <Card className="lg:col-span-2 shadow-sm border border-border">
        <CardHeader>
          <CardTitle>Top Regions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {region && region.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={region.slice(0, 10)}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    type="number"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    dataKey="region"
                    type="category"
                    width={100}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "var(--shadow-sm border border-border)",
                      color: "hsl(var(--popover-foreground))",
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Bar
                    dataKey="impressions"
                    fill="#8b5cf6"
                    radius={[0, 4, 4, 0]}
                    name="Impressions"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No region data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
