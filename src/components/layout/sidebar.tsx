"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  GraphUp,
  ShareAndroid,
  MagicWand,
  Gift,
  Leaf,
  NavArrowDown,
  NavArrowRight,
  LayoutLeft,
  StatsReport,
  List,
  Server,
  MediaImage,
  MoreVert,
  SidebarCollapse,
  SidebarExpand,
  Cloud,
  User,
  LogOut,
  HelpCircle,
  CreditCard,
  NetworkReverse,
  Check,
  Plus,
  Bell,
} from "iconoir-react";
import { useNotifications } from "@/hooks/use-notifications";

import { useSidebar } from "@/components/providers/sidebar-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

export function Sidebar({ activeOrgId }: { activeOrgId?: string | null }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { data: subscription } = useSubscription();
  const { isOpen, toggle } = useSidebar(); // Use context
  const { unreadCount } = useNotifications();
  const [openSections, setOpenSections] = useState<string[]>([
    "Analyze",
    "Campaigns",
    "Optimize",
    "AI Creative",
  ]);

  const toggleSection = (label: string) => {
    if (!isOpen) return; // Prevent toggling when collapsed
    setOpenSections((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.substring(0, 2).toUpperCase() || "U";
  };

  const navGroups = [
    {
      label: "Analyze",
      icon: GraphUp,
      items: [
        { label: "Performance", icon: StatsReport, href: "/dashboard" },
        { label: "Creative", icon: MediaImage, href: "/creatives" },
      ],
    },
    {
      label: "Campaigns",
      icon: NetworkReverse,
      items: [
        { label: "All Campaigns", icon: List, href: "/campaigns" },
        { label: "Create New", icon: Plus, href: "/campaigns/new" },
      ],
    },
    {
      label: "AI Creative",
      icon: MagicWand,
      variant: "ai",
      iconColor: "text-ai", // [UPDATED] Semantic token
      labelColor: "text-ai", // [UPDATED] Semantic token
      items: [
        { label: "Create", icon: MagicWand, href: "/creations" },
        // { label: "Improve", icon: GraphUp, href: "#" },
        { label: "My Creations", icon: LayoutLeft, href: "/creations/library" },
      ],
    },
    // {
    //   label: "Optimize",
    //   icon: LayoutLeft,
    //   items: [
    //     { label: "Create Flow", icon: ShareAndroid, href: "#" },
    //     { label: "Templates", icon: LayoutLeft, href: "#" },
    //   ],
    // },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen flex flex-col bg-sidebar border-r border-border text-subtle-foreground transition-all duration-300 font-sans shadow-soft", // [UPDATED] bg-sidebar, shadow-soft
        isOpen ? "w-65" : "w-20",
      )}
    >
      {/* 1. Header (Org Switcher) */}
      <div
        className={cn(
          "shrink-0 m-3.5 mb-3.5 flex items-center justify-between gap-2 cursor-pointer",
          !isOpen && "flex-col gap-4",
        )}
      >
        {isOpen && <WorkspaceSwitcher activeOrgId={activeOrgId} />}

        {/* Collapsed Logo View */}
        {!isOpen && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xl mb-2 border border-border">
            {(subscription?.org?.name?.[0] || "A").toUpperCase()}
          </div>
        )}

        <button
          onClick={toggle}
          className="hover:text-foreground text-muted-foreground p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {isOpen ? (
            <SidebarCollapse className="h-5 w-5" />
          ) : (
            <SidebarExpand className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* 2. Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-2 no-scrollbar">
        {/* Top Level: Explore */}
        {/* <div className="mb-2">
          <Link
            href="/dashboard"
            className={cn(
              "side-menu-item hover:bg-muted text-subtle-foreground hover:text-foreground", // [UPDATED] colors
              !isOpen && "justify-center px-0",
              pathname === "/dashboard" &&
                "bg-primary/10 text-primary font-medium",
            )}
          >
            <Compass className="h-5 w-5" />
            {isOpen && <span>Explore</span>}
          </Link>
        </div> */}

        {/* Collapsible Groups */}
        <div>
          {navGroups.map((group) => (
            <div key={group.label} className="mb-2">
              <button
                onClick={() => (isOpen ? toggleSection(group.label) : null)}
                className={cn(
                  "side-menu-item justify-between w-full hover:bg-muted text-subtle-foreground hover:text-foreground", // [UPDATED]
                  !isOpen && "justify-center px-0 cursor-default", // Disable click when collapsed or show grouping visual
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-3",
                    !isOpen && "justify-center",
                  )}
                >
                  <group.icon
                    className={cn(
                      "h-5 w-5",
                      group.iconColor ||
                        "text-subtle-foreground group-hover:text-foreground", // [UPDATED]
                    )}
                  />
                  {isOpen && (
                    <span
                      className={cn(
                        "font-medium",
                        (group as any).labelColor || "text-foreground",
                      )}
                    >
                      {group.label}
                    </span>
                  )}
                </div>
                {isOpen &&
                  (openSections.includes(group.label) ? (
                    <NavArrowDown className="h-4 w-4 " />
                  ) : (
                    <NavArrowRight className="h-4 w-4 " />
                  ))}
              </button>

              {/* Items - Always show if open, or show flattened if sidebar collapsed (optional, but requested behavior usually implies hiding subs or showing them on hover/popover. For MVP "Collapse", avoiding subs is easiest, OR we show them if we can.
                  However, standard Wask behavior: if collapsed, you just see icons.
                  If we hide specific sub-items when collapsed, user loses access.
                  BETTER APPROACH: When collapsed, render sub-items as just icons below the group icon?
                  OR: Keep it simple: When collapsed, maybe don't show sub-items?
                  Wait, if I hide sub-items, user can't navigate.
                  Let's render sub-items below logic only if isOpen is true OR treat them as flat list?

                  Let's look at navGroups.
                  Analyze -> Performance, Creative.
                  If collapsed, how do I access "Performance"?
                  If I assume "Sidebar Toggling" just hides text:
                  Then sub-items should still be visible?
                  But if Group is collapsed, sub-items are hidden.

                  DECISION: When Sidebar is collapsed, we force-expand all groups visually (but cleaner) OR we expect user to hover.
                  Actually, simplest for now: If !isOpen, show NOTHING for groups? No that's bad.

                  Let's assume for this task: When collapsed, we just show top-level icons.
                  But wait, "Analyze" is a Category. "Performance" is the link.
                  So if I collapse, I see "Analyze" icon. Clicking it does nothing?

                  Correction: Ideally, when collapsed, we shouldn't show category headers as clickable if they aren't links.
                  Let's change logic:
                  If !isOpen, we render the ITEMS directly?
                  Or we simply keep the list expanded?

                  Refined Plan for Collapsed State:
                  - Render Group Icon as non-interactive header?
                  - Render Items as icons below it.
                  - Force "expanded" visually?

                  Let's try: When collapsed, everything is expanded.
              */}
              {(isOpen ? openSections.includes(group.label) : true) && (
                <div
                  className={cn(
                    "ml-4 border-l-2 border-border pl-2 my-1 space-y-1",
                    !isOpen &&
                      "ml-0 border-l-0 pl-0 flex flex-col items-center gap-2 mt-2",
                  )}
                >
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const isAi = (group as any).variant === "ai";
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                          "side-menu-sub-item transition-all duration-150 ease-in-out relative",
                          isActive
                            ? isAi
                              ? "bg-ai/10 text-ai font-semibold"
                              : "bg-primary/10 text-primary font-semibold"
                            : "hover:text-foreground hover:bg-muted/50 text-subtle-foreground",
                          !isOpen && "justify-center px-2 py-2 h-10 w-10",
                        )}
                        title={item.label} // Tooltip fallback
                      >
                        {isActive && isOpen && (
                          <div
                            className={cn(
                              "absolute left-[-10px] top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full",
                              isAi ? "bg-ai" : "bg-primary",
                            )}
                          />
                        )}
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            isActive
                              ? isAi
                                ? "text-ai"
                                : "text-primary"
                              : "text-subtle-foreground group-hover:text-foreground", // [UPDATED]
                          )}
                        />
                        {isOpen && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Footer */}
      <div
        className={cn(
          "p-4 space-y-3 bg-transparent border-t border-border", // [UPDATED] bg-transparent
          !isOpen && "p-2 space-y-2 items-center flex flex-col",
        )}
      >
        {/* Notifications Link */}
        <Link
          href="/notifications"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 border border-border transition-colors hover:bg-muted/50 hover:text-foreground text-subtle-foreground relative",
            pathname === "/notifications" &&
              "bg-primary/10 text-primary border-primary/20",
            !isOpen && "justify-center px-0 border-0 bg-transparent",
          )}
          title="Notifications"
        >
          <Bell className="h-5 w-5 shrink-0" />
          {isOpen && (
            <span className="text-sm font-medium flex-1">Notifications</span>
          )}
          {unreadCount > 0 && (
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white px-1",
                !isOpen && "absolute -top-1 -right-1 h-4 min-w-4 text-[8px]",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Credits Pill Extracted to Header */}

        {/* User Profile Card */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className={cn(
                "bg-background rounded-2xl p-3 border border-border flex items-center gap-3 shadow-soft cursor-pointer hover:bg-muted/50 transition-colors", // [UPDATED] shadow-soft
                !isOpen &&
                  "p-1 border-0 shadow-none justify-center bg-transparent",
              )}
            >
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/20 text-primary font-medium">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>

              {isOpen && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user?.user_metadata?.full_name || "User"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate font-medium">
                      {subscription?.org?.tier || "Basic Plan"}
                    </p>
                  </div>
                  <MoreVert className="h-5 w-5 text-muted-foreground" />
                </>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side={isOpen ? "top" : "right"}
            className="w-56 p-2 rounded-xl shadow-soft border-border bg-popover" // [UPDATED] bg-popover
          >
            <div className="px-2 py-1.5 text-sm font-semibold border-b border-border mb-1 text-foreground">
              {user?.user_metadata?.full_name || "User"}
            </div>

            <Link href="/settings/general">
              <DropdownMenuItem className="cursor-pointer text-muted-foreground focus:text-foreground focus:bg-muted/50 rounded-lg px-3 py-2">
                Account Settings
              </DropdownMenuItem>
            </Link>

            <Link href="#">
              <DropdownMenuItem className="cursor-pointer text-muted-foreground focus:text-foreground focus:bg-muted/50 rounded-lg px-3 py-2">
                Help Center
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem
              onClick={() => signOut()}
              className="cursor-pointer focus:bg-muted/50 rounded-lg px-3 py-2 text-red-600 focus:text-red-700"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
