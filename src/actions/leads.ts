"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";

export interface LeadSubmission {
  id: string;
  leadgen_id: string;
  form_id: string;
  ad_id: string | null;
  campaign_id: string;
  field_data: Array<{ name: string; values: string[] }>;
  submitted_at: string;
  created_at: string;
}

export interface LeadStats {
  total: number;
  last24Hours: number;
  last7Days: number;
  last30Days: number;
}

/**
 * Fetch all leads for a specific campaign
 * Includes multi-org scoping via campaign ownership
 */
export async function fetchCampaignLeads(campaignId: string) {
  try {
    const supabase = await createClient();
    const orgId = await getActiveOrgId();
    if (!orgId) throw new Error("No organization found");

    // Verify campaign belongs to active org
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (!campaign) {
      throw new Error("Campaign not found or access denied");
    }

    // Fetch leads for this campaign
    const { data: leads, error } = await supabase
      .from("lead_submissions")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("submitted_at", { ascending: false });

    if (error) throw error;

    return { success: true, leads: leads as LeadSubmission[] };
  } catch (error: any) {
    console.error("Error fetching campaign leads:", error);
    return { success: false, error: error.message, leads: [] };
  }
}

/**
 * Fetch all leads for the active organization (across all campaigns)
 */
export async function fetchOrganizationLeads(limit = 100) {
  try {
    const supabase = await createClient();
    const orgId = await getActiveOrgId();
    if (!orgId) throw new Error("No organization found");

    const { data: leads, error } = await supabase
      .from("lead_submissions")
      .select(
        `
        *,
        campaigns!inner(id, name)
      `,
      )
      .eq("organization_id", orgId)
      .order("submitted_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, leads };
  } catch (error: any) {
    console.error("Error fetching organization leads:", error);
    return { success: false, error: error.message, leads: [] };
  }
}

/**
 * Get lead statistics for a campaign
 */
export async function getCampaignLeadStats(
  campaignId: string,
): Promise<{ success: boolean; stats?: LeadStats; error?: string }> {
  try {
    const supabase = await createClient();
    const orgId = await getActiveOrgId();
    if (!orgId) throw new Error("No organization found");

    // Verify campaign belongs to active org
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (!campaign) {
      throw new Error("Campaign not found or access denied");
    }

    // Get total count
    const { count: total } = await supabase
      .from("lead_submissions")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    // Get last 24 hours
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { count: last24Hours } = await supabase
      .from("lead_submissions")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .gte("submitted_at", yesterday.toISOString());

    // Get last 7 days
    const last7DaysDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { count: last7Days } = await supabase
      .from("lead_submissions")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .gte("submitted_at", last7DaysDate.toISOString());

    // Get last 30 days
    const last30DaysDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { count: last30Days } = await supabase
      .from("lead_submissions")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .gte("submitted_at", last30DaysDate.toISOString());

    return {
      success: true,
      stats: {
        total: total || 0,
        last24Hours: last24Hours || 0,
        last7Days: last7Days || 0,
        last30Days: last30Days || 0,
      },
    };
  } catch (error: any) {
    console.error("Error fetching lead stats:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Export leads to CSV format
 */
export async function exportCampaignLeadsToCSV(campaignId: string) {
  try {
    const supabase = await createClient();
    const orgId = await getActiveOrgId();
    if (!orgId) throw new Error("No organization found");

    // Verify campaign belongs to active org
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, name")
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (!campaign) {
      throw new Error("Campaign not found or access denied");
    }

    // Fetch all leads
    const { data: leads, error } = await supabase
      .from("lead_submissions")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    if (!leads || leads.length === 0) {
      return { success: false, error: "No leads to export" };
    }

    // Build CSV headers from all unique field names
    const allFieldNames = new Set<string>();
    leads.forEach((lead: any) => {
      lead.field_data?.forEach((field: any) => {
        allFieldNames.add(field.name);
      });
    });

    const headers = [
      "Submitted At",
      "Lead ID",
      "Form ID",
      ...Array.from(allFieldNames),
    ];

    // Build CSV rows
    const rows = leads.map((lead: any) => {
      const fieldMap = new Map<string, string>();
      lead.field_data?.forEach((field: any) => {
        fieldMap.set(field.name, field.values?.join(", ") || "");
      });

      return [
        new Date(lead.submitted_at).toLocaleString(),
        lead.leadgen_id,
        lead.form_id,
        ...Array.from(allFieldNames).map((name) => fieldMap.get(name) || ""),
      ];
    });

    // Generate CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    return {
      success: true,
      csv: csvContent,
      filename: `leads_${campaign.name.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]}.csv`,
    };
  } catch (error: any) {
    console.error("Error exporting leads:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a lead submission (GDPR compliance)
 */
export async function deleteLeadSubmission(leadId: string) {
  try {
    const supabase = await createClient();
    const orgId = await getActiveOrgId();
    if (!orgId) throw new Error("No organization found");

    // RLS policy will ensure user can only delete leads from their org
    const { error } = await supabase
      .from("lead_submissions")
      .delete()
      .eq("id", leadId)
      .eq("organization_id", orgId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting lead:", error);
    return { success: false, error: error.message };
  }
}
