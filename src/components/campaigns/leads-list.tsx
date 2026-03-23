"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCampaignLeads,
  getCampaignLeadStats,
  exportCampaignLeadsToCSV,
  deleteLeadSubmission,
  type LeadSubmission,
} from "@/actions/leads";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DownloadIcon,
  TrashIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  CalendarIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface LeadsListProps {
  campaignId: string;
}

export function LeadsList({ campaignId }: LeadsListProps) {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);

  // Fetch leads
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["campaign-leads", campaignId],
    queryFn: async () => {
      const result = await fetchCampaignLeads(campaignId);
      if (!result.success) throw new Error(result.error);
      return result.leads;
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ["campaign-lead-stats", campaignId],
    queryFn: async () => {
      const result = await getCampaignLeadStats(campaignId);
      if (!result.success) throw new Error(result.error);
      return result.stats;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteLeadSubmission,
    onSuccess: () => {
      toast.success("Lead deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["campaign-leads", campaignId] });
      queryClient.invalidateQueries({
        queryKey: ["campaign-lead-stats", campaignId],
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete lead");
    },
  });

  // Export to CSV
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportCampaignLeadsToCSV(campaignId);
      if (!result.success) {
        toast.error(result.error || "Failed to export leads");
        return;
      }

      // Create download link
      const blob = new Blob([result.csv!], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename!;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Leads exported successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to export leads");
    } finally {
      setIsExporting(false);
    }
  };

  // Helper to extract specific field from field_data
  const getFieldValue = (
    lead: LeadSubmission,
    fieldName: string,
  ): string | null => {
    const field = lead.field_data?.find((f) =>
      f.name.toLowerCase().includes(fieldName.toLowerCase()),
    );
    return field?.values?.[0] || null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const leads = leadsData || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Leads</CardDescription>
              <CardTitle className="text-3xl">{statsData.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Last 24 Hours</CardDescription>
              <CardTitle className="text-3xl">
                {statsData.last24Hours}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Last 7 Days</CardDescription>
              <CardTitle className="text-3xl">{statsData.last7Days}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Last 30 Days</CardDescription>
              <CardTitle className="text-3xl">{statsData.last30Days}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lead Submissions</CardTitle>
              <CardDescription>
                Contact information from your lead generation campaigns
              </CardDescription>
            </div>
            <Button
              onClick={handleExport}
              disabled={leads.length === 0 || isExporting}
              variant="outline"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No leads yet</h3>
              <p className="text-muted-foreground">
                Leads will appear here when users submit your lead generation
                forms.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const name =
                    getFieldValue(lead, "name") ||
                    getFieldValue(lead, "full_name") ||
                    "Unknown";
                  const email = getFieldValue(lead, "email");
                  const phone =
                    getFieldValue(lead, "phone") ||
                    getFieldValue(lead, "phone_number");

                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {email ? (
                          <div className="flex items-center gap-2">
                            <MailIcon className="w-4 h-4 text-muted-foreground" />
                            <a
                              href={`mailto:${email}`}
                              className="text-primary hover:underline"
                            >
                              {email}
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {phone ? (
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4 text-muted-foreground" />
                            <a
                              href={`tel:${phone}`}
                              className="text-primary hover:underline"
                            >
                              {phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarIcon className="w-4 h-4" />
                          {formatDistanceToNow(new Date(lead.submitted_at), {
                            addSuffix: true,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {lead.form_id.substring(0, 8)}...
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(lead.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <TrashIcon className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
