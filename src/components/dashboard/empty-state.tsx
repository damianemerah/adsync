"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Facebook, Rocket } from "iconoir-react";
import { ConnectAccountDialog } from "@/components/ad-accounts/connect-account-dialog";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";

export interface DashboardEmptyStateProps {
  userName?: string;
  hasAdAccount?: boolean;
  hasVerifiedWhatsApp?: boolean;
  hasFirstCampaign?: boolean;
}

export function DashboardEmptyState({
  userName = "there",
}: DashboardEmptyStateProps) {
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);

  return (
    <div className="container max-w-4xl mx-auto py-6 sm:py-8 h-full flex flex-col justify-center">
      <Empty className="border-border border-solid bg-card shadow-sm border border-border rounded-lg p-6 sm:p-10 mb-6 flex-1 min-h-fit overflow-y-auto">
        <EmptyHeader className="mb-4">
          <EmptyMedia
            variant="icon"
            className="mb-3 bg-primary/10 text-primary h-12 w-12 rounded-full"
          >
            <Rocket className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
            Welcome to Tenzu, {userName}!
          </EmptyTitle>
          <EmptyDescription className="max-w-lg mx-auto text-sm sm:text-base mt-2">
            You are one step away from launching your first ad in 2 minutes.
            Link your Meta or TikTok account to start selling.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent className="max-w-2xl w-full flex-col items-center">
          <Button
            size="lg"
            onClick={() => setIsConnectDialogOpen(true)}
            className="font-semibold rounded-full px-8 h-12 text-sm sm:text-base bg-primary text-primary-foreground hover:bg-primary/90 mt-4"
          >
            <Facebook className="mr-2 h-5 w-5" />
            Connect Ad Account
          </Button>
        </EmptyContent>
      </Empty>

      <ConnectAccountDialog
        open={isConnectDialogOpen}
        onOpenChange={setIsConnectDialogOpen}
      />
    </div>
  );
}
