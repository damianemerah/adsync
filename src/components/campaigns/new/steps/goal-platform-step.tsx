"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import {
  CAMPAIGN_OBJECTIVES,
  META_PLACEMENTS,
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
    setStep,
    updateDraft,
    locations,
  } = useCampaignStore();

  const { organization } = useOrganization();
  const [showOtherGoals, setShowOtherGoals] = React.useState(false);

  // Auto-select first revenue goal on mount
  useEffect(() => {
    if (!objective) {
      const defaultRevenue = CAMPAIGN_OBJECTIVES.find(
        (c) => c.category === "revenue",
      );
      if (defaultRevenue) {
        updateDraft({ objective: defaultRevenue.id });
      }
    } else {
      // Auto-expand if a growth objective is pre-selected
      const selectedObjective = CAMPAIGN_OBJECTIVES.find(
        (o) => o.id === objective,
      );
      if (selectedObjective?.category === "growth") {
        setShowOtherGoals(true);
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

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-heading text-foreground tracking-tight">
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
            <span className="bg-status-success-soft text-status-success text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
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

        <div className="pt-2 border-t border-border/50 mt-2">
          <button
            onClick={() => setShowOtherGoals(!showOtherGoals)}
            className="w-full flex items-center justify-between text-sm font-bold text-subtle-foreground hover:text-foreground transition-colors group py-2"
          >
            <span>Grow Your Brand (Awareness & Engagement)</span>
            <div
              className={cn(
                "bg-muted rounded-full p-1 transition-transform duration-200",
                showOtherGoals ? "rotate-180" : "",
              )}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </button>

          {showOtherGoals && (
            <div className="grid md:grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
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
                          "comingSoon" in goal
                            ? (goal as any).comingSoon
                            : false,
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
          )}
        </div>
      </div>

      <div className="pt-8 border-t border-border space-y-8">
        {/* Network picker */}
        <div className="space-y-4">
          <p className="text-sm font-bold text-foreground">
            Where should your ad run?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Meta Button */}
            <button
              onClick={() => updateDraft({ platform: "meta" })}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors flex-1",
                platform === "meta"
                  ? "border-2 border-primary bg-primary/5"
                  : "border border-border bg-card hover:bg-muted/50",
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded flex items-center justify-center shrink-0",
                  platform === "meta"
                    ? "bg-facebook text-white"
                    : "bg-muted text-subtle-foreground",
                )}
              >
                <Facebook className="h-4 w-4" />
              </div>
              <div className="flex-1 font-bold text-foreground text-sm">
                Meta (FB & IG)
              </div>
              {platform === "meta" && (
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
              )}
            </button>

            {/* TikTok Button */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-muted/30 opacity-60 cursor-not-allowed flex-1">
              <div className="h-8 w-8 rounded flex items-center justify-center shrink-0 bg-muted-foreground/40 text-white">
                <span className="font-bold text-xs">Tk</span>
              </div>
              <div className="flex-1">
                <div className="font-bold text-foreground text-sm">TikTok</div>
                <div className="text-[10px] font-bold text-primary uppercase tracking-wider mt-0.5">
                  Coming Phase 2
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Placement picker — only shown when Meta is selected */}
        {platform === "meta" && (
          <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
            <p className="text-sm font-bold text-foreground">
              Which surfaces should your ad appear on?
            </p>
            <div className="bg-muted/40 p-1 rounded-lg border border-border flex">
              {META_PLACEMENTS.map((p) => {
                const isSelected = metaPlacement === p.id;
                const iconMap: Record<string, React.ReactNode> = {
                  automatic: <Globe className="h-4 w-4" />,
                  instagram: <Instagram className="h-4 w-4" />,
                  facebook: <Facebook className="h-4 w-4" />,
                };
                
                return (
                  <button
                    key={p.id}
                    onClick={() =>
                      updateDraft({ metaPlacement: p.id as MetaPlacement })
                    }
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm transition-all font-medium relative",
                      isSelected
                        ? "bg-background border border-border shadow-sm text-foreground"
                        : "text-subtle-foreground hover:text-foreground",
                    )}
                  >
                    {p.badge && (
                      <span className="absolute -top-2.5 right-2 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider hidden sm:block">
                        {p.badge}
                      </span>
                    )}
                    {iconMap[p.id]}
                    <span className="truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-subtle-foreground px-1">
              {META_PLACEMENTS.find((p) => p.id === metaPlacement)?.description}
            </p>
          </div>
        )}
      </div>

      <Button
        size="lg"
        className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm border border-border rounded-lg"
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

interface GoalCardProps {
  title: string;
  desc: string;
  icon: React.ElementType;
  selected: boolean;
  onClick: () => void;
  isRevenue?: boolean;
  comingSoon?: boolean;
}

function GoalCard({
  title,
  desc,
  icon: Icon,
  selected,
  onClick,
  isRevenue,
  comingSoon,
}: GoalCardProps) {
  return (
    <div
      onClick={comingSoon ? undefined : onClick}
      className={cn(
        "p-5 rounded-lg cursor-pointer transition-all flex items-center gap-4 relative overflow-hidden",
        comingSoon
          ? "border border-border bg-muted/30 opacity-60 cursor-not-allowed"
          : selected
            ? "border-2 border-primary bg-primary/5"
            : "border border-border bg-card hover:border-primary/50 hover:bg-muted/30",
      )}
    >
      {isRevenue && selected && !comingSoon && (
        <div className="absolute top-0 right-0 p-1.5">
          <div className="bg-status-success rounded-full h-2 w-2" />
        </div>
      )}
      {comingSoon && (
        <div className="absolute top-2 right-2">
          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
            Coming Soon
          </span>
        </div>
      )}
      <div
        className={cn(
          "h-12 w-12 rounded-md flex items-center justify-center shrink-0 transition-colors",
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


