"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NavArrowDown, Check, Plus, SystemRestart } from "iconoir-react";
import { useOrganization, Organization } from "@/hooks/use-organization";
import { useSubscription } from "@/hooks/use-subscription";
import { TIER_CONFIG, TierId } from "@/lib/constants";
import { CreateBusinessDialog } from "@/components/settings/create-business-dialog";
import { cn } from "@/lib/utils";

interface WorkspaceSwitcherProps {
  /** The active org ID resolved from the server cookie — passed from the layout. */
  activeOrgId?: string | null;
}

function OrgAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-primary/20 text-primary font-bold shrink-0",
        size === "sm" ? "h-5 w-5 text-xs" : "h-7 w-7 text-sm",
      )}
    >
      {name?.[0]?.toUpperCase() || "B"}
    </div>
  );
}

export function WorkspaceSwitcher({ activeOrgId }: WorkspaceSwitcherProps) {
  const { organization, organizations, switchOrganization, isSwitching } =
    useOrganization(activeOrgId);
  const { data: subscription } = useSubscription();
  const [createOpen, setCreateOpen] = useState(false);

  const currentTier = (subscription?.org?.tier || "starter") as TierId;
  const maxOrgs = TIER_CONFIG[currentTier]?.limits?.maxOrganizations ?? 1;
  const canCreateMore = organizations.length < maxOrgs;

  const handleSwitch = async (org: Organization) => {
    if (org.id === organization?.id) return;
    await switchOrganization(org.id);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted hover:text-foreground transition-colors text-left group flex-1 border border-border shadow-soft bg-background">
            <OrgAvatar name={organization?.name || "B"} size="sm" />
            <span className="text-sm font-medium truncate flex-1 text-foreground">
              {organization?.name || "Loading..."}
            </span>
            {isSwitching ? (
              <SystemRestart className="h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <NavArrowDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="bg-popover rounded-xl shadow-soft border-border w-60 p-2"
        >
          {/* List of all orgs */}
          <div className="space-y-0.5">
            {organizations.map((org) => {
              const isActive = org.id === organization?.id;
              return (
                <DropdownMenuItem
                  key={org.id}
                  className={cn(
                    "flex items-center gap-3 p-2 focus:bg-muted/50 rounded-lg cursor-pointer",
                    isActive && "bg-primary/5 text-primary",
                  )}
                  onClick={() => handleSwitch(org)}
                >
                  <OrgAvatar name={org.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {org.subscription_tier || "starter"}
                    </p>
                  </div>
                  {isActive && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>

          <DropdownMenuSeparator className="my-2" />

          {/* Create new business */}
          <div className="px-1">
            {canCreateMore ? (
              <Button
                variant="outline"
                className="w-full justify-center gap-2 h-9 hover:text-foreground border-dashed border-border text-muted-foreground hover:bg-muted text-sm"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add Business
              </Button>
            ) : (
              <div className="text-center py-1">
                <p className="text-xs text-muted-foreground mb-1.5">
                  {maxOrgs === 1
                    ? "Upgrade to Growth to manage multiple businesses."
                    : `${organizations.length}/${maxOrgs} businesses used.`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => {
                    window.location.href = "/settings/subscription";
                  }}
                >
                  Upgrade Plan
                </Button>
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Business Dialog */}
      <CreateBusinessDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
