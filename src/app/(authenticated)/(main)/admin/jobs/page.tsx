/**
 * Admin Job Queue Dashboard
 *
 * Provides visibility into:
 * - Job queue health metrics (success rate, avg duration)
 * - Dead Letter Queue (permanently failed jobs)
 * - Active job status
 * - System performance trends
 *
 * Access: Only for admin users (add role check when you implement roles)
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
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
import { Loader2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminJobsPage() {
  const supabase = createClient();

  // Fetch job metrics (last 24 hours)
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["job-metrics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("job_metrics")
        .select("job_type, success, duration_ms")
        .gte(
          "executed_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        );

      if (!data) return null;

      // Group by job type
      const byType = data.reduce(
        (acc, m) => {
          if (!acc[m.job_type]) {
            acc[m.job_type] = {
              total: 0,
              success: 0,
              totalDuration: 0,
            };
          }
          acc[m.job_type].total++;
          if (m.success) acc[m.job_type].success++;
          acc[m.job_type].totalDuration += m.duration_ms || 0;
          return acc;
        },
        {} as Record<string, any>,
      );

      // Calculate averages
      Object.values(byType).forEach((stats: any) => {
        stats.avgDuration = Math.round(stats.totalDuration / stats.total);
        stats.successRate = Math.round((stats.success / stats.total) * 100);
      });

      return byType;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch Dead Letter Queue
  const { data: dlq, isLoading: dlqLoading } = useQuery({
    queryKey: ["job-dlq"],
    queryFn: async () => {
      const { data } = await supabase
        .from("job_dlq")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch currently processing jobs
  const { data: activeJobs, isLoading: activeLoading } = useQuery({
    queryKey: ["active-jobs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("job_queue")
        .select("*")
        .eq("status", "processing")
        .order("started_at", { ascending: true })
        .limit(10);
      return data;
    },
    refetchInterval: 5000, // Refresh every 5s
  });

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Job Queue Health</h1>
        <p className="text-muted-foreground mt-1">
          Monitor background job performance and failures
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {metrics &&
          Object.entries(metrics).map(([type, stats]: [string, any]) => {
            const isHealthy = stats.successRate > 95;
            return (
              <Card key={type}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {type
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </CardTitle>
                  {isHealthy ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.success}/{stats.total}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg: {stats.avgDuration}ms
                  </p>
                  <Badge
                    variant={isHealthy ? "default" : "destructive"}
                    className="mt-2"
                  >
                    {stats.successRate}% success
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Active Jobs */}
      {activeJobs && activeJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Currently Processing ({activeJobs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeJobs.map((job) => {
                  const startedAt = job.started_at
                    ? new Date(job.started_at)
                    : new Date(job.created_at || Date.now());
                  console.log("startedAt🔥", startedAt);
                  const durationMin = Math.round(
                    (Date.now() - startedAt.getTime()) / 60000,
                  );
                  const isStuck = durationMin > 10; // Flag jobs running >10min

                  return (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.type}</TableCell>
                      <TableCell>
                        {formatDistanceToNow(startedAt, { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {job.attempts}/{job.max_attempts}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isStuck ? "destructive" : "default"}>
                          {isStuck && (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          {durationMin}m
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dead Letter Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Dead Letter Queue ({dlq?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dlqLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : dlq && dlq.length > 0 ? (
            <div className="space-y-3">
              {dlq.map((job) => (
                <div
                  key={job.id}
                  className="border-l-4 border-red-500 pl-4 py-3 rounded-r bg-red-50 dark:bg-red-950/20"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-sm">{job.type}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {job.attempts} attempts
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(
                        new Date(job.created_at || Date.now()),
                        {
                          addSuffix: true,
                        },
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-2">
                    {job.error_message}
                  </p>
                  {(job.payload as any)?.campaignId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Campaign: {(job.payload as any).campaignId}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No failed jobs in the last 24 hours</p>
              <p className="text-sm mt-1">Your queue is healthy! 🎉</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
