import {
  differenceInDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type BucketGranularity = "day" | "week" | "month";

export interface PerformancePoint {
  date: string; // ISO YYYY-MM-DD (or any parseable date string)
  spend?: number;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  revenue?: number;
  cpc?: number;
  [key: string]: unknown;
}

export function pickGranularity(
  from: Date | undefined | null,
  to: Date | undefined | null,
): BucketGranularity {
  if (!from || !to) return "day";
  const days = Math.abs(differenceInDays(to, from)) + 1;
  if (days <= 60) return "day";
  if (days <= 180) return "week";
  return "month";
}

function bucketKey(d: Date, granularity: BucketGranularity): string {
  if (granularity === "day") return format(d, "yyyy-MM-dd");
  if (granularity === "week")
    return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return format(startOfMonth(d), "yyyy-MM-dd");
}

export function bucketPerformance(
  rows: PerformancePoint[],
  granularity: BucketGranularity,
): PerformancePoint[] {
  if (granularity === "day" || rows.length === 0) return rows;

  const groups = new Map<
    string,
    { spend: number; clicks: number; impressions: number; revenue: number }
  >();

  for (const row of rows) {
    const d = new Date(row.date);
    if (Number.isNaN(d.getTime())) continue;
    const key = bucketKey(d, granularity);
    const existing = groups.get(key) ?? {
      spend: 0,
      clicks: 0,
      impressions: 0,
      revenue: 0,
    };
    existing.spend += Number(row.spend ?? 0);
    existing.clicks += Number(row.clicks ?? 0);
    existing.impressions += Number(row.impressions ?? 0);
    existing.revenue += Number(row.revenue ?? 0);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, agg]) => ({
      date,
      spend: agg.spend,
      clicks: agg.clicks,
      impressions: agg.impressions,
      revenue: agg.revenue,
      // Recompute ratios from summed numerator/denominator — never average ratios.
      ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
      cpc: agg.clicks > 0 ? agg.spend / agg.clicks : 0,
    }));
}

export function formatBucketTick(
  value: string,
  granularity: BucketGranularity,
): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  if (granularity === "day") return format(d, "MMM d");
  if (granularity === "week") return format(d, "MMM d");
  return format(d, "MMM yy");
}

export function formatTooltipHeader(
  value: string,
  granularity: BucketGranularity,
): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  if (granularity === "day") return format(d, "MMM d, yyyy");
  if (granularity === "week") return `Week of ${format(d, "MMM d, yyyy")}`;
  return format(d, "MMMM yyyy");
}

/**
 * Generates a continuous bucket series across [from, to] aligned to the given
 * granularity, zero-filling buckets that have no underlying rows. Lets the
 * line chart span the full selected window instead of collapsing to whichever
 * days/weeks happen to have metrics.
 */
export function fillBucketRange(
  rows: PerformancePoint[],
  from: Date | undefined | null,
  to: Date | undefined | null,
  granularity: BucketGranularity,
): PerformancePoint[] {
  if (!from || !to) return rows;

  const byKey = new Map<string, PerformancePoint>();
  for (const row of rows) {
    const parsed = new Date(row.date);
    const key = Number.isNaN(parsed.getTime())
      ? row.date
      : format(parsed, "yyyy-MM-dd");
    byKey.set(key, { ...row, date: key });
  }

  let bucketStarts: Date[];
  if (granularity === "day") {
    bucketStarts = eachDayOfInterval({ start: from, end: to });
  } else if (granularity === "week") {
    bucketStarts = eachWeekOfInterval(
      { start: from, end: to },
      { weekStartsOn: 1 },
    );
  } else {
    bucketStarts = eachMonthOfInterval({ start: from, end: to });
  }

  return bucketStarts.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return (
      byKey.get(key) ?? {
        date: key,
        spend: 0,
        clicks: 0,
        impressions: 0,
        revenue: 0,
        ctr: 0,
        cpc: 0,
      }
    );
  });
}
