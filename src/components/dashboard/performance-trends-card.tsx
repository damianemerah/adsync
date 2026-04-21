"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PerformanceChart,
  MetricKey,
  METRIC_CONFIG,
} from "@/components/dashboard/performance-chart";

interface PerformanceTrendsCardProps {
  /** Daily performance rows from the dashboard data */
  performance: { date: string; [key: string]: unknown }[];
  isLoading: boolean;
}

const CHARTABLE_METRICS: MetricKey[] = ["spend", "impressions", "clicks", "ctr"];

/**
 * Self-contained card that renders the Performance Trends chart with its own
 * metric-toggle state. Decoupled so toggling a metric only re-renders this
 * card and not the entire dashboard grid.
 */
export function PerformanceTrendsCard({
  performance,
  isLoading,
}: PerformanceTrendsCardProps) {
  const [activeMetrics, setActiveMetrics] =
    useState<MetricKey[]>(CHARTABLE_METRICS);

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle>Performance Trends</CardTitle>
        <div className="flex flex-wrap gap-2">
          {CHARTABLE_METRICS.map((key) => {
            const cfg = METRIC_CONFIG[key];
            const active = activeMetrics.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleMetric(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  active
                    ? "border-transparent text-white"
                    : "border-border text-subtle-foreground bg-card hover:border-primary/40"
                }`}
                style={active ? { backgroundColor: cfg.color } : undefined}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: active
                      ? "rgba(255,255,255,0.7)"
                      : cfg.color,
                  }}
                />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full aspect-video lg:h-[400px] lg:aspect-auto rounded-md" />
        ) : (
          <div className="w-full aspect-video lg:h-[400px] lg:aspect-auto">
            <PerformanceChart
              data={performance}
              activeMetrics={activeMetrics.length > 0 ? activeMetrics : CHARTABLE_METRICS}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
