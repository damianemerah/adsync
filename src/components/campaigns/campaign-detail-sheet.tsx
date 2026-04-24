"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CampaignDetailView } from "@/components/campaigns/campaign-detail-view";
import { useCampaignDetail } from "@/hooks/use-campaign-detail";
import { SystemRestart } from "iconoir-react";

function CampaignDetailSheetInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const campaignId = searchParams.get("campaign");

  const { campaign: selectedCampaign, isLoading } =
    useCampaignDetail(campaignId);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      router.push(pathname);
    }
  };

  return (
    <Sheet open={!!campaignId} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] w-full rounded-t-xl sm:rounded-t-2xl p-0 gap-0 shadow-none border-t border-border overflow-auto no-scrollbar"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Campaign Details</SheetTitle>
          <SheetDescription>
            View metrics and ads for this campaign
          </SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="h-full flex items-center justify-center bg-card">
            <SystemRestart className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && campaignId && !selectedCampaign && (
          <div className="p-8 text-center h-full flex items-center justify-center flex-col gap-2">
            <p className="font-semibold text-foreground">Campaign not found</p>
            <p className="text-subtle-foreground text-sm">
              It may have been deleted or you don&apos;t have permission to view
              it.
            </p>
          </div>
        )}

        {!isLoading && selectedCampaign && (
          <CampaignDetailView campaign={selectedCampaign} />
        )}
      </SheetContent>
    </Sheet>
  );
}

export function CampaignDetailSheet() {
  return (
    <Suspense fallback={null}>
      <CampaignDetailSheetInner />
    </Suspense>
  );
}
