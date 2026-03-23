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

export function RevenueChannelBreakdown({
  whatsappRevenue,
  websiteRevenue,
  whatsappSales,
  websiteSales,
}: RevenueChannelBreakdownProps) {
  const data = [
    { name: "WhatsApp", value: whatsappRevenue, color: "#10b981" }, // emerald-500
    { name: "Website", value: websiteRevenue, color: "#3b82f6" }, // blue-500
  ].filter((d) => d.value > 0);

  const totalRevenue = whatsappRevenue + websiteRevenue;

  if (totalRevenue === 0) {
    return (
      <Card className="h-full shadow-sm border border-border">
        <CardHeader>
          <CardTitle>Revenue Channel</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          No revenue recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full shadow-sm border border-border">
      <CardHeader>
        <CardTitle>Revenue Source</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col justify-center space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-foreground">
                WhatsApp
              </span>
            </div>
            <p className="text-xl font-bold font-heading pl-5">
              {formatCurrency(whatsappRevenue)}
            </p>
            <p className="text-xs text-muted-foreground pl-5">
              {whatsappSales} confirmed sales
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-foreground">
                Website
              </span>
            </div>
            <p className="text-xl font-bold font-heading pl-5">
              {formatCurrency(websiteRevenue)}
            </p>
            <p className="text-xs text-muted-foreground pl-5">
              {websiteSales} pixel sales
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
