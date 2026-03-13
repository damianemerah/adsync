"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import {
  CAMPAIGN_OBJECTIVES,
  META_PLACEMENTS,
  META_SUB_PLACEMENTS,
  MetaPlacement,
} from "@/lib/constants";
import { computeSmartDefaults } from "@/lib/intelligence";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import React, { useEffect } from "react";
import { useOrganization } from "@/hooks/use-organization";
import {
  ArrowRight,
  CheckCircle,
  Facebook,
  Instagram,
  Phone,
  Flash,
  Eye,
  Heart,
  Lock,
  Globe,
  Mail,
  Download,
  Cart,
} from "iconoir-react";

const getIcon = (name: string) => {
  switch (name) {
    case "Phone":
      return Phone;
    case "Zap":
      return Flash;
    case "Eye":
      return Eye;
    case "Heart":
      return Heart;
    case "Mail":
      return Mail;
    case "ShoppingCart":
      return Cart;
    case "Download":
      return Download;
    default:
      return Flash;
  }
};

export function GoalPlatformStep() {
  const {
    objective,
    platform,
    metaPlacement,
    metaSubPlacements,
    setStep,
    updateDraft,
    locations,
  } = useCampaignStore();

  const { organization } = useOrganization();

  // Auto-select first revenue goal on mount
  useEffect(() => {
    if (!objective) {
      const defaultRevenue = CAMPAIGN_OBJECTIVES.find(
        (c) => c.category === "revenue",
      );
      if (defaultRevenue) {
        updateDraft({ objective: defaultRevenue.id });
      }
    }
  }, [objective, updateDraft]);

  // Wire computeSmartDefaults whenever objective changes
  const handleObjectiveSelect = (id: string, comingSoon?: boolean) => {
    if (comingSoon) return; // Block selection of unimplemented objectives
    updateDraft({ objective: id as any });

    const defaults = computeSmartDefaults({
      objective: id as any,
      locations,
      industry: organization?.industry,
      customerGender: organization?.customer_gender,
      sellingMethod: organization?.selling_method,
      priceTier: organization?.price_tier,
    });

    updateDraft({
      budget: defaults.budget,
      ageRange: defaults.ageRange,
      gender: defaults.gender,
    });
  };

  const handleSubPlacementToggle = (
    platformId: "instagram" | "facebook",
    positionId: string,
  ) => {
    const current = metaSubPlacements[platformId] || [];
    const updated = current.includes(positionId)
      ? current.filter((id) => id !== positionId)
      : [...current, positionId];

    // Optional: Prevent unchecking the very last option so the platform isn't entirely empty
    if (updated.length === 0) return;

    updateDraft({
      metaSubPlacements: {
        ...metaSubPlacements,
        [platformId]: updated,
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">
          What do you want to achieve?
        </h1>
        <p className="text-subtle-foreground">
          Pick your goal — we'll build the perfect ad for it.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm font-bold text-foreground">Make Sales 💰</p>
            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border border-green-200">
              Recommended
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {CAMPAIGN_OBJECTIVES.filter((g) => g.category === "revenue").map(
              (goal) => {
                const Icon = getIcon(goal.iconName);
                return (
                  <GoalCard
                    key={goal.id}
                    title={goal.label}
                    desc={goal.description}
                    icon={Icon}
                    selected={objective === goal.id}
                    onClick={() =>
                      handleObjectiveSelect(
                        goal.id,
                        "comingSoon" in goal ? (goal as any).comingSoon : false,
                      )
                    }
                    isRevenue={true}
                    comingSoon={
                      "comingSoon" in goal ? (goal as any).comingSoon : false
                    }
                  />
                );
              },
            )}
          </div>
        </div>

        <div>
          <p className="text-sm font-bold text-foreground mb-3">
            Grow Your Brand 📣
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {CAMPAIGN_OBJECTIVES.filter((g) => g.category === "growth").map(
              (goal) => {
                const Icon = getIcon(goal.iconName);
                return (
                  <GoalCard
                    key={goal.id}
                    title={goal.label}
                    desc={goal.description}
                    icon={Icon}
                    selected={objective === goal.id}
                    onClick={() =>
                      handleObjectiveSelect(
                        goal.id,
                        "comingSoon" in goal ? (goal as any).comingSoon : false,
                      )
                    }
                    comingSoon={
                      "comingSoon" in goal ? (goal as any).comingSoon : false
                    }
                  />
                );
              },
            )}
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border space-y-6">
        {/* Network picker */}
        <div>
          <p className="text-sm font-bold text-foreground mb-4">
            Where should your ad run?
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <PlatformCard
              name="Meta (FB & IG)"
              icon={Facebook}
              color="blue"
              selected={platform === "meta"}
              onClick={() => updateDraft({ platform: "meta" })}
            />
            <PlatformCard
              name="TikTok"
              icon={() => <span className="font-bold">Tk</span>}
              color="black"
              selected={platform === "tiktok"}
              onClick={() => updateDraft({ platform: "tiktok" })}
              comingSoon
            />
          </div>
        </div>

        {/* Placement picker — only shown when Meta is selected */}
        {platform === "meta" && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <p className="text-sm font-bold text-foreground mb-3">
              Which surfaces should your ad appear on?
            </p>
            <div className="grid grid-cols-3 gap-3">
              {META_PLACEMENTS.map((p) => (
                <PlacementCard
                  key={p.id}
                  placement={p as any}
                  selected={metaPlacement === p.id}
                  onClick={() =>
                    updateDraft({ metaPlacement: p.id as MetaPlacement })
                  }
                />
              ))}
            </div>

            {/* Sub-Placements (Granular Control) */}
            {(metaPlacement === "instagram" ||
              metaPlacement === "facebook") && (
              <div className="mt-6 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
                <p className="text-xs font-bold text-foreground mb-3">
                  Select where you want your ad to appear on{" "}
                  {metaPlacement === "instagram" ? "Instagram" : "Facebook"}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {META_SUB_PLACEMENTS[
                    metaPlacement as keyof typeof META_SUB_PLACEMENTS
                  ].map((sub) => {
                    const isChecked = metaSubPlacements[
                      metaPlacement as "instagram" | "facebook"
                    ]?.includes(sub.id);
                    return (
                      <button
                        key={sub.id}
                        onClick={() =>
                          handleSubPlacementToggle(
                            metaPlacement as "instagram" | "facebook",
                            sub.id,
                          )
                        }
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium rounded-full border transition-all flex items-center gap-1.5",
                          isChecked
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-subtle-foreground border-border hover:border-primary/50",
                        )}
                      >
                        {isChecked && <CheckCircle className="h-3 w-3" />}
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Button
        size="lg"
        className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft rounded-2xl"
        disabled={!platform || !objective || platform === "tiktok"}
        onClick={() => {
          const { campaignName } = useCampaignStore.getState();
          if (!campaignName) {
            const date = new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            const objName =
              CAMPAIGN_OBJECTIVES.find((o) => o.id === objective)?.label ||
              "Campaign";
            updateDraft({ campaignName: `${objName} - ${date}` });
          }
          setStep(2);
        }}
      >
        Next — Tell us what you sell <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}

function GoalCard({
  title,
  desc,
  icon: Icon,
  selected,
  onClick,
  isRevenue,
  comingSoon,
}: any) {
  return (
    <div
      onClick={comingSoon ? undefined : onClick}
      className={cn(
        "p-5 rounded-2xl border cursor-pointer transition-all flex items-center gap-4 relative overflow-hidden",
        comingSoon
          ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
          : selected
            ? "border-primary bg-primary/5 shadow-soft ring-1 ring-primary/20"
            : "bg-card border-border hover:border-primary/50 hover:bg-muted/30",
      )}
    >
      {isRevenue && selected && !comingSoon && (
        <div className="absolute top-0 right-0 p-1.5">
          <div className="bg-green-500 rounded-full h-2 w-2" />
        </div>
      )}
      {comingSoon && (
        <div className="absolute top-2 right-2">
          <span className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
            Coming Soon
          </span>
        </div>
      )}
      <div
        className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          comingSoon
            ? "bg-muted text-muted-foreground"
            : selected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-subtle-foreground",
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="font-bold text-foreground">{title}</p>
        <p className="text-xs text-subtle-foreground">{desc}</p>
      </div>
      {selected && !comingSoon && (
        <CheckCircle className="ml-auto h-6 w-6 text-primary" />
      )}
    </div>
  );
}

function PlacementCard({
  placement,
  selected,
  onClick,
}: {
  placement: (typeof META_PLACEMENTS)[number];
  selected: boolean;
  onClick: () => void;
}) {
  const iconMap: Record<string, React.ReactNode> = {
    automatic: <Globe className="h-5 w-5" />,
    instagram: <Instagram className="h-5 w-5" />,
    facebook: <Facebook className="h-5 w-5" />,
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "p-3 rounded-2xl border-2 text-left transition-all relative flex flex-col gap-2",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card hover:border-primary/50 hover:bg-muted/30",
      )}
    >
      {placement.badge && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
          {placement.badge}
        </span>
      )}
      <div
        className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-subtle-foreground",
        )}
      >
        {iconMap[placement.id]}
      </div>
      <div>
        <p className="text-xs font-bold text-foreground leading-tight">
          {placement.label}
        </p>
        <p className="text-[10px] text-subtle-foreground mt-0.5">
          {placement.description}
        </p>
      </div>
      {selected && (
        <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-primary" />
      )}
    </button>
  );
}

function PlatformCard({
  name,
  icon: Icon,
  color,
  selected,
  onClick,
  comingSoon,
}: any) {
  return (
    <div
      onClick={comingSoon ? undefined : onClick}
      className={cn(
        "p-4 rounded-2xl border transition-all flex items-center gap-3 relative overflow-hidden",
        comingSoon
          ? "border-border bg-muted/30 opacity-60 cursor-not-allowed"
          : selected
            ? "border-primary bg-primary/5 shadow-soft ring-1 ring-primary/20 cursor-pointer"
            : "border-border bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer",
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0",
          comingSoon
            ? "bg-muted-foreground/40"
            : color === "blue"
              ? "bg-[#1877F2]"
              : "bg-foreground",
        )}
      >
        {comingSoon ? (
          <Lock className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-bold text-foreground">{name}</span>
        {comingSoon && (
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mt-0.5">
            Coming Phase 2
          </p>
        )}
      </div>
      {selected && !comingSoon && (
        <CheckCircle className="ml-auto h-5 w-5 text-primary shrink-0" />
      )}
    </div>
  );
}
