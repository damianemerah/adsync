"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface RevenueChannelBreakdownProps {
  whatsappRevenue: number;
  websiteRevenue: number;
  whatsappSales: number;
  websiteSales: number;
}

// Ensure tooltip matches demographics charts exactly
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

// Custom label outside pie
function renderPieLabel({ percent }: { percent: number }) {
  return percent > 0 ? `${(percent * 100).toFixed(0)}%` : "";
}

export function RevenueChannelBreakdown({
  whatsappRevenue,
  websiteRevenue,
  whatsappSales,
  websiteSales,
}: RevenueChannelBreakdownProps) {
  const data = [
    { name: "WhatsApp", value: whatsappRevenue, fill: "var(--primary)" },
    { name: "Website", value: websiteRevenue, fill: "var(--chart-1)" },
  ].filter((d) => d.value > 0);

  const totalRevenue = whatsappRevenue + websiteRevenue;

  if (totalRevenue === 0) {
    return (
      <Card className="border border-border shadow-sm flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading font-semibold text-foreground">
            Revenue Source
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex items-center justify-center text-subtle-foreground text-sm">
          No sales data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border shadow-sm flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-heading font-semibold text-foreground">
          Revenue Source
        </CardTitle>
      </CardHeader>
      
      {/* 
        Vertically stacked layout to fit into 1/3 grid width nicely.
        Pie chart on top, metrics below.
      */}
      <CardContent className="flex-1 min-h-0 flex flex-col items-center">
        <div className="h-[180px] w-full overflow-visible shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                stroke="var(--card)"
                strokeWidth={2}
                label={renderPieLabel}
                labelLine={{ stroke: "var(--subtle-foreground)", strokeWidth: 1 }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name,
                ]}
                contentStyle={tooltipStyle}
                wrapperStyle={{ zIndex: 50 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Text Breakdowns */}
        <div className="w-full flex justify-center gap-6 mt-2 pt-2 border-t border-border/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary shrink-0" />
              <span className="text-xs font-medium text-foreground">
                WhatsApp
              </span>
            </div>
            <p className="text-base font-bold font-heading pl-5">
              {formatCurrency(whatsappRevenue)}
            </p>
            <p className="text-xs text-subtle-foreground pl-5 uppercase tracking-wide">
              {whatsappSales} confirmed
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: 'var(--chart-1)' }} />
              <span className="text-xs font-medium text-foreground">
                Website
              </span>
            </div>
            <p className="text-base font-bold font-heading pl-5">
              {formatCurrency(websiteRevenue)}
            </p>
            <p className="text-xs text-subtle-foreground pl-5 uppercase tracking-wide">
              {websiteSales} pixel sales
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
