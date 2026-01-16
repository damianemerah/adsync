"use client";

import { Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  ImageIcon,
  Briefcase,
  Users,
  Settings,
  Zap,
  Wallet,
  LogOut,
  HelpCircle,
  Bell,
  User,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider"; // 1. Import Auth Hook

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth(); // 2. Get User & SignOut function

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: Target, label: "Campaigns", href: "/campaigns", badge: "3" },
    { icon: ImageIcon, label: "Creatives", href: "/creatives" },
    { icon: Briefcase, label: "Ad Accounts", href: "/ad-accounts" },
    { icon: Wallet, label: "Billing", href: "/billing" },
  ];

  const secondaryItems = [
    { icon: Users, label: "Team", href: "/team" },
    { icon: Bell, label: "Notifications", href: "/notifications", badge: "2" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  // Helper to get initials from email or name
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

  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-64 flex flex-col border-r border-slate-800 bg-[#0F172A] text-slate-300 shadow-2xl">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-800 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-900/20">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <span className="font-heading text-xl font-bold text-white tracking-tight">
            AdSync
          </span>
        </Link>
      </div>

      {/* Scrollable Nav Area */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        {/* Main Nav */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon
                  className={`h-5 w-5 ${
                    isActive ? "text-white" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <Separator className="bg-slate-800" />

        {/* Secondary Nav */}
        <nav className="space-y-1">
          {secondaryItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-[#0F172A]">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* GLOBAL AI TRIGGER */}
        <div className="px-3 pb-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold shadow-lg border-0">
                <Sparkles className="mr-2 h-4 w-4" /> Ask AdSync AI
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px]">
              {/* AI Chat Interface Component Goes Here */}
              <div className="h-full flex flex-col justify-center items-center text-slate-500">
                <Sparkles className="h-12 w-12 mb-4 text-purple-200" />
                <p>AI Assistant is ready to help.</p>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Usage Card */}
        <div className="px-1 pt-4">
          <Card className="border-0 bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white/90">
                  Starter Plan
                </span>
                <span className="text-[10px] font-medium bg-white/20 px-1.5 py-0.5 rounded text-white">
                  Free
                </span>
              </div>
              <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/90 w-[70%]" />
              </div>
              <p className="mt-2 text-[10px] text-white/80 font-medium">
                7 of 10 AI requests used
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="w-full mt-3 h-7 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50"
              >
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Profile Section (Fixed Bottom) */}
      <div className="p-4 border-t border-slate-800 bg-[#0F172A]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-white/5 transition-colors text-left group">
              <Avatar className="h-9 w-9 border border-slate-700 bg-blue-900 text-white">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-blue-600 text-white font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {user?.user_metadata?.full_name || "User"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
              <ChevronUp className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="right"
            className="w-56 mb-2 ml-2"
          >
            <div className="px-2 py-1.5">
              <p className="text-sm font-bold truncate">
                {user?.user_metadata?.full_name || "AdSync User"}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/settings" className="flex items-center w-full">
                <User className="mr-2 h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/billing" className="flex items-center w-full">
                <Briefcase className="mr-2 h-4 w-4" /> Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="#" className="flex items-center w-full">
                <HelpCircle className="mr-2 h-4 w-4" /> Support
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* 3. LOGOUT BUTTON */}
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 cursor-pointer focus:bg-red-50"
              onClick={() => signOut()} // Triggers auth provider logout
            >
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
