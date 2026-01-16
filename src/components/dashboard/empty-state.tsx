"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Facebook,
  Smartphone,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SetupStepProps {
  title: string;
  description: string;
  icon: any;
  href: string;
  isCompleted: boolean;
  ctaText: string;
}

function SetupStep({
  title,
  description,
  icon: Icon,
  href,
  isCompleted,
  ctaText,
}: SetupStepProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-xl border transition-all",
        isCompleted
          ? "bg-green-50 border-green-100 opacity-70"
          : "bg-white border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center shrink-0",
            isCompleted
              ? "bg-green-100 text-green-600"
              : "bg-blue-50 text-blue-600"
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <Icon className="h-6 w-6" />
          )}
        </div>
        <div>
          <h3
            className={cn(
              "font-bold text-base",
              isCompleted ? "text-green-800" : "text-slate-900"
            )}
          >
            {title}
          </h3>
          <p className="text-sm text-slate-500 hidden sm:block">
            {description}
          </p>
        </div>
      </div>

      {isCompleted ? (
        <Badge
          variant="outline"
          className="border-green-200 text-green-700 bg-white"
        >
          Completed
        </Badge>
      ) : (
        <Link href={href}>
          <Button
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold"
          >
            {ctaText} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}

export function DashboardEmptyState({
  userName = "User",
}: {
  userName?: string;
}) {
  // In a real app, these booleans would come from your database
  const hasAdAccount = false;
  const hasVerifiedWhatsApp = false;
  const hasFirstCampaign = false;

  const progress = [hasAdAccount, hasVerifiedWhatsApp, hasFirstCampaign].filter(
    Boolean
  ).length;
  const total = 3;

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      {/* Welcome Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-700 rounded-2xl mb-2">
          <Rocket className="h-8 w-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-slate-900">
          Welcome to AdSync, {userName}!
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          You are 3 steps away from launching AI-powered campaigns. Let's get
          your workspace ready.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-100 rounded-full h-3 w-full max-w-md mx-auto overflow-hidden">
        <div
          className="bg-blue-600 h-full transition-all duration-1000 ease-out"
          style={{ width: `${(progress / total) * 100}%` }}
        />
      </div>
      <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
        {progress} of {total} steps completed
      </p>

      {/* Steps Grid */}
      <div className="grid gap-4 max-w-2xl mx-auto">
        <SetupStep
          title="Connect Ad Account"
          description="Link your Meta or TikTok account to import data."
          icon={Facebook}
          href="/ad-accounts"
          ctaText="Connect Account"
          isCompleted={hasAdAccount}
        />

        <SetupStep
          title="Verify WhatsApp"
          description="Enable critical alerts for payment failures."
          icon={Smartphone}
          href="/settings"
          ctaText="Verify Number"
          isCompleted={hasVerifiedWhatsApp}
        />

        <SetupStep
          title="Launch First Campaign"
          description="Use our AI to find your perfect audience."
          icon={Rocket}
          href="/campaigns/new"
          ctaText="Start Campaign"
          isCompleted={hasFirstCampaign}
        />
      </div>

      {/* Support Box */}
      <Card className="bg-slate-900 text-white border-slate-800 max-w-2xl mx-auto mt-8">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">Need help setting up?</p>
            <p className="text-slate-400 text-sm">
              Watch our 2-minute quick start video.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-800 hover:bg-slate-800 hover:text-white"
          >
            Watch Tutorial
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
