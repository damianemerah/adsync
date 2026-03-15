"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";
import type { FormField } from "@/types/lead-form-builder";

export async function fetchMetaPages(adAccountId: string) {
  try {
    const supabase = await createClient();
    const orgId = await getActiveOrgId();
    console.log("orgId🔥", orgId);
    if (!orgId) throw new Error("No organization found");

    const { data: accountData } = await supabase
      .from("ad_accounts")
      .select("access_token")
      .eq("platform_account_id", adAccountId)
      .eq("organization_id", orgId)
      .single();

    if (!accountData?.access_token) {
      throw new Error("Ad account not found or missing access token");
    }

    const token = decrypt(accountData.access_token as string);
    const pages = await MetaService.getMetaPages(token);

    return { success: true, pages };
  } catch (error: any) {
    console.error("Error fetching Meta pages:", error);
    return { success: false, error: error.message, pages: [] };
  }
}

export async function fetchLeadGenForms(adAccountId: string, pageId: string) {
  try {
    const supabase = await createClient();
    const orgId = await getActiveOrgId();
    if (!orgId) throw new Error("No organization found");

    const { data: accountData } = await supabase
      .from("ad_accounts")
      .select("access_token")
      .eq("platform_account_id", adAccountId)
      .eq("organization_id", orgId)
      .single();

    if (!accountData || !accountData.access_token) {
      throw new Error("Ad account not found or missing access token");
    }

    const token = decrypt(accountData.access_token as string);
    const forms = await MetaService.getLeadGenForms(token, pageId);

    return { success: true, forms };
  } catch (error: any) {
    console.error("Error fetching lead gen forms:", error);
    return { success: false, error: error.message };
  }
}

export async function createLeadForm(
  adAccountId: string,
  pageId: string,
  form: {
    name: string;
    questions: FormField[];
    privacyPolicyUrl: string;
    thankYouMessage?: string;
  },
) {
  try {
    const supabase = await createClient();
    const orgId = await getActiveOrgId();
    if (!orgId) throw new Error("No organization found");

    const { data: accountData } = await supabase
      .from("ad_accounts")
      .select("access_token")
      .eq("platform_account_id", adAccountId)
      .eq("organization_id", orgId)
      .single();

    if (!accountData || !accountData.access_token) {
      throw new Error("Ad account not found or missing access token");
    }

    const token = decrypt(accountData.access_token as string);
    const newForm = await MetaService.createLeadGenForm(token, pageId, form);

    return { success: true, formId: newForm.id };
  } catch (error: any) {
    console.error("Error creating lead gen form:", error);
    return { success: false, error: error.message };
  }
}
