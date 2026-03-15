"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck } from "iconoir-react";

interface FormMetadataPanelProps {
  formName: string;
  privacyPolicyUrl: string;
  thankYouMessage: string;
  onFormNameChange: (v: string) => void;
  onPrivacyPolicyUrlChange: (v: string) => void;
  onThankYouMessageChange: (v: string) => void;
}

export function FormMetadataPanel({
  formName,
  privacyPolicyUrl,
  thankYouMessage,
  onFormNameChange,
  onPrivacyPolicyUrlChange,
  onThankYouMessageChange,
}: FormMetadataPanelProps) {
  return (
    <Card className="rounded-3xl shadow-soft border-border overflow-hidden bg-card">
      <CardHeader className="pb-3 border-b border-border bg-muted/20">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          Form Details
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="font-bold text-sm">Form Name (Internal)</Label>
          <Input
            value={formName}
            onChange={(e) => onFormNameChange(e.target.value)}
            placeholder="e.g. Summer Promo Leads 2026"
            className="h-12 bg-muted/50 border-border"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="font-bold text-sm">Privacy Policy URL</Label>
          <Input
            value={privacyPolicyUrl}
            onChange={(e) => onPrivacyPolicyUrlChange(e.target.value)}
            placeholder="https://yourwebsite.com/privacy"
            className="h-12 bg-muted/50 border-border"
            type="url"
          />
          <p className="text-xs text-muted-foreground">
            Required by Meta. Must link to a valid privacy policy on your website.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="font-bold text-sm">Thank You Message (Optional)</Label>
          <Textarea
            value={thankYouMessage}
            onChange={(e) => onThankYouMessageChange(e.target.value)}
            placeholder="Thanks, we'll be in touch!"
            className="resize-none bg-muted/50 border-border"
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}
