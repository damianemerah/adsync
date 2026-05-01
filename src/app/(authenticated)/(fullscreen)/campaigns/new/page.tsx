import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/active-org";
import { CampaignWizard } from "@/components/campaigns/new/campaign-wizard";

// ─── Page ─────────────────────────────────────────────────────────────────────
// Subscription gating is handled by the fullscreen layout's <SubscriptionGate>.
// This page only resolves the active org and renders the wizard.

interface Props {
  searchParams: Promise<{ draftId?: string; resume?: string }>;
}

export default async function NewCampaignPage({ searchParams }: Props) {
  const { draftId = null, resume } = await searchParams;
  const isResume = resume === "true";

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");

  return <CampaignWizard draftId={draftId} isResume={isResume} />;
}
