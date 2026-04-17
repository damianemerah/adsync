import { SupabaseClient, User } from "@supabase/supabase-js";
import { getActiveOrgId } from "@/lib/active-org";

export interface OnboardingStatus {
  hasAdAccount: boolean;
  hasVerifiedWhatsApp: boolean;
  hasFirstCampaign: boolean;
  /** First name derived from user metadata or email prefix. */
  userName: string;
}

/**
 * Server-side helper that resolves the onboarding completion state for the
 * current user and active org. Runs all three checks in parallel.
 *
 * Used exclusively by RSC pages — never call from a Client Component.
 */
export async function getOnboardingStatus(
  supabase: SupabaseClient,
  user: User,
): Promise<OnboardingStatus> {
  const activeOrgId = await getActiveOrgId();

  if (!activeOrgId) {
    return {
      hasAdAccount: false,
      hasVerifiedWhatsApp: false,
      hasFirstCampaign: false,
      userName: resolveUserName(user),
    };
  }

  const [accountsRes, whatsappRes, campaignsRes] = await Promise.all([
    supabase
      .from("ad_accounts")
      .select("id")
      .eq("organization_id", activeOrgId)
      .is("disconnected_at", null)
      .limit(1),

    supabase
      .from("notification_settings")
      .select("verified")
      .eq("user_id", user.id)
      .eq("verified", true)
      .limit(1),

    supabase
      .from("campaigns")
      .select("id")
      .eq("organization_id", activeOrgId)
      .in("status", ["active", "paused", "completed"])
      .limit(1),
  ]);

  return {
    hasAdAccount: !!(accountsRes.data && accountsRes.data.length > 0),
    hasVerifiedWhatsApp: !!(whatsappRes.data && whatsappRes.data.length > 0),
    hasFirstCampaign: !!(campaignsRes.data && campaignsRes.data.length > 0),
    userName: resolveUserName(user),
  };
}

function resolveUserName(user: User): string {
  return (
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there"
  );
}
