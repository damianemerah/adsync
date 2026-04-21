"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Sparks, StatUp } from "iconoir-react";

interface LaunchSuccessModalProps {
  show: boolean;
  onClose: () => void;
  dbCampaignId: string | null;
  showPixelPrompt: boolean;
  budget: number;
  outcomeLabel: string;
  outcomeRange: string;
}

export function LaunchSuccessModal({
  show,
  onClose,
  dbCampaignId,
  showPixelPrompt,
  budget,
  outcomeLabel,
  outcomeRange,
}: LaunchSuccessModalProps) {
  const router = useRouter();

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <Card className="max-w-lg w-full animate-in zoom-in-95 slide-in-from-bottom-4">
        <CardContent className="p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-in zoom-in-50">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-heading text-foreground mb-2">
                {showPixelPrompt
                  ? "Ad launched! One last step..."
                  : "Your ad is live! 🎉"}
              </h2>
              <p className="text-subtle-foreground">
                {showPixelPrompt
                  ? "To track the exact Naira your ad makes, you need to install the Tenzu Pixel."
                  : "Meta is reviewing it now. Messages should start coming in within 24 hours."}
              </p>
            </div>
          </div>

          {showPixelPrompt ? (
            <div className="bg-warning-bg border border-warning-border rounded-md p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="bg-warning-icon-bg p-2 rounded-full mt-0.5">
                  <StatUp className="w-5 h-5 text-warning-text-secondary" />
                </div>
                <div>
                  <h4 className="font-bold text-warning-text mb-1">
                    Install Tracking Pixel
                  </h4>
                  <p className="text-sm text-warning-text-secondary mb-3">
                    Copy this snippet into your website&apos;s{" "}
                    <code>&lt;head&gt;</code> tag to enable ROI tracking.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="w-full bg-warning-btn hover:bg-warning-btn-hover text-white font-bold"
                  >
                    <Link href={`/campaigns/${dbCampaignId}`}>
                      Get Snippet Code
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-md">
              <div className="text-center">
                <div className="text-xs text-subtle-foreground">Daily Budget</div>
                <div className="text-lg font-bold text-foreground">
                  ₦{budget.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-subtle-foreground">
                  Expected{" "}
                  {outcomeLabel.replace(/^[a-z]/, (c) => c.toUpperCase())}
                </div>
                <div className="text-lg font-bold text-primary">
                  {outcomeRange}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 rounded-lg font-bold"
              onClick={onClose}
            >
              Watch it perform → View Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg shadow-sm border border-border"
              onClick={() => {
                if (dbCampaignId)
                  router.push(`/creations/studio?campaign_id=${dbCampaignId}`);
              }}
              disabled={!dbCampaignId}
            >
              <Sparks className="mr-2 h-5 w-5" />
              Improve My Creative with AI
            </Button>
          </div>

          <div className="text-center">
            <button
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              I&apos;ll add creative later
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
