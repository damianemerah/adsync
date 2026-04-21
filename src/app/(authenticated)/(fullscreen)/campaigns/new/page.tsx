// No "use client" — this is a Server Component.
// Subscription gate runs on the server; no loading spinner is shown.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";
import { CampaignWizard } from "@/components/campaigns/new/campaign-wizard";
import { SubscriptionGate } from "@/components/campaigns/new/subscription-gate";
// import SubscriptionGate from "@/components/campaigns/new/subscription-gate";

// ─── Server-side subscription check ───────────────────────────────────────────

async function getOrgSubscriptionStatus(orgId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organizations")
    .select("subscription_status")
    .eq("id", orgId)
    .single();

  const status = data?.subscription_status ?? "expired";
  return status === "active" || status === "trialing";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ draftId?: string; resume?: string }>;
}

export default async function NewCampaignPage({ searchParams }: Props) {
  // Next.js 15: searchParams is a Promise
  const { draftId = null, resume } = await searchParams;
  const isResume = resume === "true";

  // Resolve active org — server-side, from cookie
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  // Subscription gate — no client-side loading state needed
  const hasActiveSub = await getOrgSubscriptionStatus(orgId);

  if (!hasActiveSub) {
    return <SubscriptionGate />;
  }

  return <CampaignWizard draftId={draftId} isResume={isResume} />;
}
