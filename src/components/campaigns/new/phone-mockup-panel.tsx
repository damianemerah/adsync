"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import { useOrganization } from "@/hooks/use-organization";
import { useCreatives } from "@/hooks/use-creatives";
import { PhoneMockup } from "./phone-mockup";
import { Badge } from "@/components/ui/badge";
import { Phone, OpenNewWindow, Sparks, MapPin } from "iconoir-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getAllowedCTAsForPlacement } from "@/lib/constants/cta-options";

interface PhoneMockupPanelProps {
  compact?: boolean;
}

export function PhoneMockupPanel({ compact = false }: PhoneMockupPanelProps) {
  const {
    selectedCreatives,
    adCopy,
    budget,
    predictedROAS,
    platform,
    metaPlacement,
    locations,
    targetInterests,
    objective,
    updateDraft,
  } = useCampaignStore();

  const { organization } = useOrganization();
  const brandName = organization?.name ?? undefined;

  const { creatives } = useCreatives();

  const resolvedCreatives = selectedCreatives.map((url) => {
    const matched = creatives?.find((c) => c.original_url === url);
    return {
      url: matched?.thumbnail_url || url,
      media_type: matched?.media_type || "image",
    };
  });

  const openNativePreview = () => {
    if (selectedCreatives.length === 0) {
      toast.error("Select a creative first to preview");
      return;
    }
    // Opens Meta Ads Manager — full creative preview is available only after campaign launch
    const previewUrl =
      platform === "meta"
        ? "https://www.facebook.com/ads/manager/"
        : "https://ads.tiktok.com/business/creativecenter";

    window.open(previewUrl, "_blank");
    toast.info("Opening Ads Manager — live preview available after launch.");
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-card border-l border-border space-y-4",
        compact ? "p-3" : "p-4",
      )}
    >
      {/* Header + Resize Grip */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Phone className="h-4 w-4 text-primary" />
          Real Feed Preview
        </div>
        <div className="flex items-center gap-2 text-xs text-subtle-foreground">
          <Badge
            variant="outline"
            className="px-2 py-0.5 text-xs border-primary/30 bg-primary/5 text-primary"
          >
            {platform === "meta"
              ? metaPlacement === "instagram"
                ? "INSTAGRAM"
                : metaPlacement === "facebook"
                  ? "FACEBOOK"
                  : "META (ALL)"
              : platform === "tiktok"
                ? "TIKTOK"
                : "NO PLATFORM"}
          </Badge>
          <OpenNewWindow
            className="h-3 w-3 hover:text-primary cursor-pointer transition-colors"
            onClick={openNativePreview}
          />
        </div>
      </div>

      {/* PhoneMockup (70% height) */}
      <div className={cn("flex-1 min-h-0", compact && "max-h-[320px]")}>
        <PhoneMockup
          adCopy={adCopy}
          creatives={resolvedCreatives}
          objective={objective || "traffic"}
          platform={platform === "tiktok" ? "tiktok" : "meta"}
          metaPlacement={platform === "meta" ? metaPlacement : undefined}
          brandName={brandName}
          dailyBudgetNgn={budget}
          onCTAChange={(newCode) => {
            const allowed = getAllowedCTAsForPlacement(
              platform as any,
              objective as any,
            );
            const selected = allowed.find((c) => c.code === newCode);
            if (selected) {
              updateDraft({
                adCopy: {
                  ...adCopy,
                  cta: {
                    ...adCopy.cta,
                    platformCode: selected.code,
                    displayLabel: selected.label,
                  },
                },
              });
              toast.success(`CTA updated to ${selected.label}`);
            }
          }}
        />
      </div>

      {/* Collapsible Metrics (30% height) */}
      {!compact && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          {/* Budget + ROAS Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <span className="text-subtle-foreground">Budget</span>
              <p className="font-bold text-foreground">
                ₦{budget?.toLocaleString() || "0"}
              </p>
            </div>
            {predictedROAS && (
              <div className="space-y-1">
                <span className="text-subtle-foreground flex items-center gap-1">
                  <Sparks className="h-3 w-3 text-primary" /> ROAS
                </span>
                <p className="font-bold text-primary">
                  {predictedROAS.value.toFixed(1)}x
                </p>
              </div>
            )}
          </div>

          {/* Locations */}
          {locations && locations.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-subtle-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Locations
              </span>
              <div className="flex flex-wrap gap-1">
                {locations.slice(0, 3).map((loc: any) => (
                  <Badge
                    key={loc.id}
                    variant="secondary"
                    className="text-xs bg-muted text-foreground"
                  >
                    {loc.name}
                  </Badge>
                ))}
                {locations.length > 3 && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-muted text-foreground"
                  >
                    +{locations.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Top Interests */}
          {targetInterests && targetInterests.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-subtle-foreground">
                Top Interests
              </span>
              <div className="flex flex-wrap gap-1">
                {targetInterests.slice(0, 3).map((int: any) => (
                  <Badge
                    key={int.id}
                    className="text-xs bg-primary/10 text-primary border-primary/20"
                  >
                    {int.name}
                  </Badge>
                ))}
                {targetInterests.length > 3 && (
                  <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                    +{targetInterests.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
