"use server";

import { createClient } from "@/lib/supabase/server";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";

export async function fetchLeadGenForms(adAccountId: string, pageId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: orgData } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!orgData) throw new Error("No organization found");

    const { data: accountData } = await supabase
      .from("ad_accounts")
      .select("access_token")
      .eq("platform_account_id", adAccountId)
      .eq("organization_id", orgData.organization_id as string)
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
    questions: Array<{ type: string; label?: string }>;
    privacyPolicyUrl: string;
    thankYouMessage?: string;
  },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: orgData } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!orgData) throw new Error("No organization found");

    const { data: accountData } = await supabase
      .from("ad_accounts")
      .select("access_token")
      .eq("platform_account_id", adAccountId)
      .eq("organization_id", orgData.organization_id as string)
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
