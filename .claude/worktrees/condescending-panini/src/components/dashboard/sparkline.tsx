"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  data,
  color = "#12E193", // Emerald default
  width = 600,
  height = 40,
}: SparklineProps) {
  // Transform array into object array for Recharts
  const chartData = data.map((value, index) => ({ i: index, value }));

  // Create a unique ID for the gradient to prevent conflicts if multiple charts are on page
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div style={{ width: width, height: height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false} // Disable animation for table performance
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
