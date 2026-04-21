"use client";

import { useCampaignStore } from "@/stores/campaign-store";
import { Input } from "@/components/ui/input";
import { Download, InfoCircle } from "iconoir-react";

export function AppInfoStep() {
  const { appStoreUrl, metaApplicationId, updateDraft } = useCampaignStore();

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    updateDraft({ appStoreUrl: url });

    // Try to auto-parse if it looks like a Meta App dashboard ID isn't already there
    // For iOS: apps.apple.com/app/id1234567890
    // For Android: play.google.com/store/apps/details?id=com.example.app
    if (!metaApplicationId) {
      const appleMatch = url.match(/\/id(\d+)/);
      if (appleMatch) {
        updateDraft({ metaApplicationId: appleMatch[1] });
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20 mt-12">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-2">
          <Download className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-heading text-foreground">
          What app are you promoting?
        </h1>
        <p className="text-subtle-foreground max-w-lg mx-auto">
          Share your App Store or Google Play Store link, and your Meta App ID.
        </p>
      </div>

      <div className="space-y-6 bg-card border border-border rounded-lg p-6 md:p-8 shadow-sm">
        <div className="space-y-3">
          <label className="text-sm font-bold text-foreground">
            App Store / Play Store Link
          </label>
          <Input
            value={appStoreUrl}
            onChange={handleUrlChange}
            placeholder="e.g. https://play.google.com/store/apps/details?id=com.example.app"
            className="h-12 border-border bg-muted/50 focus-visible:ring-primary/20"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-foreground flex items-center justify-between">
            <span>Meta Application ID</span>
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-normal text-primary hover:underline flex items-center gap-1"
            >
              <InfoCircle className="w-3 h-3" /> Find it in Meta App Dashboard
            </a>
          </label>
          <Input
            value={metaApplicationId}
            onChange={(e) => updateDraft({ metaApplicationId: e.target.value })}
            placeholder="e.g. 123456789012345"
            className="h-12 border-border bg-muted/50 focus-visible:ring-primary/20"
          />
          <p className="text-xs text-subtle-foreground">
            This is required by Meta to run App Install ads. It ensures clicks
            open your app directly if they already have it installed.
          </p>
        </div>
      </div>
    </div>
  );
}
